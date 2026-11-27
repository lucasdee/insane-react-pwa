# insane-react-pwa

A React + TypeScript + Vite PWA with Material UI, the frontend of [insane-node-rest-api](https://github.com/lucasdee/insane-node-rest-api): users register, log in, see their profile, and create, share and tag memos.

Author: lucasdee

## Quick start

Prerequisites: Node.js 26 and npm.

Install dependencies and start the dev server:

```bash
npm install
cp .env.example .env   # optional: the API URL defaults to http://localhost:3000
npm run dev
```

The app talks to a running insane-node-rest-api (see [Connecting to the API](#connecting-to-the-api)).

Build and preview production output:

```bash
npm run build
npm run preview
```

Run tests and coverage:

```bash
npm run test
npm run test:coverage
```

Lint and format:

```bash
npm run lint
npm run format
npm run format:check
```

## Features

- Home screen, registration, login and a profile page, with routes only signed-in users can open
- Memos: list the memos assigned to you, each showing whether you wrote it or who did, create memos, open a memo to edit its title, content and tags, and assign memos to other users (searched by name). What you can do with a memo depends on whether you wrote it and on your role on it: its author can edit it, its ADMINs can edit it and assign any role, its MODs can edit it and assign USERs, its USERs can read it
- React + TypeScript powered by Vite
- Material UI (MUI) for UI components
- Progressive Web App support via `vite-plugin-pwa`
- Service worker registration and runtime caching
- Custom install prompt UI and offline indicator component

## Connecting to the API

- `VITE_API_URL` (in `.env`, see `.env.example`) is the API's base URL. It defaults to `http://localhost:3000`.
- The API's `CORS_ORIGIN` must be this app's origin: `http://localhost:5173` for `npm run dev`.
- Sessions use a short-lived access token, kept in memory only, and a refresh-token cookie (`HttpOnly`, `SameSite=Strict`, path `/auth`) set by the API. The cookie is only sent when the app and the API are on the same site: use the same host name for both (`localhost`, not `127.0.0.1`), and in production serve them from the same site.
- `src/api/session.ts` refreshes the access token before it expires, or when a request gets a 401, and retries that request once. Refreshes are shared within a tab and serialized across tabs with a Web Lock, because the API rotates the refresh token on every use. A reload restores the session from the cookie.
- API responses are never cached by the service worker.

### API types

The request and response types in `src/api/types.ts` come from `src/api/generated/api.ts`, a copy of the backend's committed `generated/api.ts` (generated from its OpenAPI spec). Don't edit it. After the backend API changes, copy it again and commit the result:

```bash
npm run types:sync                              # from ../insane-node-rest-api
API_TYPES_SRC=/path/to/api.ts npm run types:sync # from another checkout
```

## PWA details

- Service worker registration: `src/main.tsx` (uses `virtual:pwa-register`).
- Install prompt: `src/components/InstallPrompt.tsx` implements a custom UI using the `beforeinstallprompt` event.
- Offline notice: `src/components/Offline.tsx` and `src/hooks/useOnlineStatus.ts` provide online/offline detection.
- Icons & manifest: `public/logo192.png`, `public/logo512.png`, and the PWA manifest are configured in `vite.config.ts` (via `VitePWA`).

Open DevTools → Application to inspect the registered service worker and cached resources.

## Project structure (key files)

- `package.json` — scripts and dependencies
- `vite.config.ts` — plugin and PWA configuration
- `index.html` — app entry
- `src/main.tsx` — app bootstrap (theme, React Query, router, auth) and SW registration
- `src/App.tsx` — routes
- `src/api/` — API client, session handling and generated types
- `src/auth/` — auth state (`AuthProvider`, `useAuth`) and route guards
- `src/pages/` — home, login, register, profile, memo list and new memo pages
- `src/components/memos/` — memo card, tag input, user search, edit tags and assign dialogs
- `src/hooks/useMemos.ts`, `src/hooks/useUserSearch.ts` — React Query hooks for memos, tags and users
- `src/utils/permissions.ts` — what each role on a memo allows
- `src/utils/validation.ts` — form and tag checks mirroring the API's rules
- `src/components/InstallPrompt.tsx` — custom PWA install UI
- `src/components/Offline.tsx` — offline indicator component
- `src/hooks/useOnlineStatus.ts` — online/offline hook
- `public/` — static assets and PWA icons

## Testing

Unit tests are powered by Vitest, React Testing Library and user-event. They live in `test/` folders next to the code; setup is in `src/setupTests.ts`. Requests go to an [MSW](https://mswjs.io) server (`src/test/server.ts`) whose handlers in `src/test/handlers.ts` behave like the API, so no backend is needed; override them per test with `server.use(...)`. `renderWithProviders` (`src/test/renderWithProviders.tsx`) renders with React Query, a router and the auth provider. Coverage must stay at 90% or more.

```bash
npm run test
npm run test:ui   # interactive UI for Vitest
```

## Development notes

- ESLint and Prettier are configured; use `npm run lint` and `npm run format` to keep code consistent.
- TypeScript project references are configured (`tsconfig.app.json`, `tsconfig.node.json`).

## Contributing

Contributions are welcome. Please open an issue to discuss changes, then submit a pull request. Include reasonable tests and update docs where applicable.

## License

This project is covered by the LICENSE file in the repository.
