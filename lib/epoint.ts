import crypto from 'crypto';

const EPOINT_BASE = 'https://epoint.az/api/1';
export const EPOINT_REQUEST_URL = `${EPOINT_BASE}/request`;
export const EPOINT_STATUS_URL = `${EPOINT_BASE}/get-status`;

export function signRequest(payload: Record<string, unknown>, privateKey: string) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = Buffer.from(
    crypto.createHash('sha1').update(privateKey + data + privateKey).digest(),
  ).toString('base64');
  return { data, signature };
}

export function verifySignature(data: string, signature: string, privateKey: string): boolean {
  const expected = Buffer.from(
    crypto.createHash('sha1').update(privateKey + data + privateKey).digest(),
  ).toString('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function decodeData<T = Record<string, unknown>>(data: string): T {
  return JSON.parse(Buffer.from(data, 'base64').toString('utf8')) as T;
}

export function encodeOrderId(userId: string, examId: string): string {
  return Buffer.from(JSON.stringify({ u: userId, e: examId, t: Date.now() })).toString('base64url');
}

export function decodeOrderId(orderId: string): { u: string; e: string } {
  return JSON.parse(Buffer.from(orderId, 'base64url').toString('utf8'));
}
