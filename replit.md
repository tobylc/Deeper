# Deeper - Connection & Conversation Platform

## Overview
Deeper is a full-stack web application designed to foster meaningful connections and conversations. It enables users to create private conversation spaces based on relationship types (e.g., parent-child, romantic partners) and provides curated question suggestions to deepen dialogue. The platform aims to transform superficial interactions into thoughtful, enduring exchanges, supporting long-term relationship growth.

## User Preferences
Preferred communication style: Simple, everyday language.
Change authorization policy: NEVER make changes to any elements, pages, or functionality without explicit user authorization in advance. Always ask for permission before modifying existing features or design.

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
- **Conversation System**: Private, turn-based conversation spaces with message categorization (questions/responses) and real-time synchronization via WebSockets. Enforces strict turn-based system, question-response exchanges, thoughtful response timers (10 mins for responses), and prohibits timers for questions.
- **Question Suggestion Engine**: Curated and AI-generated questions categorized by relationship type, populating text input for editing.
- **Journal Entry Interface**: Unique UI transforms conversations into a journal aesthetic with paper textures, ruled lines, and handwriting fonts.
- **Voice Messaging**: Voice recording with OpenAI Whisper AI transcription, integrated into conversation flow.
- **Subscription Model**: Invitee users have "free forever" access; inviter users require trial/paid subscriptions with connection limits.
- **Notification System**: Email and SMS notifications (Twilio integration) for turns, invitations, and system events, with user preferences.
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
- **Twilio**: SMS notifications
- **SendGrid**: Email delivery
- **OpenAI Whisper**: AI transcription
- **Stripe**: Subscription billing and payment processing

### Development Dependencies
- **tsx**: TypeScript execution
- **esbuild**: JavaScript bundler
- **vite**: Frontend build tool
- **drizzle-kit**: Database schema management