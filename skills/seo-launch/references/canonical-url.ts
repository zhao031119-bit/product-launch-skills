/**
 * The one public URL a request belongs on, or null when it already is there.
 *
 * Search engines index a sitemap URL only when it answers 200 itself, and
 * treat every other address of the same page (http://, www., a trailing
 * slash, the old /zh prefix) as a duplicate. Each of those gets ONE permanent
 * redirect straight to the clean URL, never a chain of hops.
 */
export function canonicalRedirectTarget(
  requestUrl: string,
  options: { appUrl: string; forwardedProto?: string | null }
): string | null {
  const current = new URL(requestUrl);
  // Behind a TLS-terminating proxy the request URL can read http:// while the
  // visitor is on https. Trusting this header can only skip a redirect.
  const proto = options.forwardedProto?.split(',')[0]?.trim().toLowerCase();
  if (proto === 'http' || proto === 'https') current.protocol = `${proto}:`;

  const app = parseUrl(options.appUrl);
  const target = new URL(current.href);
  if (target.hostname.startsWith('www.') && target.hostname !== app?.hostname) {
    target.hostname = target.hostname.slice(4);
  }
  if (app?.protocol === 'https:') {
    // wrangler also serves the Worker on <name>.<account>.workers.dev.
    if (target.hostname.endsWith('.workers.dev')) {
      target.hostname = app.hostname;
    }
    // A Worker answers plain http:// unless the zone turns on "Always Use
    // HTTPS", so the live domain enforces https itself. Other hosts
    // (localhost, wrangler dev) keep the scheme they were reached on.
    if (target.hostname === app.hostname) target.protocol = 'https:';
  }

  const legacyLocale = target.pathname.match(/^\/zh(\/.*)?$/);
  if (legacyLocale) target.pathname = legacyLocale[1] || '/';
  // The router answers a trailing slash with a temporary 307; make it a 301.
  // API paths are left alone: a client posting there expects no redirect.
  if (
    target.pathname.length > 1 &&
    target.pathname.endsWith('/') &&
    !target.pathname.startsWith('/api/')
  ) {
    target.pathname = target.pathname.replace(/\/+$/, '') || '/';
  }

  return target.href === current.href ? null : target.href;
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
