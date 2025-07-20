# SpecForge - AI Specification Generator

SpecForge is an AI-powered web application that simulates an Agile team conversation to generate professional software specifications.

## Project Structure

```
├── backend/          # Express.js TypeScript backend
├── frontend/         # React TypeScript frontend with Vite
├── docker-compose.yml # PostgreSQL database setup
└── .kiro/specs/      # Project specifications
```

## Development Setup

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL database)
- npm or yarn

### Backend Setup

```bash
cd backend
npm install
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Database Setup

1. Start PostgreSQL with Docker:

```bash
docker compose up -d postgres
```

2. Generate Prisma client and run migrations:

```bash
cd backend
npx prisma generate
npx prisma db push
```

## Available Scripts

### Backend

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm start` - Start production server

### Frontend

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run lint` - Run ESLint

## Technology Stack

### Frontend

- React 19 with TypeScript
- Vite for build tooling
- Vitest for testing
- ESLint + Prettier for code quality

### Backend

- Express.js with TypeScript
- Prisma ORM with PostgreSQL
- Jest for testing
- ESLint + Prettier for code quality

### Database

- PostgreSQL 15
- Prisma for type-safe database access

## Environment Variables

Copy `.env.example` to `.env` in the backend directory and configure:

```
PORT=3001
NODE_ENV=development
DATABASE_URL="postgresql://specforge:specforge123@localhost:5432/specforge"
```
