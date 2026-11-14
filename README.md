# TaskFlow

TaskFlow is a responsive task management dashboard built with Next.js App Router, TypeScript, and Tailwind CSS. Its dashboard and `/tasks` page use the same JSON Server API for task data.

## Requirements

- Node.js 22.12 or newer (required by the installed JSON Server version)
- npm

## Run locally

Install dependencies:

```bash
npm install
```

In the first terminal, start the mock API:

```bash
npm run dev:api
```

In a second terminal, start Next.js:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the dashboard or [http://localhost:3000/tasks](http://localhost:3000/tasks) for task management. The API is available at [http://localhost:3001/tasks](http://localhost:3001/tasks).

The API base URL defaults to `http://localhost:3001`. To override it, set `NEXT_PUBLIC_API_BASE_URL` in `.env.local`; `.env.example` shows the default value.

## Checks

```bash
npm run typecheck
npm run lint
npm run build
```
