import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:my_flutter_app/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('end-to-end test', () {
    testWidgets('tap on the first course and verify details', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Verify we are on the landing screen
      expect(find.text('Welcome Back!'), findsOneWidget);
      expect(find.text('Featured Courses'), findsOneWidget);

      // Find the first course card (assuming mock data is loaded)
      // We look for 'Flutter Masterclass 2024' which is in our mock data
      final courseFinder = find.text('Flutter Masterclass 2024');

      // Scroll until visible if needed
      await tester.scrollUntilVisible(
        courseFinder,
        500,
        scrollable: find.byType(Scrollable).first,
      );

      expect(courseFinder, findsOneWidget);

      // Tap on the course
      await tester.tap(courseFinder);
      await tester.pumpAndSettle();

      // Verify we are on the detail screen
      expect(find.text('Flutter Masterclass 2024'), findsOneWidget);
      expect(find.text('Enroll Now'), findsOneWidget);
    });
  });
}
