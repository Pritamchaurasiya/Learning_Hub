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
class HomeScreenV2 extends ConsumerStatefulWidget {
  const HomeScreenV2({super.key});

  @override
  ConsumerState<HomeScreenV2> createState() => _HomeScreenV2State();
}

class _HomeScreenV2State extends ConsumerState<HomeScreenV2>
    with SingleTickerProviderStateMixin {
  late ConfettiController _confettiController;
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _confettiController =
        ConfettiController(duration: const Duration(seconds: 3));
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _confettiController.dispose();
    _tabController.dispose();
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
      child: Scaffold(
        extendBodyBehindAppBar: true,
        body: DefaultTabController(
          length: 3,
          child: NestedScrollView(
            headerSliverBuilder:
                (BuildContext context, bool innerBoxIsScrolled) {
              return <Widget>[
                SliverOverlapAbsorber(
                  handle:
                      NestedScrollView.sliverOverlapAbsorberHandleFor(context),
                  sliver: SliverAppBar(
                    title: Text(AppLocalizations.of(context)!.appTitle),
                    pinned: true,
                    floating: true,
                    snap: true,
                    forceElevated: innerBoxIsScrolled,
                    bottom: TabBar(
                      controller: _tabController,
                      tabs: const [
                        Tab(text: 'Home'),
                        Tab(text: 'Discover'),
                        Tab(text: 'Live'),
                      ],
                    ),
                  ),
                ),
              ];
            },
            body: TabBarView(
              controller: _tabController,
              children: [
                _buildHomeTab(context, homeData, isDesktop, isTablet),
                _buildDiscoverTab(context, homeData, isDesktop, isTablet),
                _buildLiveTab(context, homeData, isDesktop, isTablet),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHomeTab(BuildContext context, AsyncValue<HomeData> homeData,
      bool isDesktop, bool isTablet) {
    return homeData.when(
      loading: () => const HomeSkeleton(),
      error: (error, stack) => Center(child: Text('Error: $error')),
      data: (data) => CustomScrollView(
        slivers: [
          SliverList(
            delegate: SliverChildListDelegate([
              WelcomeSection(userName: data.userName),
              const RecentlyViewedWidget(),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: MentorshipBanner(),
              ),
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: ActivityHeatmap(
                  activityData: {
                    DateTime.now(): 45,
                    DateTime.now().subtract(const Duration(days: 1)): 30,
                    DateTime.now().subtract(const Duration(days: 2)): 60,
                    DateTime.now().subtract(const Duration(days: 3)): 15,
                    DateTime.now().subtract(const Duration(days: 5)): 90,
                  },
                ),
              ),
              Consumer(
                builder: (context, ref, child) {
                  final pathState = ref.watch(learningPathProvider);
                  final activePath = pathState.activePath;

                  if (activePath == null) {
                    return const SizedBox.shrink();
                  }

                  return Padding(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SectionHeader(
                          title: 'Your Learning Path',
                          icon: Icons.map,
                          onSeeAll: () => context.push('/learning-path'),
                        ),
                        Card(
                          child: ListTile(
                            leading: CircleAvatar(
                              backgroundColor: Theme.of(context)
                                  .colorScheme
                                  .primaryContainer,
                              child: Icon(Icons.school,
                                  color: Theme.of(context).colorScheme.primary),
                            ),
                            title: Text(activePath.title,
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold)),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const SizedBox(height: 4),
                                LinearProgressIndicator(
                                  value: activePath.progress / 100,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                    '${activePath.progress.toInt()}% Completed'),
                              ],
                            ),
                            trailing:
                                const Icon(Icons.arrow_forward_ios, size: 16),
                            onTap: () =>
                                context.push('/learning-path/${activePath.id}'),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ]),
          ),
        ],
      ),
    );
  }

  Widget _buildDiscoverTab(BuildContext context, AsyncValue<HomeData> homeData,
      bool isDesktop, bool isTablet) {
    return homeData.when(
      loading: () => const HomeSkeleton(),
      error: (error, stack) => Center(child: Text('Error: $error')),
      data: (data) => CustomScrollView(
        slivers: [
          SliverList(
            delegate: SliverChildListDelegate([
              if (isDesktop) const HeroBanner(),
              if (isDesktop) const SizedBox(height: 16),
              SectionHeader(
                title: AppLocalizations.of(context)!.featuredCourses,
                onSeeAll: () => context.push('/search?featured=true'),
              ),
              if (isDesktop)
                FeaturedCoursesGrid(courses: data.featuredCourses)
              else
                FeaturedCoursesSection(courses: data.featuredCourses),
              SectionHeader(
                  title: AppLocalizations.of(context)!.browseCategories),
              const CategoriesSection(),
              SectionHeader(
                title: AppLocalizations.of(context)!.trendingNow,
                onSeeAll: () => context.push('/search?trending=true'),
              ),
              CourseListHorizontal(
                courses: data.trendingCourses,
                isDesktop: isDesktop || isTablet,
              ),
              SectionHeader(
                title: AppLocalizations.of(context)!.recommendedForYou,
                onSeeAll: () => context.push('/search?recommended=true'),
              ),
              Consumer(
                builder: (context, ref, child) {
                  final recommendationState = ref.watch(recommendationProvider);
                  if (recommendationState.isLoading &&
                      recommendationState.recommendations.isEmpty) {
                    return const SizedBox(
                        height: 200,
                        child: PremiumLoadingIndicator(
                            message: 'Loading recommendations...'));
                  }
                  if (recommendationState.recommendations.isEmpty) {
                    return const SizedBox(height: 50);
                  }
                  return CourseListHorizontal(
                    courses: recommendationState.recommendations,
                    isDesktop: isDesktop || isTablet,
                  );
                },
              ),
            ]),
          ),
        ],
      ),
    );
  }

  Widget _buildLiveTab(BuildContext context, AsyncValue<HomeData> homeData,
      bool isDesktop, bool isTablet) {
    return homeData.when(
      loading: () => const HomeSkeleton(),
      error: (error, stack) => Center(child: Text('Error: $error')),
      data: (data) => CustomScrollView(
        slivers: [
          SliverList(
            delegate: SliverChildListDelegate([
              if (data.upcomingLiveClasses.isNotEmpty) ...[
                SectionHeader(
                  title: AppLocalizations.of(context)!.upcomingLiveClasses,
                  icon: Icons.live_tv,
                ),
                LiveClassesSection(classes: data.upcomingLiveClasses),
              ],
            ]),
          ),
        ],
      ),
    );
  }
}
