import { describe, it, expect } from 'vitest';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import { playedAudio, questions } from '@/lib/db/schema';

/*
 * These assert the SQL TEXT that Drizzle emits for two statement SHAPES.
 *
 * READ THIS BEFORE TRUSTING THEM. The statements below are built here, inline.
 * Nothing in this file imports `markAudioPlayed` or `importExamFromJson`, so
 * these cannot observe the production code drifting away from them: deleting
 * `setWhere` from the real single-play claim leaves every assertion here green
 * while the rule silently becomes "always renew".
 *
 * That was verified, not assumed — removing `setWhere` from
 * `lib/actions/audio.ts` fails three tests in
 * `test/integration/audio-claim.test.ts` and none here.
 *
 * So what these are for is narrower than it looks: they are a canary for a
 * DRIZZLE UPGRADE quietly changing how a builder renders `ON CONFLICT ... DO
 * UPDATE ... WHERE` or `RETURNING`. The BEHAVIOUR each rule guarantees is
 * covered against a real Postgres in `test/integration/` —
 *   audio-claim.test.ts      — the single-play rule, through the server action
 *   import-reimport.test.ts  — id preservation, through the importer
 * and those are the tests to change if a rule changes.
 *
 * A builder needs a client to render SQL but not to connect, so this one is
 * pointed at a URL it never dials.
 */
const db = drizzle({ client: neon('postgresql://user:pass@localhost/db') });

describe('single-play audio claim', () => {
  const build = () =>
    db
      .insert(playedAudio)
      .values({ userId: 'u1', examId: 'e1', audioUrl: 'https://a/1.mp3', playedAt: new Date() })
      .onConflictDoUpdate({
        target: [playedAudio.userId, playedAudio.examId, playedAudio.audioUrl],
        set: { playedAt: new Date(), expiresAt: sql`now() + interval '24 hours'` },
        setWhere: sql`${playedAudio.expiresAt} <= now()`,
      })
      .returning({ id: playedAudio.id });

  it('arbitrates on the unique claim key so only one caller can win', () => {
    expect(build().toSQL().sql).toContain(
      'on conflict ("user_id","exam_id","audio_url") do update',
    );
  });

  it('renews ONLY an expired claim — without this the rule is defeatable', () => {
    // The guard that makes a live claim a no-op. If this clause disappears,
    // every re-claim succeeds and one listen per attempt becomes unlimited.
    expect(build().toSQL().sql).toMatch(/do update set.*where\s+"played_audio"\."expires_at" <= now\(\)/is);
  });

  it('reports the outcome by returning a row, not by throwing', () => {
    // `alreadyPlayed` is derived from an empty result set. Losing RETURNING
    // would make every claim read as a first play.
    expect(build().toSQL().sql).toContain('returning');
  });
});

describe('exam import upsert', () => {
  const build = () =>
    db
      .insert(questions)
      .values({ examId: 'e1', moduleIndex: 0, order: 0, type: 'mcq', stem: 'Q' })
      .onConflictDoUpdate({
        target: [questions.examId, questions.moduleIndex, questions.order],
        set: { stem: sql`excluded.stem` },
      });

  it('conflicts on the slot key, which is what preserves question ids', () => {
    /*
     * The fix for the orphaned-question-id bug. Re-importing an exam must
     * UPDATE the question occupying each slot rather than delete and reinsert,
     * because a new id orphans `exam_answers.question_id` on every result
     * already filed — it reached 1,064 of 1,310 answers on ielts-academic-1
     * before the migration.
     */
    expect(build().toSQL().sql).toContain(
      'on conflict ("exam_id","module_index","order") do update',
    );
  });

  it('never emits a delete', () => {
    expect(build().toSQL().sql).not.toContain('delete');
  });
});
