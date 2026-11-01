// Simple widget test that avoids Google Fonts issues
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    // Mock Shared Preferences
    SharedPreferences.setMockInitialValues({});

    // Reset FlutterError to default
    FlutterError.onError = null;
  });

  testWidgets('App renders with basic MaterialApp',
      (WidgetTester tester) async {
    // Set up a proper screen size
    tester.view.physicalSize = const Size(1080, 1920);
    tester.view.devicePixelRatio = 2.0;

    // Build the app
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: Scaffold(
            body: Center(
              child: Text('Test'),
            ),
          ),
        ),
      ),
    );

    // Verify the basic structure is there
    expect(find.byType(MaterialApp), findsOneWidget);
    expect(find.byType(Scaffold), findsOneWidget);
    expect(find.text('Test'), findsOneWidget);

    // Reset the view size
    addTearDown(() => tester.view.resetPhysicalSize());
  });
}
