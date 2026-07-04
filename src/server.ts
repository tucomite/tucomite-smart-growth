import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// ---------------------------------------------------------------------------
// Security headers (OWASP hardening)
// Applied to every response leaving the Worker. Keep CSP compatible with
// TanStack SSR (inline hydration script) + Supabase + Google Fonts.
// ---------------------------------------------------------------------------
const SUPABASE_ORIGIN = "https://aucrkwihamwonzudlofs.supabase.co";
const LOVABLE_ORIGIN = "https://lovable.dev https://*.lovable.app https://*.lovable.dev";

// Content-Security-Policy — OWASP hardening.
//
// NOTE on `script-src 'unsafe-inline'`:
//   TanStack Start injects an inline hydration script into the SSR HTML.
//   Per MDN, the ideal replacement is a per-response `nonce-<random>` or a
//   sha256 hash of the exact hydration payload. The current SSR plugin does
//   not expose a hook to inject that nonce/hash. We accept `'unsafe-inline'`
//   as DOCUMENTED TECHNICAL DEBT — to be removed as soon as the framework
//   supports nonce-based CSP. `'unsafe-eval'` remains banned.
//
// NOTE on framing / clickjacking:
//   `frame-ancestors` is the source of truth (MDN: CSP wins over legacy XFO).
//   `X-Frame-Options: SAMEORIGIN` below is kept only as a legacy fallback
//   for pre-CSP crawlers/bots; any real change must be made in this list.
//
// NOTE on COEP: not applied — Google Fonts, Supabase Storage, and the
//   Lovable preview iframe do not all serve compatible CORP headers today.
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${LOVABLE_ORIGIN}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  `connect-src 'self' ${SUPABASE_ORIGIN} wss://aucrkwihamwonzudlofs.supabase.co ${LOVABLE_ORIGIN}`,
  "frame-ancestors 'self' https://lovable.dev https://*.lovable.app https://*.lovable.dev",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

function applySecurityHeaders(response: Response, requestId: string): Response {
  // Never rewrite headers on non-mutable responses (e.g. redirects with bodies) —
  // clone into a fresh Response we own.
  const headers = new Headers(response.headers);
  headers.set("Content-Security-Policy", CSP);
  headers.set("X-Content-Type-Options", "nosniff");
  // Legacy fallback only — CSP `frame-ancestors` is the source of truth.
  headers.set("X-Frame-Options", "SAMEORIGIN");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  );
  // HSTS without `preload` on purpose: preload is irreversible for months and
  // requires HTTPS on every subdomain of the registrable domain. Re-enable
  // preload only after a confirmed subdomain inventory (see hstspreload.org).
  headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  // CORP: allow same-site subresource loads (Lovable preview + custom domains
  // typically share a registrable site). Not `same-origin` to avoid breaking
  // asset embedding across the preview subdomain family.
  headers.set("Cross-Origin-Resource-Policy", "same-site");
  headers.set("X-DNS-Prefetch-Control", "off");
  // Correlation for logs/audit — safe to expose.
  headers.set("X-Request-Id", requestId);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    // Generate or propagate a stable request id for correlation across
    // audit_logs, response headers, and server logs. Never returns a secret.
    const incoming = request.headers.get("x-request-id");
    const requestId =
      incoming && /^[a-zA-Z0-9._-]{8,128}$/.test(incoming)
        ? incoming
        : crypto.randomUUID();
    let requestWithId = request;
    if (incoming !== requestId) {
      try {
        const h = new Headers(request.headers);
        h.set("x-request-id", requestId);
        requestWithId = new Request(request.url, {
          method: request.method,
          headers: h,
          body:
            request.method === "GET" || request.method === "HEAD"
              ? undefined
              : request.body,
          redirect: request.redirect,
          // @ts-expect-error - duplex required by undici for streamed bodies
          duplex: "half",
        });
      } catch {
        requestWithId = request;
      }
    }
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(requestWithId, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      return applySecurityHeaders(normalized, requestId);
    } catch (error) {
      console.error(error);
      return applySecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
        requestId,
      );
    }
  },
};
