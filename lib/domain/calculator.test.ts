import { describe, expect, it } from 'vitest';
import { evaluate, evaluateAt, formatResult, CalcError } from './calculator';

const ev = (s: string, x?: number) => evaluate(s, { x, angleMode: 'deg' });
const rad = (s: string) => evaluate(s, { angleMode: 'rad' });

describe('arithmetic and precedence', () => {
  it('applies standard precedence', () => {
    expect(ev('2 + 3 * 4')).toBe(14);
    expect(ev('(2 + 3) * 4')).toBe(20);
    expect(ev('10 - 4 - 3')).toBe(3);          // left-associative
    expect(ev('100 / 5 / 2')).toBe(10);
  });

  it('makes ^ right-associative, as a calculator must', () => {
    expect(ev('2^3^2')).toBe(512);             // not 64
    expect(ev('2^-1')).toBe(0.5);              // signed exponent
    expect(ev('-2^2')).toBe(-4);               // unary binds looser than ^
  });

  it('handles unary and repeated signs', () => {
    expect(ev('-5')).toBe(-5);
    expect(ev('--5')).toBe(5);
    expect(ev('3 * -2')).toBe(-6);
  });

  /* Candidates write algebra, not calculator syntax. */
  it('supports implicit multiplication', () => {
    expect(ev('2(3+4)')).toBe(14);
    expect(ev('3x', 5)).toBe(15);
    expect(ev('(1+1)(2+2)')).toBe(8);
    expect(ev('2pi')).toBeCloseTo(2 * Math.PI, 10);
  });

  it('accepts the symbols people actually paste', () => {
    expect(ev('6 ÷ 2')).toBe(3);
    expect(ev('3 × 4')).toBe(12);
    expect(ev('10 − 4')).toBe(6);              // U+2212 minus
    expect(ev('√(16)')).toBe(4);
    expect(ev('1,234 + 1')).toBe(1235);        // thousands separator
  });
});

describe('functions and constants', () => {
  it('does trig in degrees by default', () => {
    expect(ev('sin(30)')).toBeCloseTo(0.5, 10);
    expect(ev('cos(60)')).toBeCloseTo(0.5, 10);
    expect(ev('asin(0.5)')).toBeCloseTo(30, 10);
  });

  it('does trig in radians when asked', () => {
    expect(rad('sin(pi/2)')).toBeCloseTo(1, 10);
    expect(rad('atan(1)')).toBeCloseTo(Math.PI / 4, 10);
  });

  it('evaluates logs, roots and rounding', () => {
    expect(ev('log(1000)')).toBeCloseTo(3, 10);
    expect(ev('ln(e)')).toBeCloseTo(1, 10);
    expect(ev('sqrt(144)')).toBe(12);
    expect(ev('cbrt(27)')).toBeCloseTo(3, 10);
    expect(ev('abs(-7)')).toBe(7);
    expect(ev('floor(3.9)')).toBe(3);
  });

  it('takes two-argument functions', () => {
    expect(ev('max(3, 9)')).toBe(9);
    expect(ev('min(3, 9)')).toBe(3);
  });

  it('rejects a wrong argument count', () => {
    expect(() => ev('max(3)')).toThrow(CalcError);
    expect(() => ev('sqrt(1, 2)')).toThrow(CalcError);
  });
});

describe('errors are CalcError with a readable message, never a crash', () => {
  it.each([
    ['', 'Boş ifadə'],
    ['2 +', 'yarımçıq'],
    ['(2 + 3', 'mötərizə'],
    ['2 $ 3', 'Naməlum simvol'],
    ['foo(2)', 'Naməlum funksiya'],
    ['1 / 0', 'Sıfıra'],
    ['1.2.3', 'Yanlış ədəd'],
    ['2 3 +', 'düzgün bitmir'],
  ])('rejects %j', (input) => {
    expect(() => ev(input)).toThrow(CalcError);
  });

  it('refuses x when no value is bound', () => {
    expect(() => ev('x + 1')).toThrow(CalcError);
  });

  /*
   * The reason this is a hand-written parser rather than eval(): none of these
   * may reach the host environment from an exam page.
   */
  it('cannot reach the host environment', () => {
    for (const attack of [
      'process.exit(1)',
      'globalThis',
      'constructor',
      'window.location',
      '[].constructor',
      'require("fs")',
    ]) {
      expect(() => ev(attack)).toThrow(CalcError);
    }
  });
});

describe('evaluateAt — plotting', () => {
  it('evaluates a function of x', () => {
    expect(evaluateAt('x^2', 4)).toBe(16);
    expect(evaluateAt('2x + 1', 3)).toBe(7);
  });

  /* A curve must be allowed gaps rather than failing the whole plot. */
  it('returns null where the function is undefined instead of throwing', () => {
    expect(evaluateAt('1/x', 0)).toBeNull();
    expect(evaluateAt('sqrt(x)', -4)).toBeNull();
    expect(evaluateAt('nonsense(x)', 1)).toBeNull();
  });
});

describe('formatResult', () => {
  it('hides binary floating-point noise', () => {
    expect(formatResult(evaluate('0.1 + 0.2'))).toBe('0.3');
    expect(formatResult(evaluate('1/3'))).toBe('0.333333333333');
  });

  it('keeps integers exact', () => {
    expect(formatResult(42)).toBe('42');
    expect(formatResult(-7)).toBe('-7');
  });

  it('falls back to exponential at the extremes', () => {
    expect(formatResult(1.5e20)).toContain('e+');
    expect(formatResult(2e-9)).toContain('e-');
  });
});

describe('scientific notation', () => {
  /*
   * `e` is Euler's constant in the identifier branch, so before the tokenizer
   * consumed exponents `1e6` parsed as a call to an unknown function `e6`.
   */
  it('reads exponent notation as one number', () => {
    expect(evaluate('1e6')).toBe(1_000_000);
    expect(evaluate('6.02e23')).toBeCloseTo(6.02e23, -18);
    expect(evaluate('2E3')).toBe(2000);
    expect(evaluate('1.5e-3')).toBeCloseTo(0.0015, 10);
    expect(evaluate('2e+4')).toBe(20000);
  });

  it('still treats a bare e as Euler', () => {
    expect(evaluate('e')).toBeCloseTo(Math.E, 10);
    expect(evaluate('2*e')).toBeCloseTo(2 * Math.E, 10);
  });

  /* Only consumed when digits follow, so a dangling identifier stays an error. */
  it('does not swallow a malformed exponent', () => {
    expect(() => evaluate('2e3x')).toThrow();
    // Two numbers with nothing between them — see the juxtaposition rule.
    expect(() => evaluate('1.2e1.5')).toThrow();
  });

  it('composes with the rest of the grammar', () => {
    expect(evaluate('1e3 + 1')).toBe(1001);
    expect(evaluate('2 * 1e2')).toBe(200);
    expect(evaluate('(1e2)^2')).toBe(10000);
  });
});

describe('juxtaposition', () => {
  it('still multiplies the shapes candidates actually write', () => {
    expect(evaluate('2pi')).toBeCloseTo(2 * Math.PI, 10);
    expect(evaluate('2(3+4)')).toBe(14);
    expect(evaluate('2sin(30)', { angleMode: 'deg' })).toBeCloseTo(1, 10);
    expect(evaluate('(1+1)(2+2)')).toBe(8);
  });

  /*
   * `12 34` returned 408. Two bare numbers are never algebra — they are a
   * mistyped operator, and a silent product is a wrong answer the candidate
   * has no way to notice.
   */
  it('rejects two numbers with no operator between them', () => {
    expect(() => evaluate('12 34')).toThrow(/İki ədəd/);
    expect(() => evaluate('3 4 5')).toThrow(/İki ədəd/);
    expect(() => evaluate('1e2 5')).toThrow(/İki ədəd/);
  });
});
