import 'dart:async';
import 'package:flutter/material.dart';
import 'package:learning_hub/l10n/generated/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:confetti/confetti.dart';

import 'package:learning_hub/core/services/course_service.dart';
import 'package:learning_hub/data/models/course_model.dart';
import 'package:learning_hub/data/models/live_class_model.dart';

import 'package:learning_hub/core/providers/auth_provider.dart';
import 'package:learning_hub/core/providers/gamification_provider.dart';
import 'package:learning_hub/core/providers/recommendation_provider.dart';
import 'package:learning_hub/core/providers/learning_path_provider.dart';
import 'package:learning_hub/features/gamification/presentation/widgets/level_up_dialog.dart';
import 'package:learning_hub/shared/widgets/recently_viewed_widget.dart';
import 'package:learning_hub/features/home/mentorship_banner.dart';
import 'package:learning_hub/shared/widgets/home_skeleton.dart';
import 'package:learning_hub/shared/widgets/premium_loading_indicator.dart';
import 'package:learning_hub/features/home/widgets/hero_banner.dart';
import 'package:learning_hub/features/home/widgets/home_app_bar.dart';
import '../../shared/widgets/activity_heatmap.dart';

import 'models/home_data.dart';
import 'widgets/section_header.dart';
import 'widgets/welcome_section.dart';
import 'widgets/featured_courses_list.dart';
import 'widgets/categories_section.dart';
import 'widgets/course_list_horizontal.dart';
import 'widgets/live_classes_section.dart';

/// Home screen provider for real data
final homeDataProvider = FutureProvider<HomeData>((ref) async {
  final courseService = CourseService.instance;

  // Use the recommendation provider to ensure consistency
  // We don't await this here to avoid blocking UI, the UI subscribes to the provider separately
  // But for the 'HomeData' object backward compatibility, we might fetch basics

  // Get current user from auth provider
  final currentUser = ref.watch(currentUserProvider);
  final userName = currentUser?.displayName ?? 'Learner';

  // 1. Fetch data in parallel
  final results = await Future.wait([
    courseService.getFeaturedCourses(),
    courseService.getCourses(category: 'trending'),
    courseService.getUpcomingLiveClasses(),
  ]);

  final featured = results[0] as List<Course>;
  final trending = results[1] as List<Course>;
  final liveClasses = results[2] as List<LiveClassModel>;

  // Refresh recommendations in background
  unawaited(ref.read(recommendationProvider.notifier).loadRecommendations());

  return HomeData(
    userName: userName,
    continueLearning: [], // Usage replaced by RecentlyViewedWidget
    featuredCourses: featured,
    trendingCourses: trending,
    recommendedCourses: [], // Handled by separate provider now
    upcomingLiveClasses: liveClasses,
  );
});

/// Home screen with featured courses, recommendations, and progress tracking
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  late ConfettiController _confettiController;

  @override
  void initState() {
    super.initState();
    _confettiController =
        ConfettiController(duration: const Duration(seconds: 3));
  }

  @override
  void dispose() {
    _confettiController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Listen for level up celebration
    ref.listen(gamificationProvider, (previous, next) {
      if (next.showLevelUpCelebration && !next.isLoading) {
        _confettiController.play();
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => LevelUpDialog(
            newLevel: next.level,
            xpGained:
                500, // Mocked for now, in real prod this comes from the event
            unlockedRewards: const [
              'New Avatar: Legend',
              'Special Badge: God-Tier Learner'
            ],
          ),
        );
        // Reset the flag immediately to allow future triggers
        ref.read(gamificationProvider.notifier).dismissCelebration();
      }
    });

    final theme = Theme.of(context);
    final homeData = ref.watch(homeDataProvider);

    final size = MediaQuery.of(context).size;
    final isDesktop = size.width >= 1024;
    final isTablet = size.width >= 600 && size.width < 1024;

    return Title(
      title: AppLocalizations.of(context)!.appTitle,
      color: theme.primaryColor,
      child: Stack(
        children: [
          Scaffold(
            extendBodyBehindAppBar: true,
            body: CustomScrollView(
              slivers: [
                const HomeAppBar(),

                // Content
                homeData.when(
                  loading: () => const SliverFillRemaining(
                    child: HomeSkeleton(),
                  ),
                  error: (error, stack) => SliverFillRemaining(
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.error_outline,
                              size: 48, color: theme.colorScheme.error),
                          const SizedBox(height: 16),
                          Text('Unable to load content',
                              style: theme.textTheme.titleMedium),
                          const SizedBox(height: 8),
                          FilledButton.icon(
                            onPressed: () => ref.invalidate(homeDataProvider),
                            icon: const Icon(Icons.refresh),
                            label: const Text('Retry'),
                          ),
                        ],
                      ),
                    ),
                  ),
                  data: (data) => SliverList(
                    delegate: SliverChildListDelegate([
                      // Hero Banner (God-Tier Feature)
                      if (isDesktop) const HeroBanner(),
                      if (isDesktop) const SizedBox(height: 16),

                      // Welcome Section with Glassmorphism
                      WelcomeSection(userName: data.userName),

                      // Recently Viewed (Replaces Continue Learning)
                      const RecentlyViewedWidget(),

                      // Mentorship Banner
                      const Padding(
                        padding:
                            EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        child: MentorshipBanner(),
                      ),

                      // GOD MODE: Activity Heatmap
                      Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 8),
                        child: ActivityHeatmap(
                          activityData: {
                            DateTime.now(): 45,
                            DateTime.now().subtract(const Duration(days: 1)):
                                30,
                            DateTime.now().subtract(const Duration(days: 2)):
                                60,
                            DateTime.now().subtract(const Duration(days: 3)):
                                15,
                            DateTime.now().subtract(const Duration(days: 5)):
                                90,
                          },
                        ),
                      ),

                      // Learning Path Progress (New)
                      Consumer(
                        builder: (context, ref, child) {
                          final pathState = ref.watch(learningPathProvider);
                          final activePath = pathState.activePath;

                          if (activePath == null) {
                            return const SizedBox.shrink();
                          }

                          return Padding(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 8),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                SectionHeader(
                                  title: 'Your Learning Path',
                                  icon: Icons.map,
                                  onSeeAll: () => context.push(
                                      '/learning-path'), // Route to be implemented
                                ),
                                Card(
                                  child: ListTile(
                                    leading: CircleAvatar(
                                      backgroundColor:
                                          theme.colorScheme.primaryContainer,
                                      child: Icon(Icons.school,
                                          color: theme.colorScheme.primary),
                                    ),
                                    title: Text(activePath.title,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.bold)),
                                    subtitle: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        const SizedBox(height: 4),
                                        LinearProgressIndicator(
                                          value: activePath.progress / 100,
                                          borderRadius:
                                              BorderRadius.circular(4),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                            '${activePath.progress.toInt()}% Completed'),
                                      ],
                                    ),
                                    trailing: const Icon(
                                        Icons.arrow_forward_ios,
                                        size: 16),
                                    onTap: () => context.push(
                                        '/learning-path/${activePath.id}'),
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),

                      // Featured Courses (Responsive)
                      SectionHeader(
                        title: AppLocalizations.of(context)!.featuredCourses,
                        onSeeAll: () => context.push('/search?featured=true'),
                      ),
                      if (isDesktop)
                        FeaturedCoursesGrid(courses: data.featuredCourses)
                      else
                        FeaturedCoursesSection(courses: data.featuredCourses),

                      // Categories
                      SectionHeader(
                          title:
                              AppLocalizations.of(context)!.browseCategories),
                      const CategoriesSection(),

                      // Trending Now
                      SectionHeader(
                        title: AppLocalizations.of(context)!.trendingNow,
                        onSeeAll: () => context.push('/search?trending=true'),
                      ),
                      CourseListHorizontal(
                        courses: data.trendingCourses,
                        isDesktop: isDesktop || isTablet,
                      ),

                      // Recommended for You (Real Data)
                      SectionHeader(
                        title: AppLocalizations.of(context)!.recommendedForYou,
                        onSeeAll: () =>
                            context.push('/search?recommended=true'),
                      ),
                      Consumer(
                        builder: (context, ref, child) {
                          final recommendationState =
                              ref.watch(recommendationProvider);
                          if (recommendationState.isLoading &&
                              recommendationState.recommendations.isEmpty) {
                            return const SizedBox(
                                height: 200,
                                child: PremiumLoadingIndicator(
                                    message: 'Loading recommendations...'));
                          }
                          if (recommendationState.recommendations.isEmpty) {
                            return const SizedBox(height: 50); // Hide if empty
                          }
                          return CourseListHorizontal(
                            courses: recommendationState.recommendations,
                            isDesktop: isDesktop || isTablet,
                          );
                        },
                      ),

                      // Upcoming Live Classes
                      if (data.upcomingLiveClasses.isNotEmpty) ...[
                        SectionHeader(
                          title:
                              AppLocalizations.of(context)!.upcomingLiveClasses,
                          icon: Icons.live_tv,
                        ),
                        LiveClassesSection(classes: data.upcomingLiveClasses),
                      ],

                      const SizedBox(height: 48),
                    ]),
                  ),
                ),
              ],
            ),
          ),

          // Confetti Overlay
          Align(
            alignment: Alignment.topCenter,
            child: ConfettiWidget(
              confettiController: _confettiController,
              blastDirectionality: BlastDirectionality.explosive,
              shouldLoop: false,
              colors: const [
                Colors.green,
                Colors.blue,
                Colors.pink,
                Colors.orange,
                Colors.purple
              ],
            ),
          ),

          // AI Tutor FAB (Glassmorphic)
          Positioned(
            bottom: 24,
            right: 24,
            child: _AiTutorFab(),
          ),
        ],
      ),
    );
  }
}

/// Glassmorphic AI Tutor FAB
class _AiTutorFab extends StatefulWidget {
  @override
  State<_AiTutorFab> createState() => _AiTutorFabState();
}

class _AiTutorFabState extends State<_AiTutorFab>
    with SingleTickerProviderStateMixin {
  bool _isHovered = false;
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.15).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: ListenableBuilder(
        listenable: _pulseController,
        builder: (context, child) {
          return Transform.scale(
            scale: _isHovered ? 1.1 : _pulseAnimation.value,
            child: child,
          );
        },
        child: GestureDetector(
          onTap: () => context.push('/ai-tutor'),
          child: Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Colors.deepPurple.shade400,
                  Colors.purple.shade600,
                  Colors.indigo.shade500,
                ],
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.purple.withValues(alpha: 0.4),
                  blurRadius: 20,
                  spreadRadius: 2,
                  offset: const Offset(0, 4),
                ),
                BoxShadow(
                  color: Colors.deepPurple.withValues(alpha: 0.3),
                  blurRadius: 30,
                  spreadRadius: 5,
                ),
              ],
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Glassmorphic inner circle
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.3),
                      width: 1.5,
                    ),
                    gradient: RadialGradient(
                      colors: [
                        Colors.white.withValues(alpha: 0.2),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
                // AI Icon
                const Icon(
                  Icons.psychology,
                  color: Colors.white,
                  size: 28,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
