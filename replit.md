# Finance Management System - replit.md

## Overview

This is a comprehensive finance management system built with a modern full-stack architecture. The application enables multi-branch invoice management, supplier tracking, financial analytics, and role-based access control. It's designed for businesses that need to manage invoices, track payments, monitor supplier relationships, and gain insights into their financial performance across multiple locations.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Bundler**: Vite for fast development and optimized builds
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query (React Query) for server state
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with session-based authentication
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Authentication**: Passport.js with local strategy using scrypt password hashing
- **Security**: Comprehensive security middleware including rate limiting, CSRF protection, and intrusion detection
- **File Upload**: Multer for invoice document handling

### Database Design
- **Primary Database**: PostgreSQL (configured for Neon serverless)
- **Schema Management**: Drizzle Kit for migrations
- **Key Tables**: users, branches, suppliers, invoices, financial_transactions, roles, role_permissions
- **Data Relationships**: Foreign key constraints between branches, suppliers, and invoices

## Key Components

### Authentication & Authorization
- **Multi-role System**: Admin, branch manager, accountant roles
- **Custom Role Management**: Extensible role-permission system
- **Page-level Access Control**: Granular permissions for different application sections
- **Session Security**: Secure session handling with memory store

### Invoice Management
- **Invoice Types**: Standard, credit notes, and cash invoices
- **Payment Tracking**: Detailed payment records with bank transfers and cheques
- **File Attachments**: Support for invoice document uploads
- **Bulk Operations**: Mass payment processing capabilities

### Financial Analytics
- **Real-time Dashboards**: Revenue tracking, cash flow analysis
- **Risk Assessment**: Supplier payment delay analysis and risk scoring
- **Forecasting**: Revenue prediction using historical data
- **Multi-branch Reporting**: Consolidated and branch-specific financial views

### Supplier Management
- **Comprehensive Profiles**: Contact information, payment terms, notes
- **Outstanding Balance Tracking**: Real-time debt calculation across branches
- **Risk Analytics**: Payment behavior analysis and risk scoring
- **Branch-specific Relationships**: Supplier balances per branch location

## Data Flow

### Request Flow
1. Client requests authenticated through session middleware
2. Role-based access control validates page permissions
3. API routes handle business logic and database operations
4. Responses formatted and returned with appropriate security headers

### Data Synchronization
- TanStack Query manages client-side caching and synchronization
- Optimistic updates for improved user experience
- Real-time data refresh on mutation success
- Error boundary handling for failed operations

### File Handling
- Invoice documents uploaded to local storage
- File validation and size limits enforced
- Secure file serving with authentication checks

## External Dependencies

### Core Dependencies
- **Database**: @neondatabase/serverless for PostgreSQL connection
- **Authentication**: passport, express-session, bcryptjs
- **Validation**: zod schema validation throughout the stack
- **UI Library**: Comprehensive Radix UI component suite
- **Charts**: Recharts for financial data visualization
- **Date Handling**: date-fns for consistent date formatting

### Security Dependencies
- **Rate Limiting**: express-rate-limit for API protection
- **Security Headers**: helmet for HTTP security headers
- **CSRF Protection**: Built-in CSRF token generation and validation
- **Input Sanitization**: XSS and SQL injection protection

### Development Dependencies
- **Build Tools**: esbuild for server bundling, Vite for client
- **Type Safety**: TypeScript with strict configuration
- **Code Quality**: ESLint and Prettier configuration ready

## Deployment Strategy

### Build Process
- **Client Build**: Vite builds optimized static assets to `dist/public`
- **Server Build**: esbuild bundles server code to `dist/index.js`
- **Database Migrations**: Automatically applied via Drizzle Kit

### Environment Configuration
- **Development**: Hot reloading with Vite middleware integration
- **Production**: Optimized builds with static file serving
- **Database**: Environment-based connection string configuration

### Replit Integration
- **Auto-scaling Deployment**: Configured for Replit's autoscale infrastructure
- **Port Configuration**: Port 5000 mapped to external port 80
- **Module Requirements**: Node.js 20, web server, PostgreSQL 16

## Changelog
- July 17, 2025. Search engine indexing blocked and CSV export enhanced
  - Added comprehensive search engine blocking with robots.txt and meta tags
  - All major search engines (Google, Bing, Yahoo, DuckDuckGo, Baidu, Yandex) blocked from indexing
  - Payment tracking page now has CSV export functionality with filter support
  - CSV export includes all payment details including cheque numbers
  - Dashboard date range filters now work properly with new backend API
  - Credit Note automatic payment system implemented with disabled form fields
- July 10, 2025. Multi-branch supplier management system completed
  - Suppliers can now be assigned to multiple branches simultaneously
  - Edit supplier form loads complete branch information and saves changes properly
  - Fixed React Hook Form checkbox array handling (object to array conversion)
  - Branch assignment works correctly for both new and existing suppliers
  - Cache invalidation and form reset mechanisms implemented
  - All supplier operations now support multi-branch functionality
- June 29, 2025. Enhanced branch-based access control and UI restrictions
  - Suppliers page: All users can now see all suppliers (removed branch filtering)
  - Invoices & Payment Tracking: Branch selection locked for Branch Managers (auto-selected to their branch)
  - Branch Managers cannot change branch filter in Invoices and Payment Tracking pages
  - Roles page: Completely restricted to Admin users only (Branch Managers blocked)
  - Applied branch filtering to all analytics and financial data endpoints
  - Dashboard shows branch-specific metrics for Branch Managers
- June 26, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.