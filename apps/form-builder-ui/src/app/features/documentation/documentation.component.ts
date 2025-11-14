import { Component, inject, OnInit, signal, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

/**
 * Documentation section navigation interface
 */
export interface DocSection {
  id: string;
  title: string;
  icon: string;
  subsections?: { id: string; title: string }[];
}

/**
 * Documentation Component
 *
 * A comprehensive documentation page with left sidebar navigation.
 * Now integrated with MainLayoutComponent for consistent navigation.
 *
 * Features:
 * - Left sidebar with section navigation
 * - Smooth scrolling between sections
 * - Active section highlighting
 * - Mobile-responsive collapsible sidebar
 * - Complete documentation content
 */
@Component({
  selector: 'app-documentation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="documentation-container">
      <!-- Left Sidebar Navigation -->
      <aside class="doc-sidebar" [class.sidebar-open]="sidebarOpen()">
        <div class="sidebar-header">
          <h2 class="sidebar-title">
            <i class="pi pi-book"></i>
            Documentation
          </h2>
          <button
            class="sidebar-toggle md:hidden"
            (click)="toggleSidebar()"
            [attr.aria-label]="'Close sidebar'"
          >
            <i class="pi pi-times"></i>
          </button>
        </div>

        <nav class="sidebar-nav" role="navigation">
          @for (section of docSections; track section.id) {
            <div class="nav-section">
              <button
                class="nav-section-button"
                [class.active]="activeSection() === section.id"
                (click)="scrollToSection(section.id)"
              >
                <i [class]="section.icon" class="nav-icon"></i>
                {{ section.title }}
              </button>
              @if (section.subsections && activeSection() === section.id) {
                <div class="nav-subsections">
                  @for (subsection of section.subsections; track subsection.id) {
                    <button
                      class="nav-subsection-button"
                      [class.active]="activeSubsection() === subsection.id"
                      (click)="scrollToSection(subsection.id)"
                    >
                      {{ subsection.title }}
                    </button>
                  }
                </div>
              }
            </div>
          }
        </nav>
      </aside>

      <!-- Mobile Sidebar Overlay -->
      @if (sidebarOpen()) {
        <div class="sidebar-overlay md:hidden" (click)="toggleSidebar()"></div>
      }

      <!-- Floating Mobile Menu Toggle -->
      <button
        class="mobile-menu-toggle md:hidden"
        (click)="toggleSidebar()"
        [attr.aria-label]="'Open navigation menu'"
      >
        <i class="pi pi-bars"></i>
      </button>

      <!-- Main Content -->
      <main class="doc-main">
        <div class="doc-content">

          <!-- Quick Links Grid -->
          <section class="doc-section">
            <h2 class="doc-section-title">Quick Start</h2>
            <div class="doc-grid">
              <div class="doc-card" (click)="scrollToSection('getting-started')">
                <div class="doc-card-icon getting-started">
                  <i class="pi pi-play-circle"></i>
                </div>
                <div class="doc-card-content">
                  <h3>Getting Started</h3>
                  <p>Set up your development environment in minutes</p>
                </div>
              </div>
              <div class="doc-card" (click)="scrollToSection('architecture')">
                <div class="doc-card-icon architecture">
                  <i class="pi pi-sitemap"></i>
                </div>
                <div class="doc-card-content">
                  <h3>Architecture</h3>
                  <p>Understanding the project structure and patterns</p>
                </div>
              </div>
              <div class="doc-card" (click)="scrollToSection('api-docs')">
                <div class="doc-card-icon api">
                  <i class="pi pi-code"></i>
                </div>
                <div class="doc-card-content">
                  <h3>API Documentation</h3>
                  <p>Complete REST API reference and examples</p>
                </div>
              </div>
              <div class="doc-card" (click)="scrollToSection('contributing')">
                <div class="doc-card-icon contributing">
                  <i class="pi pi-users"></i>
                </div>
                <div class="doc-card-content">
                  <h3>Contributing</h3>
                  <p>Guidelines for contributing to the project</p>
                </div>
              </div>
            </div>
          </section>

          <!-- Getting Started Section -->
          <section id="getting-started" class="doc-section">
            <h2 class="doc-section-title">🚀 Getting Started</h2>
            <div class="doc-content-block">
              <h3>Prerequisites</h3>
              <div class="doc-list">
                <div class="doc-list-item">
                  <i class="pi pi-check-circle doc-check"></i>
                  <span><strong>Node.js 20+</strong> with npm</span>
                </div>
                <div class="doc-list-item">
                  <i class="pi pi-check-circle doc-check"></i>
                  <span><strong>PostgreSQL 14+</strong> (recommended via Homebrew)</span>
                </div>
                <div class="doc-list-item">
                  <i class="pi pi-check-circle doc-check"></i>
                  <span><strong>pgWeb CLI</strong> (optional database UI)</span>
                </div>
              </div>

              <h3>Quick Setup</h3>
              <div class="doc-code-block">
                <div class="doc-code-header">
                  <span class="doc-code-title">Terminal</span>
                  <button class="doc-copy-button" (click)="copyToClipboard('quick-setup')">
                    <i class="pi pi-copy"></i>
                  </button>
                </div>
                <pre id="quick-setup"><code># Install dependencies
npm install

# Start everything (API + Frontend + pgWeb)
./start-dev.sh

# Stop all services
./stop-dev.sh</code></pre>
              </div>

              <div class="doc-info-box">
                <div class="doc-info-icon">
                  <i class="pi pi-info-circle"></i>
                </div>
                <div class="doc-info-content">
                  <h4>Service URLs</h4>
                  <ul>
                    <li><strong>Frontend:</strong> <a href="http://localhost:4200" target="_blank" rel="noopener">http://localhost:4200</a></li>
                    <li><strong>Backend API:</strong> <a href="http://localhost:3000" target="_blank" rel="noopener">http://localhost:3000</a></li>
                    <li><strong>API Docs:</strong> <a href="http://localhost:3000/api-docs" target="_blank" rel="noopener">http://localhost:3000/api-docs</a></li>
                    <li><strong>Database UI:</strong> <a href="http://localhost:8080" target="_blank" rel="noopener">http://localhost:8080</a></li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <!-- Architecture Section -->
          <section id="architecture" class="doc-section">
            <h2 class="doc-section-title">🏗️ Architecture Overview</h2>
            <div class="doc-content-block">
              <h3>Tech Stack</h3>
              <div class="doc-tech-grid">
                <div class="doc-tech-item frontend">
                  <i class="pi pi-desktop"></i>
                  <div class="doc-tech-info">
                    <h4>Frontend</h4>
                    <p>Angular 20+ with standalone components, PrimeNG 17+, Tailwind CSS, NgRx Signals</p>
                  </div>
                </div>
                <div class="doc-tech-item backend">
                  <i class="pi pi-server"></i>
                  <div class="doc-tech-info">
                    <h4>Backend</h4>
                    <p>Express.js with TypeScript, JWT Authentication, PostgreSQL with connection pooling</p>
                  </div>
                </div>
                <div class="doc-tech-item database">
                  <i class="pi pi-database"></i>
                  <div class="doc-tech-info">
                    <h4>Database</h4>
                    <p>PostgreSQL 15+ with migration system, comprehensive seed data, pgWeb UI</p>
                  </div>
                </div>
              </div>

              <h3>Monorepo Structure</h3>
              <div class="doc-code-block">
                <div class="doc-code-header">
                  <span class="doc-code-title">Project Structure</span>
                </div>
                <pre><code>nodeangularfullstack/
├── apps/
│   ├── web/          # Angular 20+ frontend
│   └── api/          # Express.js backend
├── packages/
│   ├── shared/       # Shared types (@nodeangularfullstack/shared)
│   └── config/       # Shared configuration
├── scripts/          # Build and development scripts
└── docs/            # Documentation</code></pre>
              </div>
            </div>
          </section>

          <!-- API Documentation Section -->
          <section id="api-docs" class="doc-section">
            <h2 class="doc-section-title">🔌 API Documentation</h2>
            <div class="doc-content-block">
              <p>The API provides comprehensive REST endpoints with JWT authentication and role-based access control.</p>

              <h3>Test User Accounts</h3>
              <div class="doc-table-container">
                <table class="doc-table">
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Email</th>
                      <th>Password</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><span class="doc-badge admin">Admin</span></td>
                      <td>admin@example.com</td>
                      <td><code>User123!@#</code></td>
                    </tr>
                    <tr>
                      <td><span class="doc-badge user">User</span></td>
                      <td>user@example.com</td>
                      <td><code>User123!@#</code></td>
                    </tr>
                    <tr>
                      <td><span class="doc-badge readonly">ReadOnly</span></td>
                      <td>readonly@example.com</td>
                      <td><code>User123!@#</code></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="doc-action-buttons">
                <a href="http://localhost:3000/api-docs" target="_blank" rel="noopener" class="doc-button primary">
                  <i class="pi pi-external-link"></i>
                  View Interactive API Docs
                </a>
                <a href="http://localhost:3000/health" target="_blank" rel="noopener" class="doc-button secondary">
                  <i class="pi pi-heart"></i>
                  Check API Health
                </a>
              </div>
            </div>
          </section>

          <!-- Development Commands Section -->
          <section id="development" class="doc-section">
            <h2 class="doc-section-title">⚡ Development Commands</h2>
            <div class="doc-content-block">
              <h3>Essential Commands</h3>
              <div class="doc-command-grid">
                <div class="doc-command-card">
                  <h4>Start Development</h4>
                  <div class="doc-code-block small">
                    <pre><code># Start everything
npm start
./start-dev.sh

# Start API only
npm --workspace=apps/api run dev

# Start Frontend only
npm --workspace=apps/web run dev</code></pre>
                  </div>
                </div>
                <div class="doc-command-card">
                  <h4>Testing</h4>
                  <div class="doc-code-block small">
                    <pre><code># Run all tests
npm test

# API tests only
npm run test:api

# Frontend tests only
npm run test:web</code></pre>
                  </div>
                </div>
                <div class="doc-command-card">
                  <h4>Database</h4>
                  <div class="doc-code-block small">
                    <pre><code># Run migrations
npm --workspace=apps/api run db:migrate

# Seed test data
npm --workspace=apps/api run db:seed

# Reset database
npm --workspace=apps/api run db:reset</code></pre>
                  </div>
                </div>
                <div class="doc-command-card">
                  <h4>Quality Checks</h4>
                  <div class="doc-code-block small">
                    <pre><code># Build all apps
npm run build

# Lint code
npm run lint

# Type checking
npm run typecheck</code></pre>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Contributing Section -->
          <section id="contributing" class="doc-section">
            <h2 class="doc-section-title">🤝 Contributing</h2>
            <div class="doc-content-block">
              <h3>Development Workflow</h3>
              <div class="doc-workflow">
                <div class="doc-workflow-step">
                  <div class="doc-workflow-number">1</div>
                  <div class="doc-workflow-content">
                    <h4>Setup Branch</h4>
                    <div class="doc-code-block small">
                      <pre><code>git checkout develop
git pull upstream develop
git checkout -b feature/your-feature</code></pre>
                    </div>
                  </div>
                </div>
                <div class="doc-workflow-step">
                  <div class="doc-workflow-number">2</div>
                  <div class="doc-workflow-content">
                    <h4>Make Changes</h4>
                    <p>Follow coding standards, write tests, update documentation</p>
                  </div>
                </div>
                <div class="doc-workflow-step">
                  <div class="doc-workflow-number">3</div>
                  <div class="doc-workflow-content">
                    <h4>Test & Commit</h4>
                    <div class="doc-code-block small">
                      <pre><code>npm run quality:check
git add .
git commit -m "feat: your feature"</code></pre>
                    </div>
                  </div>
                </div>
                <div class="doc-workflow-step">
                  <div class="doc-workflow-number">4</div>
                  <div class="doc-workflow-content">
                    <h4>Create PR</h4>
                    <div class="doc-code-block small">
                      <pre><code>git push origin feature/your-feature
gh pr create --title "Feature: Your feature"</code></pre>
                    </div>
                  </div>
                </div>
              </div>

              <h3>Commit Message Format</h3>
              <div class="doc-commit-examples">
                <div class="doc-commit-example">
                  <div class="doc-commit-type feat">feat</div>
                  <span>New feature</span>
                </div>
                <div class="doc-commit-example">
                  <div class="doc-commit-type fix">fix</div>
                  <span>Bug fix</span>
                </div>
                <div class="doc-commit-example">
                  <div class="doc-commit-type docs">docs</div>
                  <span>Documentation changes</span>
                </div>
                <div class="doc-commit-example">
                  <div class="doc-commit-type refactor">refactor</div>
                  <span>Code refactoring</span>
                </div>
              </div>
            </div>
          </section>

          <!-- Troubleshooting Section -->
          <section id="troubleshooting" class="doc-section">
            <h2 class="doc-section-title">🔧 Troubleshooting</h2>
            <div class="doc-content-block">
              <div class="doc-troubleshoot-grid">
                <div class="doc-troubleshoot-item">
                  <h4>Backend Won't Start</h4>
                  <div class="doc-code-block small">
                    <pre><code># Check PostgreSQL status
brew services list | grep postgresql

# Verify connection
PGPASSWORD=dbpassword psql -h localhost -U dbuser -d nodeangularfullstack -c 'SELECT 1'</code></pre>
                  </div>
                </div>
                <div class="doc-troubleshoot-item">
                  <h4>Port Already in Use</h4>
                  <div class="doc-code-block small">
                    <pre><code># Find process using port
lsof -i:3000  # Backend
lsof -i:4200  # Frontend

# Kill process
kill -9 &lt;PID&gt;</code></pre>
                  </div>
                </div>
                <div class="doc-troubleshoot-item">
                  <h4>Database Issues</h4>
                  <div class="doc-code-block small">
                    <pre><code># Create database if missing
createdb -h localhost -U dbuser nodeangularfullstack

# Reset everything
npm run db:reset</code></pre>
                  </div>
                </div>
                <div class="doc-troubleshoot-item">
                  <h4>TypeScript Errors</h4>
                  <div class="doc-code-block small">
                    <pre><code># Check specific errors
npm run typecheck

# Skip pre-commit (temporary)
git commit --no-verify -m "message"</code></pre>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Footer -->
          <footer class="doc-footer">
            <div class="doc-footer-content">
              <p class="doc-footer-text">
                © 2025 NodeAngularFullStack. Built with Node.js, Angular, and PostgreSQL.
              </p>
              <div class="doc-footer-links">
                <a routerLink="/welcome" class="doc-footer-link">Welcome</a>
                <a routerLink="/app/dashboard" class="doc-footer-link">Form Builder</a>
                <a routerLink="/app/profile" class="doc-footer-link">Profile</a>
                <a href="https://github.com" target="_blank" rel="noopener" class="doc-footer-link">
                  <i class="pi pi-github"></i>
                  GitHub
                </a>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  `,
  styles: [
    `
      /* Main Container */
      .documentation-container {
        display: flex;
        min-height: calc(100vh - 4rem); /* Account for main layout header */
        background-color: var(--color-background);
        color: var(--color-text-primary);
        transition: var(--transition-colors);
      }

      /* Left Sidebar */
      .doc-sidebar {
        position: fixed;
        top: 0;
        left: 0;
        width: 16rem;
        height: 100vh;
        background-color: var(--color-surface);
        border-right: var(--border-width-1) solid var(--color-border-light);
        overflow-y: auto;
        z-index: 30;
        transform: translateX(-100%);
        transition: transform 0.3s ease-in-out;
      }

      .doc-sidebar.sidebar-open {
        transform: translateX(0);
      }

      @media (min-width: 768px) {
        .doc-sidebar {
          position: sticky;
          transform: translateX(0);
          top: 0;
          height: 100vh;
        }
      }

      /* Sidebar Header */
      .sidebar-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--spacing-4);
        border-bottom: var(--border-width-1) solid var(--color-border-light);
      }

      .sidebar-title {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
        margin: 0;
      }

      .sidebar-title i {
        color: var(--color-primary-600);
      }

      .sidebar-toggle {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        border: none;
        background: transparent;
        color: var(--color-text-secondary);
        border-radius: var(--border-radius-md);
        transition: var(--transition-colors);
      }

      .sidebar-toggle:hover {
        background-color: var(--color-gray-100);
        color: var(--color-text-primary);
      }

      /* Sidebar Navigation */
      .sidebar-nav {
        padding: var(--spacing-4) 0;
      }

      .nav-section {
        margin-bottom: var(--spacing-2);
      }

      .nav-section-button {
        display: flex;
        align-items: center;
        gap: var(--spacing-3);
        width: 100%;
        padding: var(--spacing-3) var(--spacing-4);
        border: none;
        background: transparent;
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        text-align: left;
        transition: var(--transition-colors);
        cursor: pointer;
      }

      .nav-section-button:hover {
        background-color: var(--color-gray-100);
        color: var(--color-text-primary);
      }

      .nav-section-button.active {
        background-color: var(--color-primary-50);
        color: var(--color-primary-700);
        border-right: 3px solid var(--color-primary-600);
      }

      .nav-icon {
        color: var(--color-text-muted);
        font-size: var(--font-size-base);
        width: 1.25rem;
        text-align: center;
      }

      .nav-section-button.active .nav-icon {
        color: var(--color-primary-600);
      }

      .nav-subsections {
        padding-left: var(--spacing-6);
        margin-top: var(--spacing-1);
      }

      .nav-subsection-button {
        display: block;
        width: 100%;
        padding: var(--spacing-2) var(--spacing-4);
        border: none;
        background: transparent;
        color: var(--color-text-muted);
        font-size: var(--font-size-xs);
        text-align: left;
        transition: var(--transition-colors);
        cursor: pointer;
      }

      .nav-subsection-button:hover {
        color: var(--color-text-secondary);
      }

      .nav-subsection-button.active {
        color: var(--color-primary-600);
        font-weight: var(--font-weight-medium);
      }

      /* Sidebar Overlay for Mobile */
      .sidebar-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 25;
      }

      /* Mobile Menu Toggle Button */
      .mobile-menu-toggle {
        position: fixed;
        top: 1rem;
        left: 1rem;
        width: 3rem;
        height: 3rem;
        background-color: var(--color-primary-600);
        color: white;
        border: none;
        border-radius: var(--border-radius-full);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: var(--font-size-lg);
        cursor: pointer;
        box-shadow: var(--shadow-lg);
        z-index: 20;
        transition: all 0.2s ease-in-out;
      }

      .mobile-menu-toggle:hover {
        background-color: var(--color-primary-700);
        transform: scale(1.05);
      }

      .mobile-menu-toggle:active {
        transform: scale(0.95);
      }

      .doc-nav-container {
        max-width: 1280px;
        margin: 0 auto;
        padding: 0 var(--spacing-4);
        display: flex;
        justify-content: space-between;
        align-items: center;
        height: 4rem;
      }

      .doc-nav-brand .brand-link {
        display: flex;
        align-items: center;
        gap: var(--spacing-3);
        color: var(--color-text-primary);
        text-decoration: none;
        font-weight: var(--font-weight-medium);
        transition: var(--transition-colors);
      }

      .doc-nav-brand .brand-link:hover {
        color: var(--color-primary-600);
      }

      .brand-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        background-color: var(--color-primary-100);
        border-radius: var(--border-radius-md);
        transition: var(--transition-colors);
      }

      .brand-icon i {
        color: var(--color-primary-600);
        font-size: var(--font-size-base);
      }

      .doc-nav-actions {
        display: flex;
        align-items: center;
        gap: var(--spacing-4);
      }

      .dashboard-link {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
        padding: var(--spacing-2) var(--spacing-3);
        color: var(--color-text-secondary);
        text-decoration: none;
        border-radius: var(--border-radius-md);
        transition: var(--transition-colors);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
      }

      .dashboard-link:hover {
        color: var(--color-primary-600);
        background-color: var(--color-primary-50);
      }

      /* Main Content */
      .doc-main {
        flex: 1;
        margin-left: 0;
        transition: margin-left 0.3s ease-in-out;
      }

      @media (min-width: 768px) {
        .doc-main {
          // margin-left: 16rem; /* Match sidebar width */
        }
      }

      .doc-content {
        max-width: 1024px;
        margin: 0 auto;
        padding: var(--spacing-8) var(--spacing-4);
      }

      /* Hero Section */
      .doc-hero {
        text-align: center;
        padding: var(--spacing-12) 0 var(--spacing-16);
      }

      .doc-hero-title {
        font-size: clamp(2.5rem, 5vw, 3.5rem);
        font-weight: var(--font-weight-bold);
        color: var(--color-text-primary);
        margin-bottom: var(--spacing-4);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-4);
      }

      .doc-hero-icon {
        color: var(--color-primary-600);
        font-size: clamp(2rem, 4vw, 3rem);
      }

      .doc-hero-subtitle {
        font-size: var(--font-size-xl);
        color: var(--color-text-secondary);
        max-width: 48rem;
        margin: 0 auto;
        line-height: var(--line-height-relaxed);
      }

      /* Sections */
      .doc-section {
        margin-bottom: var(--spacing-16);
      }

      .doc-section-title {
        font-size: var(--font-size-3xl);
        font-weight: var(--font-weight-bold);
        color: var(--color-text-primary);
        margin-bottom: var(--spacing-8);
        border-bottom: 2px solid var(--color-primary-200);
        padding-bottom: var(--spacing-4);
      }

      .doc-content-block {
        background-color: var(--color-surface);
        border-radius: var(--border-radius-lg);
        padding: var(--spacing-8);
        box-shadow: var(--shadow-sm);
        border: var(--border-width-1) solid var(--color-border-light);
        transition: var(--transition-colors);
      }

      .doc-content-block h3 {
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
        margin-bottom: var(--spacing-4);
        margin-top: var(--spacing-6);
      }

      .doc-content-block h3:first-child {
        margin-top: 0;
      }

      .doc-content-block h4 {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-primary);
        margin-bottom: var(--spacing-3);
      }

      .doc-content-block p {
        color: var(--color-text-secondary);
        line-height: var(--line-height-relaxed);
        margin-bottom: var(--spacing-4);
      }

      /* Quick Links Grid */
      .doc-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: var(--spacing-6);
        margin-bottom: var(--spacing-8);
      }

      .doc-card {
        background-color: var(--color-surface);
        border-radius: var(--border-radius-lg);
        padding: var(--spacing-6);
        border: var(--border-width-1) solid var(--color-border-light);
        transition: all 0.3s ease;
        cursor: pointer;
        display: flex;
        align-items: flex-start;
        gap: var(--spacing-4);
      }

      .doc-card:hover {
        box-shadow: var(--shadow-lg);
        transform: translateY(-2px);
        border-color: var(--color-primary-300);
      }

      .doc-card-icon {
        width: 3rem;
        height: 3rem;
        border-radius: var(--border-radius-lg);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: var(--font-size-xl);
        color: white;
        flex-shrink: 0;
      }

      .doc-card-icon.getting-started {
        background: linear-gradient(135deg, var(--color-green-500), var(--color-green-600));
      }

      .doc-card-icon.architecture {
        background: linear-gradient(135deg, var(--color-blue-500), var(--color-blue-600));
      }

      .doc-card-icon.api {
        background: linear-gradient(135deg, var(--color-purple-500), var(--color-purple-600));
      }

      .doc-card-icon.contributing {
        background: linear-gradient(135deg, var(--color-orange-500), var(--color-orange-600));
      }

      .doc-card-content h3 {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
        margin-bottom: var(--spacing-2);
        margin-top: 0;
      }

      .doc-card-content p {
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
        line-height: var(--line-height-relaxed);
        margin: 0;
      }

      /* Lists */
      .doc-list {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-3);
        margin-bottom: var(--spacing-6);
      }

      .doc-list-item {
        display: flex;
        align-items: center;
        gap: var(--spacing-3);
        padding: var(--spacing-3);
        background-color: var(--color-gray-50);
        border-radius: var(--border-radius-md);
        transition: var(--transition-colors);
      }

      .doc-check {
        color: var(--color-green-600);
        font-size: var(--font-size-lg);
        flex-shrink: 0;
      }

      /* Code Blocks */
      .doc-code-block {
        background-color: var(--color-gray-900);
        border-radius: var(--border-radius-lg);
        overflow: hidden;
        margin-bottom: var(--spacing-6);
        box-shadow: var(--shadow-sm);
      }

      .doc-code-block.small {
        margin-bottom: var(--spacing-4);
      }

      .doc-code-header {
        background-color: var(--color-gray-800);
        padding: var(--spacing-3) var(--spacing-4);
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--color-gray-700);
      }

      .doc-code-title {
        color: var(--color-gray-300);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
      }

      .doc-copy-button {
        background: transparent;
        border: 1px solid var(--color-gray-600);
        color: var(--color-gray-300);
        padding: var(--spacing-1) var(--spacing-2);
        border-radius: var(--border-radius-sm);
        cursor: pointer;
        font-size: var(--font-size-sm);
        transition: all 0.2s ease;
      }

      .doc-copy-button:hover {
        background-color: var(--color-gray-700);
        color: white;
      }

      .doc-code-block pre {
        padding: var(--spacing-4);
        margin: 0;
        overflow-x: auto;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: var(--font-size-sm);
        line-height: 1.5;
      }

      .doc-code-block code {
        color: var(--color-gray-100);
        background: transparent;
        padding: 0;
        border-radius: 0;
      }

      /* Info Box */
      .doc-info-box {
        background: linear-gradient(135deg, var(--color-blue-50), var(--color-blue-100));
        border: var(--border-width-1) solid var(--color-blue-200);
        border-radius: var(--border-radius-lg);
        padding: var(--spacing-6);
        display: flex;
        gap: var(--spacing-4);
        margin-bottom: var(--spacing-6);
      }

      .doc-info-icon {
        color: var(--color-blue-600);
        font-size: var(--font-size-xl);
        flex-shrink: 0;
      }

      .doc-info-content h4 {
        color: var(--color-blue-800);
        font-weight: var(--font-weight-semibold);
        margin-bottom: var(--spacing-3);
        margin-top: 0;
      }

      .doc-info-content ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .doc-info-content li {
        padding: var(--spacing-1) 0;
        color: var(--color-blue-700);
      }

      .doc-info-content a {
        color: var(--color-blue-600);
        text-decoration: none;
        font-weight: var(--font-weight-medium);
      }

      .doc-info-content a:hover {
        text-decoration: underline;
      }

      /* Tech Grid */
      .doc-tech-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: var(--spacing-6);
        margin-bottom: var(--spacing-6);
      }

      .doc-tech-item {
        display: flex;
        align-items: flex-start;
        gap: var(--spacing-4);
        padding: var(--spacing-4);
        background-color: var(--color-gray-50);
        border-radius: var(--border-radius-lg);
        transition: var(--transition-colors);
      }

      .doc-tech-item i {
        font-size: var(--font-size-2xl);
        width: 3rem;
        height: 3rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--border-radius-lg);
        color: white;
        flex-shrink: 0;
      }

      .doc-tech-item.frontend i {
        background: linear-gradient(135deg, var(--color-red-500), var(--color-red-600));
      }

      .doc-tech-item.backend i {
        background: linear-gradient(135deg, var(--color-green-500), var(--color-green-600));
      }

      .doc-tech-item.database i {
        background: linear-gradient(135deg, var(--color-blue-500), var(--color-blue-600));
      }

      .doc-tech-info h4 {
        margin-top: 0;
        margin-bottom: var(--spacing-2);
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
      }

      .doc-tech-info p {
        margin: 0;
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
        line-height: var(--line-height-relaxed);
      }

      /* Table */
      .doc-table-container {
        overflow-x: auto;
        margin-bottom: var(--spacing-6);
        border-radius: var(--border-radius-lg);
        box-shadow: var(--shadow-sm);
      }

      .doc-table {
        width: 100%;
        border-collapse: collapse;
        background-color: var(--color-surface);
      }

      .doc-table th,
      .doc-table td {
        padding: var(--spacing-3) var(--spacing-4);
        text-align: left;
        border-bottom: var(--border-width-1) solid var(--color-border-light);
      }

      .doc-table th {
        background-color: var(--color-gray-50);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
        font-size: var(--font-size-sm);
      }

      .doc-table td {
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
      }

      .doc-table code {
        background-color: var(--color-gray-100);
        padding: var(--spacing-1) var(--spacing-2);
        border-radius: var(--border-radius-sm);
        font-size: var(--font-size-xs);
        color: var(--color-text-primary);
      }

      /* Badges */
      .doc-badge {
        display: inline-flex;
        align-items: center;
        padding: var(--spacing-1) var(--spacing-2);
        border-radius: var(--border-radius-full);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
        text-transform: uppercase;
        letter-spacing: 0.025em;
      }

      .doc-badge.admin {
        background-color: var(--color-red-100);
        color: var(--color-red-800);
      }

      .doc-badge.user {
        background-color: var(--color-blue-100);
        color: var(--color-blue-800);
      }

      .doc-badge.readonly {
        background-color: var(--color-gray-100);
        color: var(--color-gray-800);
      }

      /* Action Buttons */
      .doc-action-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: var(--spacing-4);
        margin-top: var(--spacing-6);
      }

      .doc-button {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-2);
        padding: var(--spacing-3) var(--spacing-6);
        border-radius: var(--border-radius-lg);
        text-decoration: none;
        font-weight: var(--font-weight-medium);
        font-size: var(--font-size-sm);
        transition: all 0.2s ease;
        border: var(--border-width-2) solid transparent;
      }

      .doc-button.primary {
        background-color: var(--color-primary-600);
        color: white;
      }

      .doc-button.primary:hover {
        background-color: var(--color-primary-700);
        transform: translateY(-1px);
        box-shadow: var(--shadow-md);
      }

      .doc-button.secondary {
        background-color: transparent;
        color: var(--color-text-primary);
        border-color: var(--color-border);
      }

      .doc-button.secondary:hover {
        background-color: var(--color-gray-50);
        border-color: var(--color-primary-300);
      }

      /* Command Grid */
      .doc-command-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: var(--spacing-6);
      }

      .doc-command-card {
        background-color: var(--color-gray-50);
        border-radius: var(--border-radius-lg);
        padding: var(--spacing-6);
        transition: var(--transition-colors);
      }

      .doc-command-card h4 {
        margin-top: 0;
        margin-bottom: var(--spacing-4);
        color: var(--color-text-primary);
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
      }

      /* Workflow */
      .doc-workflow {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-6);
        margin-bottom: var(--spacing-8);
      }

      .doc-workflow-step {
        display: flex;
        gap: var(--spacing-4);
        align-items: flex-start;
      }

      .doc-workflow-number {
        width: 2.5rem;
        height: 2.5rem;
        background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
        color: white;
        border-radius: var(--border-radius-full);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: var(--font-weight-bold);
        font-size: var(--font-size-sm);
        flex-shrink: 0;
      }

      .doc-workflow-content {
        flex: 1;
      }

      .doc-workflow-content h4 {
        margin-top: 0;
        margin-bottom: var(--spacing-2);
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
      }

      .doc-workflow-content p {
        margin-bottom: var(--spacing-3);
        color: var(--color-text-secondary);
      }

      /* Commit Examples */
      .doc-commit-examples {
        display: flex;
        flex-wrap: wrap;
        gap: var(--spacing-4);
      }

      .doc-commit-example {
        display: flex;
        align-items: center;
        gap: var(--spacing-3);
        padding: var(--spacing-3) var(--spacing-4);
        background-color: var(--color-gray-50);
        border-radius: var(--border-radius-lg);
        transition: var(--transition-colors);
      }

      .doc-commit-type {
        padding: var(--spacing-1) var(--spacing-3);
        border-radius: var(--border-radius-full);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-bold);
        text-transform: uppercase;
        color: white;
      }

      .doc-commit-type.feat {
        background-color: var(--color-green-600);
      }

      .doc-commit-type.fix {
        background-color: var(--color-red-600);
      }

      .doc-commit-type.docs {
        background-color: var(--color-blue-600);
      }

      .doc-commit-type.refactor {
        background-color: var(--color-purple-600);
      }

      /* Troubleshooting Grid */
      .doc-troubleshoot-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: var(--spacing-6);
      }

      .doc-troubleshoot-item {
        background-color: var(--color-gray-50);
        border-radius: var(--border-radius-lg);
        padding: var(--spacing-6);
        transition: var(--transition-colors);
      }

      .doc-troubleshoot-item h4 {
        margin-top: 0;
        margin-bottom: var(--spacing-4);
        color: var(--color-text-primary);
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
      }

      /* Footer */
      .doc-footer {
        background-color: var(--color-surface);
        border-top: var(--border-width-1) solid var(--color-border-light);
        padding: var(--spacing-8) 0;
        margin-top: var(--spacing-16);
        transition: var(--transition-colors);
      }

      .doc-footer-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--spacing-4);
        text-align: center;
      }

      .doc-footer-text {
        color: var(--color-text-secondary);
        margin: 0;
      }

      .doc-footer-links {
        display: flex;
        flex-wrap: wrap;
        gap: var(--spacing-6);
      }

      .doc-footer-link {
        color: var(--color-text-secondary);
        text-decoration: none;
        font-size: var(--font-size-sm);
        display: flex;
        align-items: center;
        gap: var(--spacing-1);
        transition: var(--transition-colors);
      }

      .doc-footer-link:hover {
        color: var(--color-primary-600);
      }

      /* Dark theme adjustments */

      /* Sidebar dark theme */
      [data-theme='dark'] .doc-sidebar {
        background-color: var(--color-gray-900);
        border-right-color: var(--color-border);
      }

      [data-theme='dark'] .sidebar-header {
        border-bottom-color: var(--color-border);
      }

      [data-theme='dark'] .sidebar-toggle:hover {
        background-color: var(--color-gray-800);
      }

      [data-theme='dark'] .nav-section-button:hover {
        background-color: var(--color-gray-800);
      }

      [data-theme='dark'] .nav-section-button.active {
        background-color: var(--color-primary-900);
        color: var(--color-primary-300);
      }

      [data-theme='dark'] .nav-section-button.active .nav-icon {
        color: var(--color-primary-400);
      }

      [data-theme='dark'] .nav-subsection-button.active {
        color: var(--color-primary-400);
      }

      /* Content dark theme fixes */
      [data-theme='dark'] .doc-info-box {
        background: linear-gradient(135deg, var(--color-blue-900), var(--color-blue-800));
        border-color: var(--color-blue-700);
      }

      [data-theme='dark'] .doc-info-content h4 {
        color: var(--color-blue-200);
      }

      [data-theme='dark'] .doc-info-content li {
        color: var(--color-blue-300);
      }

      [data-theme='dark'] .doc-info-content a {
        color: var(--color-blue-400);
      }

      [data-theme='dark'] .doc-list-item {
        background-color: var(--color-gray-800);
      }

      [data-theme='dark'] .doc-tech-item,
      [data-theme='dark'] .doc-command-card,
      [data-theme='dark'] .doc-troubleshoot-item,
      [data-theme='dark'] .doc-commit-example {
        background-color: var(--color-gray-800);
      }

      [data-theme='dark'] .doc-table th {
        background-color: var(--color-gray-800);
      }

      [data-theme='dark'] .doc-table code {
        background-color: var(--color-gray-700);
        color: var(--color-text-primary);
      }

      [data-theme='dark'] .doc-button.secondary:hover {
        background-color: var(--color-gray-800);
      }

      /* Badge dark theme fixes */
      [data-theme='dark'] .doc-badge.admin {
        background-color: var(--color-red-900);
        color: var(--color-red-200);
      }

      [data-theme='dark'] .doc-badge.user {
        background-color: var(--color-blue-900);
        color: var(--color-blue-200);
      }

      [data-theme='dark'] .doc-badge.readonly {
        background-color: var(--color-gray-700);
        color: var(--color-gray-200);
      }

      /* Responsive Design */
      @media (max-width: 768px) {
        .doc-nav-container {
          padding: 0 var(--spacing-3);
        }

        .doc-main {
          padding: 0 var(--spacing-3);
        }

        .doc-hero-title {
          flex-direction: column;
          gap: var(--spacing-2);
        }

        .doc-grid {
          grid-template-columns: 1fr;
        }

        .doc-tech-grid,
        .doc-command-grid,
        .doc-troubleshoot-grid {
          grid-template-columns: 1fr;
        }

        .doc-content-block {
          padding: var(--spacing-6);
        }

        .doc-workflow-step {
          flex-direction: column;
          text-align: center;
        }

        .doc-commit-examples {
          flex-direction: column;
        }

        .doc-action-buttons {
          flex-direction: column;
        }

        .doc-nav-actions {
          gap: var(--spacing-2);
        }

        .dashboard-link span {
          display: none;
        }

        .brand-text {
          display: none;
        }
      }

      /* Smooth scrolling */
      html {
        scroll-behavior: smooth;
      }

      /* Focus styles */
      .doc-card:focus,
      .doc-button:focus,
      .doc-copy-button:focus {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: 2px;
      }
    `,
  ],
})
export class DocumentationComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef);

  protected readonly sidebarOpen = signal(false);
  protected readonly activeSection = signal('getting-started');
  protected readonly activeSubsection = signal('');

  /**
   * Documentation sections for sidebar navigation
   */
  protected readonly docSections: DocSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: 'pi pi-play-circle',
      subsections: [
        { id: 'prerequisites', title: 'Prerequisites' },
        { id: 'quick-setup', title: 'Quick Setup' },
      ],
    },
    {
      id: 'architecture',
      title: 'Architecture',
      icon: 'pi pi-sitemap',
      subsections: [
        { id: 'monorepo-structure', title: 'Monorepo Structure' },
        { id: 'backend-arch', title: 'Backend Architecture' },
        { id: 'frontend-arch', title: 'Frontend Architecture' },
      ],
    },
    {
      id: 'api-docs',
      title: 'API Documentation',
      icon: 'pi pi-code',
      subsections: [
        { id: 'endpoints', title: 'Endpoints' },
        { id: 'authentication', title: 'Authentication' },
        { id: 'error-handling', title: 'Error Handling' },
      ],
    },
    {
      id: 'development',
      title: 'Development',
      icon: 'pi pi-wrench',
      subsections: [
        { id: 'setup', title: 'Local Setup' },
        { id: 'testing', title: 'Testing' },
        { id: 'commands', title: 'Commands' },
      ],
    },
    {
      id: 'contributing',
      title: 'Contributing',
      icon: 'pi pi-users',
      subsections: [
        { id: 'guidelines', title: 'Guidelines' },
        { id: 'commit-workflow', title: 'Commit Workflow' },
        { id: 'pull-requests', title: 'Pull Requests' },
      ],
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: 'pi pi-exclamation-triangle',
    },
  ];

  ngOnInit(): void {
    // Scroll to top on component init
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.setupScrollListener();
  }

  /**
   * Toggle sidebar visibility
   */
  public toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  /**
   * Setup scroll listener for active section tracking
   */
  private setupScrollListener(): void {
    // Implementation for tracking scroll position and updating active section
    // This would be enhanced with intersection observer in a real implementation
  }

  /**
   * Scroll to a specific section on the page
   */
  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /**
   * Copy code to clipboard
   */
  copyToClipboard(elementId: string): void {
    const element = document.getElementById(elementId);
    if (element) {
      const text = element.textContent || '';
      navigator.clipboard
        .writeText(text)
        .then(() => {
          // You could add a toast notification here
          console.log('Code copied to clipboard');
        })
        .catch((err) => {
          console.error('Failed to copy code: ', err);
        });
    }
  }
}
