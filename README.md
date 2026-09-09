# A little human

A reading-focused personal blog mockup for Charl. React, TypeScript, Vite, Tailwind CSS, Lucide, and locally bundled fonts.

Run `pnpm install` and `pnpm dev` to preview. `pnpm build` checks TypeScript and builds the frontend.

Includes a responsive journal, topic filters, four sample article routes, an About page, and a persisted light/dark preference (light on first visit). All copy is placeholder content for review. Supplied artwork is in `public/images`.

Frontend only: authentication, publishing, and database are not connected. Vercel can use the Vite preset, `pnpm build`, and `dist` output. SPA rewrites support direct article URLs.

When implementing Convex, configure the Vercel build to run the frontend build through `convex deploy --cmd 'pnpm build'`. Create a Convex deploy key and add it to Vercel as `CONVEX_DEPLOY_KEY`. Confirm author authentication requirements before implementing publishing.
