/**
 * The one public URL a request belongs on, or null when it already is there.
 *
 * Search engines index a sitemap URL only when it answers 200 itself, and
 * treat every other address of the same page (http://, the www or bare host
 * the site does not use, a trailing slash, a retired path prefix) as a
 * duplicate. Each of those gets ONE permanent redirect straight to the clean
 * URL, never a chain of hops.
 */
export function canonicalRedirectTarget(
  requestUrl: string,
  options: {
    appUrl: string;
    forwardedProto?: string | null;
    /** Retired path prefixes to drop, e.g. ['/zh'] for an old locale. */
    legacyPrefixes?: string[];
  }
): string | null {
  const current = new URL(requestUrl);
  // Behind a TLS-terminating proxy the request URL can read http:// while the
  // visitor is on https. Trusting this header can only skip a redirect.
  const proto = options.forwardedProto?.split(',')[0]?.trim().toLowerCase();
  if (proto === 'http' || proto === 'https') current.protocol = `${proto}:`;

  const app = parseUrl(options.appUrl);
  const target = new URL(current.href);
  // www.<domain> and <domain> are one site: whichever of the two the app URL
  // does not use goes to the one it does. Other hosts are left alone.
  if (
    app &&
    target.hostname !== app.hostname &&
    bareHost(target.hostname) === bareHost(app.hostname)
  ) {
    target.hostname = app.hostname;
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

  for (const prefix of options.legacyPrefixes ?? []) {
    if (
      target.pathname === prefix ||
      target.pathname.startsWith(`${prefix}/`)
    ) {
      target.pathname = target.pathname.slice(prefix.length) || '/';
      break;
    }
  }
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

function bareHost(hostname: string): string {
  return hostname.replace(/^www\./, '');
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
