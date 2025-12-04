# Trip Explorer Backend

Backend API for Trip Explorer v2, built with Express, TypeScript, and Prisma.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Run database migrations:

```bash
npm run prisma:migrate
```

4. Start development server:

```bash
npm run dev
```

## API Endpoints

- `GET /health` - Health check

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
