/**
 * Delete every filed attempt — `exam_results` and `exam_answers` — after taking
 * a full backup.
 *
 *   node --env-file=.env.local scripts/wipe-attempts.mjs                 # dry run
 *   node --env-file=.env.local scripts/wipe-attempts.mjs --confirm       # do it
 *
 * WHAT IT TOUCHES
 *   exam_results   every row deleted
 *   exam_answers   every row deleted (also ON DELETE CASCADE from the above,
 *                  but done explicitly so the count is reported honestly)
 *   purchases      `attempt_count` reset to 0 — it is a denormalised counter
 *                  that only ever ratchets FORWARD (see `greatest(...)` in
 *                  saveExamResult), so without this the admin views would keep
 *                  reporting attempts that no longer exist
 *
 * WHAT IT DOES NOT TOUCH
 *   purchases rows themselves — entitlements are payment records, and nobody
 *   loses access to an exam they bought. The question bank, exams, sessions,
 *   audio claims and user settings are all left alone.
 *
 * SAFETY
 *   - Dry run by default. Nothing is written without `--confirm`.
 *   - The backup is written and re-read BEFORE any delete runs. If the backup
 *     cannot be written or does not parse, the script exits without deleting.
 *   - The deletes and the counter reset go in ONE `sql.transaction([...])`, so
 *     the database never sees results gone while counters still claim them.
 *   - Idempotent: running it twice is harmless, the second run deletes nothing.
 *
 * The backup defaults to OUTSIDE the repository, because it contains user ids
 * and essay text and must not be committed by accident.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

const CONFIRM = process.argv.includes('--confirm');
const argOf = (flag) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
};

const DATABASE_URL = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DIRECT_URL / DATABASE_URL is not defined');

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupPath = argOf('--backup')
  ?? `${process.env.HOME}/Documents/mockexam-attempts-backup-${stamp}.json`;

const sql = neon(DATABASE_URL);

const c = {
  dim: s => `\x1b[2m${s}\x1b[0m`,
  bold: s => `\x1b[1m${s}\x1b[0m`,
  red: s => `\x1b[31m${s}\x1b[0m`,
  grn: s => `\x1b[32m${s}\x1b[0m`,
  yel: s => `\x1b[33m${s}\x1b[0m`,
};

console.log(c.dim(`database : ${DATABASE_URL.split('@')[1]?.split('/')[0] ?? '(unknown host)'}`));
console.log(c.dim(`mode     : ${CONFIRM ? 'CONFIRM — will delete' : 'dry run — no writes'}`));

/* ------------------------------------------------------------- inspect --- */

const [before] = await sql`
  select (select count(*) from exam_results)::int  results,
         (select count(*) from exam_answers)::int  answers,
         (select count(*) from purchases)::int     purchases,
         (select count(*) from purchases where attempt_count > 0)::int counters`;

console.log('');
console.log(c.bold('current state'));
console.log(`  exam_results            ${before.results}`);
console.log(`  exam_answers            ${before.answers}`);
console.log(`  purchases               ${before.purchases}  ${c.dim('(kept — entitlements are not touched)')}`);
console.log(`  purchases w/ attempts   ${before.counters}  ${c.dim('(attempt_count will be reset to 0)')}`);

const perUser = await sql`
  select user_id, count(*)::int n from exam_results group by user_id order by n desc`;
if (perUser.length) {
  console.log('');
  console.log(c.bold('attempts per user'));
  for (const u of perUser) console.log(`  ${u.user_id.slice(0, 16)}…  ${u.n}`);
}

if (before.results === 0 && before.answers === 0) {
  console.log('');
  console.log(c.grn('Nothing to delete — already empty.'));
  process.exit(0);
}

/* -------------------------------------------------------------- backup --- */

console.log('');
console.log(c.bold('backup'));

const [examResults, examAnswers, purchases] = await Promise.all([
  sql`select * from exam_results order by user_id, exam_id, attempt_number`,
  sql`select * from exam_answers order by result_id, id`,
  sql`select * from purchases order by user_id, exam_id`,
]);

const payload = {
  takenAt: new Date().toISOString(),
  note: 'Pre-deletion backup. Restore order: exam_results, then exam_answers, '
      + 'then restore purchases.attempt_count.',
  counts: {
    exam_results: examResults.length,
    exam_answers: examAnswers.length,
    purchases: purchases.length,
  },
  exam_results: examResults,
  exam_answers: examAnswers,
  purchases,
};

writeFileSync(backupPath, JSON.stringify(payload, null, 2));

// Read it back and parse it. A backup nobody has verified is not a backup, and
// this is the last moment at which the data still exists.
const verified = JSON.parse(readFileSync(backupPath, 'utf8'));
if (
  verified.counts.exam_results !== before.results ||
  verified.counts.exam_answers !== before.answers
) {
  console.error(c.red('Backup does not match the live counts. NOT deleting.'));
  process.exit(1);
}

console.log(`  wrote ${backupPath}`);
console.log(`  verified ${verified.counts.exam_results} results / ${verified.counts.exam_answers} answers`);

/* -------------------------------------------------------------- delete --- */

if (!CONFIRM) {
  console.log('');
  console.log(c.yel('Dry run. Nothing was deleted.'));
  console.log(c.yel('Re-run with --confirm to apply:'));
  console.log(c.dim('  node --env-file=.env.local scripts/wipe-attempts.mjs --confirm'));
  process.exit(0);
}

console.log('');
console.log(c.bold('deleting'));

/*
 * One atomic batch. `sql.transaction([...])` sends these as a single
 * transaction over the HTTP driver — enough here because nothing needs to be
 * read and decided between the statements.
 */
await sql.transaction([
  sql`DELETE FROM exam_answers`,
  sql`DELETE FROM exam_results`,
  sql`UPDATE purchases SET attempt_count = 0, updated_at = now() WHERE attempt_count <> 0`,
]);

const [after] = await sql`
  select (select count(*) from exam_results)::int results,
         (select count(*) from exam_answers)::int answers,
         (select count(*) from purchases)::int    purchases,
         (select count(*) from purchases where attempt_count > 0)::int counters`;

console.log(`  exam_results            ${before.results} → ${after.results}`);
console.log(`  exam_answers            ${before.answers} → ${after.answers}`);
console.log(`  purchases               ${before.purchases} → ${after.purchases}  ${c.dim('(unchanged)')}`);
console.log(`  purchases w/ attempts   ${before.counters} → ${after.counters}`);

const ok = after.results === 0 && after.answers === 0
  && after.counters === 0 && after.purchases === before.purchases;

console.log('');
console.log(ok ? c.grn('Done. Backup kept at:') : c.red('UNEXPECTED FINAL STATE — check the database. Backup at:'));
console.log(`  ${backupPath}`);
process.exit(ok ? 0 : 1);
