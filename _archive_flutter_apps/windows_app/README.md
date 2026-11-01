# LearningHub - Development Quick Reference

## Commands

```bash
flutter pub get          # Install deps
flutter run -d windows   # Run on Windows
flutter analyze          # Check for issues
flutter test             # Run tests
```

## Project Structure

```
lib/
├── core/providers/      # auth_provider, theme_provider
├── core/router/         # app_router.dart (GoRouter)
├── core/theme/          # app_theme.dart, app_colors.dart
├── data/models/         # user_model, course_model
├── features/            # Screen folders (auth, home, course, etc.)
└── shared/widgets/      # Reusable widgets
```

## Key Patterns

### State (Riverpod)

```dart
final authProvider = StateNotifierProvider<AuthNotifier, AsyncValue<User?>>(...)
ref.watch(provider)    // In build() - reactive
ref.read(provider)     // In callbacks - one-time
```

### Navigation (GoRouter)

```dart
context.go('/home');        // Replace
context.push('/course/1');  // Push
context.pop();              // Back
```

## Dependencies (pubspec.yaml)

- flutter_riverpod
- go_router
- hive_ce, hive_ce_flutter
- cached_network_image
- flutter_animate
- google_fonts
- video_player
- shared_preferences

## Checklist for Changes

- [ ] Follow existing patterns
- [ ] Add error handling
- [ ] Add loading states
- [ ] Use AppColors
- [ ] Test on multiple screen sizes
