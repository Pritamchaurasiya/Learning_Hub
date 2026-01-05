import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:learning_hub/l10n/generated/app_localizations.dart';
import 'package:learning_hub/features/home/home_screen.dart';
import 'package:learning_hub/core/providers/gamification_provider.dart';
import 'package:learning_hub/core/providers/recommendation_provider.dart';
import 'package:learning_hub/core/providers/learning_path_provider.dart';
import 'package:learning_hub/core/providers/analytics_provider.dart';
import 'package:learning_hub/core/providers/auth_provider.dart';
import 'package:learning_hub/data/models/user_model.dart';
import 'package:get_it/get_it.dart';
import 'package:learning_hub/features/gamification/domain/repositories/gamification_repository.dart';
import 'package:learning_hub/features/gamification/domain/entities/achievement.dart';
import 'package:learning_hub/features/gamification/domain/entities/leaderboard_entry.dart';
import 'package:dartz/dartz.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:learning_hub/features/home/models/home_data.dart';
import 'package:learning_hub/data/models/course_model.dart';
import 'mocks.dart';

// --- MOCKS ---

// Mock GamificationNotifier
class MockGamificationNotifier extends GamificationNotifier {
  @override
  GamificationState build() {
    return const GamificationState(
      totalXP: 100,
      level: 5,
      levelProgress: 0.5,
      streak: 3,
      isLoading: false,
    );
  }
}

// Mock RecommendationNotifier
class MockRecommendationNotifier extends StateNotifier<RecommendationState>
    implements RecommendationNotifier {
  MockRecommendationNotifier() : super(const RecommendationState());

  @override
  Future<void> loadRecommendations() async {}
  @override
  Future<void> refresh() async {}
}

// Mock LearningPathNotifier
class MockLearningPathNotifier extends StateNotifier<LearningPathState>
    implements LearningPathNotifier {
  MockLearningPathNotifier() : super(const LearningPathState());

  @override
  Future<void> loadPaths() async {}
  @override
  Future<void> generatePath(
      {required String goal,
      required List<String> targetSkills,
      required String timeCommitment,
      required List<String> preferredStyles}) async {}
  @override
  Future<void> startPath(String pathId) async {}
  @override
  Future<void> deletePath(String pathId) async {}
}

// Mock AnalyticsNotifier
class MockAnalyticsNotifier extends AnalyticsNotifier {
  @override
  AnalyticsState build() {
    return AnalyticsState(isLoading: false);
  }

  @override
  Future<void> endSession() async {}
  @override
  void startSession() {}
  @override
  void refresh() {}
}

// Mock AuthNotifier
class MockAuthNotifier extends AuthNotifier {
  @override
  Future<User?> build() async {
    return User(
      id: 'test_user',
      email: 'test@test.com',
      displayName: 'Test User',
      role: UserRole.student,
      enrolledCourseIds: [],
      completedCourseIds: [],
      wishlistCourseIds: [],
      preferences: UserPreferences.defaultPreferences(),
      stats: UserStats.empty(),
      createdAt: DateTime.now(),
      lastLoginAt: DateTime.now(),
      isVerified: true,
      isActive: true,
    );
  }
}

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    SharedPreferences.setMockInitialValues({});

    // Register GetIt mocks
    await GetIt.I.reset();
    final mockGamificationRepo = MockGamificationRepository();

    when(() => mockGamificationRepo.getUserXP())
        .thenAnswer((_) async => const Right(0));
    when(() => mockGamificationRepo.watchUserXP())
        .thenAnswer((_) async => const Right(Stream.empty()));
    when(() => mockGamificationRepo.getAchievements())
        .thenAnswer((_) async => const Right(<Achievement>[]));
    when(() =>
            mockGamificationRepo.getLeaderboard(period: any(named: 'period')))
        .thenAnswer((_) async => const Right(<LeaderboardEntry>[]));

    GetIt.I.registerSingleton<GamificationRepository>(mockGamificationRepo);
  });

  tearDownAll(() {
    GetIt.I.reset();
  });

  testWidgets('Integration: Home Screen Test with mock data',
      (WidgetTester tester) async {
    // Set desktop size to avoid layout issues with small screens if any
    tester.view.physicalSize = const Size(1920, 1080);
    tester.view.devicePixelRatio = 1.0;

    // 1. Create Mock HomeData
    final mockHomeData = HomeData(
      userName: 'Test User',
      continueLearning: [],
      featuredCourses: [
        Course(
          id: '1',
          title: 'Test Course 1',
          slug: 'test-course-1',
          description: 'Desc 1',
          shortDescription: 'Short Desc',
          thumbnailUrl: '',
          instructorId: 'inst1',
          instructorName: 'Instructor',
          instructorAvatar: '',
          totalLessons: 5,
          isFree: true,
          category: 'Development',
          price: 0,
          rating: 5.0,
          sections: [],
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
          tags: ['tag'],
          enrollmentCount: 10,
          reviewCount: 5,
          totalDuration: const Duration(hours: 1),
          level: CourseLevel.beginner,
          language: 'English',
          isPublished: true,
          hasCertificate: true,
          requirements: [],
          whatYouWillLearn: [],
        ),
      ],
      trendingCourses: [],
      recommendedCourses: [],
      upcomingLiveClasses: [],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          gamificationProvider.overrideWith(() => MockGamificationNotifier()),
          homeDataProvider.overrideWith((ref) => Future.value(mockHomeData)),
          recommendationProvider
              .overrideWith((ref) => MockRecommendationNotifier()),
          learningPathProvider
              .overrideWith((ref) => MockLearningPathNotifier()),
          analyticsProvider.overrideWith(() => MockAnalyticsNotifier()),
          authProvider.overrideWith(() => MockAuthNotifier()),
        ],
        child: const MaterialApp(
          localizationsDelegates: [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          supportedLocales: AppLocalizations.supportedLocales,
          home: HomeScreen(),
        ),
      ),
    );

    // Pump frames manually allowing animations to progress but not wait forever
    // Pump several frames to allow data settlement and initial animations
    // We avoid pumpAndSettle here because HeroBanner has infinite animations (repeat)
    for (int i = 0; i < 10; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }

    // Verification
    expect(find.byType(HomeScreen, skipOffstage: false), findsOneWidget);
    expect(find.text('Featured Courses', skipOffstage: false), findsOneWidget);
    expect(find.byType(GridView, skipOffstage: false), findsOneWidget);
    expect(find.byType(Card, skipOffstage: false), findsWidgets);
    expect(find.text('Test Course 1', skipOffstage: false), findsOneWidget);

    // Reset size
    addTearDown(tester.view.resetPhysicalSize);
  });
}
