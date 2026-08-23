import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * A listening track this candidate has already consumed.
 *
 * This used to live as `playedAudioUrls` on the ExamSession — which meant
 * `restartExamSession`, whose whole job is deleting that document, handed the
 * listen back. The restart button sits on the ResumeScreen, and the
 * ResumeScreen is one reload away at any point in a running attempt, so the
 * single-play rule could be defeated in about four seconds:
 *
 *     play the track → reload → "start over" → fresh clock, fresh listen
 *
 * On IELTS that costs almost nothing, because Listening is the FIRST module —
 * two minutes of answers thrown away in exchange for having already heard the
 * recording. `StrictAudioPlayer` and the atomic claim in `markAudioPlayed` were
 * both correct in isolation; the record they relied on was simply too easy to
 * delete.
 *
 * Keeping it in its own collection outlives the session, so a restart no longer
 * refunds the track. What DOES refund it is submitting: `saveExamResult` clears
 * the claim as it files the result. That is the right boundary, because a
 * restart is free — it leaves no record — whereas submitting costs the
 * candidate a filed attempt. One listen per attempt, with unlimited attempts
 * intact.
 */
export interface IPlayedAudio extends Document {
  userId: string;
  examId: string;
  audioUrl: string;
  playedAt: Date;
}

/**
 * Backstop lifetime for a claim whose attempt was never filed.
 *
 * NOT the mechanism that decides when a track becomes available again — that is
 * the attempt itself: `saveExamResult` deletes the claim when it files a
 * result, so a genuine retake starts with the recording fresh. This TTL only
 * sweeps up claims belonging to attempts that were abandoned and never
 * submitted.
 *
 * It was ten minutes, which was shorter than every listening module in the
 * catalog — IELTS Listening runs 30 minutes, General English 15, the TOEFL
 * template 36 — so the claim expired DURING the section it existed to protect.
 * Play at minute 0, reload at minute 11, and the Play button was back with the
 * clock still running and no restart needed. A window that has to outlive a
 * sitting cannot be shorter than a module.
 */
export const PLAYED_AUDIO_TTL_SECONDS = 24 * 60 * 60;

const PlayedAudioSchema = new Schema<IPlayedAudio>({
  userId:   { type: String, required: true },
  examId:   { type: String, required: true },
  audioUrl: { type: String, required: true },
  playedAt: { type: Date,   required: true, default: Date.now },
});

/*
 * The unique index IS the claim.
 *
 * `markAudioPlayed` inserts and treats a duplicate-key error as "already
 * played", so exactly one concurrent caller can ever win — the guarantee comes
 * from the index rather than from a read-then-write in application code, which
 * is what let two tabs both be granted the same track.
 */
PlayedAudioSchema.index({ userId: 1, examId: 1, audioUrl: 1 }, { unique: true });
PlayedAudioSchema.index({ playedAt: 1 }, { expireAfterSeconds: PLAYED_AUDIO_TTL_SECONDS });

const PlayedAudioModel: Model<IPlayedAudio> =
  (mongoose.models.PlayedAudio as Model<IPlayedAudio>) ||
  mongoose.model<IPlayedAudio>('PlayedAudio', PlayedAudioSchema);

export default PlayedAudioModel;
