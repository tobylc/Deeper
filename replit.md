# Deeper - Connection & Conversation Platform

## Overview

Deeper is a production-ready full-stack web application designed to facilitate meaningful connections and conversations between people. The platform enables users to invite others to private conversation spaces where they can engage in structured dialogue based on their relationship type (parent-child, romantic partners, friends, etc.). The application provides curated question suggestions to help deepen relationships through thoughtful exchanges.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: React Context for authentication state, TanStack Query for server state
- **UI Framework**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite with React plugin

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful API endpoints with comprehensive error handling
- **Development**: Hot reload with Vite integration for development
- **Production**: Built with esbuild for optimized server bundle

### Data Storage Solutions
- **Database**: PostgreSQL with production-grade connection pooling
- **ORM**: Drizzle with PostgreSQL dialect and query optimization
- **Schema Management**: Drizzle Kit for migrations
- **Production Storage**: DatabaseStorage implementation with transaction support
- **Database Provider**: Neon serverless PostgreSQL configured

## Key Components

### Authentication System
- Replit Auth (Beta) integration with OpenID Connect protocol
- Server-side session management with PostgreSQL storage
- Passport.js authentication middleware with refresh token support
- Secure session cookies with proper expiration handling
- Production-ready authentication endpoints with rate limiting

### Connection Management
- Invitation system where users can invite others by email
- Relationship type categorization (Parent-Child, Romantic Partners, Friends, Siblings, etc.)
- Connection status tracking (pending, accepted, declined)
- Personal message support for invitations

### Conversation System
- Private conversation spaces between connected users
- Turn-based conversation flow with current turn tracking
- Message categorization (questions vs responses)
- Real-time conversation state management

### Question Suggestion Engine
- Curated question sets organized by relationship type
- Randomized question presentation to avoid repetition
- Category-specific questions to facilitate meaningful dialogue
- Interactive question selection interface

### UI/UX Components
- Comprehensive component library built on Radix UI primitives
- Responsive design with mobile-first approach
- Toast notifications for user feedback
- Modal dialogs for forms and confirmations
- Loading states and error handling

## Data Flow

1. **User Registration/Login**: Users authenticate via email, user data stored in database
2. **Connection Creation**: Inviter sends connection request with relationship type and personal message
3. **Connection Acceptance**: Invitee accepts connection, triggering conversation space creation
4. **Conversation Flow**: Users exchange questions and responses in turn-based format
5. **Question Suggestions**: System provides relevant questions based on relationship type
6. **Message Storage**: All conversation messages persisted with metadata (type, timestamp, sender)

## External Dependencies

### Production Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL database driver
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Headless UI component primitives
- **wouter**: Lightweight React router
- **zod**: TypeScript-first schema validation
- **tailwindcss**: Utility-first CSS framework

### Development Dependencies
- **tsx**: TypeScript execution engine for development
- **esbuild**: Fast JavaScript bundler for production builds
- **vite**: Frontend build tool and development server
- **drizzle-kit**: Database schema management tools

## Deployment Strategy

### Development Environment
- **Runtime**: Node.js 20 with hot reload
- **Database**: PostgreSQL 16 module in Replit
- **Development Server**: Vite dev server on port 5000
- **API Server**: Express server integrated with Vite middleware

### Production Build
- **Frontend**: Vite build process generating optimized static assets
- **Backend**: esbuild bundling server code into single ESM file
- **Database**: PostgreSQL with Drizzle migrations
- **Deployment**: Replit autoscale deployment target
- **Port Configuration**: External port 80 mapping to local port 5000

### Architecture Decisions

#### Database Strategy
- **Chosen**: Drizzle ORM with PostgreSQL
- **Rationale**: Type-safe database operations, excellent TypeScript integration, modern SQL-first approach
- **Alternative Considered**: Prisma (rejected due to complexity overhead for this application size)

#### Authentication Approach
- **Chosen**: Simple email-based authentication
- **Rationale**: Reduces friction for users, appropriate for the intimate nature of the application
- **Trade-off**: Less security vs. ease of use (acceptable for this use case)

#### Frontend State Management
- **Chosen**: TanStack Query + React Context
- **Rationale**: TanStack Query for server state caching, Context for simple client state
- **Alternative Considered**: Redux Toolkit (rejected as overkill for application complexity)

#### Styling Strategy
- **Chosen**: Tailwind CSS with shadcn/ui component system
- **Rationale**: Rapid development, consistent design system, excellent customization
- **Benefits**: CSS-in-JS avoided, design tokens via CSS variables, responsive design utilities

## Production Infrastructure

### Security & Performance
- **Rate Limiting**: Comprehensive rate limiting on all endpoints (authentication, connections, messages)
- **Validation**: Multi-layer input validation with Zod schemas and custom middleware
- **Error Handling**: Production-grade error handling with proper HTTP status codes
- **Security Headers**: CORS, XSS protection, content type validation
- **Database Optimization**: Indexes on all critical query paths for optimal performance

### Background Processing
- **Job Queue System**: Asynchronous background job processing for email notifications
- **Email Service**: Configurable email service with console logging for development
- **Analytics Tracking**: Comprehensive event tracking for user actions and system metrics
- **Health Monitoring**: System health checks with database connectivity validation

### Monitoring & Observability
- **Request Logging**: Detailed request/response logging with performance metrics
- **Error Tracking**: Structured error logging with stack traces and context
- **Analytics Dashboard**: Real-time metrics for user engagement and system performance
- **Graceful Shutdown**: Proper server shutdown handling for deployment scenarios

## Changelog
```
Changelog:
- June 14, 2025. Initial setup with basic application structure
- June 14, 2025. Production infrastructure implementation:
  * PostgreSQL database integration with Drizzle ORM
  * Comprehensive error handling and validation
  * Rate limiting and security middleware
  * Background job processing system
  * Analytics and monitoring capabilities
  * Email notification system
  * Database optimization with indexes
- June 14, 2025. Navigation and marketing pages implementation:
  * Fixed navigation links throughout the application
  * Created comprehensive Features page showcasing unique value propositions
  * Built Pricing page with 7-day trial-to-upgrade conversion strategy
  * Removed "About" navigation link for streamlined UX
  * Implemented consistent navigation across all pages
- June 14, 2025. Complete design system overhaul:
  * Implemented dark sophisticated ocean blue and amber palette for immersive experience
  * Ocean blue primary (#4FACFE), warm amber (#D7A087), soft teal accents
  * Dark charcoal background (#1B2137) with multi-layer radial gradient patterns
  * Enhanced curved aesthetic with 1.5rem radius eliminating all linear elements
  * Added glassmorphism navigation with 20px backdrop blur for depth
  * Created gradient-based buttons (btn-ocean, btn-amber) with hover animations
  * Updated message bubbles with 2rem radius and dark glass effect
  * Applied modern Inter typography throughout application
  * Enhanced all pages with smooth animations and cohesive dark aesthetic
- June 15, 2025. Production authentication system implemented:
  * Removed all demo and mock authentication components
  * Migrated to production-ready Replit Auth integration
  * Cleaned frontend authentication interface to use real OAuth
  * Eliminated demo user creation and mock session handling
  * Updated email templates to use deployed URL (https://deepersocial.replit.app)
  * System now requires proper OAuth configuration for production use
  * All authentication endpoints updated for production deployment
- June 17, 2025. Comprehensive subscription billing system implemented:
  * Connection limits enforced based on subscription tiers (free: 1, basic: 5, premium: 20, unlimited: 999)
  * Paid users can invite others without charge - invitees inherit subscription benefits
  * Enhanced dashboard UI differentiates between initiated vs accepted connections
  * Subscription management routes for upgrading and status checking
  * Connection acceptance automatically grants inviter's tier to invitee
  * Comprehensive error handling for connection limits in invitation form
  * Subscription status display shows current plan, connection counts, and upgrade options
  * Database schema includes inviterSubscriptionTier tracking for billing inheritance
- June 17, 2025. Full name user system implemented:
  * Added firstName and lastName fields to user schema for proper name storage
  * Updated invitation signup form to collect full names during account creation
  * OAuth authentication extracts names from Google profiles automatically
  * Created UserDisplayName component and utility functions for consistent name display
  * Backend API endpoint for retrieving user display names (/api/users/display-name/:email)
  * Updated dashboard, conversation interface, and invitation displays to show proper names
  * System prioritizes full names over email addresses throughout the interface
  * Graceful fallback to email username when names are unavailable
- June 17, 2025. Production-ready security system implemented:
  * Added bcrypt password hashing with 12 salt rounds for secure credential storage
  * Enhanced session management with proper error handling and cookie security
  * Comprehensive input validation throughout all API endpoints
  * Rate limiting implemented on all critical endpoints (auth, invitations, connections)
  * Email format validation with RFC 5322 compliant regex patterns
  * Relationship type validation against whitelist of allowed values
  * Prevention of self-invitation attempts and duplicate user creation
  * Enhanced error handling with specific database error responses
  * Production vs development error message differentiation
  * Invitation acceptance workflow with robust session establishment
  * Comprehensive logging for debugging and monitoring purposes
  * Authentication state properly typed throughout frontend application
- June 17, 2025. Account linking system for invited users completed:
  * Database schema enhanced with googleId field for OAuth account linking
  * OAuth authentication automatically links existing email-based accounts with Google profiles
  * Dashboard interface shows authentication methods with account linking controls
  * Success notifications when Google account linking is completed
  * Invitation acceptance logic handles existing users without password conflicts
  * Email/password authentication fully functional for invited users
  * Users can access their accounts using either login method after linking
  * Fixed conversation turn logic so inviters properly start first conversations
  * Corrected "Your turn" vs "Their turn" display based on actual conversation state
  * Enhanced conversation header to display participant names instead of email addresses
```

## User Preferences
```
Preferred communication style: Simple, everyday language.
```