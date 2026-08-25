import { describe, expect, it } from 'vitest';
import { isAllowedImageUrl, isAllowedMediaUrl } from './media';

describe('isAllowedImageUrl', () => {
  it('allows an empty value (no image)', () => {
    expect(isAllowedImageUrl('')).toBe(true);
    expect(isAllowedImageUrl('   ')).toBe(true);
    expect(isAllowedImageUrl(undefined)).toBe(true);
    expect(isAllowedImageUrl(null)).toBe(true);
  });

  it('allows same-origin absolute paths', () => {
    expect(isAllowedImageUrl('/charts/fig1.png')).toBe(true);
    expect(isAllowedImageUrl('/a.png?v=2')).toBe(true);
  });

  it('allows the configured Vercel Blob host', () => {
    expect(isAllowedImageUrl('https://abc123.public.blob.vercel-storage.com/chart.png')).toBe(true);
  });

  it('rejects other hosts', () => {
    expect(isAllowedImageUrl('https://cdn.example.com/chart.png')).toBe(false);
    expect(isAllowedImageUrl('https://imgur.com/a.png')).toBe(false);
  });

  it('rejects protocol-relative URLs, which are not same-origin paths', () => {
    expect(isAllowedImageUrl('//evil.com/a.png')).toBe(false);
  });

  it('rejects non-https protocols', () => {
    expect(isAllowedImageUrl('http://abc.public.blob.vercel-storage.com/a.png')).toBe(false);
    expect(isAllowedImageUrl('javascript:alert(1)')).toBe(false);
    expect(isAllowedImageUrl('data:image/svg+xml,<svg/onload=alert(1)>')).toBe(false);
  });

  it('rejects hosts that merely contain the allowed suffix', () => {
    // The suffix must terminate the hostname, not appear inside a path or a
    // lookalike domain.
    expect(isAllowedImageUrl('https://evil.com/.public.blob.vercel-storage.com/a.png')).toBe(false);
    expect(isAllowedImageUrl('https://public.blob.vercel-storage.com.evil.com/a.png')).toBe(false);
  });

  it('rejects malformed URLs', () => {
    expect(isAllowedImageUrl('not a url')).toBe(false);
    expect(isAllowedImageUrl('https://')).toBe(false);
  });
});

describe('isAllowedMediaUrl — audio', () => {
  /*
   * `audioUrl` went unchecked while `imageUrl` was guarded. The rule is the
   * same host rule; only the failure differs, and audio's is worse — a Play
   * button that never sounds inside a live single-play listening module.
   */
  it('accepts the blob host and site-relative paths', () => {
    expect(isAllowedMediaUrl('https://abc123.public.blob.vercel-storage.com/part1.mp3')).toBe(true);
    expect(isAllowedMediaUrl('/audio/part1.mp3')).toBe(true);
    expect(isAllowedMediaUrl('')).toBe(true);
  });

  it('rejects the hosts an admin is most likely to paste', () => {
    expect(isAllowedMediaUrl('https://drive.google.com/file/d/abc/view')).toBe(false);
    expect(isAllowedMediaUrl('https://my-bucket.s3.amazonaws.com/part1.mp3')).toBe(false);
    expect(isAllowedMediaUrl('https://dropbox.com/s/x/part1.mp3')).toBe(false);
  });

  it('rejects the same spoofing shapes as images', () => {
    expect(isAllowedMediaUrl('https://evil.com/.public.blob.vercel-storage.com/a.mp3')).toBe(false);
    expect(isAllowedMediaUrl('https://public.blob.vercel-storage.com.evil.com/a.mp3')).toBe(false);
    expect(isAllowedMediaUrl('//evil.com/a.mp3')).toBe(false);
  });
});
