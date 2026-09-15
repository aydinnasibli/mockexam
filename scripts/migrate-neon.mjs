/**
 * Copy the whole database from one Neon account to another.
 *
 *   node --env-file=.env.migrate scripts/migrate-neon.mjs                     # dry run
 *   node --env-file=.env.migrate scripts/migrate-neon.mjs --confirm           # do it
 *   node --env-file=.env.migrate scripts/migrate-neon.mjs --verify            # compare only
 *   node --env-file=.env.migrate scripts/migrate-neon.mjs --confirm --resume  # after a crash
 *
 * Reads SOURCE_DIRECT_URL and TARGET_DIRECT_URL from .env.migrate. Both must be
 * DIRECT endpoints, with no `-pooler` in the host, for the same reason
 * drizzle.config.ts gives: PgBouncer's transaction mode breaks DDL.
 *
 * WHAT IT DOES
 *   1. Preflight, on every run. Confirms the source carries exactly the
 *      migrations in drizzle/, prints its row counts, and refuses a target that
 *      already holds data. A dry run stops here having written nothing.
 *   2. Builds the target schema by applying drizzle/: the same files that built
 *      the source. Constraints, partial indexes and the migration history come
 *      out identical instead of being reverse-engineered from a live database.
 *   3. Copies every table in foreign-key order, keyset-paged on the primary key.
 *      Postgres renders each page as JSON text and Postgres parses it back on the
 *      far side; Node only carries the string. No numeric, timestamp or jsonb
 *      value is ever round-tripped through a JavaScript type.
 *   4. Moves the two bigserial sequences past the copied ids, then verifies:
 *      per-table row count and an md5 over every row, on both sides.
 *
 * SAFETY
 *   - The source is only ever queried inside READ ONLY transactions.
 *   - A target with rows in any of these tables is refused. If a copy dies
 *     part-way, `--confirm --resume` finishes it: inserts skip primary keys
 *     that already landed.
 *   - Stop writes to the app first. A row written to the source mid-copy can be
 *     missed, and the verify step will report the table it happened to.
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { readMigrationFiles } from 'drizzle-orm/migrator';

const MIGRATIONS = fileURLToPath(new URL('../drizzle', import.meta.url));

// Parents before children, so every foreign key resolves the moment its row lands.
export const TABLES = [
  { name: 'users',         pk: 'id',      textPk: true  },
  { name: 'exams',         pk: 'id',      textPk: true  },
  { name: 'questions',     pk: 'id',      textPk: true  },
  { name: 'exam_results',  pk: 'id',      textPk: true  },
  { name: 'exam_answers',  pk: 'id',      textPk: false },
  { name: 'exam_sessions', pk: 'id',      textPk: true  },
  { name: 'purchases',     pk: 'id',      textPk: true  },
  { name: 'played_audio',  pk: 'id',      textPk: false },
  { name: 'user_settings', pk: 'user_id', textPk: true  },
  { name: 'free_claims',   pk: 'user_id', textPk: true  },
];

const q = id => `"${id.replaceAll('"', '""')}"`;
const list = cols => cols.map(c => q(c.name)).join(', ');

/* ---------------------------------------------------------------- queries */

export async function tableNames(db) {
  const rows = await db.read(`
    SELECT table_schema AS schema, table_name AS name
      FROM information_schema.tables
     WHERE table_type = 'BASE TABLE'
       AND table_schema NOT IN ('pg_catalog', 'information_schema', 'drizzle')
     ORDER BY 1, 2`);
  return rows.map(r => (r.schema === 'public' ? r.name : `${r.schema}.${r.name}`));
}

export function columns(db, table) {
  return db.read(`
    SELECT column_name AS name, udt_name AS type
      FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`, [table]);
}

export async function rowCount(db, table) {
  const [{ n }] = await db.read(`SELECT count(*)::int AS n FROM ${q(table)}`);
  return n;
}

async function appliedMigrations(db) {
  const [{ present }] = await db.read(
    `SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS present`);
  if (!present) return null;
  return db.read(`
    SELECT hash, created_at::text AS created_at
      FROM drizzle.__drizzle_migrations
     ORDER BY created_at`);
}

/*
 * A jsonb column can hold the JSON value `null`, which is not SQL NULL, and
 * json_populate_recordset collapses the two. Boxing each jsonb value in a
 * one-element array on the way out and unboxing it on the way in keeps them
 * distinct.
 */
const isJson = c => c.type === 'jsonb' || c.type === 'json';
const boxed = cols => cols.map(c => (isJson(c)
  ? `CASE WHEN ${q(c.name)} IS NULL THEN NULL ELSE jsonb_build_array(${q(c.name)}) END AS ${q(c.name)}`
  : q(c.name))).join(', ');
const unboxed = cols => cols.map(c => (isJson(c) ? `${q(c.name)} -> 0` : q(c.name))).join(', ');

const pageSql = (name, pk, cols, where) => `
  SELECT count(*)::int AS n,
         json_agg(p ORDER BY ${q(pk)})::text AS rows,
         max(${q(pk)})::text AS last
    FROM (SELECT ${boxed(cols)} FROM ${q(name)} ${where} ORDER BY ${q(pk)} LIMIT $1) p`;

/** Keyset-paged copy of one table. Returns the number of source rows sent. */
export async function copyTable(src, tgt, { name, pk }, cols, { batch = 200, onPage } = {}) {
  let cursor = null;
  let sent = 0;
  for (;;) {
    const [{ n, rows, last }] = cursor === null
      ? await src.read(pageSql(name, pk, cols, ''), [batch])
      : await src.read(pageSql(name, pk, cols, `WHERE ${q(pk)} > $2`), [batch, cursor]);
    if (n === 0) return sent;

    await tgt.write(`
      INSERT INTO ${q(name)} (${list(cols)})
      SELECT ${unboxed(cols)} FROM json_populate_recordset(NULL::${q(name)}, $1::json)
      ON CONFLICT (${q(pk)}) DO NOTHING`, [rows]);

    sent += n;
    cursor = last;
    onPage?.(sent);
    if (n < batch) return sent;
  }
}

/**
 * Row count plus an md5 over every row in primary-key order. `COLLATE "C"`
 * makes the order byte-wise, so databases with different default collations
 * still walk their rows in the same sequence.
 */
export async function fingerprint(db, { name, pk, textPk }, cols) {
  const order = textPk ? `${q(pk)} COLLATE "C"` : q(pk);
  const [r] = await db.read(`
    SELECT count(*)::int AS n,
           coalesce(md5(string_agg(md5(row(${list(cols)})::text), '' ORDER BY ${order})), '') AS md5
      FROM ${q(name)}`);
  return r;
}

/** Next id handed out is one past the highest copied id. */
export async function resetSequence(tgt, { name, pk }) {
  await tgt.write(`
    SELECT setval(pg_get_serial_sequence($1, $2),
                  coalesce((SELECT max(${q(pk)}) FROM ${q(name)}), 0) + 1,
                  false)`, [name, pk]);
}

/* ------------------------------------------------------------------- main */

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

function warn(message) {
  console.warn(`! ${message}`);
}

/** Host and database name only. The password never reaches the terminal. */
function endpoint(label, url) {
  if (!url) fail(`${label} is empty. Put the connection string in .env.migrate.`);
  let u;
  try { u = new URL(url); } catch { fail(`${label} is not a valid postgresql:// URL.`); }
  if (u.hostname.includes('-pooler')) {
    fail(`${label} is a pooled endpoint (${u.hostname}). Use the direct one: ` +
         'Neon console → Connect → turn Connection pooling off.');
  }
  return `${u.hostname}${u.pathname}`;
}

function neonDb(url) {
  const sql = neon(url);
  return {
    sql,
    // UTC pins how timestamptz renders as text, which the md5 in `fingerprint`
    // depends on. READ ONLY is what keeps this script honest about the source.
    read: async (text, params = []) => {
      const [, rows] = await sql.transaction(
        [sql.query(`SET LOCAL TimeZone = 'UTC'`), sql.query(text, params)],
        { readOnly: true },
      );
      return rows;
    },
    write: (text, params = []) => sql.query(text, params),
  };
}

async function verify(src, tgt) {
  console.log('\nverifying: row count + md5 of every row');
  let ok = true;
  for (const t of TABLES) {
    const cols = await columns(src, t.name);
    const [s, d] = await Promise.all([fingerprint(src, t, cols), fingerprint(tgt, t, cols)]);
    const same = s.n === d.n && s.md5 === d.md5;
    ok &&= same;
    const note = !same && s.n === d.n ? '  same count, different content' : '';
    console.log(`  ${same ? '✓' : '✗'} ${t.name.padEnd(14)} source ${s.n}  target ${d.n}${note}`);
  }
  if (!ok) {
    process.exitCode = 1;
    console.error('\n✗ Source and target differ. If the app was still writing, stop it and run\n' +
                  '  --confirm --resume, then --verify again.');
  }
  return ok;
}

async function main() {
  const args = process.argv.slice(2);
  const CONFIRM = args.includes('--confirm');
  const RESUME = args.includes('--resume');
  const VERIFY = args.includes('--verify');
  const batch = Number(args.find(a => a.startsWith('--batch='))?.slice('--batch='.length) ?? 200);
  if (!Number.isInteger(batch) || batch < 1) fail('--batch must be a positive integer.');

  const srcAt = endpoint('SOURCE_DIRECT_URL', process.env.SOURCE_DIRECT_URL);
  const tgtAt = endpoint('TARGET_DIRECT_URL', process.env.TARGET_DIRECT_URL);
  if (srcAt === tgtAt) fail('SOURCE_DIRECT_URL and TARGET_DIRECT_URL are the same database.');

  const src = neonDb(process.env.SOURCE_DIRECT_URL);
  const tgt = neonDb(process.env.TARGET_DIRECT_URL);

  const version = async db => (await db.read(`SELECT current_setting('server_version') AS v`))[0].v;
  const [srcVersion, tgtVersion] = await Promise.all([version(src), version(tgt)]);
  console.log(`source  ${srcAt}  Postgres ${srcVersion}`);
  console.log(`target  ${tgtAt}  Postgres ${tgtVersion}`);
  if (parseInt(tgtVersion, 10) < parseInt(srcVersion, 10)) {
    warn('Target runs an older Postgres major than the source. This schema needs nothing newer than 13, so it will work, but match them if you can.');
  }

  if (VERIFY) return verify(src, tgt);

  /* ---- preflight */

  const known = new Set(TABLES.map(t => t.name));
  const srcTables = await tableNames(src);
  const missing = TABLES.map(t => t.name).filter(t => !srcTables.includes(t));
  if (missing.length) fail(`Source has no ${missing.join(', ')}. Is SOURCE_DIRECT_URL the right database?`);
  const extra = srcTables.filter(t => !known.has(t));
  if (extra.length) warn(`Source also has ${extra.join(', ')}. This script does not copy those.`);

  const local = readMigrationFiles({ migrationsFolder: MIGRATIONS });
  const applied = await appliedMigrations(src);
  if (!applied) {
    warn('Source has no drizzle migration history. The column check still guards the copy.');
  } else if (applied.length !== local.length) {
    fail(`Source has ${applied.length} migration(s) applied but drizzle/ has ${local.length}. ` +
         'Copying into a schema of a different shape would fail part-way.');
  } else if (applied.some((m, i) => m.hash !== local[i].hash)) {
    warn('Source migration hashes differ from drizzle/ (a file was edited after it ran). The column check still guards the copy.');
  }

  console.log('\nsource rows');
  const srcCounts = {};
  for (const t of TABLES) {
    srcCounts[t.name] = await rowCount(src, t.name);
    console.log(`  ${t.name.padEnd(14)} ${srcCounts[t.name]}`);
  }

  const tgtTables = await tableNames(tgt);
  const foreign = tgtTables.filter(t => !known.has(t));
  if (foreign.length) warn(`Target already has other tables: ${foreign.join(', ')}. They are left alone.`);
  const occupied = [];
  for (const t of TABLES) {
    if (!tgtTables.includes(t.name)) continue;
    const n = await rowCount(tgt, t.name);
    if (n) occupied.push(`${t.name} (${n})`);
  }
  if (occupied.length && !RESUME) {
    fail(`Target already holds data: ${occupied.join(', ')}. Use an empty database, ` +
         'or pass --resume to finish an interrupted copy.');
  }

  if (!CONFIRM) {
    console.log('\nDry run: nothing was written. Stop writes to the app, then re-run with --confirm.');
    return;
  }

  /* ---- schema */

  console.log('\napplying drizzle/ to target');
  await migrate(drizzle({ client: tgt.sql }), { migrationsFolder: MIGRATIONS });

  const cols = {};
  for (const t of TABLES) {
    const [s, d] = await Promise.all([columns(src, t.name), columns(tgt, t.name)]);
    const shape = cs => cs.map(c => `${c.name}:${c.type}`).sort().join(', ');
    if (shape(s) !== shape(d)) {
      fail(`Column mismatch on ${t.name}.\n  source: ${shape(s)}\n  target: ${shape(d)}`);
    }
    cols[t.name] = s;
  }

  /* ---- data */

  console.log('\ncopying');
  for (const t of TABLES) {
    const label = `  ${t.name.padEnd(14)}`;
    const sent = await copyTable(src, tgt, t, cols[t.name], {
      batch,
      onPage: n => process.stdout.write(`\r${label} ${n}/${srcCounts[t.name]}`),
    });
    process.stdout.write(`\r${label} ${sent} rows${' '.repeat(12)}\n`);
  }
  for (const t of TABLES.filter(t => !t.textPk)) await resetSequence(tgt, t);

  if (await verify(src, tgt)) {
    console.log('\n✓ Copied and verified. Next: point DATABASE_URL and DIRECT_URL at the new account.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    // The message and Postgres detail only; a raw driver error object can carry
    // request internals that have no business in a terminal scrollback.
    console.error(`\n✗ ${err?.message ?? err}${err?.detail ? `\n  ${err.detail}` : ''}\n`);
    process.exit(1);
  });
}
