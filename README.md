# TypeLeap

TypeLeap is a version of [FrogFind](https://github.com/ActionRetro/FrogFind) that runs as a modern Node.js + TypeScript service while keeping the output intentionally simple for old browsers.

## Project status
The current version is a one-shotted vibe-coded port of the original with some (also) vibe-coded improvements.

## Run locally

```sh
corepack enable
pnpm install
pnpm run dev
```

Open `http://localhost:3000`.

## Build and run

```sh
pnpm run build
pnpm start
```

## Docker

Build and run with one command:

```sh
docker compose up --build
```

Then open `http://localhost:3000`.

Love the frog. Be the frog.
