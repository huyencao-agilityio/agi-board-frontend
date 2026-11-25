---
paths:
  - 'src/**/*.{ts,tsx}'
  - 'index.html'
  - 'vite.config.ts'
  - 'wrangler.jsonc'
  - '.env.example'
---

# Security

The server enforces every rule; the client must not weaken it or leak data. If a spec seems to need an exception, ask first.

## Session and CSRF

- The session is an `httpOnly` cookie the client never reads. Do not store tokens, session ids or user data in `localStorage`, `sessionStorage` or IndexedDB.
- All requests go through `api()`: it sends `credentials: 'include'` and the double-submit CSRF header on every write. Never call `fetch` / `XMLHttpRequest` directly or strip the header.
- Logout is `POST` only. After logout, clear the query cache (`queryClient.clear()`) so the next user sees nothing from the previous one.

## Permissions

- Client checks only hide or disable controls. Never treat a hidden button as protection, and never send `userId`, `role` or `systemRole` in a request body to decide access.
- 403 and 404 both show WEB-13 (`RouteError`), so the UI never confirms that a hidden board or card exists.
- System roles (`SUPPORT`, `SUPER_ADMIN`) unlock only the admin routes; they never show workspace or board content.

## Account privacy

- Sign-in failure, forgot password, resend code and lockout show the same message for every email address. Do not branch the UI on "email not found". Exception: sign-up shows a banner on `EMAIL_ALREADY_EXISTS` (decision #367).
- Do not put emails, tokens, reset codes or invite tokens in logs, analytics or error messages. Read reset/verify tokens from the URL, send them, then remove them from the address bar (`navigate(..., { replace: true })`).

## Rendering untrusted content

- Render user text (card titles, descriptions, comments, names) as React text. No `dangerouslySetInnerHTML`; if Markdown is needed later, use a sanitising renderer and ask first.
- Links from user content: only `http:`/`https:` URLs, with `rel="noopener noreferrer"` on `target="_blank"`. Never put user input in `href="javascript:..."`, `eval`, `new Function` or inline styles built from strings.
- Redirect targets (`?next=`) must be same-origin paths (start with `/`, not `//`).

## Files

- Check size (25 MB) and type on the client for fast feedback only; the server is the real check. Show downloads through the API URL, never by building object-store URLs on the client.

## Config and secrets

- Only `VITE_*` variables reach the browser, and everything in them is public. Never put secrets, API keys or private URLs in `VITE_*`, `index.html` or source.
- New env variables go into the zod schema in `src/lib/env.ts`, `.env.example`, `vite.config.ts` `test.env` and the Playwright `webServer.env`.
- Never read or commit `.env*` / `.dev.vars` (the guard hook denies it).

## Dependencies

- Do not add a dependency for something a few lines or an installed package can do. A new dependency needs a reason in the PR. Use `pnpm`, never edit `pnpm-lock.yaml` by hand.
