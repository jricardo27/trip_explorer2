# Trip Explorer Frontend

Frontend for Trip Explorer v2, built with React, TypeScript, Zustand, and React Query.

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Zustand** - Client state management
- **React Query** - Server state management
- **Material-UI** - Component library
- **Leaflet** - Map visualization
- **Axios** - HTTP client

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your API URL
```

3. Start development server:

```bash
npm run dev
```

## Project Structure

```
src/
├── api/          # API client and endpoints
├── components/   # Reusable UI components
├── hooks/        # React Query hooks
├── pages/        # Page components
├── stores/       # Zustand stores
├── types/        # TypeScript types
└── utils/        # Utility functions
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
