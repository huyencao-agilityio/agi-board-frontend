// Edge entry of the frontend Worker. Static assets are served by Cloudflare; only /api/* reaches this code
// (wrangler.jsonc assets.run_worker_first). It hands the request to the backend Worker through a service binding,
// so the API shares the frontend's origin: the session and CSRF cookies stay same-site and the browser can read csrf_token.
// A plain fetch() to the backend's workers.dev URL would fail (Worker-to-Worker on workers.dev is blocked).

type Env = { API: { fetch(request: Request): Promise<Response> } }

export default {
  fetch: (request: Request, env: Env) => env.API.fetch(request),
}
