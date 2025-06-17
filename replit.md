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
- June 17, 2025. Email system enhancement to use proper names:
  * All email services now use getUserDisplayNameByEmail to fetch proper user names
  * Invitation emails display inviter's full name instead of email address
  * Connection acceptance emails show invitee's name instead of email
  * Connection decline emails use proper names for better personalization
  * Enhanced user experience with more personal and professional email communications
  * Applies to ConsoleEmailService, ProductionEmailService, and InternalEmailService
- June 17, 2025. Inviter dashboard enhancement for accepted connections:
  * Added "Ready to Start Conversations" section for accepted connections without active conversations
  * Clear visual indication when invitee accepts invitation with success messaging and next steps
  * Prominent "Start Your First Conversation" button to begin dialogue from dashboard
  * Shows connection details including relationship type, acceptance date, and personal message
  * Automatically creates conversation and redirects to conversation interface when clicked
  * Fixed conversation endpoint mismatch from /api/conversations/${email} to /api/conversations/by-email/${email}
  * Separates accepted connections from active conversations for better user flow and clarity
- June 17, 2025. Professional logo implementation throughout application:
  * Created reusable DeeperLogo component with responsive sizing (sm, md, lg, xl)
  * Fixed Express static file serving to properly load logo assets from public directory
  * Replaced all text-based "Deeper" references with professional logo image
  * Implemented context-aware logo sizing: large for navigation headers, extra-large for auth cards, medium for dashboard, small for popups
  * Enhanced visual hierarchy with logo sizing that matches surrounding UI elements (e.g., login button prominence)
  * Updated landing page, dashboard, auth, features, pricing pages, and welcome popup components
  * Consistent branding experience across all user touchpoints
- June 17, 2025. Heart icon replacement with brand consistency:
  * Replaced all Heart icons throughout application with DeeperLogo component
  * Updated dashboard subscription status, connection acceptance, and conversation ready sections
  * Modified conversation interface welcome messages and response badges to use logo
  * Enhanced question suggestions, invitation pages, and signup flows with logo consistency
  * Applied appropriate logo sizing and styling (inverted colors for dark backgrounds)
  * Maintained visual hierarchy while strengthening brand identity across all interactions
  * Covers all components: dashboard, conversation interface, question suggestions, invitation flows, welcome popups
- June 17, 2025. Enhanced logo system with new transparent design:
  * Replaced existing logo with new blue transparent gradient design throughout application
  * Enhanced flexible sizing system with 6 size options (xs, sm, md, lg, xl, header)
  * Updated header logo size to h-12 (48px) for maximum readability with proper padding
  * Applied consistent logo implementation across landing, auth, features, and pricing pages
  * Added object-contain styling for optimal logo display and transparency handling
- June 17, 2025. Production-ready logo optimization completed:
  * Optimized logo file size from 1.5MB to 126KB (92% reduction) for production performance
  * Enhanced logo component with production-ready error handling and text fallback
  * Added eager loading, async decoding, and select-none for optimal user experience
  * Audited and standardized all 11 logo locations across the entire application
  * Ensured consistent header sizing (h-12) across all navigation components
  * Comprehensive logo implementation covering: landing, auth, features, pricing, dashboard, conversation interface, question suggestions, invitation pages, welcome popups, and signup forms
- June 17, 2025. Quotation marks brand element system implementation:
  * Systematically replaced all Heart icons with new QuotesIcon component as secondary brand element
  * Created reusable QuotesIcon component with same flexible sizing system as DeeperLogo
  * Updated dashboard subscription status, connection acceptance, and conversation ready sections
  * Modified conversation interface welcome messages and response badges to use quotation marks
  * Enhanced question suggestions, invitation pages, and signup flows with consistent brand element
  * Applied appropriate sizing and styling (inverted colors for dark backgrounds)
  * Covers all components: dashboard, conversation interface, question suggestions, invitation flows, welcome popups, and signup forms
  * Quotation marks icon now synonymous with "Deeper" brand identity across all user interactions
- June 17, 2025. Critical text visibility and conversation functionality fixes:
  * Fixed invitation page "You've been personally" text to use ocean blue color for proper visibility
  * Enhanced invitee welcome popup with white and contextual blue text throughout for dark background readability
  * Implemented production-ready conversation interface with always-visible message input
  * Added comprehensive turn-based messaging with visual indicators and disabled states
  * Enhanced conversation page with proper error handling, loading states, and professional styling
  * Turn status sidebar provides clear feedback when waiting for other participant
  * Message composition interface maintains context awareness with appropriate placeholders
  * Complete conversation functionality now fully operational for production deployment
- June 17, 2025. Enhanced transparent quotes icon implementation:
  * Updated quotes icon with new transparent blue design for improved visual consistency
  * New transparent version works seamlessly across light and dark backgrounds
  * Maintains brand identity while providing better visual integration
  * Automatically applied across all QuotesIcon component locations throughout application
  * Enhanced visual hierarchy with improved contrast and professional appearance
- June 17, 2025. Subscription plan restructure with new pricing and invitation limits:
  * Redesigned pricing page with three distinct plans: Basic ($4.95), Advanced ($9.95), and Unlimited ($19.95)
  * Basic plan allows 1 invitation and 1 connection as inviter (down from previous 5 connections)
  * Advanced plan allows 3 invitations and 3 connections as inviter (replaces previous Personal plan)
  * Unlimited plan allows unlimited invitations and connections as inviter (updated pricing to $19.95)
  * All plans include 7-day free trial with clear trial messaging on pricing page
  * Updated backend tierBenefits configuration to enforce new connection limits
  * Enhanced pricing page UI with new icons (Users, MessageCircle, Infinity) for each tier
  * Maintained existing subscription inheritance system where invitees get inviter's benefits
- June 17, 2025. UI fixes and authentication flow improvements:
  * Fixed invitation page circle icon color to display blue logo instead of black/inverted version
  * Eliminated flash of dark screen during redirects by implementing proper loading states in App.tsx
  * Added authentication loading spinner with branded styling to prevent 404 flashes
  * Updated invitation signup page to use router navigation instead of window.location.href
  * Enhanced auth page to properly invalidate authentication cache after login
  * Improved routing logic to separate authenticated vs unauthenticated routes cleanly
  * Fixed invitee login redirect issues by implementing proper query invalidation
- June 17, 2025. Conversation messaging functionality and UI color consistency fixes:
  * Fixed conversation page messaging functionality with proper API authentication for production
  * Enhanced conversation page with loading states and comprehensive error handling
  * Removed unnecessary PATCH requests for conversation turns (backend handles automatically)
  * Updated all invitation page icons to use consistent blue color matching quotation marks
  * Fixed invitee welcome popup text readability by changing all text to white or blue colors
  * Improved production messaging functionality with proper authentication and turn management
- June 17, 2025. Complete messaging system implementation and invitation signup fixes:
  * Implemented full messaging functionality with input area, send button, and character count
  * Added question suggestion integration - users can click suggestions to populate input field
  * Fixed 404 redirect issue after invitee creates password during invitation acceptance
  * Enhanced authentication cache invalidation to properly refresh user state after signup
  * Ensured invitees are redirected to dashboard with welcome popup after successful account creation
  * Turn-based messaging system with visual indicators and proper authentication handling
  * Production-ready conversation interface with Enter key support and loading states
- June 17, 2025. Conversation interface contrast and readability improvements:
  * Updated message bubbles to use solid backgrounds: blue for current user, gray for other users
  * Changed all message text to white for optimal readability against solid backgrounds
  * Enhanced typing indicator styling with consistent gray background and white text
  * Improved text contrast throughout conversation page sidebar and question suggestions
  * Updated all secondary text elements to use darker gray (slate-600/700) for better visibility
  * Consistent contrast standards applied across conversation interface, sidebar, and question cards
- June 17, 2025. Authentication infinite loading issue resolution:
  * Fixed authentication hook to properly handle 401 responses without infinite loading
  * Added 3-second timeout to authentication requests to prevent hanging
  * Updated session configuration for better OAuth compatibility and persistence
  * Enhanced session store settings with proper PostgreSQL schema configuration
  * Simplified authentication state management to resolve loading states quickly
  * Authentication now properly transitions from loading to login form for unauthenticated users
```

## User Preferences
```
Preferred communication style: Simple, everyday language.
```