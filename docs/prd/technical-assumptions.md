# Technical Assumptions

## Repository Structure: Monorepo
Single repository containing both frontend and backend with shared TypeScript types and utilities. This approach supports the brief's emphasis on easy adoption and consistent development environments while enabling rapid development and deployment.

## Service Architecture
**Monolith with Microservice Readiness:** RESTful API design implemented as unified Express.js application with clear service boundaries. Architecture supports future decomposition into microservices while maintaining simplicity for MVP scope and developer onboarding.

## Testing Requirements
**Unit + Integration Testing:** Comprehensive test coverage including unit tests for business logic, integration tests for API endpoints, and basic end-to-end testing for critical user journeys. Emphasis on testability through seed data and Swagger documentation for manual validation.

## Additional Technical Assumptions and Requests

**Frontend Technology Stack:**
- Angular 20+ with TypeScript for type safety and modern development patterns
- Tailwind CSS for rapid, consistent styling and professional appearance
- PrimeNG components for professional UI elements and reduced development time

**Backend Technology Stack:**
- Express.js with TypeScript for unified language across full stack
- JWT middleware for secure, stateless authentication
- OpenAPI 3.0 integration for comprehensive API documentation and testing

**Database and Infrastructure:**
- PostgreSQL 15+ with connection pooling for reliability and performance
- Docker containers (Ubuntu-based) for consistent development environments
- pgWeb admin interface for database inspection and debugging

**Development and Deployment:**
- Hot-reload development environment for rapid iteration
- Digital Ocean deployment optimization for cost-effective hosting
- Environment variable configuration for multi-tenancy toggle and system settings

**Quality and Security:**
- Automated security scanning to maintain zero high-severity vulnerabilities
- SQL injection prevention and XSS protection built into framework choices
- CORS configuration and JWT best practices for secure API access
