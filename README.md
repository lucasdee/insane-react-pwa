# insane-react-pwa

A small React + TypeScript + Vite starter with Material UI and PWA support (service worker, install prompt, offline indicators).

Author: lucasdee

## Quick start

Prerequisites: Node.js 24 and npm.

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

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

- React + TypeScript powered by Vite
- Material UI (MUI) for UI components
- Progressive Web App support via `vite-plugin-pwa`
- Service worker registration and runtime caching
- Custom install prompt UI and offline indicator component

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
- `src/main.tsx` — app bootstrap and SW registration
- `src/App.tsx` — main app component
- `src/components/InstallPrompt.tsx` — custom PWA install UI
- `src/components/Offline.tsx` — offline indicator component
- `src/hooks/useOnlineStatus.ts` — online/offline hook
- `public/` — static assets and PWA icons

## Testing

Unit tests are powered by Vitest and React Testing Library. Example tests live in `src/components/test/` and test setup is in `src/setupTests.ts`.

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
