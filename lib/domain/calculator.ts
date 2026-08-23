/**
 * A safe arithmetic expression evaluator.
 *
 * The exam player needs a calculator on Math modules — every Digital SAT
 * candidate has one on screen for the whole section, so a mock that withholds
 * it tests arithmetic the real exam does not. The obvious shortcut, `eval()` or
 * `new Function()`, is a script-injection sink sitting inside a paid exam page
 * behind a strict CSP; it is not on the table. So this is a hand-written
 * tokeniser and recursive-descent parser over a closed grammar: numbers,
 * the five operators, parentheses, a fixed function table and two constants.
 * Nothing it can be handed reaches the host environment.
 *
 * It also evaluates in terms of a variable `x`, which is what lets the same
 * parser drive function plotting without a second implementation.
 *
 * Pure: no DOM, no I/O, unit-testable.
 */

export type AngleMode = 'deg' | 'rad';

export interface EvalOptions {
  /** Trig input/output unit. Degrees is the SAT/DİM default. */
  angleMode?: AngleMode;
  /** Value bound to `x`; leave undefined for a plain calculation. */
  x?: number;
}

/** Thrown for anything malformed; the UI shows the message, never a stack. */
export class CalcError extends Error {}

// ── Tokeniser ───────────────────────────────────────────────────────────────

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'ident'; value: string }
  | { kind: 'op'; value: string }
  | { kind: 'lparen' }
  | { kind: 'rparen' }
  | { kind: 'comma' };

const OPERATORS = new Set(['+', '-', '*', '/', '^', '%']);

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  // Unicode operators are what a candidate actually pastes or types on a phone
  // keyboard; normalising here keeps the grammar below to ASCII.
  const src = input
    .replace(/[−–—]/g, '-')   // minus sign, en/em dash
    .replace(/[×⋅∙]/g, '*')   // ×, ⋅, ∙
    .replace(/[÷]/g, '/')               // ÷
    .replace(/[π]/g, 'pi')              // π
    .replace(/[√]/g, 'sqrt')            // √
    .replace(/,(?=\d{3}\b)/g, '');           // thousands separators: 1,234 -> 1234

  while (i < src.length) {
    const ch = src[i];

    if (ch === ' ' || ch === '\t') { i++; continue; }

    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      const raw = src.slice(i, j);
      if ((raw.match(/\./g) ?? []).length > 1) throw new CalcError(`Yanlış ədəd: ${raw}`);
      const value = Number(raw);
      if (!Number.isFinite(value)) throw new CalcError(`Yanlış ədəd: ${raw}`);
      tokens.push({ kind: 'num', value });
      i = j;
      continue;
    }

    if (/[a-zA-Z]/.test(ch)) {
      let j = i;
      while (j < src.length && /[a-zA-Z0-9]/.test(src[j])) j++;
      tokens.push({ kind: 'ident', value: src.slice(i, j).toLowerCase() });
      i = j;
      continue;
    }

    if (OPERATORS.has(ch)) { tokens.push({ kind: 'op', value: ch }); i++; continue; }
    if (ch === '(') { tokens.push({ kind: 'lparen' }); i++; continue; }
    if (ch === ')') { tokens.push({ kind: 'rparen' }); i++; continue; }
    if (ch === ',') { tokens.push({ kind: 'comma' }); i++; continue; }

    throw new CalcError(`Naməlum simvol: ${ch}`);
  }

  return tokens;
}

// ── Functions and constants ─────────────────────────────────────────────────

const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };

type Fn = { arity: number; apply: (args: number[], mode: AngleMode) => number };

const toRad = (v: number, mode: AngleMode) => (mode === 'deg' ? (v * Math.PI) / 180 : v);
const fromRad = (v: number, mode: AngleMode) => (mode === 'deg' ? (v * 180) / Math.PI : v);

const FUNCTIONS: Record<string, Fn> = {
  sin:   { arity: 1, apply: ([a], m) => Math.sin(toRad(a, m)) },
  cos:   { arity: 1, apply: ([a], m) => Math.cos(toRad(a, m)) },
  tan:   { arity: 1, apply: ([a], m) => Math.tan(toRad(a, m)) },
  asin:  { arity: 1, apply: ([a], m) => fromRad(Math.asin(a), m) },
  acos:  { arity: 1, apply: ([a], m) => fromRad(Math.acos(a), m) },
  atan:  { arity: 1, apply: ([a], m) => fromRad(Math.atan(a), m) },
  sqrt:  { arity: 1, apply: ([a]) => Math.sqrt(a) },
  cbrt:  { arity: 1, apply: ([a]) => Math.cbrt(a) },
  abs:   { arity: 1, apply: ([a]) => Math.abs(a) },
  ln:    { arity: 1, apply: ([a]) => Math.log(a) },
  log:   { arity: 1, apply: ([a]) => Math.log10(a) },
  exp:   { arity: 1, apply: ([a]) => Math.exp(a) },
  round: { arity: 1, apply: ([a]) => Math.round(a) },
  floor: { arity: 1, apply: ([a]) => Math.floor(a) },
  ceil:  { arity: 1, apply: ([a]) => Math.ceil(a) },
  min:   { arity: 2, apply: ([a, b]) => Math.min(a, b) },
  max:   { arity: 2, apply: ([a, b]) => Math.max(a, b) },
};

export const FUNCTION_NAMES = Object.keys(FUNCTIONS);

// ── Parser ──────────────────────────────────────────────────────────────────
//
//   expr    := term (('+' | '-') term)*
//   term    := unary (('*' | '/' | '%') unary)* | implicit multiplication
//   unary   := ('-' | '+') unary | power
//   power   := atom ('^' unary)?          — right-associative: 2^3^2 = 512
//   atom    := number | constant | 'x' | func '(' args ')' | '(' expr ')'

class Parser {
  private pos = 0;
  constructor(private tokens: Token[], private opts: Required<Pick<EvalOptions, 'angleMode'>> & { x?: number }) {}

  private peek(): Token | undefined { return this.tokens[this.pos]; }
  private next(): Token | undefined { return this.tokens[this.pos++]; }

  parse(): number {
    const value = this.expr();
    if (this.pos < this.tokens.length) throw new CalcError('İfadə düzgün bitmir.');
    return value;
  }

  private expr(): number {
    let left = this.term();
    for (;;) {
      const t = this.peek();
      if (t?.kind === 'op' && (t.value === '+' || t.value === '-')) {
        this.next();
        const right = this.term();
        left = t.value === '+' ? left + right : left - right;
      } else return left;
    }
  }

  private term(): number {
    let left = this.unary();
    for (;;) {
      const t = this.peek();
      if (t?.kind === 'op' && (t.value === '*' || t.value === '/' || t.value === '%')) {
        this.next();
        const right = this.unary();
        if ((t.value === '/' || t.value === '%') && right === 0) throw new CalcError('Sıfıra bölmək olmaz.');
        left = t.value === '*' ? left * right : t.value === '/' ? left / right : left % right;
        continue;
      }
      /*
       * Implicit multiplication: 2(3+4), 3x, 2sin(30).
       * Candidates write algebra, not calculator syntax, and rejecting `3x`
       * would make the graphing input useless. Only an atom-starting token can
       * follow, so this cannot swallow an operator.
       */
      if (t && (t.kind === 'num' || t.kind === 'ident' || t.kind === 'lparen')) {
        left *= this.unary();
        continue;
      }
      return left;
    }
  }

  private unary(): number {
    const t = this.peek();
    if (t?.kind === 'op' && (t.value === '-' || t.value === '+')) {
      this.next();
      const v = this.unary();
      return t.value === '-' ? -v : v;
    }
    return this.power();
  }

  private power(): number {
    const base = this.atom();
    const t = this.peek();
    if (t?.kind === 'op' && t.value === '^') {
      this.next();
      // Right-associative, and the exponent may itself be signed: 2^-1.
      const exponent = this.unary();
      const result = Math.pow(base, exponent);
      if (Number.isNaN(result) && !Number.isNaN(base) && !Number.isNaN(exponent)) {
        throw new CalcError('Bu dərəcə hesablana bilmir.');
      }
      return result;
    }
    return base;
  }

  private atom(): number {
    const t = this.next();
    if (!t) throw new CalcError('İfadə yarımçıqdır.');

    if (t.kind === 'num') return t.value;

    if (t.kind === 'lparen') {
      const v = this.expr();
      if (this.next()?.kind !== 'rparen') throw new CalcError('Bağlanmayan mötərizə.');
      return v;
    }

    if (t.kind === 'ident') {
      if (t.value === 'x') {
        if (this.opts.x === undefined) throw new CalcError('x təyin olunmayıb.');
        return this.opts.x;
      }
      if (t.value in CONSTANTS) return CONSTANTS[t.value];

      const fn = FUNCTIONS[t.value];
      if (!fn) throw new CalcError(`Naməlum funksiya: ${t.value}`);
      if (this.next()?.kind !== 'lparen') throw new CalcError(`${t.value} üçün mötərizə lazımdır.`);

      const args: number[] = [this.expr()];
      while (this.peek()?.kind === 'comma') { this.next(); args.push(this.expr()); }
      if (this.next()?.kind !== 'rparen') throw new CalcError('Bağlanmayan mötərizə.');
      if (args.length !== fn.arity) {
        throw new CalcError(`${t.value} ${fn.arity} arqument gözləyir.`);
      }
      return fn.apply(args, this.opts.angleMode);
    }

    if (t.kind === 'op') throw new CalcError(`Gözlənilməz operator: ${t.value}`);
    throw new CalcError('İfadə düzgün deyil.');
  }
}

/**
 * Evaluate an expression. Throws `CalcError` with a message fit to show a
 * candidate; never throws anything else for malformed input.
 */
export function evaluate(input: string, options: EvalOptions = {}): number {
  const trimmed = input.trim();
  if (!trimmed) throw new CalcError('Boş ifadə.');

  const result = new Parser(tokenize(trimmed), {
    angleMode: options.angleMode ?? 'deg',
    x: options.x,
  }).parse();

  if (!Number.isFinite(result)) {
    throw new CalcError(Number.isNaN(result) ? 'Nəticə ədəd deyil.' : 'Nəticə sonsuzdur.');
  }
  return result;
}

/**
 * Evaluate for plotting: returns null instead of throwing where the function is
 * simply undefined, so a curve can have gaps (tan, sqrt of a negative, 1/x at
 * zero) without the whole plot failing.
 */
export function evaluateAt(expression: string, x: number, angleMode: AngleMode = 'rad'): number | null {
  try {
    const y = evaluate(expression, { x, angleMode });
    return Number.isFinite(y) ? y : null;
  } catch {
    return null;
  }
}

/** Trim floating-point noise for display: 0.1+0.2 shows as 0.3, not 0.30000000000000004. */
export function formatResult(value: number): string {
  if (Number.isInteger(value) && Math.abs(value) < 1e15) return String(value);
  const rounded = Number(value.toPrecision(12));
  if (Math.abs(rounded) >= 1e12 || (Math.abs(rounded) < 1e-6 && rounded !== 0)) {
    return rounded.toExponential(6).replace(/\.?0+e/, 'e');
  }
  return String(rounded);
}
