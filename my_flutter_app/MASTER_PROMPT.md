# Learning Hub Master Prompt

## Overview
This master prompt is designed to guide the development, testing, and optimization of the Learning Hub platform. It ensures consistency, quality, and efficiency across all phases of the project.

## Key Principles

### 1. **Code Quality and Standards**
- Follow Flutter best practices and Dart conventions.
- Ensure all code is well-documented and maintainable.
- Use Riverpod for state management and GoRouter for navigation.
- Adhere to the repository pattern for data handling.

### 2. **Testing and Validation**
- Conduct comprehensive unit, widget, and integration testing.
- Ensure all tests pass before merging changes.
- Use mock data and fake repositories for isolated testing.
- Validate UI/UX for responsiveness and accessibility.

### 3. **Performance Optimization**
- Optimize build times and reduce bundle size.
- Use tree-shaking for unused assets and code.
- Ensure smooth animations and transitions.
- Monitor and improve app startup time.

### 4. **User Experience**
- Maintain a consistent and intuitive UI across all screens.
- Ensure accessibility compliance (e.g., screen reader support).
- Validate user flows and navigation paths.
- Gather and incorporate user feedback iteratively.

### 5. **Error Handling and Debugging**
- Implement robust error handling for API calls and user inputs.
- Use logging to track and diagnose issues.
- Ensure graceful degradation for network errors and edge cases.
- Provide clear and actionable error messages to users.

### 6. **Security and Compliance**
- Secure sensitive data and API endpoints.
- Use environment variables for configuration and secrets.
- Ensure compliance with data protection regulations.
- Implement secure authentication and authorization.

## Development Workflow

### 1. **Analysis and Planning**
- Analyze requirements and break down tasks into manageable components.
- Identify dependencies and potential risks.
- Create a detailed plan with milestones and deadlines.

### 2. **Implementation**
- Write clean, modular, and reusable code.
- Follow the repository pattern for data access.
- Use Riverpod for state management and GoRouter for navigation.
- Ensure all features are fully functional and tested.

### 3. **Testing**
- Conduct unit tests for individual components.
- Perform widget tests for UI components.
- Execute integration tests for module interactions.
- Validate performance and user experience.

### 4. **Optimization**
- Optimize code for performance and efficiency.
- Reduce build times and bundle size.
- Ensure smooth animations and transitions.
- Monitor and improve app startup time.

### 5. **Deployment**
- Build and deploy the app for web, mobile, and desktop.
- Ensure compatibility across all target platforms.
- Monitor post-deployment performance and user feedback.
- Iterate and improve based on real-world usage data.

## Best Practices

### Code Structure
- Organize code into features, domains, and presentations.
- Use clear and descriptive naming conventions.
- Keep components small and focused on a single responsibility.
- Document all public APIs and complex logic.

### State Management
- Use Riverpod for state management.
- Avoid global state; prefer scoped providers.
- Ensure state is immutable and predictable.
- Use async providers for data fetching and error handling.

### Navigation
- Use GoRouter for declarative navigation.
- Define clear routes and navigation paths.
- Handle deep linking and route parameters.
- Ensure smooth transitions between screens.

### API and Data Handling
- Use the repository pattern for data access.
- Implement robust error handling for API calls.
- Use Dio for HTTP requests and interceptors for logging.
- Cache data appropriately to improve performance.

### UI/UX
- Follow Material Design guidelines for consistency.
- Ensure responsiveness across all screen sizes.
- Use animations to enhance user experience.
- Validate accessibility compliance.

## Tools and Libraries

### Core Libraries
- Flutter SDK
- Dart
- Riverpod
- GoRouter
- Dio
- Flutter Animate

### Testing
- Flutter Test
- Mockito
- Integration Test

### Build and Deployment
- Flutter Build
- Docker (for backend services)
- GitHub Actions (for CI/CD)

### Monitoring and Analytics
- Firebase Analytics
- Sentry (for error tracking)
- Logging and Monitoring Tools

## Conclusion
This master prompt serves as a comprehensive guide for developing, testing, and optimizing the Learning Hub platform. Adhere to these principles and best practices to ensure a high-quality, performant, and user-friendly application.