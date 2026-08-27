'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Play, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import posthog from 'posthog-js';
import Button from '@/components/ui/Button';
import { checkAudioPlayed, markAudioPlayed } from '@/lib/actions/audio';

/**
 * Listening audio that may be played exactly once.
 *
 * Real listening sections do not let a candidate replay a track, so the
 * "already played" flag is owned by the server (lib/actions/audio.ts) rather
 * than by this component — a reload, a second tab, or devtools cannot hand
 * anyone a second listen.
 */
/**
 * `secondsLeftInModule` is the section clock, not the track's.
 *
 * The module's window opens on the schedule whether or not the candidate has
 * pressed play, and browsers will not let us start audio without a gesture — so
 * a candidate who arrives at the section late can be left with less time than
 * the recording runs for. Nothing can start it for them; the honest thing is to
 * say so before they commit to a track they cannot finish.
 */
export default function StrictAudioPlayer(
  { src, examId, secondsLeftInModule }: { src: string; examId: string; secondsLeftInModule?: number | null },
) {
  const [status, setStatus] = useState<'checking' | 'ready' | 'playing' | 'finished'>('checking');
  const [currentTime, setCurrentTime] = useState(0);
  /** True while the one-and-only claim is in flight; disables the button. */
  const [claiming, setClaiming] = useState(false);
  /** Synchronous guard — see `handlePlay`. Never reset once a claim is made. */
  const claimStartedRef = useRef(false);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // On mount: check (read-only) whether this audio has already been played.
  // `cancelled` covers the student navigating out of the module before the
  // check resolves; the catch covers a transport failure, which must leave the
  // player usable rather than stuck on "Yüklənir…" for the rest of the exam.
  useEffect(() => {
    let cancelled = false;
    checkAudioPlayed(examId, src)
      .then(result => {
        if (cancelled) return;
        if ('error' in result) {
          setStatus('ready'); // fail open so the exam is not blocked
          return;
        }
        setStatus(result.alreadyPlayed ? 'finished' : 'ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('ready');
      });
    return () => { cancelled = true; };
  }, [src, examId]);

  const handlePlay = async () => {
    /*
     * The latch is a REF, and it is set before anything is awaited.
     *
     * `status` is React state, and `setStatus('playing')` cannot run until
     * `await play()` has resolved — so two clicks a few milliseconds apart both
     * read `status === 'ready'` and both proceeded. The first created the claim;
     * the second hit the unique index, was told `alreadyPlayed`, and took the
     * "another tab has this" branch — pausing the audio and marking it finished
     * with the claim already spent. A double-tap one second into an IELTS
     * Listening part destroyed the recording permanently.
     *
     * A ref updates synchronously, so the second invocation returns before it
     * can reach `play()`. `claiming` additionally disables the button, so the
     * common case never gets that far.
     */
    if (claimStartedRef.current) return;
    if (status !== 'ready' || !audioRef.current) return;
    claimStartedRef.current = true;
    setClaiming(true);

    // Must call play() synchronously inside the click handler — browsers block it
    // if called after an await (loses the user-gesture context).
    try {
      await audioRef.current.play();
    } catch (err) {
      // Playback never started, so nothing was consumed: release the latch and
      // let them try again rather than burning the track on a blocked autoplay.
      claimStartedRef.current = false;
      setClaiming(false);
      const { name, message } = err instanceof Error
        ? { name: err.name, message: err.message }
        : { name: undefined, message: String(err) };
      posthog.captureException(err, { context: 'audioPlay', error_name: name, error_message: message });
      toast.error(`Audionu başlatmaq mümkün olmadı: ${message}. Zəhmət olmasa təkrar sınayın.`);
      return;
    }
    setStatus('playing');

    // Mark as played server-side after playback has started. A failure here is
    // deliberately silent: the audio is already running and stopping it over a
    // bookkeeping error would cost the student the recording.
    const result = await markAudioPlayed(examId, src).catch(() => ({ error: 'network' as const }));
    setClaiming(false);
    if ('error' in result) return; // fail open — audio is already playing
    if (result.alreadyPlayed) {
      /*
       * With the latch in place this component claims at most once, so this can
       * only mean the track was genuinely consumed elsewhere — another tab, or
       * another device. Stopping it is right.
       */
      audioRef.current?.pause();
      setStatus('finished');
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const handleEnded = () => {
    setStatus('finished');
    setCurrentTime(duration);
  };

  const remaining = Math.max(0, duration - currentTime);
  const progress  = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Only meaningful once the metadata has given us a real duration.
  const wontFit = status === 'ready'
    && duration > 0
    && typeof secondsLeftInModule === 'number'
    && secondsLeftInModule > 0
    && secondsLeftInModule < duration;

  function fmtTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  return (
    <div className="w-full space-y-2">
      <audio
        ref={audioRef}
        src={src}
        crossOrigin="anonymous"
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        className="hidden"
      />

      {/* Checking state */}
      {status === 'checking' && (
        <div className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm border border-rule bg-surface-2 text-ink-soft">
          <span className="w-4 h-4 border-2 border-t-ink rounded-full animate-spin border-rule border-t-ink"  />
          Yüklənir...
        </div>
      )}

      {/* Ready state */}
      {status === 'ready' && (
        <>
          <Button size="none" className="w-full justify-center gap-2.5 rounded-xl px-5.5 py-3 text-sm disabled:opacity-60"
            onClick={handlePlay}
            disabled={claiming}
          >
            <Play size={18} /> {claiming ? 'Başladılır…' : 'Səsi Başlat (Yalnız 1 dəfə)'}
          </Button>
          <p className="text-sm text-center px-2 leading-tight font-medium text-warn">
            ⚠️ Diqqət: Audio yalnız 1 dəfə dinlənilə bilər. Başlatdıqdan sonra dayandırmaq olmaz.
          </p>
          {wontFit && (
            <p className="text-sm text-center px-2 leading-tight font-medium text-error">
              Bu bölmədə qalan vaxt ({fmtTime(secondsLeftInModule)}) audionun uzunluğundan
              ({fmtTime(duration)}) azdır — audio sona çatmaya bilər.
            </p>
          )}
        </>
      )}

      {/* Playing state */}
      {status === 'playing' && (
        <div className="w-full rounded-2xl px-4 py-3 space-y-2.5 border border-rule bg-surface-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-ink">
              <Volume2 size={16} className="animate-pulse shrink-0" />
              <span>Səs oxunur...</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono tabular-nums text-base">{fmtTime(remaining)}</span>
              <span className="font-sans text-xs leading-normal font-medium tracking-[0.08em] uppercase text-ink-mute">qaldı</span>
            </div>
          </div>
          <div className="relative h-1 w-full overflow-hidden rounded-full bg-rule-soft">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-ink transition-[width] duration-300 ease-linear"
              // A computed percentage cannot be a utility class; the colour can.
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between font-mono tabular-nums text-xs text-ink-mute">
            <span>{fmtTime(currentTime)}</span>
            <span>{fmtTime(duration)}</span>
          </div>
        </div>
      )}

      {/* Finished state */}
      {status === 'finished' && (
        <div className="w-full rounded-2xl px-4 py-3 space-y-2 border border-rule bg-surface-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 size={16} className="shrink-0 text-ok"  />
              <span>Audio bitdi</span>
            </div>
            {duration > 0 && <span className="font-mono text-sm">{fmtTime(duration)}</span>}
          </div>
          <div className="relative h-1 w-full overflow-hidden rounded-full bg-rule-soft">
            <div className="absolute inset-0 rounded-full bg-ok/30"  />
          </div>
        </div>
      )}
    </div>
  );
}
