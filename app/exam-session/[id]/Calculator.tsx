'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { X, GripHorizontal, Delete } from 'lucide-react';
import { evaluate, evaluateAt, formatResult, CalcError, type AngleMode } from '@/lib/domain/calculator';
import { MONO_SECTION } from '@/components/ui/type-styles';

/**
 * The on-screen calculator for Math modules.
 *
 * Built in-house rather than embedding Desmos: a third-party script would need
 * its host added to a CSP that currently allows only 'self' plus Clerk, on a
 * site handling auth and payments, and its terms distinguish commercial use.
 * All the arithmetic goes through `lib/domain/calculator.ts`, which is a real
 * parser — never `eval()`.
 *
 * Draggable, because a fixed panel covers the question it is being used on.
 */

interface Props { onClose: () => void }

const KEYS: Array<Array<{ label: string; insert?: string; action?: 'clear' | 'back' | 'equals' }>> = [
  [{ label: 'AC', action: 'clear' }, { label: '(', insert: '(' }, { label: ')', insert: ')' }, { label: '÷', insert: '/' }],
  [{ label: '7', insert: '7' }, { label: '8', insert: '8' }, { label: '9', insert: '9' }, { label: '×', insert: '*' }],
  [{ label: '4', insert: '4' }, { label: '5', insert: '5' }, { label: '6', insert: '6' }, { label: '−', insert: '-' }],
  [{ label: '1', insert: '1' }, { label: '2', insert: '2' }, { label: '3', insert: '3' }, { label: '+', insert: '+' }],
  [{ label: '0', insert: '0' }, { label: '.', insert: '.' }, { label: '=', action: 'equals' }, { label: '^', insert: '^' }],
];

const FUNCTION_KEYS = [
  { label: '√', insert: 'sqrt(' }, { label: 'x²', insert: '^2' }, { label: 'sin', insert: 'sin(' },
  { label: 'cos', insert: 'cos(' }, { label: 'tan', insert: 'tan(' }, { label: 'ln', insert: 'ln(' },
  { label: 'log', insert: 'log(' }, { label: 'π', insert: 'pi' }, { label: 'e', insert: 'e' },
  { label: 'mod', insert: '%' },
];

/** Sample count across the plot width — dense enough that a parabola reads smooth. */
const SAMPLES = 240;

export default function Calculator({ onClose }: Props) {
  const [tab, setTab] = useState<'calc' | 'graph'>('calc');
  const [angleMode, setAngleMode] = useState<AngleMode>('deg');
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const [fn, setFn] = useState('x^2');
  const [span, setSpan] = useState(10);

  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: pos.x, baseY: pos.y };
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setPos({ x: d.baseX + (e.clientX - d.startX), y: d.baseY + (e.clientY - d.startY) });
  };
  const onPointerUp = () => { dragRef.current = null; };

  const compute = useCallback(() => {
    if (!expr.trim()) return;
    try {
      setResult(formatResult(evaluate(expr, { angleMode })));
      setError('');
    } catch (err) {
      setResult('');
      setError(err instanceof CalcError ? err.message : 'Hesablanmadı.');
    }
  }, [expr, angleMode]);

  function press(key: { insert?: string; action?: 'clear' | 'back' | 'equals' }) {
    if (key.action === 'clear') { setExpr(''); setResult(''); setError(''); return; }
    if (key.action === 'back')  { setExpr(s => s.slice(0, -1)); return; }
    if (key.action === 'equals') { compute(); return; }
    if (key.insert) { setExpr(s => s + key.insert); setError(''); }
  }

  /*
   * Plot geometry. Samples are taken in a viewBox of 100×100 user units and the
   * SVG scales itself, so the curve stays crisp at any panel size. `null`
   * samples break the path into separate subpaths rather than drawing a false
   * vertical line across an asymptote — which is what makes tan(x) and 1/x look
   * right instead of looking like they have near-vertical segments.
   */
  const paths = useMemo(() => {
    const out: string[] = [];
    let current: string[] = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const x = -span + (2 * span * i) / SAMPLES;
      const y = evaluateAt(fn, x, angleMode);
      if (y === null || Math.abs(y) > span * 4) {
        if (current.length > 1) out.push(current.join(' '));
        current = [];
        continue;
      }
      const px = ((x + span) / (2 * span)) * 100;
      const py = 50 - (y / span) * 50;
      current.push(`${current.length === 0 ? 'M' : 'L'}${px.toFixed(3)},${py.toFixed(3)}`);
    }
    if (current.length > 1) out.push(current.join(' '));
    return out;
  }, [fn, span, angleMode]);

  const gridLines = useMemo(
    () => Array.from({ length: 9 }, (_, i) => ((i + 1) * 100) / 10),
    [],
  );

  return (
    <div
      className="fixed bottom-20 right-4 z-95 w-[300px] rounded-card border border-rule bg-surface shadow-lg"
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
      role="dialog"
      aria-label="Kalkulyator"
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="flex cursor-grab touch-none items-center justify-between gap-2 border-b border-rule px-3 py-2 active:cursor-grabbing"
      >
        <GripHorizontal size={14} className="shrink-0 text-ink-mute" aria-hidden="true" />
        <div className="flex flex-1 gap-1">
          {(['calc', 'graph'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                tab === t ? 'bg-ink text-bg' : 'text-ink-soft hover:bg-surface-2'
              }`}
            >
              {t === 'calc' ? 'Hesab' : 'Qrafik'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setAngleMode(m => (m === 'deg' ? 'rad' : 'deg'))}
          className="rounded-lg border border-rule px-2 py-1 font-mono text-xs text-ink-soft"
          aria-label={`Bucaq vahidi: ${angleMode}`}
        >
          {angleMode.toUpperCase()}
        </button>
        <button onClick={onClose} aria-label="Kalkulyatoru bağla" className="rounded-lg p-1 text-ink-soft hover:bg-surface-2">
          <X size={15} />
        </button>
      </div>

      {tab === 'calc' ? (
        <div className="p-3">
          <div className="mb-2 rounded-xl border border-rule bg-surface-2 px-3 py-2">
            <input
              value={expr}
              onChange={e => { setExpr(e.target.value); setError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); compute(); } }}
              placeholder="0"
              aria-label="İfadə"
              inputMode="text"
              className="w-full bg-transparent text-right font-mono text-base text-ink outline-none placeholder:text-ink-mute"
            />
            <div className="mt-1 min-h-[20px] text-right font-mono text-sm">
              {error
                ? <span className="text-error">{error}</span>
                : <span className="text-ink-mute">{result}</span>}
            </div>
          </div>

          <div className="mb-2 grid grid-cols-5 gap-1">
            {FUNCTION_KEYS.map(k => (
              <button
                key={k.label}
                onClick={() => press(k)}
                className="rounded-lg border border-rule bg-surface-2 py-1.5 font-mono text-xs text-ink-soft transition-colors hover:bg-surface-3"
              >
                {k.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-1">
            {KEYS.flat().map((k, i) => (
              <button
                key={i}
                onClick={() => press(k)}
                className={`rounded-lg py-2 font-mono text-sm transition-colors ${
                  k.action === 'equals'
                    ? 'bg-ink text-bg'
                    : k.action === 'clear'
                    ? 'border border-rule bg-surface-2 text-error'
                    : 'border border-rule bg-surface-2 text-ink hover:bg-surface-3'
                }`}
              >
                {k.label}
              </button>
            ))}
            <button
              onClick={() => press({ action: 'back' })}
              aria-label="Bir simvol sil"
              className="col-span-4 flex items-center justify-center gap-1.5 rounded-lg border border-rule bg-surface-2 py-1.5 text-xs text-ink-soft transition-colors hover:bg-surface-3"
            >
              <Delete size={13} /> Sil
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3">
          <label className="mb-2 flex items-center gap-2 rounded-xl border border-rule bg-surface-2 px-3 py-2">
            <span className="font-mono text-sm text-ink-mute">y =</span>
            <input
              value={fn}
              onChange={e => setFn(e.target.value)}
              placeholder="x^2"
              aria-label="Funksiya"
              className="w-full bg-transparent font-mono text-sm text-ink outline-none placeholder:text-ink-mute"
            />
          </label>

          <svg
            viewBox="0 0 100 100"
            className="mb-2 w-full rounded-xl border border-rule bg-surface-2"
            role="img"
            aria-label={`y = ${fn} qrafiki`}
          >
            {gridLines.map(v => (
              <g key={v} className="text-rule">
                <line x1={v} y1="0" x2={v} y2="100" stroke="currentColor" strokeWidth="0.2" />
                <line x1="0" y1={v} x2="100" y2={v} stroke="currentColor" strokeWidth="0.2" />
              </g>
            ))}
            <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="0.5" className="text-ink-mute" />
            <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeWidth="0.5" className="text-ink-mute" />
            {paths.map((d, i) => (
              <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth="0.7" className="text-accent" />
            ))}
          </svg>

          <div className="flex items-center justify-between gap-2">
            <span className={`${MONO_SECTION} text-ink-mute`}>Aralıq ±{span}</span>
            <input
              type="range"
              min={1}
              max={50}
              value={span}
              onChange={e => setSpan(Number(e.target.value))}
              aria-label="Qrafik aralığı"
              className="h-1 flex-1 accent-ink"
            />
          </div>
          {paths.length === 0 && (
            <p className="mt-2 text-center text-xs text-ink-mute">Bu aralıqda qrafik çəkilmədi.</p>
          )}
        </div>
      )}
    </div>
  );
}
