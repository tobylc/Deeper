# Deeper - Connection & Conversation Platform

## Overview
Deeper is a full-stack web application designed to foster meaningful connections and conversations. It enables users to create private conversation spaces based on relationship types (e.g., parent-child, romantic partners) and provides curated question suggestions to deepen dialogue. The platform aims to transform superficial interactions into thoughtful, enduring exchanges, supporting long-term relationship growth.

## User Preferences
Preferred communication style: Simple, everyday language.
Change authorization policy: NEVER make changes to any elements, pages, or functionality without explicit user authorization in advance. Always ask for permission before modifying existing features or design.

## Recent Changes
**Date: August 27, 2025**
- **Complete AWS Communication Migration**: Successfully migrated all communication services to AWS
  - **Email Service**: Migrated from SendGrid to Amazon SES using AWS SDK v3
    - Created new `SESEmailService` class with full email campaign support
    - Updated email service factory to use AWS credentials
    - Maintains backward compatibility with fallback to internal database service
  - **SMS Service**: Migrated from Twilio to Amazon SNS using AWS SDK v3
    - Created new `SNSSMSService` class supporting all SMS notification types
    - Updated SMS service factory to use AWS credentials instead of Twilio
    - Supports connection invitations, acceptance/decline notifications, turn notifications, verification codes
    - Maintains backward compatibility with fallback to internal database service
- Fixed critical database WebSocket connection error that prevented app from starting
- Resolved function signature errors in server routes
- Updated Neon database configuration to use HTTP connections instead of WebSocket for Node.js compatibility
- Added proper error handling and utility functions for email validation
- App is now running successfully on port 5000 with all AWS services configured

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: React Context (authentication), TanStack Query (server state)
- **UI Framework**: Radix UI components with shadcn/ui styling
- **Styling**: Tailwind CSS with CSS variables
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (ES modules)
- **API Pattern**: RESTful API
- **Production Build**: esbuild

### Data Storage
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle
- **Schema Management**: Drizzle Kit

### Core Features
- **Authentication**: Replit Auth (Beta) with OpenID Connect, server-side sessions, Passport.js.
- **Connection Management**: Invitation system via email, relationship categorization, status tracking, personal messages.
- **Conversation System**: Private, turn-based conversation spaces with message categorization (questions/responses) and real-time synchronization via WebSockets. Enforces strict turn-based system, question-response exchanges, thoughtful response timers (10 mins for responses), and prohibits timers for questions. **NEW**: Intelligent question detection in middle column - when users type a message ending with "?" in the main text box, a popup asks if they want to start a new conversation thread or send as a response.
- **Question Suggestion Engine**: Curated and AI-generated questions categorized by relationship type, populating text input for editing.
- **Journal Entry Interface**: Unique UI transforms conversations into a journal aesthetic with paper textures, ruled lines, and handwriting fonts.
- **Voice Messaging**: Voice recording with OpenAI Whisper AI transcription, integrated into conversation flow.
- **Subscription Model**: Invitee users have "free forever" access; inviter users require trial/paid subscriptions with connection limits.
- **Enhanced Email Campaign System**: Aggressive nudging system with reminders every 48-72 hours for up to 35 days. Includes pending invitation reminders, turn reminders, and inviter nudges with escalating urgency. Features opt-out functionality respecting user notification preferences and unsubscribe links.
- **Thread Management**: Multi-conversation threading system allowing new question threads, with automatic title generation and paper stacking for long conversations.
- **Thoughtful Response Enforcement**: Implements a 10-minute minimum response time for thoughtful engagement, with visual popups.

### UI/UX Design
- **Color Scheme**: Dark sophisticated ocean blue and amber palette with multi-layer radial gradient backgrounds.
- **Aesthetics**: Curved aesthetic (1.5rem radius), glassmorphism navigation, gradient-based buttons.
- **Typography**: Modern Inter font, with Kalam for journal entries.
- **Responsiveness**: Mobile-first approach with consistent padding and optimized layouts.

## External Dependencies

### Production Dependencies
- **@neondatabase/serverless**: PostgreSQL driver
- **drizzle-orm**: ORM
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: UI component primitives
- **wouter**: React router
- **zod**: Schema validation
- **tailwindcss**: CSS framework
- **Amazon SES**: Email delivery (migrated from SendGrid)
- **Amazon SNS**: SMS notifications (migrated from Twilio)
- **OpenAI Whisper**: AI transcription
- **Stripe**: Subscription billing and payment processing

### Development Dependencies
- **tsx**: TypeScript execution
- **esbuild**: JavaScript bundler
- **vite**: Frontend build tool
- **drizzle-kit**: Database schema management