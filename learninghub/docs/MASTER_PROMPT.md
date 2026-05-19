# LearningHub - Master Prompt for Comprehensive Fixing

## Mission Statement

Transform LearningHub into a production-ready, modern, reliable, responsive, optimized, and complete web application with best possible quality.

---

## Phase 1: Code Quality & TypeScript (PRIORITY: CRITICAL)

### Task 1.1: Fix All TypeScript Warnings

```
Goal: Zero TypeScript warnings
Files: All .ts/.tsx files
Actions:
  1. Run `npx tsc --noEmit` to get full list
  2. Fix unused variables (prefix with _ or remove)
  3. Fix unused imports
  4. Replace remaining 'any' types with proper interfaces
  5. Add missing return type annotations
Verification: Run tsc again, should show 0 errors
```

### Task 1.2: ESLint Configuration

```
Goal: Consistent code style, zero ESLint warnings
Actions:
  1. Review .eslintrc configuration
  2. Add strict rules for:
     - unused-imports/no-unused-imports
     - @typescript-eslint/explicit-function-return-type
     - @typescript-eslint/no-explicit-any (warn)
  3. Run `npm run lint` and fix all issues
  4. Add lint-staged for pre-commit hooks
Verification: `npm run lint` passes with 0 warnings
```

### Task 1.3: Code Organization

```
Goal: Clean, maintainable code structure
Actions:
  1. Split large components (>300 lines) into smaller components
  2. Create barrel exports (index.ts) for cleaner imports
  3. Organize utils folder by functionality
  4. Move constants to separate files
  5. Create hooks directory structure
Verification: All components < 200 lines, clean imports
```

---

## Phase 2: UI/UX & Responsive Design (PRIORITY: HIGH)

### Task 2.1: Mobile Responsive Audit

```
Goal: Perfect mobile experience
Actions:
  1. Test on 320px, 375px, 414px, 768px, 1024px breakpoints
  2. Fix AdminPage tables (add horizontal scroll)
  3. Fix grid layouts to use responsive columns
  4. Increase touch targets to min 44x44px
  5. Fix font sizes for mobile readability
  6. Test navigation menu on mobile
Files:
  - AdminPage.tsx
  - HomePage.tsx
  - SearchPage.tsx
  - CoursePage.tsx
  - LessonPlayerPage.tsx
Verification: All pages usable on 320px width
```

### Task 2.2: Accessibility Improvements

```
Goal: WCAG 2.1 AA compliance
Actions:
  1. Add aria-labels to all interactive elements
  2. Add aria-describedby for form inputs
  3. Ensure all images have alt text
  4. Check color contrast (min 4.5:1)
  5. Add keyboard navigation support
  6. Add focus indicators
  7. Test with screen reader
Files: All components with interactive elements
Verification: Lighthouse accessibility score > 95
```

### Task 2.3: Form UX Improvements

```
Goal: Professional form experience
Actions:
  1. Add client-side validation with Zod
  2. Show real-time validation errors
  3. Add password strength indicator
  4. Improve error message wording
  5. Add loading states to submit buttons
  6. Prevent double submission
  7. Add success notifications
Files:
  - AuthPage.tsx
  - SettingsPage.tsx
  - AdminPage.tsx forms
Verification: Forms are intuitive and error-free
```

### Task 2.4: Loading States & Error Boundaries

```
Goal: Smooth UX during loading/errors
Actions:
  1. Add skeleton screens for all async content
  2. Implement ErrorBoundary at route level
  3. Add retry buttons for failed requests
  4. Show offline indicator when disconnected
  5. Add progressive loading for images
Files:
  - Create ErrorBoundary component
  - Update all page components
Verification: No page crashes, graceful error handling
```

---

## Phase 3: Performance Optimization (PRIORITY: HIGH)

### Task 3.1: Bundle Analysis

```
Goal: Optimized bundle size
Actions:
  1. Add @vitejs/plugin-visualizer
  2. Analyze bundle composition
  3. Identify large dependencies
  4. Tree-shake unused code
  5. Split vendor chunks
Verification: Main bundle < 200KB gzipped
```

### Task 3.2: Code Splitting

```
Goal: Fast initial load
Actions:
  1. Verify all routes use React.lazy()
  2. Add prefetching for likely next routes
  3. Split heavy components (charts, editors)
  4. Use dynamic imports for modal content
Files: App.tsx route configuration
Verification: Initial load < 3s on 3G
```

### Task 3.3: Image Optimization

```
Goal: Fast image loading
Actions:
  1. Add WebP/AVIF format support
  2. Implement lazy loading for images
  3. Add blur-up placeholder
  4. Use responsive images (srcset)
  5. Optimize thumbnail sizes
Verification: Images load progressively, LCP < 2.5s
```

### Task 3.4: Caching Strategy

```
Goal: Fast subsequent loads
Actions:
  1. Add service worker with Workbox
  2. Cache static assets
  3. Cache API responses
  4. Implement stale-while-revalidate
  5. Add offline page support
Verification: App works offline, instant repeat visits
```

---

## Phase 4: Security Hardening (PRIORITY: HIGH)

### Task 4.1: Authentication Security

```
Goal: Secure auth flow
Actions:
  1. Move token from localStorage to httpOnly cookies
  2. Implement refresh token rotation
  3. Add token expiration handling
  4. Add CSRF protection
  5. Implement secure password reset
Files: auth service, API utils
Verification: Tokens not accessible via JavaScript
```

### Task 4.2: Input Validation

```
Goal: Prevent injection attacks
Actions:
  1. Sanitize all user inputs
  2. Validate all API payloads
  3. Add XSS protection
  4. Implement rate limiting UI
  5. Add SQL injection prevention (backend)
Verification: No XSS vulnerabilities in forms
```

### Task 4.3: API Security

```
Goal: Secure API communication
Actions:
  1. Add request signing
  2. Implement API rate limiting
  3. Add secure headers
  4. Validate all responses
  5. Add request ID for tracing
Verification: All API calls secure
```

---

## Phase 5: Testing & Quality Assurance (PRIORITY: MEDIUM)

### Task 5.1: Unit Testing

```
Goal: >80% code coverage
Actions:
  1. Setup Vitest
  2. Add tests for utilities
  3. Add tests for hooks
  4. Add tests for services
  5. Mock API calls
Verification: `npm run test` passes with 80%+ coverage
```

### Task 5.2: Component Testing

```
Goal: All components tested
Actions:
  1. Setup React Testing Library
  2. Add tests for critical components
  3. Test user interactions
  4. Test accessibility
  5. Add snapshot tests
Verification: All UI components have tests
```

### Task 5.3: E2E Testing

```
Goal: Critical paths tested
Actions:
  1. Setup Playwright
  2. Add auth flow tests
  3. Add course enrollment tests
  4. Add payment flow tests
  5. Add mobile responsive tests
Verification: E2E tests pass in CI
```

---

## Phase 6: Feature Completion (PRIORITY: MEDIUM)

### Task 6.1: PWA Features

```
Goal: Installable app experience
Actions:
  1. Add manifest.json
  2. Add service worker
  3. Add offline indicator
  4. Add app icons
  5. Implement background sync
Verification: App installable, works offline
```

### Task 6.2: Push Notifications

```
Goal: Engaging notification system
Actions:
  1. Request notification permission
  2. Show course reminders
  3. Show achievement notifications
  4. Add notification preferences
  5. Test on mobile devices
Verification: Notifications work on all platforms
```

### Task 6.3: Advanced Search

```
Goal: Powerful search functionality
Actions:
  1. Add faceted search
  2. Add search filters (mobile)
  3. Add search history
  4. Add search suggestions
  5. Add recent searches
Verification: Search is fast and accurate
```

---

## Phase 7: Monitoring & Analytics (PRIORITY: MEDIUM)

### Task 7.1: Error Tracking

```
Goal: Production error visibility
Actions:
  1. Complete Sentry integration
  2. Add error context
  3. Add user feedback dialog
  4. Add breadcrumbs
  5. Setup alerting
Verification: All errors tracked in Sentry
```

### Task 7.2: Performance Monitoring

```
Goal: Performance visibility
Actions:
  1. Add Web Vitals tracking
  2. Add custom performance marks
  3. Setup performance budgets
  4. Add RUM (Real User Monitoring)
  5. Create performance dashboard
Verification: Performance metrics visible
```

### Task 7.3: Analytics

```
Goal: User behavior insights
Actions:
  1. Add custom GA4 events
  2. Track feature usage
  3. Add funnel analysis
  4. Add cohort analysis
  5. Create analytics dashboard
Verification: Full user journey tracked
```

---

## Phase 8: Deployment & DevOps (PRIORITY: LOW)

### Task 8.1: CI/CD Pipeline

```
Goal: Automated deployment
Actions:
  1. Setup GitHub Actions
  2. Add build step
  3. Add test step
  4. Add lint step
  5. Add deploy step
Verification: Push to main triggers deployment
```

### Task 8.2: Docker Setup

```
Goal: Containerized deployment
Actions:
  1. Create Dockerfile
  2. Add docker-compose.yml
  3. Add health checks
  4. Optimize image size
  5. Add multi-stage build
Verification: App runs in Docker
```

### Task 8.3: Environment Management

```
Goal: Proper environment setup
Actions:
  1. Create environment templates
  2. Add secrets management
  3. Setup staging environment
  4. Add feature flags
  5. Add rollback strategy
Verification: Multiple environments configured
```

---

## Verification Checklist

### Code Quality

- [ ] TypeScript: 0 errors, 0 warnings
- [ ] ESLint: 0 warnings
- [ ] Prettier: All files formatted
- [ ] Tests: >80% coverage
- [ ] Build: Successful

### Performance

- [ ] Lighthouse: >90 all categories
- [ ] Bundle: <500KB main
- [ ] LCP: <2.5s
- [ ] FID: <100ms
- [ ] CLS: <0.1

### Accessibility

- [ ] WCAG 2.1 AA compliant
- [ ] Keyboard navigable
- [ ] Screen reader tested
- [ ] Color contrast: 4.5:1+
- [ ] Focus indicators visible

### Security

- [ ] No XSS vulnerabilities
- [ ] Secure auth flow
- [ ] Input sanitized
- [ ] HTTPS enforced
- [ ] CSP headers

### UX

- [ ] Mobile responsive (320px+)
- [ ] Offline capable
- [ ] Fast loading
- [ ] Error handling
- [ ] Loading states

---

## Execution Rules

1. **No Breaking Changes**: Always maintain backward compatibility
2. **Test First**: Add tests before fixing bugs
3. **One Change at a Time**: Small, focused commits
4. **Document**: Update docs for every change
5. **Verify**: Test thoroughly before marking complete
6. **Review**: Self-review all changes

---

## Success Criteria

- Build succeeds with 0 errors
- All tests pass
- Lighthouse score >90
- No security vulnerabilities
- Mobile responsive
- Accessible to WCAG AA
- Fast performance (Web Vitals green)

---

## Next Task Recommendation

**Start with Phase 1 (Code Quality)**:

1. Fix all TypeScript warnings (30 mins)
2. Setup ESLint properly (30 mins)
3. Organize code structure (1 hour)

This provides immediate code quality improvements and makes subsequent tasks easier.

**Time Estimate**: 2 hours for Phase 1  
**Impact**: High (code maintainability)  
**Risk**: Low (no breaking changes)
