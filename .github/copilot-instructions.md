# URLShortener Guidelines

## Architecture
- **Frontend**: React 19, Vite, Tailwind CSS 4, Zustand (state management), and React Router DOM. React Compiler is enabled (`babel-plugin-react-compiler`).
- **Backend**: Node.js (ESM), Express, Prisma (PostgreSQL), Kafka (for tracking clicks), and Redis (for caching).
- **Repository Structure**: Root `package.json` orchestrates both frontend and backend sub-projects using `concurrently`.

## Build and Test
- **Dev Server**: Run `npm run dev` from the root directory. This concurrently starts:
  - Backend API (`server/server.ts`)
  - Kafka Consumer (`server/app/consumers/consumer.ts`)
  - Frontend React application (`frontend/vite`)
- **Database**: When modifying the Prisma schema (`server/prisma/schema.prisma`), make sure to run `npx prisma generate` inside the `server` directory.

## Conventions
- **Backend ESM Imports**: The server uses `"type": "module"`. All local file imports within TypeScript must include the `.js` extension (e.g., `import authRouter from "./routes/auth.route.js"`).
- **Asynchronous Processing**:
  - **Redis** is used as a caching layer to reduce direct PostgreSQL lookups for URL mappings (see `app/services/linkCache.service.ts`).
  - **Kafka** is strictly used for offloading click tracking. Events are produced in the redirection controller and processed in the background by `consumer.ts`.
- **Frontend State Management**: Use Zustand (`frontend/src/store`) for global state management.
- **Styling**: Tailwind CSS v4 is used via the Vite plugin (`@tailwindcss/vite`). Utilize utility classes directly in `tsx` instead of writing custom CSS.
