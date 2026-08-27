/**
 * One-way backfill: MongoDB → Neon Postgres.
 *
 *   node --env-file=.env.local scripts/backfill.mjs --check
 *   node --env-file=.env.local scripts/backfill.mjs
 *   node --env-file=.env.local scripts/backfill.mjs --verify
 *
 * Three properties this script is built around:
 *
 *   IDEMPOTENT. Every write is an upsert keyed on the primary key, so running
 *   it twice is the same as running it once. You will run it many times against
 *   a Neon branch before running it once for real, and a re-run after a partial
 *   failure must not double-insert or fall over.
 *
 *   ID-PRESERVING. Mongo ObjectId hex strings are carried across as the text
 *   primary keys. The application already treats these as opaque strings, and
 *   the same strings are embedded in every stored result's answer array — so
 *   nothing anywhere needs remapping. This is the single largest risk reduction
 *   available on a live database.
 *
 *   FAIL-LOUD. It runs a preflight that reports every row the new foreign keys
 *   would reject BEFORE writing anything, because those rows are real integrity
 *   violations that Mongo was silently tolerating. Pass --skip-orphans to
 *   migrate everything else and leave them behind, listed.
 *
 * Deliberately raw SQL rather than the Drizzle schema: a data move should be
 * readable as exactly the statements it runs.
 *
 * STATUS: the migration is DONE. Every table is listed in `CUT_OVER` below, so
 * without `--force-cutover` every write here short-circuits — this is a RESTORE
 * tool now, not a migration tool. Keep it for that and for `--verify`. It is
 * also the only remaining reason `mongodb` is a devDependency; nothing the
 * application ships imports it.
 */
import { MongoClient } from 'mongodb';
import { neon } from '@neondatabase/serverless';

const MODE =
  process.argv.includes('--check')  ? 'check'  :
  process.argv.includes('--verify') ? 'verify' : 'migrate';
const SKIP_ORPHANS = process.argv.includes('--skip-orphans');
const FORCE_CUTOVER = process.argv.includes('--force-cutover');

/*
 * Tables the application has already cut over to Postgres.
 *
 * Once a table is on this list, Postgres is the source of truth and Mongo is a
 * frozen snapshot — so copying Mongo over the top would silently DESTROY every
 * write made since the cutover (an admin's exam edit, an imported bank, a
 * reordered module). The script refuses to touch them.
 *
 * Add each table here as its phase lands. `--force-cutover` overrides, and is
 * only ever right when deliberately restoring from Mongo.
 */
const CUT_OVER = new Set([
  'exams', 'questions', 'exam_sessions', 'played_audio', 'user_settings',
  'exam_results', 'exam_answers', 'purchases',
]);

const { MONGODB_URI, DATABASE_URL } = process.env;
if (!MONGODB_URI)  throw new Error('MONGODB_URI is not defined');
if (!DATABASE_URL) throw new Error('DATABASE_URL is not defined');

const sql = neon(DATABASE_URL);

/** Rows per INSERT. Keeps each HTTP request well inside Neon's statement size. */
const CHUNK = 250;

const c = {
  dim:  s => `\x1b[2m${s}\x1b[0m`,
  bold: s => `\x1b[1m${s}\x1b[0m`,
  red:  s => `\x1b[31m${s}\x1b[0m`,
  grn:  s => `\x1b[32m${s}\x1b[0m`,
  yel:  s => `\x1b[33m${s}\x1b[0m`,
};

/* ------------------------------------------------------------ coercion --- */

const id    = v => (v == null ? null : String(v));
const str   = (v, d = '')   => (v == null ? d : String(v));
const num   = (v, d = 0)    => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const numN  = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const bool  = (v, d = false) => (typeof v === 'boolean' ? v : d);
const arr   = v => (Array.isArray(v) ? v : []);
const strs  = v => arr(v).map(x => String(x ?? ''));
const ints  = v => arr(v).map(x => num(x, 0));
const date  = (v, d = null) => (v instanceof Date && !isNaN(v) ? v.toISOString() : d);
const dateR = v => date(v, new Date().toISOString());   // required column
const plus  = (v, ms) => new Date((v instanceof Date && !isNaN(v) ? v.getTime() : Date.now()) + ms).toISOString();

/* --------------------------------------------------------------- runner --- */

/**
 * Insert `rows` into `table` in chunks, upserting on `conflict`.
 *
 * Builds one multi-row parameterised INSERT per chunk. `cols` is the column
 * list; `update` names the columns re-assigned on conflict (empty = DO NOTHING).
 */
async function upsert(table, cols, rows, conflict = [], update = []) {
  if (CUT_OVER.has(table) && !FORCE_CUTOVER) return 0;
  if (!rows.length) return 0;
  let written = 0;

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const params = [];
    const tuples = chunk.map(r => {
      const slots = cols.map(col => {
        params.push(r[col]);
        return `$${params.length}`;
      });
      return `(${slots.join(',')})`;
    });

    const setClause = update.length
      ? `DO UPDATE SET ${update.map(col => `"${col}" = EXCLUDED."${col}"`).join(', ')}`
      : 'DO NOTHING';

    // No conflict target means a plain INSERT — used where the caller has
    // already cleared the rows it is about to write (see exam_answers).
    const onConflict = conflict.length
      ? ` ON CONFLICT (${conflict.map(x => `"${x}"`).join(',')}) ${setClause}`
      : '';

    const text =
      `INSERT INTO "${table}" (${cols.map(x => `"${x}"`).join(',')}) ` +
      `VALUES ${tuples.join(',')}` + onConflict;

    await sql.query(text, params);
    written += chunk.length;
    process.stdout.write(`\r  ${table.padEnd(15)} ${written}/${rows.length}   `);
  }
  process.stdout.write(`\r  ${table.padEnd(15)} ${c.grn(String(written))} rows${' '.repeat(12)}\n`);
  return written;
}

/* ------------------------------------------------------------------ main --- */

const mongo = new MongoClient(MONGODB_URI);
await mongo.connect();
const mdb = mongo.db();

const read = async name => mdb.collection(name).find({}).toArray();

console.log(c.bold(`\n  Mongo → Neon  [${MODE}]\n`));

const [exams, questions, results, sessions, purchases, audio, settings] = await Promise.all([
  read('exams'), read('questions'), read('examresults'), read('examsessions'),
  read('purchases'), read('playedaudios'), read('usersettings'),
]);

const source = {
  exams: exams.length, questions: questions.length, exam_results: results.length,
  exam_answers: results.reduce((n, r) => n + arr(r.answers).length, 0),
  exam_sessions: sessions.length, purchases: purchases.length,
  played_audio: audio.length, user_settings: settings.length,
};

console.log(c.bold('  Source counts'));
for (const [k, v] of Object.entries(source)) console.log(`  ${k.padEnd(15)} ${v}`);

/* ------------------------------------------------------------- preflight --- */

// Every table below takes a foreign key to exams.id. A row pointing at an exam
// that no longer exists is a violation Mongo tolerated and Postgres will not.
const examIds = new Set(exams.map(e => e.examId));
// Legacy claims promoted from sessions are additional rows with no Mongo
// counterpart in `playedaudios`, so the expected count has to include them.
source.played_audio += sessions
  .filter(s => examIds.has(s.examId))
  .reduce((n, s) => n + arr(s.playedAudioUrls).length, 0);
const orphans = {
  questions:     questions.filter(q => !examIds.has(q.examId)),
  exam_results:  results.filter(r => !examIds.has(r.examId)),
  exam_sessions: sessions.filter(s => !examIds.has(s.examId)),
  purchases:     purchases.filter(p => !examIds.has(p.examId)),
  played_audio:  audio.filter(a => !examIds.has(a.examId)),
};
const orphanTotal = Object.values(orphans).reduce((n, o) => n + o.length, 0);

// Not a blocker — the historical damage from the re-import bug. These answers
// point at questions that no longer exist, so their snapshot cannot be
// recovered; they are counted so the loss is stated rather than discovered.
const liveQuestionIds = new Set(questions.map(q => String(q._id)));
const unresolvable = results.reduce(
  (n, r) => n + arr(r.answers).filter(a => !liveQuestionIds.has(str(a.questionId))).length, 0);

console.log(c.bold('\n  Preflight'));
if (orphanTotal === 0) {
  console.log(`  ${c.grn('✓')} no foreign-key violations`);
} else {
  console.log(`  ${c.red('✗')} ${orphanTotal} rows reference a missing exam:`);
  for (const [t, rows] of Object.entries(orphans)) {
    if (!rows.length) continue;
    const ids = [...new Set(rows.map(r => r.examId))];
    console.log(`      ${t.padEnd(15)} ${String(rows.length).padStart(5)}  examId: ${ids.slice(0, 4).join(', ')}${ids.length > 4 ? ` +${ids.length - 4}` : ''}`);
  }
}
console.log(
  unresolvable === 0
    ? `  ${c.grn('✓')} every stored answer resolves to a live question`
    : `  ${c.yel('!')} ${unresolvable} stored answers point at deleted questions — ` +
      `snapshot unrecoverable, question_id will be NULL`);

if (MODE === 'check') {
  console.log(c.dim('\n  --check: nothing written.\n'));
  await mongo.close();
  process.exit(orphanTotal > 0 ? 1 : 0);
}

if (MODE === 'verify') {
  console.log(c.bold('\n  Verify  (mongo → postgres)'));
  let bad = 0;
  for (const [table, expected] of Object.entries(source)) {
    const [{ n }] = await sql.query(`SELECT count(*)::int AS n FROM "${table}"`);
    const ok = n === expected;
    if (!ok) bad++;
    console.log(`  ${ok ? c.grn('✓') : c.red('✗')} ${table.padEnd(15)} ${String(expected).padStart(6)} → ${String(n).padStart(6)}`);
  }
  console.log(bad === 0 ? c.grn('\n  All counts match.\n') : c.red(`\n  ${bad} table(s) differ.\n`));
  await mongo.close();
  process.exit(bad === 0 ? 0 : 1);
}

if (orphanTotal > 0 && !SKIP_ORPHANS) {
  console.log(c.red('\n  Aborted. Fix the rows above, or re-run with --skip-orphans to leave them behind.\n'));
  await mongo.close();
  process.exit(1);
}

const keep = rows =>
  orphanTotal === 0 ? rows : rows.filter(r => examIds.has(r.examId));

/* ---------------------------------------------------------------- write --- */

console.log(c.bold('\n  Writing'));
if (CUT_OVER.size && !FORCE_CUTOVER) {
  console.log(c.dim(`  skipping ${[...CUT_OVER].join(', ')} — already cut over to Postgres`));
}

// 1. exams — the FK parent, so it goes first. `examId` becomes the PK outright.
await upsert('exams',
  ['id','title','type','description','tag','price','features','modules',
   'total_questions','duration_minutes','is_active','created_at','updated_at'],
  exams.map(e => ({
    id: str(e.examId), title: str(e.title), type: str(e.type),
    description: str(e.description), tag: str(e.tag),
    price: String(num(e.price, 0)),
    features: strs(e.features),
    modules: JSON.stringify(arr(e.modules).map(m => ({
      name: str(m.name), type: str(m.type),
      durationMinutes: num(m.durationMinutes), questions: num(m.questions),
      breakAfterMinutes: num(m.breakAfterMinutes), isAdaptive: bool(m.isAdaptive),
      instructions: str(m.instructions), layout: str(m.layout, 'single'),
    }))),
    total_questions: num(e.totalQuestions), duration_minutes: num(e.durationMinutes),
    is_active: bool(e.isActive, true),
    created_at: dateR(e.createdAt), updated_at: dateR(e.updatedAt),
  })),
  ['id'],
  ['title','type','description','tag','price','features','modules',
   'total_questions','duration_minutes','is_active','updated_at']);

// 2. questions — ObjectId hex preserved as the text PK, which is what keeps
//    every stored answer's questionId pointing at the right row.
await upsert('questions',
  ['id','exam_id','module_index','order','type','block_id','passage','audio_url',
   'image_url','stem','options','open_answers','correct_index','match_items',
   'correct_matching','explanation','writing_task_type','min_words','max_words',
   'rubric','created_at','updated_at'],
  keep(questions).map(q => ({
    id: id(q._id), exam_id: str(q.examId),
    module_index: num(q.moduleIndex), order: num(q.order),
    type: str(q.type, 'mcq'), block_id: str(q.blockId),
    passage: str(q.passage), audio_url: str(q.audioUrl), image_url: str(q.imageUrl),
    stem: str(q.stem), options: strs(q.options), open_answers: strs(q.openAnswers),
    correct_index: num(q.correctIndex, -1), match_items: strs(q.matchItems),
    correct_matching: ints(q.correctMatching), explanation: str(q.explanation),
    writing_task_type: q.writingTaskType ? str(q.writingTaskType) : null,
    min_words: numN(q.minWords), max_words: numN(q.maxWords), rubric: str(q.rubric),
    created_at: dateR(q.createdAt), updated_at: dateR(q.updatedAt),
  })),
  ['id'],
  ['exam_id','module_index','order','type','block_id','passage','audio_url',
   'image_url','stem','options','open_answers','correct_index','match_items',
   'correct_matching','explanation','writing_task_type','min_words','max_words',
   'rubric','updated_at']);

// 3. exam_results — moduleScores stays JSONB; answers split out below.
const liveResults = keep(results);
await upsert('exam_results',
  ['id','user_id','exam_id','exam_title','exam_tag','exam_type','attempt_number',
   'started_at','completed_at','duration_seconds','total_questions','score',
   'overall_band','total_scaled','rw_scaled','math_scaled','module_scores',
   'writing_grading_at','created_at'],
  liveResults.map(r => ({
    id: id(r._id), user_id: str(r.userId), exam_id: str(r.examId),
    exam_title: str(r.examTitle), exam_tag: str(r.examTag),
    exam_type: r.examType ? str(r.examType) : null,
    attempt_number: num(r.attemptNumber, 1),
    started_at: dateR(r.startedAt), completed_at: dateR(r.completedAt),
    duration_seconds: Math.max(0, num(r.durationSeconds)),
    total_questions: Math.max(0, num(r.totalQuestions)),
    score: String(Math.min(100, Math.max(0, num(r.score)))),
    overall_band: numN(r.overallBand) === null ? null : String(r.overallBand),
    total_scaled: numN(r.totalScaled), rw_scaled: numN(r.rwScaled),
    math_scaled: numN(r.mathScaled),
    module_scores: JSON.stringify(arr(r.moduleScores)),
    writing_grading_at: date(r.writingGradingAt),
    created_at: dateR(r.createdAt ?? r.completedAt),
  })),
  ['id'],
  ['exam_title','exam_tag','exam_type','started_at','completed_at','duration_seconds',
   'total_questions','score','overall_band','total_scaled','rw_scaled','math_scaled',
   'module_scores','writing_grading_at']);

/*
 * 4. exam_answers — the nested array becomes rows, and the snapshot is filled
 *    from the live bank where the question still exists.
 *
 * This is a one-time reconstruction of history: from here on `saveExamResult`
 * writes the snapshot at submit time, when the question is guaranteed present.
 * Answers whose question was already destroyed by a past re-import cannot be
 * recovered — they get a NULL question_id and an empty snapshot, which the
 * review page must render as "unavailable" rather than as a wrong answer.
 *
 * An answer has NO natural unique key. Its `questionId` is not one — every
 * answer damaged by the re-import carries a NULL question, so a whole module's
 * worth of them would collapse onto a single key. Rather than invent a
 * synthetic ordinal that would exist only to serve this script, idempotency is
 * achieved by clearing each result's answers before rewriting them: a re-run
 * lands on byte-identical state, and a partial run leaves no duplicates.
 */
const qById = new Map(questions.map(q => [String(q._id), q]));
const answerRows = [];
for (const r of liveResults) {
  for (const a of arr(r.answers)) {
    const q = qById.get(str(a.questionId));
    answerRows.push({
      result_id: id(r._id),
      question_id: q ? str(a.questionId) : null,
      module_index: num(a.moduleIndex),
      user_answer: num(a.userAnswer, -1),
      user_answer_text: str(a.userAnswerText),
      correct_index: num(a.correctIndex, -1),
      is_correct: bool(a.isCorrect),
      marks: num(a.marks, 1), earned_marks: num(a.earnedMarks, 0),
      time_seconds: Math.max(0, num(a.timeSeconds)),
      writing_score: numN(a.writingScore) === null ? null : String(a.writingScore),
      writing_word_count: numN(a.writingWordCount),
      writing_criteria: a.writingCriteria ? JSON.stringify(a.writingCriteria) : null,
      ai_feedback: a.aiFeedback ? str(a.aiFeedback) : null,
      writing_pending: bool(a.writingPending),
      q_stem:    q ? str(q.stem) : '',
      q_options: q ? strs(q.options) : [],
      q_passage: q ? str(q.passage) : '',
    });
  }
}
// Left behind by an earlier revision of this script that tried to key answers
// on their question. Dropped so a fresh database and a re-run agree.
await sql`DROP INDEX IF EXISTS exam_answers_backfill_key`;

// Clear first, in result-sized batches, so a re-run replaces rather than adds.
const resultIds = liveResults.map(r => id(r._id));
for (let i = 0; i < resultIds.length; i += CHUNK) {
  await sql.query(
    'DELETE FROM exam_answers WHERE result_id = ANY($1)',
    [resultIds.slice(i, i + CHUNK)],
  );
}

await upsert('exam_answers',
  ['result_id','question_id','module_index','user_answer','user_answer_text',
   'correct_index','is_correct','marks','earned_marks','time_seconds',
   'writing_score','writing_word_count','writing_criteria','ai_feedback',
   'writing_pending','q_stem','q_options','q_passage'],
  answerRows);

// 5. exam_sessions — progress stays a JSONB blob; the 7-day TTL becomes a column.
await upsert('exam_sessions',
  ['id','user_id','exam_id','started_at','total_seconds','module_schedule',
   'progress','last_seen_at','expires_at'],
  keep(sessions).map(s => ({
    id: id(s._id), user_id: str(s.userId), exam_id: str(s.examId),
    started_at: dateR(s.startedAt), total_seconds: num(s.totalSeconds),
    module_schedule: s.moduleSchedule ? JSON.stringify(s.moduleSchedule) : null,
    progress: s.progress ? JSON.stringify(s.progress) : null,
    last_seen_at: date(s.lastSeenAt),
    expires_at: plus(s.startedAt, 7 * 24 * 60 * 60 * 1000),
  })),
  ['id'],
  ['started_at','total_seconds','module_schedule','progress','last_seen_at','expires_at']);

// 6. purchases — money. Structurally trivial, moved last for a reason.
await upsert('purchases',
  ['id','user_id','exam_id','transaction_id','amount_cents','currency','status',
   'attempt_count','order_history','created_at','updated_at'],
  keep(purchases).map(p => ({
    id: id(p._id), user_id: str(p.userId), exam_id: str(p.examId),
    transaction_id: str(p.transactionId), amount_cents: num(p.amountCents),
    currency: str(p.currency, 'AZN'), status: str(p.status, 'COMPLETED'),
    attempt_count: num(p.attemptCount), order_history: strs(p.orderHistory),
    created_at: dateR(p.createdAt), updated_at: dateR(p.updatedAt ?? p.createdAt),
  })),
  ['id'],
  ['transaction_id','amount_cents','currency','status','attempt_count',
   'order_history','updated_at']);

/*
 * 7. played_audio — the unique claim key carries over; TTL becomes expires_at.
 *
 * Two sources, not one. Alongside the collection, every live session's
 * DEPRECATED `playedAudioUrls` array is converted into a real claim.
 *
 * That array is not empty in production, and the new schema has no column for
 * it. Dropping it would hand those candidates their listening track back — the
 * precise exploit the PlayedAudio collection was created to close, where a
 * reload and "start over" bought a second listen in about four seconds.
 * Promoting the entries to real rows preserves the claim AND retires the legacy
 * read path, instead of carrying a dead column into a clean schema.
 *
 * These expire with their SESSION (7 days from `startedAt`), not on the 24-hour
 * audio backstop — several are already older than 24 hours, so the audio TTL
 * would mark them spent-and-expired, which is the same refund by another route.
 * A claim has to outlive the attempt it belongs to.
 */
const legacyClaims = keep(sessions).flatMap(s =>
  arr(s.playedAudioUrls).map(url => ({
    user_id: str(s.userId), exam_id: str(s.examId), audio_url: str(url),
    played_at: dateR(s.startedAt),
    expires_at: plus(s.startedAt, 7 * 24 * 60 * 60 * 1000),
  })));

const audioRows = [
  ...keep(audio).map(a => ({
    user_id: str(a.userId), exam_id: str(a.examId), audio_url: str(a.audioUrl),
    played_at: dateR(a.playedAt),
    expires_at: plus(a.playedAt, 24 * 60 * 60 * 1000),
  })),
  // Deduped by the unique claim key: a track recorded in both places is one claim.
  ...legacyClaims,
];
if (legacyClaims.length) {
  console.log(c.dim(`  (${legacyClaims.length} legacy playedAudioUrls promoted to claims)`));
}

await upsert('played_audio',
  ['user_id','exam_id','audio_url','played_at','expires_at'],
  audioRows,
  ['user_id','exam_id','audio_url'],
  ['played_at','expires_at']);

// 8. user_settings — userId is the PK; there was never a second row per user.
await upsert('user_settings',
  ['user_id','target_exam_date','target_exam_type','created_at','updated_at'],
  settings.map(s => ({
    user_id: str(s.userId),
    target_exam_date: s.targetExamDate ? str(s.targetExamDate) : null,
    target_exam_type: s.targetExamType ? str(s.targetExamType) : null,
    created_at: dateR(s.createdAt), updated_at: dateR(s.updatedAt),
  })),
  ['user_id'],
  ['target_exam_date','target_exam_type','updated_at']);

/* --------------------------------------------------------------- verify --- */

console.log(c.bold('\n  Verify  (mongo → postgres)'));
let bad = 0;
for (const [table, expected] of Object.entries(source)) {
  const [{ n }] = await sql.query(`SELECT count(*)::int AS n FROM "${table}"`);
  /*
   * With --skip-orphans the target is intentionally short by the orphan count.
   * `exam_answers` needs its own arithmetic: no answer is orphaned in its own
   * right, but every answer belonging to a skipped result goes with it.
   */
  if (CUT_OVER.has(table) && !FORCE_CUTOVER) {
    const [{ n }] = await sql.query(`SELECT count(*)::int AS n FROM "${table}"`);
    console.log(`  ${c.dim('–')} ${table.padEnd(15)} ${String(n).padStart(6)} (cut over; Postgres authoritative)`);
    continue;
  }
  let target = expected;
  if (SKIP_ORPHANS) {
    if (table === 'exam_answers') {
      target -= orphans.exam_results.reduce((n, r) => n + arr(r.answers).length, 0);
    } else if (orphans[table]) {
      target -= orphans[table].length;
    }
  }
  const ok = n === target;
  if (!ok) bad++;
  console.log(`  ${ok ? c.grn('✓') : c.red('✗')} ${table.padEnd(15)} ${String(target).padStart(6)} → ${String(n).padStart(6)}`);
}

console.log(bad === 0
  ? c.grn('\n  Backfill complete, all counts match.\n')
  : c.red(`\n  Backfill finished with ${bad} mismatched table(s).\n`));

await mongo.close();
process.exit(bad === 0 ? 0 : 1);
