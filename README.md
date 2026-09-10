# Charllieb’s journal

A single-author personal blog built with React, TypeScript, Vite, Tailwind, Convex, and Convex Auth. Public reading requires no login. Only GitHub account **Porkstone** (immutable ID `383633`) can sign in and publish.

## Develop

```sh
pnpm install
pnpm dev:backend
pnpm dev
```

Convex writes `.env.local` with the development deployment URL. Run the backend and Vite commands in separate terminals. The development deployment is `grandiose-hound-64` in project `charlie-8b891/life-blog`.

## Publishing

Use **Author sign in** in the footer, then **Continue with GitHub**. The writing desk at `/write` supports title, unique URL slug, category, short summary, plain-text paragraphs, preview, and publishing. Unpublished drafts stay in the current browser. Published posts are persisted in Convex and appear reactively for all readers.

Authorization is enforced in Convex, not just by hiding the editor. The GitHub profile ID is checked during account creation and session creation, and checked again against the authenticated user on every publish. Public queries omit private user fields and use indexes and pagination.

The database starts empty. Original mock content is archived at `docs/review/sample-posts.json`; it is not automatically published or seeded on deployments.

## Production: Vercel + Convex

- Site: https://life-blog-five.vercel.app
- Backend: https://groovy-panda-88.convex.cloud
- Dashboard: https://dashboard.convex.dev/t/charlie-8b891/life-blog/groovy-panda-88

`vercel.json` selects `pnpm vercel-build`. The package script runs:

```sh
convex deploy --cmd-url-env-var-name VITE_CONVEX_URL --cmd "pnpm build"
```

Every Vercel production build therefore builds the frontend against the correct Convex URL and deploys the backend. Do not replace this with `pnpm build` in Vercel. The frontend output is `dist` and SPA rewrites support direct article and editor URLs.

### Vercel environment

| Variable | Scope | Setup |
| --- | --- | --- |
| `CONVEX_DEPLOY_KEY` | Production | Configured with the `vercel-life-blog` production deploy key. |
| `VITE_CONVEX_URL` | Build process | Supplied automatically by `convex deploy`; no manual variable needed. |

Preview builds need their own **preview** Convex deploy key scoped to Vercel Preview, with appropriate Convex auth configuration. Do not reuse the production key for previews. No preview key is configured by this change.

### Convex production environment

| Variable | Setup |
| --- | --- |
| `SITE_URL` | Configured as `https://life-blog-five.vercel.app`. |
| `JWT_PRIVATE_KEY` | Generated and configured; secret. |
| `JWKS` | Generated and configured; public signing keys. |
| `AUTH_GITHUB_ID` | Configured from the GitHub OAuth app Client ID. |
| `AUTH_GITHUB_SECRET` | Configured from the GitHub OAuth app Client Secret; secret. |

Create the OAuth app at https://github.com/settings/applications/new:

- Homepage URL: `https://life-blog-five.vercel.app`
- Authorization callback URL: `https://groovy-panda-88.convex.site/api/auth/callback/github`

Set its credentials in **Convex production**, not Vercel. The sign-in button stays disabled until all required auth variables exist. Never prefix secrets with `VITE_` or commit them.

For local GitHub sign-in, create a separate development OAuth app with homepage `http://localhost:5173` and callback `https://grandiose-hound-64.convex.site/api/auth/callback/github`, then set `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` on the development deployment. Dev `SITE_URL` and signing keys are already configured. Use localhost for OAuth so it matches `SITE_URL`.

For a fresh deployment only, `node scripts/setup-auth-keys.mjs` (or `--prod`) generates signing keys and sets the site URL without printing secrets. It refuses to rotate existing keys.

## Verification

```sh
pnpm typecheck
pnpm test
pnpm build
```

Backend tests cover unauthenticated writes, a different authenticated account, successful publishing, public field privacy, duplicate slugs, input validation, category filtering, and pagination. `docs/review/backend-check.mjs` checks the empty journal, sign-in, editor route protection, missing posts, mobile overflow, and saved theme against the local dev server.
