# NodeAngularFullStack

A modern full-stack application built with Angular 20+ and Express.js, featuring TypeScript throughout, shared types, and a monorepo structure.

## Tech Stack

- **Frontend**: Angular 20+ with standalone components
- **Backend**: Express.js with TypeScript
- **UI Library**: PrimeNG 17+ with Tailwind CSS
- **Database**: PostgreSQL 15+
- **Cache**: Redis 7+
- **State Management**: NgRx Signals
- **Authentication**: JWT with Passport.js
- **Testing**: Jest + Playwright

## Project Structure

```
nodeangularfullstack/
├── apps/
│   ├── web/         # Angular frontend application
│   └── api/         # Express.js backend API
├── packages/
│   ├── shared/      # Shared types and utilities
│   └── config/      # Shared configuration
├── infrastructure/
│   └── docker/      # Docker configurations
├── scripts/         # Build and deployment scripts
└── docs/           # Documentation
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Docker Desktop 24+ and Docker Compose 2.23+ (recommended)
- PostgreSQL 15+ (if not using Docker)
- Redis 7+ (if not using Docker)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd nodeangularfullstack
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up the database:
```bash
# Create a PostgreSQL database named 'nodeangularfullstack'
# Update DB credentials in .env file
```

### Development

Run both frontend and backend in development mode:
```bash
npm run dev
```

Or run them separately:
```bash
# Backend API
npm run dev:api

# Frontend Angular app
npm run dev:web
```

Access the applications:
- Frontend: http://localhost:4200
- Backend API: http://localhost:3000
- API Health Check: http://localhost:3000/health

### Building for Production

Build all applications:
```bash
npm run build
```

Build specific apps:
```bash
npm run build:api
npm run build:web
```

### Testing

Run all tests:
```bash
npm test
```

Run tests for specific apps:
```bash
npm run test:api
npm run test:web
```

### Linting

Run linting for all apps:
```bash
npm run lint
```

## Development Workflow

1. **Shared Types**: Define all shared interfaces in `packages/shared/src/types/`
2. **API Development**: Implement endpoints in `apps/api/src/`
3. **Frontend Development**: Build UI components in `apps/web/src/`
4. **Testing**: Write tests alongside your code
5. **Documentation**: Keep docs updated in `docs/` folder

## Coding Standards

- All public functions must have JSDoc comments
- Use shared types from `@nodeangularfullstack/shared`
- Follow Angular style guide for frontend
- Follow Express best practices for backend
- Validate all user input on both frontend and backend

## Environment Variables

See `.env.example` for all required environment variables.

## Docker Support

### Quick Start with Docker

The easiest way to run the entire stack is with Docker Compose:

```bash
# Start all services in background
npm run docker:up

# Or start with development hot-reload
npm run docker:up:dev

# View logs
npm run docker:logs

# Stop all services
npm run docker:down
```

### Docker Services

When running with Docker Compose, the following services are available:

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:4201 | Angular application (Docker) |
| Backend API | http://localhost:3001 | Express.js API (Docker) |
| PostgreSQL | localhost:5432 | Database (user: dbuser, pass: dbpassword) |
| Redis | localhost:6379 | Cache server |
| pgWeb | http://localhost:8080 | Database web interface |

**Note on Port Configuration:**
- Docker services use ports 3001 (API) and 4201 (Web) to avoid conflicts with local development
- Local development (without Docker) uses ports 3000 (API) and 4200 (Web)
- This allows running both Docker and local environments simultaneously

### Docker Commands

```bash
# Build images
npm run docker:build

# Start services
npm run docker:up

# Start with dev configuration (hot-reload)
npm run docker:up:dev

# View logs
npm run docker:logs

# Stop services
npm run docker:down

# Clean up (removes volumes)
npm run docker:clean

# Restart services
npm run docker:restart

# Run tests in containers
npm run docker:test

# Run tests for specific service
npm run docker:test:api
npm run docker:test:web

# Run linting in containers
npm run docker:lint

# Run linting for specific service
npm run docker:lint:api
npm run docker:lint:web
```

### Docker Development

The development Docker setup includes:
- Hot-reload for both Angular and Express.js
- Volume mounting for live code updates
- pgWeb for database inspection
- Proper health checks for all services
- Isolated network for security

## Contributing

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Ensure all tests pass
5. Submit a pull request

## License

ISC

## Support

For issues and questions, please check the `docs/` folder or create an issue in the repository.