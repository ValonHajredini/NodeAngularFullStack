# Unified Project Structure

```plaintext
nodeangularfullstack/
├── .github/                        # CI/CD workflows
│   └── workflows/
│       ├── ci.yaml                # Test and lint on PR
│       └── deploy.yaml            # Deploy to Digital Ocean
├── apps/                          # Application packages
│   ├── web/                       # Angular frontend
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── core/         # Singleton services
│   │   │   │   ├── features/     # Feature modules
│   │   │   │   ├── shared/       # Shared components
│   │   │   │   └── layouts/      # Layout components
│   │   │   ├── assets/           # Static assets
│   │   │   ├── environments/     # Environment configs
│   │   │   └── styles/           # Global styles
│   │   ├── public/               # Public assets
│   │   ├── angular.json
│   │   ├── tailwind.config.js
│   │   └── package.json
│   └── api/                      # Express.js backend
│       ├── src/
│       │   ├── routes/           # API routes
│       │   ├── controllers/      # Route handlers
│       │   ├── services/         # Business logic
│       │   ├── repositories/     # Data access
│       │   ├── middleware/       # Express middleware
│       │   ├── validators/       # Input validation
│       │   ├── utils/           # Utilities
│       │   └── server.ts        # Server entry
│       ├── migrations/          # Database migrations
│       ├── seeds/              # Seed data
│       ├── tests/              # API tests
│       └── package.json
├── packages/                    # Shared packages
│   ├── shared/                 # Shared types/utils
│   │   ├── src/
│   │   │   ├── types/         # TypeScript interfaces
│   │   │   ├── constants/     # Shared constants
│   │   │   ├── validators/    # Shared validators
│   │   │   └── utils/        # Shared utilities
│   │   └── package.json
│   └── config/                # Shared configuration
│       ├── eslint/           # ESLint rules
│       ├── typescript/       # TS config
│       └── jest/            # Jest config
├── infrastructure/           # Infrastructure as code
│   ├── docker/
│   │   ├── Dockerfile.web   # Angular container
│   │   ├── Dockerfile.api   # Express container
│   │   └── nginx.conf      # Nginx config
│   └── docker-compose.yml  # Local development
├── scripts/                # Build/deploy scripts
│   ├── setup.sh           # Initial setup
│   ├── migrate.sh         # Run migrations
│   └── seed.sh           # Load seed data
├── docs/                  # Documentation
│   ├── prd.md
│   ├── architecture.md   # This document
│   └── api/              # API docs
├── .env.example          # Environment template
├── package.json          # Root package.json
├── nx.json              # Nx configuration (if using)
└── README.md            # Getting started guide
```
