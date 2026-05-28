# MLEN Website

## Clone and run this project (one-shot)

From a terminal:

```bash
# 1) Clone the repository
git clone <REPO_URL>

# 2) Enter the project folder
cd mlen_website

# 3) Install dependencies (requires pnpm)
pnpm install

# 4) Start local development server
pnpm dev
```

By default, the site will be available at `http://localhost:4321`.

## Build and preview

```bash
# Build production output into dist/
pnpm build

# Optional: preview the built site locally
pnpm preview
```

## Prerequisites

- Node.js (matching your project stack)
- pnpm 11+ (this project sets `packageManager` to `pnpm@11.0.6`)

If your system doesn’t have pnpm installed, run:

```bash
corepack enable
corepack prepare pnpm@11.0.6 --activate
```

## Project scripts

- `pnpm dev` — run the local dev server
- `pnpm build` — type-check and generate static output
- `pnpm preview` — serve the built site for a quick local check
- `pnpm check` — run Astro checks only
