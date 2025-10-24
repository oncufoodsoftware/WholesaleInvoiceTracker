# Finance Management System

## Overview

This is a comprehensive finance management system designed for businesses requiring multi-branch invoice management, supplier tracking, financial analytics, and role-based access control. It aims to streamline financial operations, enhance payment tracking, improve supplier relationship management, and provide insightful financial performance data across various business locations.

## Recent Changes (October 24, 2025)

### Critical Bug Fix: Supplier Balance Calculations
- **Fixed**: Supplier balances now correctly account for BOTH legacy invoice payments (invoice.paidAmount) AND new bulk payments (supplier_payments table)
- **Issue**: Before payment-tracking system existed, invoices were marked as paid directly using invoice.paidAmount. After introducing /payment-tracking page and bulk_payments system, supplier balance calculations only considered bulk_payments, ignoring legacy payments
- **Impact**: This caused mismatches where suppliers showed unpaid balances on /suppliers page despite invoices showing "Paid" status on /invoices page
- **Solution**: Updated all balance calculation endpoints to use formula: `Balance = (Standard+Cash Invoices) - Credit Notes - (Bulk Payments + Legacy Invoice Payments)`
- **Affected Endpoints**: `/api/suppliers`, `/api/suppliers/top-balance`, `/api/dashboard/summary`

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query)
- **UI/UX**: shadcn/ui with Radix UI primitives, Tailwind CSS for styling with CSS variables for theming.
- **Form Handling**: React Hook Form with Zod validation

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with session-based authentication
- **Database ORM**: Drizzle ORM with PostgreSQL dialect (Neon serverless)
- **Authentication**: Passport.js with local strategy and scrypt hashing
- **Security**: Comprehensive middleware for rate limiting, CSRF protection, and intrusion detection
- **File Upload**: Multer for invoice document handling

### Database Design
- **Database**: PostgreSQL
- **Schema Management**: Drizzle Kit for migrations
- **Core Entities**: Users, branches, suppliers, invoices, financial_transactions, roles, role_permissions.
- **Relationships**: Foreign key constraints define relationships between key entities.

### Key Features
- **Authentication & Authorization**: Multi-role system (Admin, Branch Manager, Accountant) with customizable permissions and page-level access control. Secure session handling.
- **Invoice Management**: Supports standard, credit, and cash invoices. Features payment tracking, file attachments, and bulk payment processing.
- **Financial Analytics**: Real-time dashboards for revenue, cash flow, and risk assessment (supplier payment delays). Includes multi-branch reporting and forecasting.
- **Supplier Management**: Comprehensive profiles, outstanding balance tracking across branches, risk analytics based on payment behavior, and multi-branch supplier assignment.

## External Dependencies

- **Database**: @neondatabase/serverless (PostgreSQL)
- **Authentication**: passport, express-session, bcryptjs
- **Validation**: zod
- **UI Components**: Radix UI
- **Charting**: Recharts
- **Date Handling**: date-fns
- **Security**: express-rate-limit, helmet