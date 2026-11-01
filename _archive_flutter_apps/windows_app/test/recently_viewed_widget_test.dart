import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:learning_hub/shared/widgets/recently_viewed_widget.dart';
import 'package:learning_hub/data/models/course_model.dart';
import 'package:learning_hub/core/services/course_service.dart';
import 'package:mocktail/mocktail.dart';

import 'dart:io';
import 'dart:async';

class TestHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    return _MockHttpClient();
  }
}

class _MockHttpClient extends Mock implements HttpClient {
  @override
  Future<HttpClientRequest> getUrl(Uri url) {
    return Future.value(_MockHttpClientRequest());
  }

  @override
  set autoUncompress(bool autoUncompress) {}
}

class _MockHttpClientRequest extends Mock implements HttpClientRequest {
  @override
  HttpHeaders get headers => _MockHttpHeaders();

  @override
  Future<HttpClientResponse> close() {
    return Future.value(_MockHttpClientResponse());
  }
}

class _MockHttpClientResponse extends Mock implements HttpClientResponse {
  @override
  int get statusCode => 200;

  @override
  int get contentLength => kTransparentImage.length;

  @override
  HttpClientResponseCompressionState get compressionState =>
      HttpClientResponseCompressionState.notCompressed;

  @override
  StreamSubscription<List<int>> listen(
    void Function(List<int> event)? onData, {
    Function? onError,
    void Function()? onDone,
    bool? cancelOnError,
  }) {
    return Stream<List<int>>.fromIterable([kTransparentImage]).listen(
      onData,
      onError: onError,
      onDone: onDone,
      cancelOnError: cancelOnError,
    );
  }
}

class _MockHttpHeaders extends Mock implements HttpHeaders {}

// A transparent 1x1 pixel PNG
final List<int> kTransparentImage = <int>[
  0x89,
  0x50,
  0x4E,
  0x47,
  0x0D,
  0x0A,
  0x1A,
  0x0A,
  0x00,
  0x00,
  0x00,
  0x0D,
  0x49,
  0x48,
  0x44,
  0x52,
  0x00,
  0x00,
  0x00,
  0x01,
  0x00,
  0x00,
  0x00,
  0x01,
  0x08,
  0x06,
  0x00,
  0x00,
  0x00,
  0x1F,
  0x15,
  0xC4,
  0x89,
  0x00,
  0x00,
  0x00,
  0x0A,
  0x49,
  0x44,
  0x41,
  0x54,
  0x78,
  0x9C,
  0x63,
  0x00,
  0x01,
  0x00,
  0x00,
  0x05,
  0x00,
  0x01,
  0x0D,
  0x0A,
  0x2D,
  0xB4,
  0x00,
  0x00,
  0x00,
  0x00,
  0x49,
  0x45,
  0x4E,
  0x44,
  0xAE,
  0x42,
  0x60,
  0x82,
];

void main() {
  setUpAll(() {
    HttpOverrides.global = TestHttpOverrides();
  });

  testWidgets('RecentlyViewedWidget displays courses when data is available',
      (WidgetTester tester) async {
    // Mock Data
    final mockCourse = Course(
      id: 'c1',
      title: 'Flutter Mastery',
      slug: 'flutter-mastery',
      description: 'Learn Flutter',
      shortDescription: 'Basic Flutter',
      thumbnailUrl: 'https://example.com/image.jpg',
      instructorId: 'inst1',
      instructorName: 'Angela Yu',
      instructorAvatar: 'https://example.com/avatar.jpg',
      rating: 4.8,
      reviewCount: 100,
      enrollmentCount: 1000,
      price: 19.99,
      isFree: false,
      totalDuration: const Duration(hours: 10),
      totalLessons: 20,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
      sections: [],
      category: 'Development',
      language: 'English',
      level: CourseLevel.beginner,
      isPublished: true,
      hasCertificate: true,
      requirements: [],
      whatYouWillLearn: [],
      tags: [],
    );

    final mockProgress = CourseProgress(
      courseId: 'c1',
      progress: 0.5,
      completedLessons: 10,
      totalLessons: 20,
      timeSpentMinutes: 300,
      lastAccessed: DateTime.now(),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          recentlyViewedProvider.overrideWith((ref) {
            return [
              {'course': mockCourse, 'progress': mockProgress}
            ];
          }),
        ],
        child: const MaterialApp(
          home: Scaffold(
            body: RecentlyViewedWidget(),
          ),
        ),
      ),
    );

    // Initial pump - shows loading state
    await tester.pump();

    // Pump to allow Future to complete and trigger rebuild
    // We explicitly avoid pumpAndSettle here because the loading skeleton
    // has an infinite shimmer animation which would cause a timeout
    await tester
        .pump(const Duration(milliseconds: 100)); // Allow future to complete
    await tester.pump(); // Process the rebuild

    // Now we should be in data state (no infinite animation)
    // We can allow finite animations (fadeIn) to complete
    await tester.pumpAndSettle();

    // Verify Title
    expect(find.text('Jump Back In'), findsOneWidget);

    expect(find.text('Flutter Mastery'), findsOneWidget);
    expect(find.text('50% Done'), findsOneWidget);
  });

  testWidgets('RecentlyViewedWidget hides when no data',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          recentlyViewedProvider.overrideWith((ref) async {
            return [];
          }),
        ],
        child: const MaterialApp(
          home: Scaffold(
            body: RecentlyViewedWidget(),
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Jump Back In'), findsNothing);
    expect(find.byType(ListView), findsNothing);
  });
}
