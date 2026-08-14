import { describe, expect, it } from 'vitest';
import { decodeOrderId, encodeOrderId, signRequest, verifySignature } from './epoint';

const KEY = 'test-private-key';

describe('signRequest / verifySignature', () => {
  it('round-trips a payload it signed itself', () => {
    const { data, signature } = signRequest({ order_id: '1', amount: '10.00' }, KEY);
    expect(verifySignature(data, signature, KEY)).toBe(true);
  });

  it('rejects a signature made with a different key', () => {
    const { data } = signRequest({ order_id: '1' }, KEY);
    const { signature } = signRequest({ order_id: '1' }, 'other-key');
    expect(verifySignature(data, signature, KEY)).toBe(false);
  });

  it('rejects tampered data', () => {
    const { signature } = signRequest({ order_id: '1', amount: '10.00' }, KEY);
    const forged = Buffer.from(JSON.stringify({ order_id: '1', amount: '0.01' })).toString('base64');
    expect(verifySignature(forged, signature, KEY)).toBe(false);
  });

  it('returns false rather than throwing on a malformed signature', () => {
    const { data } = signRequest({ order_id: '1' }, KEY);
    // Different byte length — timingSafeEqual throws on these, and the webhook
    // must read that as "not authentic", not as a 500.
    expect(verifySignature(data, 'short', KEY)).toBe(false);
    expect(verifySignature(data, '', KEY)).toBe(false);
  });
});

describe('encodeOrderId / decodeOrderId', () => {
  it('round-trips the user and exam it encoded', () => {
    const encoded = encodeOrderId('user_123', 'sat-mock-1');
    expect(decodeOrderId(encoded)).toEqual({ u: 'user_123', e: 'sat-mock-1' });
  });

  // The webhook writes the decoded values straight into a purchase upsert, so
  // anything that is not a well-formed order id has to throw rather than
  // resolve to `undefined` and key a purchase row on nothing.
  it.each([
    ['a JSON number',        Buffer.from('123').toString('base64url')],
    ['JSON null',            Buffer.from('null').toString('base64url')],
    ['an array',             Buffer.from('[]').toString('base64url')],
    ['an object missing e',  Buffer.from(JSON.stringify({ u: 'user_1' })).toString('base64url')],
    ['an object missing u',  Buffer.from(JSON.stringify({ e: 'sat-1' })).toString('base64url')],
    ['non-string members',   Buffer.from(JSON.stringify({ u: 1, e: 2 })).toString('base64url')],
    ['empty members',        Buffer.from(JSON.stringify({ u: '', e: '' })).toString('base64url')],
    ['not JSON at all',      'bm90LWpzb24'],
  ])('throws on %s', (_label, encoded) => {
    expect(() => decodeOrderId(encoded)).toThrow();
  });
});
