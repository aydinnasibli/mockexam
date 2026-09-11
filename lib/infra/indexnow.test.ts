import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/infra/observability', () => ({
  captureMessage: vi.fn(async () => {}),
  captureException: vi.fn(async () => {}),
}));

const { submitToIndexNow, indexNowKey } = await import('@/lib/infra/indexnow');
const { BASE_URL } = await import('@/lib/shared/seo');

const KEY = 'a1b2c3d4e5f6a7b8';

/** The body of the single fetch call, parsed. */
function sentBody(fetchMock: ReturnType<typeof vi.fn>) {
  return JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  process.env.INDEXNOW_KEY = KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.INDEXNOW_KEY;
});

describe('indexNowKey', () => {
  it('is null when unset, so the feature is simply off', () => {
    delete process.env.INDEXNOW_KEY;
    expect(indexNowKey()).toBeNull();
  });

  it('rejects a malformed key rather than submitting one the endpoint will 403', () => {
    // Too short, and an underscore is not in the permitted set.
    process.env.INDEXNOW_KEY = 'bad_key';
    expect(indexNowKey()).toBeNull();
  });

  it('accepts a spec-shaped key', () => {
    expect(indexNowKey()).toBe(KEY);
  });
});

describe('submitToIndexNow', () => {
  it('posts the key, host and key location', async () => {
    await submitToIndexNow([`${BASE_URL}/exams`]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = sentBody(fetchMock);
    expect(body.key).toBe(KEY);
    expect(body.host).toBe(new URL(BASE_URL).host);
    expect(body.keyLocation).toBe(`${BASE_URL}/indexnow-key.txt`);
    expect(body.urlList).toEqual([`${BASE_URL}/exams`]);
  });

  it('drops foreign-origin URLs instead of letting them reject the batch', async () => {
    // A single off-host URL makes the endpoint answer 422 for the WHOLE post,
    // so one stray entry would silently discard every real URL alongside it.
    await submitToIndexNow([
      `${BASE_URL}/exams`,
      'https://example.com/evil',
      'http://localhost:3000/exams/ielts',
      'not-a-url',
    ]);

    expect(sentBody(fetchMock).urlList).toEqual([`${BASE_URL}/exams`]);
  });

  it('de-duplicates', async () => {
    await submitToIndexNow([`${BASE_URL}/exams`, `${BASE_URL}/exams`, BASE_URL]);
    expect(sentBody(fetchMock).urlList).toEqual([`${BASE_URL}/exams`, BASE_URL]);
  });

  it('sends nothing when no URL survives filtering', async () => {
    await submitToIndexNow(['https://example.com/a']);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends nothing when the key is absent', async () => {
    delete process.env.INDEXNOW_KEY;
    await submitToIndexNow([`${BASE_URL}/exams`]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never throws when the endpoint fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    // A search-engine ping must not be able to fail an admin's save.
    await expect(submitToIndexNow([`${BASE_URL}/exams`])).resolves.toBeUndefined();
  });

  it('never throws on a rejected submission', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 403 }));
    await expect(submitToIndexNow([`${BASE_URL}/exams`])).resolves.toBeUndefined();
  });
});
