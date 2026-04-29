# Express/Prisma Backend Enhancement Plan

## Background & Motivation
The current Express backend is barebones and lacks the features necessary to support the fully-typed frontend we just stabilized. We need to expand it to include all features from the Cloudflare Workers backend.

## Scope & Impact
- **Prisma Schema Expansion**: Add models for Courses, Tests, Questions, LiveSessions, Mentors, Problems, ActivityLogs, etc.
- **Controllers & Routing**: Build out missing endpoints for all new models.
- **Security**: Implement JWT refresh tokens, role-based access control, and strict input validation via Zod.
- **Real-Time**: Integrate WebSockets (Socket.io) for live class and notification events.

## Proposed Solution
We will systematically build out the `learninghub/backend` directory. We will start by syncing the `schema.prisma` with the frontend's expected data models. Then, we will create the necessary Express controllers, wrap them in robust error handling and validation middleware, and finally, add real-time and caching capabilities.

## Alternatives Considered
- Migrating to the Cloudflare Workers backend entirely: Rejected because a traditional Node.js/Express environment offers easier local development, robust ORM support (Prisma), and simpler WebSocket integration for this specific setup.

## Phased Implementation Plan
1. **Database Foundation**: Update `schema.prisma` and run `db push`.
2. **Core API Expansion**: Implement Courses, Auth, and Gamification controllers.
3. **Advanced API Expansion**: Implement Tests, Live Classes, and Problem (DSA) controllers.
4. **Real-Time & Optimization**: Add Socket.io for notifications and simple caching for high-traffic endpoints.

## Verification
- Unit/Integration tests for critical paths (e.g., auth, course enrollment).
- Postman/Thunder Client manual verification.
- End-to-end testing by running the frontend against the new local backend.

## Migration & Rollback
- Backup the SQLite database (`dev.db`) before any schema migrations.
- Commit all changes atomically so we can revert via Git if any phase breaks the server.