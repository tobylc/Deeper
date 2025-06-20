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
- June 17, 2025. Multi-conversation threading system implementation:
  * Enhanced database schema with conversation threading support: title, topic, isMainThread, parentConversationId, lastActivityAt fields
  * Implemented ConversationThreads component with collapsible envelope-style thread management
  * Added backend API endpoints for connection-based conversation threading (/api/connections/:id/conversations)
  * Created thread selection interface allowing users to start new conversation topics while maintaining existing ones
  * Fixed message bubble flashing issue during typing by optimizing conditional rendering logic
  * Redesigned conversation page with 4-column layout: threads sidebar, main conversation, question suggestions
  * Mobile-responsive threading interface with toggle button for thread visibility
  * Thread sorting: main thread first, then by last activity date for intuitive conversation flow
- June 18, 2025. Conversation page optimization and question terminology update:
  * Redesigned conversation page to utilize full screen space with h-screen layout and proper flex containers
  * Changed all "topic" references to "question" terminology throughout the threading interface
  * Optimized left column layout to prevent text cutoff and ensure all elements fit within constraints
  * Added AI-generated question suggestions in "New Question" popup based on relationship type
  * Compact header design (h-14) and optimized spacing for maximum content area utilization
  * Enhanced mobile responsiveness with proper column hiding/showing on small screens
- June 18, 2025. Middle column conversation interface enhancement:
  * Replaced blank white space with engaging welcome content featuring clickable example questions
  * Added relationship-specific conversation starters that users can click to immediately send
  * Removed muted appearance from "Your turn" badge and send button with vibrant gradient styling
  * Enhanced send button with hover animations and visual feedback when message is ready
  * Redesigned conversation container with rounded corners and shadow to establish focal point
  * Compact header and input areas to maximize conversation space while maintaining professional appearance
- June 18, 2025. Right column question suggestions enhancement:
  * Added contrasting background colors: ocean blue gradient for curated questions, amber gradient for AI-generated
  * Implemented toggle buttons to switch between curated and AI-generated question sets
  * Created clean, professional design with proper text contrast (slate-700 to slate-900 on colored backgrounds)
  * Added AI question generation backend endpoint with rate limiting (5 generations per hour)
  * Integrated relationship-specific AI question templates for Parent-Child, Romantic Partners, Friends, and Siblings
  * Maintained simple, uncluttered interface with clear visual hierarchy and user-friendly interactions
- June 18, 2025. Conversation page header enhancement with profile images:
  * Replaced generic blue Users icon with actual profile images from user accounts
  * Implemented overlapping ProfileAvatar components showing both conversation participants
  * Added user data queries to fetch current user and other participant information
  * Enhanced header displays proper names and profile images with white borders and shadows
  * Clean, professional appearance with authentic user representation instead of placeholder icons
- June 17, 2025. Authentication infinite loading issue resolution:
  * Fixed authentication hook to properly handle 401 responses without infinite loading
  * Added 3-second timeout to authentication requests to prevent hanging
  * Updated session configuration for better OAuth compatibility and persistence
  * Enhanced session store settings with proper PostgreSQL schema configuration
  * Simplified authentication state management to resolve loading states quickly
  * Authentication now properly transitions from loading to login form for unauthenticated users
- June 18, 2025. Complete user name display system implementation:
  * Fixed invitation page to fetch actual user display names via API instead of email parsing
  * Enhanced emails page to display proper user names instead of raw email addresses
  * Verified all email templates (Console, Production, Internal) correctly use getUserDisplayNameByEmail
  * Ensured consistent name display throughout: dashboard, conversations, invitations, emails
  * All user interfaces now prioritize full names over email addresses with proper fallback
  * Production-ready user name system with comprehensive error handling and caching
- June 18, 2025. Turn notification email system implementation:
  * Added turn notification emails sent automatically when users send messages or responses
  * Implemented sendTurnNotification method across all email services (Console, Production, Internal)
  * Enhanced message sending endpoint to trigger email notifications to waiting users
  * Professional email templates with "Continue Conversation" one-click button for immediate access
  * Email design matches existing application color scheme with ocean blue gradients
  * Turn notifications include sender name, message type, and direct conversation link
  * Production-ready turn-based communication system with comprehensive email notification flow
- June 18, 2025. Comprehensive SMS/text notification system implementation:
  * Added SMS notification capability alongside existing email system using Twilio integration
  * Enhanced user schema with phoneNumber, phoneVerified, and notificationPreference fields
  * Created unified notification service supporting email, SMS, or both notification types
  * Implemented phone verification system with 6-digit SMS codes and 10-minute expiration
  * Added API endpoints for phone verification (/api/users/send-verification, /api/users/verify-phone)
  * Enhanced notification preference management with email/SMS/both options
  * Turn notifications now sent via user's preferred method (email, SMS, or both)
  * Production-ready SMS service with Console, Production (Twilio), and Internal implementations
  * Rate limiting on verification endpoints (5 attempts per 15 minutes for sending codes)
  * Complete SMS notification flow for connection invitations, acceptances, declines, and turn notifications
- June 18, 2025. Follow-up conversation flow enhancement:
  * Implemented progressive message labeling: Question → Response → Follow up for all subsequent messages
  * After initial question-response exchange, all future messages display as "Follow up" with ArrowRight icon
  * Updated input area to show "Your Follow up" badge and placeholder text for continuing conversations
  * Enhanced message badge styling with distinct colors: ocean blue for questions, amber for responses, gray for follow-ups
  * Improved conversation flow to encourage ongoing dialogue beyond initial exchange
  * Applied follow-up logic consistently across message bubbles, input badges, and placeholder text
- June 18, 2025. Revolutionary journal entry conversation interface implementation:
  * Completely redesigned conversation interface from text bubbles to authentic journal entry aesthetic
  * Created paper-like conversation entries with ruled lines, margin lines, and three-hole punch effects
  * Implemented unique paper sheet styling with subtle rotations, shadows, and aged paper gradients
  * Added handwriting font (Kalam) and serif typography for authentic journal feel
  * Enhanced typing indicator as journal paper with blue tint and writing animation
  * Transformed workspace background with wood desk texture and scattered paper patterns
  * Redesigned input area as actual writing surface with ruled paper, red margin line, and ink well send button
  * Added paper clips for first/last messages and decorative flourishes throughout
  * Created novel conversation experience completely unlike typical messaging applications
  * Journal entries feel intimate and personal with authentic paper textures and handwritten elements
  * Removed distracting paper clip elements and perfected parchment aesthetic with organic edges
  * Enhanced papers with aged textures, coffee stains, and natural color variations for authentic feel
  * Used CSS clip-path for organic parchment edges instead of perfect geometric shapes
- June 18, 2025. Elegant waiting state system and invitation email fixes:
  * Replaced jarring red error toasts with beautiful parchment-style waiting states during non-turn interactions
  * Created graceful "Their turn to write" indicators in thread sidebar matching journal aesthetic
  * Added encouraging reflection text in main conversation area with organic parchment design
  * Fixed invitation email text gradient from fading to white to using amber contrast color for readability
  * Resolved HTML markup display issue where JSON data appeared instead of clean user names in emails
  * Implemented turn validation to prevent error states and provide contextual waiting feedback
  * All waiting states maintain consistent coffee-stained parchment aesthetic with organic edges
- June 18, 2025. Real-time dashboard system implementation:
  * Implemented WebSocket-based real-time dashboard updates for instant notification delivery
  * Created comprehensive WebSocket server with connection management and user tracking
  * Added real-time message notifications that automatically refresh dashboard when new messages arrive
  * Integrated connection status notifications for immediate acceptance/decline updates
  * Built client-side WebSocket hook with automatic reconnection and error handling
  * Dashboard now auto-refreshes conversation data when users receive new messages
  * Turn notification emails verified to send to correct recipient whose turn it is to respond
  * Complete real-time communication system enhancing user engagement and responsiveness
- June 18, 2025. Conversation page consistency and color differentiation completion:
  * Implemented complete ocean blue/amber color differentiation throughout conversation page
  * Updated all conversation elements to use consistent hyper-realistic paper styling with subtle textures
  * Fixed conversation threads sidebar to match main conversation window paper design
  * Enhanced waiting states with proper ocean blue accents matching current user's message style
  * Applied consistent ruled lines (25% opacity) and paper textures across all page elements
  * Updated bottom conversation area to use ocean blue theme instead of amber/yellow
  * Achieved beautiful, consistent, clean aesthetic throughout entire conversation interface
- June 18, 2025. Paper stacking system for long conversations:
  * Implemented automatic paper stacking when conversations reach 4+ messages total
  * Created StackedPapers component with realistic depth effects using multiple paper layers
  * Added slight offsets and rotations to simulate natural paper pile appearance
  * Shows message count summary on top visible paper in the stack
  * Main conversation area now displays only latest 2 full paper entries for readability
  * Maintains hyper-realistic paper styling consistency with subtle textures and ruled lines
  * Prevents conversation window clutter while preserving focus on recent exchanges
  * Added clickable expand/collapse functionality for paper stacks with smooth animations
  * Implemented restack button that appears when papers are expanded for easy re-collapsing
- June 18, 2025. Automatic thread naming system implementation:
  * Created intelligent thread naming system that summarizes original questions into meaningful titles
  * Implemented generateRelationshipSpecificTitle function with context-aware question analysis
  * Added relationship-specific prefixes (Family:, Love:, Friendship:) for better organization
  * Thread titles automatically generated when first question is sent in conversation
  * Updated backend storage with updateConversationTitle method for title management
  * Enhanced conversation threads UI to display auto-generated titles instead of generic topic names
  * Thread naming preserves key question context while keeping titles concise (under 50 characters)
  * Fixed new question thread creation error by correcting API request format
- June 18, 2025. Unified conversation page layout for consistent invitee/inviter experience:
  * Restructured conversation page with standardized 3-column layout for both user types
  * Left column: Question threads with "Ask New Question" button and automatic stacking functionality
  * Middle column: Active conversation with paper journal interface and stacking system
  * Right column: Question suggestions with waiting states for non-turn users
  * Enhanced QuestionSuggestions component to handle both turn states appropriately
  * Automatic conversation stacking when switching between different question threads
  * Consistent navigation and functionality regardless of user role (inviter/invitee)
- June 18, 2025. Production-ready conversation threading system implementation:
  * Fixed "New Question" button placement to right column (QuestionSuggestions component) only
  * Removed all "New Question" functionality from left column ConversationThreads component
  * Enhanced thread creation to automatically send first message when creating new conversation thread
  * Updated ConversationThreads to fetch real conversation data from API endpoints
  * Implemented proper TypeScript typing for all conversation thread components
  * Added empty state handling for users with no previous conversations
  * Fixed thread creation mutation to create separate conversation threads for new questions
  * Enhanced thread naming system with automatic title generation from question content
  * Production-ready API integration with proper error handling and loading states
- June 18, 2025. Single-conversation display system with automatic thread stacking:
  * Implemented conversation filtering to show only ONE active conversation in middle pane at all times
  * Current active conversation is automatically hidden from left column conversation threads
  * When new question is asked, previous conversation moves to left column as stacked conversation
  * URL routing updated to reflect active conversation changes automatically
  * Thread selection properly updates URL and switches displayed conversation
  * Enhanced empty state messaging to differentiate between no conversations vs active conversation
  * Complete single-conversation display system ensuring clean, focused conversation experience
- June 18, 2025. Connection acceptance flash issue and production-ready real-time dashboard system:
  * Fixed automatic conversation creation during connection acceptance - conversations now only created when inviter manually clicks "Start Your First Conversation"
  * Eliminated brief flash of "Start Your First Conversation" button before redirecting to active conversation
  * Removed auto-conversation creation from both invitation signup and connection acceptance endpoints
  * Enhanced WebSocket real-time dashboard updates to notify both participants of conversation changes
  * Added comprehensive conversation update notifications for message sending, conversation creation, and thread changes
  * Implemented production-ready WebSocket server with proper error handling and reconnection logic
  * Added missing POST /api/conversations endpoint for dashboard conversation creation with real-time notifications
  * Dashboard now auto-refreshes for both participants when conversations are created, messages sent, or threads updated
  * Complete real-time notification system ensuring immediate dashboard updates across all user interactions
- June 18, 2025. Unified conversation threading system with synchronized right column "new question" behavior:
  * Standardized all right column actions (curated questions, AI questions, custom questions) to create new conversation threads
  * Eliminated question population behavior - all right column clicks now create immediate conversation threads with automatic message sending
  * Enhanced WebSocket notifications to include connectionId for proper conversation state synchronization between both users
  * Implemented custom event system to trigger URL changes and state updates when new conversation threads are created
  * Both users now see identical conversation states: current conversation in middle column, rolled up conversations in left column
  * Unified behavior ensures clicking any suggestion in right column causes current conversation to roll up for both participants
  * Real-time conversation threading synchronization maintains consistent user experience across all devices and sessions
- June 18, 2025. One-time onboarding popup system implementation:
  * Added hasSeenOnboarding field to user schema with default false for tracking first-time users
  * Created OnboardingPopup component explaining turn-based communication system to new users
  * Enhanced database storage interface with updateUser method for onboarding completion tracking
  * Added API endpoint /api/users/mark-onboarding-complete for updating onboarding status
  * Integrated onboarding popup into conversation page to appear before first question or response
  * Popup explains thoughtful turn-based communication system with relationship-specific messaging
  * One-time educational experience helps users understand the unique conversation flow
  * System automatically tracks completion and prevents popup from showing again
- June 19, 2025. Complete role-based personalization system implementation:
  * Systematically updated all user-facing text throughout the application to display specific role combinations (e.g., "Father & Son") instead of generic relationship types (e.g., "Parent-Child")
  * Enhanced dashboard component to show personalized role displays in all connection sections: pending invitations, sent invitations, ready to start conversations, and active conversations
  * Updated conversation page header to display specific role combinations using connection data and role display utilities
  * Modified conversation interface component to use personalized role language in empty states and welcome messages
  * Enhanced question suggestions component with role-specific waiting states and contextual reflection prompts
  * Updated invitee welcome popup to support role parameters and display specific role combinations in connection establishment messaging
  * Applied role-based personalization consistently across email templates (already completed in previous iterations)
  * Created comprehensive role display utility integration throughout all components for consistent personalized user experience
  * All relationship displays now show authentic, specific role combinations creating more personal and meaningful connection representations
- June 19, 2025. Enhanced onboarding popup with "The Heart of Deeper" messaging:
  * Added prominently highlighted section explaining Deeper's purpose for long-term, thoughtful conversations
  * Emphasized platform is designed for conversations spanning years or decades, not quick messaging
  * Clarified Deeper as conversation sanctuary for meaningful dialogue that's difficult in person
  * Distinguished from texting/email with focus on sustained, thoughtful exchanges
  * Enhanced visual design with gradient backgrounds and larger icons for emphasis
  * One-time display system ensures users see core platform purpose without repetition
- June 19, 2025. Thoughtful response time enforcement system implementation:
  * Created ThoughtfulResponsePopup component with 10-minute minimum response time requirement
  * Added response time tracking that starts when users begin typing messages
  * Implemented countdown timer showing remaining reflection time before message can be sent
  * Enhanced popup design with amber gradient theme matching application aesthetic
  * Added encouraging messaging about taking time for quality responses over speed
  * System prevents quick responses to encourage meaningful, thoughtful communication
  * Integrated seamlessly into conversation page with proper state management and user flow
- June 20, 2025. Voice message system with AI transcription implementation:
  * Enhanced database schema with voice message fields: messageFormat, audioFileUrl, transcription, audioDuration
  * Created VoiceRecorder component with professional recording interface and 30-minute maximum duration
  * Implemented OpenAI Whisper integration for accurate speech-to-text transcription with cost-effective pricing
  * Added VoiceMessageDisplay component with playback controls, progress bar, and transcription display
  * Enhanced conversation interface with text/voice mode toggle and seamless switching between message types
  * Voice messages automatically transcribed using OpenAI's Whisper-1 model for accessibility and searchability
  * Created comprehensive voice message API endpoint with file upload, transcription, and storage handling
  * Integrated voice messages into existing conversation flow with proper turn management and notifications
  * Both audio playback and AI-generated text transcription displayed for optimal user experience
  * Production-ready voice messaging system enhancing meaningful communication through multiple modalities
- June 20, 2025. Thoughtful response timer system enhancement:
  * Implemented timer logic that only appears after inviter's first question to allow smooth conversation initiation
  * Added 10-minute countdown timer that starts when users begin typing or recording voice messages
  * Enhanced voice recorder with callback system to trigger response timer when recording begins
  * Updated conversation interface to properly handle timer events for both text and voice message modes
  * Timer automatically skips for inviter's first question while enforcing thoughtful response time for all subsequent messages
  * System encourages meaningful dialogue while maintaining natural conversation flow and startup experience
- June 20, 2025. Onboarding popup visual enhancement:
  * Enhanced "The Heart of Deeper" section with ocean blue contrast elements against white background
  * Added ocean blue gradient background, accent stripe, and corner visual elements for better hierarchy
  * Updated title and key text to use ocean blue coloring for improved readability and brand consistency
  * Enhanced icon presentation with ring effects and improved visual prominence
  * Maintained clean white background while adding engaging blue visual interest throughout the popup
- June 20, 2025. React infinite loop resolution and onboarding popup optimization:
  * Fixed critical React error #310 causing white page crashes by eliminating problematic useEffect dependency arrays
  * Moved thoughtful response timer logic from useEffect to input handlers to prevent circular dependencies
  * Optimized onboarding popup to display only once per user globally based on hasSeenOnboarding database field
  * Enhanced thoughtful response popup timer text to use consistent black color matching application design
  * Maintained voice recording integration with timer functionality while resolving stability issues
- June 20, 2025. Complete role-based display system implementation:
  * Fixed email templates in all services (Console, Production, Internal) to use specific role combinations instead of generic relationship types
  * Updated QuestionSuggestions component badge to display "Father/Son" instead of "Parent-Child" 
  * Enhanced OnboardingPopup component to accept and display specific role combinations
  * Modified email invitation text templates to use personalized role descriptions throughout
  * Systematically replaced remaining generic relationship descriptions with authentic user-selected role combinations
  * All user-facing text now consistently shows specific roles (e.g., "Father/Son") rather than generic categories (e.g., "Parent-Child")
- June 20, 2025. Role-specific question curation system for adult relationships:
  * Enhanced curated question system to provide distinct questions for each specific role in adult relationships (20+ years old assumption)
  * Updated Parent-Child questions: Fathers receive questions about sharing life wisdom and understanding adult children; Sons receive questions about seeking guidance and family responsibility
  * Mothers get questions about maternal wisdom and navigating adult independence; Daughters get questions about life guidance and family traditions
  * Implemented OpenAI-powered AI question generation with role-specific prompts for adult conversations
  * Created comprehensive fallback question templates organized by specific user roles rather than generic relationship types
  * Each user now receives question suggestions tailored exclusively to their role perspective in adult relationships
  * AI question generation uses sophisticated role-based prompts focusing on adult life experiences, family dynamics, and mature relationship navigation
```

## User Preferences
```
Preferred communication style: Simple, everyday language.
Change authorization policy: NEVER make changes to any elements, pages, or functionality without explicit user authorization in advance. Always ask for permission before modifying existing features or design.
```