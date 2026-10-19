import { describe, expect, test } from 'vitest';

import { canonicalRedirectTarget } from './canonical-url';

const SITE = 'https://example.org';
const live = { appUrl: SITE };
const go = (url: string, forwardedProto?: string) =>
  canonicalRedirectTarget(url, { ...live, forwardedProto });

describe('canonicalRedirectTarget', () => {
  test('sitemap URLs answer 200 themselves (no redirect)', () => {
    for (const path of [
      '/',
      '/es',
      '/pricing',
      '/free-get-a-job-meme-generator',
      '/sitemap.xml',
      '/robots.txt',
      '/es?utm_source=x',
    ]) {
      expect(go(`${SITE}${path}`)).toBeNull();
    }
  });

  test('http, www and workers.dev go to the https apex in one hop', () => {
    expect(go('http://example.org/')).toBe(`${SITE}/`);
    expect(go('http://example.org/es')).toBe(`${SITE}/es`);
    expect(go('https://www.example.org/pricing')).toBe(
      `${SITE}/pricing`
    );
    expect(go('http://www.example.org/zh/es/?ref=x')).toBe(
      `${SITE}/es?ref=x`
    );
    expect(go('https://example.someone.workers.dev/es')).toBe(
      `${SITE}/es`
    );
  });

  test('trailing slash and the old /zh prefix redirect permanently', () => {
    expect(go(`${SITE}/es/`)).toBe(`${SITE}/es`);
    expect(go(`${SITE}/es//`)).toBe(`${SITE}/es`);
    expect(go(`${SITE}/zh`)).toBe(`${SITE}/`);
    expect(go(`${SITE}/zh/`)).toBe(`${SITE}/`);
    expect(go(`${SITE}/zh/pricing`)).toBe(`${SITE}/pricing`);
    expect(go(`${SITE}/zhuanlan`)).toBeNull();
  });

  test('API calls are never redirected for a trailing slash', () => {
    expect(go(`${SITE}/api/payment/notify/waffo/`)).toBeNull();
  });

  test('no loop behind a TLS proxy that reports https', () => {
    expect(go('http://example.org/es', 'https')).toBeNull();
    expect(go('http://www.example.org/es', 'https')).toBe(
      `${SITE}/es`
    );
  });

  test('local hosts keep plain http', () => {
    const dev = { appUrl: 'http://localhost:3000' };
    expect(canonicalRedirectTarget('http://localhost:3000/es', dev)).toBeNull();
    expect(canonicalRedirectTarget('http://localhost:3000/es/', dev)).toBe(
      'http://localhost:3000/es'
    );
    expect(canonicalRedirectTarget('http://www.localhost:3000/es', dev)).toBe(
      'http://localhost:3000/es'
    );
    expect(canonicalRedirectTarget('http://127.0.0.1:8787/es', live)).toBeNull();
  });

  test('a www app URL keeps its www host', () => {
    const www = { appUrl: 'https://www.example.com' };
    expect(canonicalRedirectTarget('https://www.example.com/es', www)).toBeNull();
    expect(canonicalRedirectTarget('http://www.example.com/es', www)).toBe(
      'https://www.example.com/es'
    );
  });
});
