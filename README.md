# NodeAngularFullStack

[![Epic 33.1 Tests](https://github.com/yourusername/NodeAngularFullStack/actions/workflows/test-epic-33.1.yml/badge.svg)](https://github.com/yourusername/NodeAngularFullStack/actions/workflows/test-epic-33.1.yml)
[![CI](https://github.com/yourusername/NodeAngularFullStack/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/NodeAngularFullStack/actions/workflows/ci.yml)

A modern full-stack application built with Angular 20+ and Express.js, featuring TypeScript
throughout, shared types, and a monorepo structure with tool export capabilities for gradual service
extraction.

## Architecture

### Monolith-First with Export Capability

This project uses a **monolith-first architecture** with infrastructure for gradual service
extraction:

- **Core System**: Monolithic Express.js backend + Angular frontend (apps/api and apps/web)
- **Export Infrastructure**: Generate standalone service packages from registered tools
- **Database**: Single PostgreSQL instance for core system
- **Deployment Strategy**: Monolith remains primary system; exported tools can run independently

**Key Capabilities (Epics 30-33)**:

- **Tool Registry**: Track forms, workflows, and themes registered in the monolith
- **Export Orchestrator**: Multi-step export process using Strategy Pattern (Forms/Workflows/Themes)
- **Package Generation**: Creates .tar.gz archives with Express.js boilerplate, Docker configs,
  migrations, and tool data
- **CLI Scaffolding**: `npx @nodeangularfullstack/create-tool` to generate new service boilerplate
- **Download & Deploy**: Export packages can be deployed as standalone microservices externally

**Why Monolith-First?**

- Lower operational complexity during development
- Shared database simplifies transactions and data consistency
- Export system allows gradual extraction when needed (e.g., scaling, team autonomy)
- Backward compatible: existing features continue working while new tools can be exported

**Future Roadmap**: See `/MicroserviceDock/` for full microservices migration plans (API Gateway,
service mesh, distributed tracing).

## Tech Stack

- **Frontend**: Angular 20+ with standalone components
- **Backend**: Express.js with TypeScript
- **UI Library**: PrimeNG 17+ with Tailwind CSS
- **Database**: PostgreSQL 15+
- **Cache**: Redis 7+
- **State Management**: NgRx Signals
- **Authentication**: JWT with Passport.js
- **Testing**: Jest + Playwright

## Key Features

### Form Builder with Analytics & Data Visualization

Create custom forms and gain powerful insights from submission data:

- **Visual Form Builder**: Drag-and-drop interface for creating forms
- **Real-Time Analytics**: Interactive charts and statistics updated in real-time
- **Data Visualization**: Automatic chart selection based on field types
  - **Bar Charts**: For choice fields (SELECT, RADIO, CHECKBOX)
  - **Line Charts**: For date/time trends and numeric trends
  - **Pie Charts**: For binary choices (TOGGLE fields)
  - **Statistics Cards**: For numeric and text field analysis
- **Customizable Dashboard**: Show/hide fields, toggle between chart and table views
- **WCAG AA Accessible**: Full keyboard navigation, screen reader support, data table alternatives
- **Interactive Filtering**: Filter submissions and watch charts update automatically
- **Client-Side Performance**: Sub-second calculations for 1000+ submissions

📖 **Learn More**: [Form Analytics Charts User Guide](docs/user-guide/form-analytics-charts.md)

### Custom Theme System

Create stunning, branded forms with the powerful theme customization system:

- **Visual Theme Designer**: 5-step wizard for creating custom themes from Form Builder
- **Pre-Built Themes**: Choose from 9 professionally designed themes (Ocean Blue, Sunset Orange,
  Forest Green, etc.)
- **Custom Theme Creation**: Full control over colors, backgrounds, fonts, and styling
- **Advanced Backgrounds**: Solid colors, linear gradients, radial gradients with angle/position
  control
- **Google Fonts Integration**: Access 1000+ professional fonts for headings and body text
- **Real-Time Preview**: See changes instantly as you design your theme
- **Responsive Design**: Themes automatically adapt to mobile, tablet, and desktop
- **Per-Form Themes**: Apply different themes to different forms
- **Easy Theme Management**: Edit your themes anytime, changes apply to all forms using that theme
- **User Permissions**: All users can create themes, only owners/admins can edit
- **Performance Optimized**: CSS variable-based rendering for instant theme switching (<300ms
  preview updates)
- **Backward Compatible**: Existing forms without themes continue working with default styles

📖 **Learn More**:

- [Theme Creation Guide](docs/user-guides/theme-creation-guide.md)
- [Theme System Architecture](docs/architecture/theme-system.md)

### Tool Registry & Export System

Export tools as standalone, deployable microservice packages:

- **Tool Registry**: Track all registered tools (forms, workflows, themes) with metadata and status
- **Export Infrastructure**: Multi-step orchestration using Strategy Pattern for different tool
  types
- **Package Generation**: Creates complete .tar.gz archives containing:
  - Express.js/Node.js service boilerplate
  - Docker configuration (Dockerfile, docker-compose.yml)
  - Database migrations and schemas
  - Environment configuration templates
  - Tool-specific data (form schemas, theme configs, etc.)
  - README with deployment instructions
- **Progress Tracking**: Real-time export progress with step completion percentage
- **Security & Verification**: SHA-256 checksums for package integrity, download tracking, 30-day
  retention
- **CLI Scaffolding**: `npx @nodeangularfullstack/create-tool` to generate new service templates
- **Export History**: View past exports, re-download packages, monitor export status
- **Role-Based Access**: Export permissions based on tool ownership and admin roles
- **Rollback Support**: Automatic cleanup on export failure with step-by-step rollback

**Use Cases**:

- Extract high-traffic tools to separate services for independent scaling
- Deploy exported tools on different infrastructure (AWS, Azure, on-premise)
- Share tool packages with external teams or customers
- Create isolated microservices without breaking the monolith

📖 **Learn More**: See `docs/stories/30/`, `docs/stories/31/`, `docs/stories/32/`,
`docs/stories/33/` for detailed story documentation

### Authentication & Security

- JWT-based authentication with refresh tokens
- Role-based access control (Admin, User, ReadOnly)
- Password hashing with bcrypt
- Rate limiting and security headers
- CSRF protection

### Testing & Quality

- Comprehensive unit tests (Jest)
- E2E tests (Playwright)
- Automated accessibility testing (axe-core)
- Code coverage reporting
- TypeScript strict mode

## Project Structure

```
nodeangularfullstack/
├── apps/
│   ├── web/                    # Angular frontend application
│   │   └── src/app/features/
│   │       ├── admin/          # Tool Registry UI (ToolCard, Export History)
│   │       └── tools/          # Form Builder, Theme Designer
│   └── api/                    # Express.js backend API
│       ├── src/
│       │   ├── controllers/    # REST API endpoints (export, tool-registry)
│       │   ├── services/       # Export orchestrator, strategies
│       │   ├── repositories/   # Database access layer
│       │   └── jobs/           # Background job processors
│       └── database/
│           └── migrations/     # Tool Registry & Export Jobs schemas
├── packages/
│   ├── shared/                 # Shared types and utilities
│   │   └── src/types/
│   │       ├── export.types.ts         # ExportJob, ExportJobStatus
│   │       └── tool-registry.types.ts  # ToolRegistryRecord
│   ├── config/                 # Shared configuration
│   └── create-tool/            # CLI tool for scaffolding services (Epic 31)
├── infrastructure/             # Deployment infrastructure definitions
├── scripts/                    # Build and development scripts
├── docs/
│   ├── stories/                # User stories by epic (30-33: Export system)
│   │   ├── 30/                 # Tool Registry System
│   │   ├── 31/                 # CLI Scaffolding Tool
│   │   ├── 32/                 # Tool Registry UI
│   │   └── 33/                 # Export Core Infrastructure
│   ├── qa/gates/               # Quality gate validation files
│   └── architecture/           # System architecture documentation
└── MicroserviceDock/           # Microservices migration planning docs
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 14+ (Homebrew recommended on macOS)
- pgweb CLI (optional database UI)
- Redis 7+ (optional if you enable caching locally)

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

#### ⚡ One-Command Startup (Recommended)

```bash
# Start local backend, frontend, and pgWeb (requires PostgreSQL running locally)
./start-dev.sh
# OR
npm start
# OR
npm run dev
```

#### ⚡ One-Command Shutdown

```bash
# Stop all services
./stop-dev.sh
# OR
npm stop
```

#### Manual Development (Alternative)

Run services separately:

```bash
# Backend API
npm run dev:api

# Frontend Angular app
npm run dev:web
```

#### Service URLs

- **Frontend (Angular)**: http://localhost:4200
- **Backend API**: http://localhost:3000
- **API Documentation (Swagger)**: http://localhost:3000/api-docs
- **pgAdmin (Database UI)**: http://localhost:8080
- **API Health Check**: http://localhost:3000/health

#### Login Credentials

**pgAdmin Database UI:**

- Email: admin@admin.com
- Password: admin

**Test User Accounts:**

- Admin: admin@example.com / password123
- User: user@example.com / password123
- ReadOnly: readonly@example.com / password123

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

## Local Development (No Docker)

### Prerequisites

- Node.js 20+ with npm
- PostgreSQL 14 (recommended via Homebrew: `brew install postgresql@14`)
- pgweb CLI (optional database UI: `brew install pgweb`)

After installing PostgreSQL, start it with `brew services start postgresql@14` so that it runs in
the background. Create the development databases and users:

```bash
createdb nodeangularfullstack
createuser --interactive dbuser          # set password (e.g. dbpassword)
createdb -O dbuser nodeangularfullstack
createuser --interactive testuser        # password suggestion: testpass
createdb -O testuser nodeangularfullstack_test
```

### Quick Start

```bash
# Install dependencies
npm install

# Copy the environment template and update secrets as needed
cp .env.development .env.local
# Edit .env.local to match your local credentials

# Start everything (API, web, pgWeb)
./start-dev.sh

# Stop all services
./stop-dev.sh
```

The startup script loads `.env.development` by default. Set `ENV_FILE=.env.local` to target a custom
file:

```bash
ENV_FILE=.env.local ./start-dev.sh
```

### Running Individual Apps

You can still run each workspace separately:

```bash
npm --workspace=apps/api run dev   # API server (requires PostgreSQL)
npm --workspace=apps/web run dev   # Angular frontend
```

### Available Services

| Service             | URL                            |
| ------------------- | ------------------------------ |
| Frontend (Angular)  | http://localhost:4200          |
| Backend API         | http://localhost:3000          |
| API Docs            | http://localhost:3000/api-docs |
| pgWeb (database UI) | http://localhost:8080          |

Logs are written to the `logs/` folder while services are running. Remove them safely with
`./stop-dev.sh`.

If PostgreSQL is running via Homebrew you can stop it with:

```bash
brew services stop postgresql@14
```

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
