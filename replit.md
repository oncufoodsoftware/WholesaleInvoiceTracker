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
- October 17, 2025. Complete dashboard redesign and invoice display bug fixes
  - **DASHBOARD REDESIGN**: Completely new modern, clean dashboard layout
  - Removed complex widgets and replaced with simple, effective metric cards
  - Added 4 key metric cards: Total Invoices, Paid Amount, Outstanding, Payment Rate
  - Added 2 analytics charts: Revenue Trend (line chart), Payment Status (pie chart)
  - Added Recent Activity sections: Recent Invoices and Recent Payments lists
  - Added Quick Actions section with 4 common task buttons
  - **NOTIFICATION FIX**: Removed admin-only user-actions endpoint causing 403 errors
  - Notifications now only show Direct Debits and Payment Tracking data
  - All queries use default fetcher pattern with proper object-based query keys
  - **INVOICE DISPLAY BUG FIX**: Fixed "Recent Invoices" showing £NaN and incorrect status
  - Enhanced GET /api/invoices endpoint with SQL joins to include supplierName and branchName
  - Dashboard now correctly uses invoice.amount (not invoice.totalAmount)
  - Status display now uses invoice.status === 'fully_paid' (supports: Paid, Partial, Pending)
  - **SECURITY FIX**: Restored accountant role branch filtering (was missing in initial fix)
  - Branch managers AND accountants now properly restricted to their own branch invoices
  - Supports ?limit=5 query parameter for dashboard Recent Invoices widget
- October 17, 2025. Critical security fixes and supplier balance calculation bug resolved
  - **CRITICAL BUG FIX**: Supplier balance calculation was double-counting credit notes (using paidAmount + credit note subtraction)
  - **CRITICAL SECURITY FIX**: Branch managers could see other branches' balances in suppliers page response
  - Supplier balance calculation corrected to: Standard/Cash Invoices - Credit Notes - Bulk Payments
  - GET /api/suppliers endpoint now restricts branchBalances object to branch manager's own branch only
  - GET /api/suppliers endpoint now filters branches array to show only branch manager's own branch
  - Added getAllSupplierPayments() storage method to fetch bulk payment data for accurate balance calculation
  - Verified: Wholesale Catering Ltd balance changed from incorrect £576.05 to correct £2,000.03
  - Verified: Finances page branch dropdown already disabled for branch managers (no changes needed)
- August 12, 2025. Critical security fixes and UI enhancements completed
  - **SECURITY FIX**: Added proper authentication and branch restrictions to dashboard API
  - **SECURITY FIX**: Removed duplicate payment tracking endpoint that bypassed branch controls
  - **SECURITY FIX**: Branch managers now strictly limited to their own branch data across all endpoints
  - Payment tracking page: Admin-only Edit/Delete buttons added for payment management
  - Bulk Payment form: Supplier list now sorted alphabetically (A-Z)
  - Auto-refresh implemented: Pages refresh after add/edit/delete operations
  - Payment deletion system: Complete reversal of invoice payments and supplier balances
  - Export functionality: Branch-specific CSV exports with proper date range filtering
  - UI improvements: Scrollable transaction popup and proper payment method defaults
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