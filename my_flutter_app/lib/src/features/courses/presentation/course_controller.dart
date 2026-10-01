import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/features/courses/data/course_repository.dart';
import 'package:my_flutter_app/src/features/courses/domain/course_model.dart';

class CourseState {
  CourseState({
    this.allCourses = const [],
    this.filteredCourses = const [],
    this.searchQuery = '',
    this.selectedLevel,
    this.selectedCategory,
    this.freeOnly = false,
  });

  final List<Course> allCourses;
  final List<Course> filteredCourses;
  final String searchQuery;
  final String? selectedLevel;
  final String? selectedCategory;
  final bool freeOnly;

  List<Course> get courses => filteredCourses;

  CourseState copyWith({
    List<Course>? allCourses,
    List<Course>? filteredCourses,
    String? searchQuery,
    String? selectedLevel,
    String? selectedCategory,
    bool? freeOnly,
  }) {
    return CourseState(
      allCourses: allCourses ?? this.allCourses,
      filteredCourses: filteredCourses ?? this.filteredCourses,
      searchQuery: searchQuery ?? this.searchQuery,
      selectedLevel: selectedLevel ?? this.selectedLevel,
      selectedCategory: selectedCategory ?? this.selectedCategory,
      freeOnly: freeOnly ?? this.freeOnly,
    );
  }
}

final courseControllerProvider =
    AsyncNotifierProvider<CourseController, CourseState>(CourseController.new);

class CourseController extends AsyncNotifier<CourseState> {
  static final List<Course> _mockCourses = [
    const Course(
      id: '1',
      title: 'Full-Stack Web & System Design Masterclass',
      slug: 'fullstack-masterclass',
      description:
          'Build scalable web applications with Flutter, Django REST Framework, PostgreSQL, and Redis. Master distributed architectures.',
      shortDescription: 'Complete end-to-end full-stack engineering with real deployments.',
      price: 0.0,
      isFree: true,
      difficulty: 'intermediate',
      level: 'INTERMEDIATE',
      instructorName: 'Alex Rivera',
      categoryName: 'Engineering',
      categorySlug: 'engineering',
      thumbnailUrl:
          'https://images.unsplash.com/photo-1617042375876-a13e36732a04?w=800&q=80',
      learningObjectives: [
        'Build high-performance REST and WebSocket APIs with Django and Channels',
        'Develop cross-platform client applications in Flutter with Riverpod',
        'Design optimized relational schemas and indexing in PostgreSQL',
        'Implement robust caching, rate limiting, and session security with Redis',
      ],
      requirements: [
        'Basic familiarity with Python or Dart programming',
        'Understanding of fundamental HTTP and client-server concepts',
      ],
    ),
    const Course(
      id: '2',
      title: 'Data Structures & Algorithms in Production',
      slug: 'dsa-production',
      description:
          'Deep dive into graph algorithms, dynamic programming, trees, and time-space complexity optimization with interactive coding problems.',
      shortDescription: 'Master algorithms with comprehensive test cases and visualizer.',
      price: 0.0,
      isFree: true,
      difficulty: 'advanced',
      level: 'ADVANCED',
      instructorName: 'Sarah Smith',
      categoryName: 'Computer Science',
      categorySlug: 'computer-science',
      thumbnailUrl:
          'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80',
      learningObjectives: [
        'Master asymptotic analysis and memory profiling',
        'Solve advanced graph, tree, and backtracking problems',
        'Implement production-ready caching and search indices',
      ],
    ),
    const Course(
      id: '3',
      title: 'AI Systems & Neuro-Symbolic Reasoning',
      slug: 'ai-systems-mastery',
      description:
          'Understand LLM orchestration, RAG pipelines, semantic embeddings with pgvector, and automated evaluation engines.',
      shortDescription: 'Architect resilient AI systems and agents.',
      price: 49.99,
      isFree: false,
      difficulty: 'advanced',
      level: 'ADVANCED',
      instructorName: 'Dr. Emily Chen',
      categoryName: 'Artificial Intelligence',
      categorySlug: 'ai',
      thumbnailUrl:
          'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80',
      learningObjectives: [
        'Deploy RAG pipelines with vector databases and hybrid search',
        'Implement guardrails, prompt security, and automated evaluation',
      ],
    ),
    const Course(
      id: '4',
      title: 'Modern UI/UX Design Systems',
      slug: 'modern-ui-ux',
      description:
          'Create accessible, responsive, and delightful user experiences with glassmorphism, responsive grids, and design tokens.',
      shortDescription: 'Design enterprise-grade interfaces from wireframe to code.',
      price: 0.0,
      isFree: true,
      difficulty: 'beginner',
      level: 'BEGINNER',
      instructorName: 'David Miller',
      categoryName: 'Design',
      categorySlug: 'design',
      thumbnailUrl:
          'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80',
      learningObjectives: [
        'Master responsive layout principles across mobile and desktop',
        'Design accessible color palettes and typography hierarchies',
      ],
    ),
  ];

  @override
  FutureOr<CourseState> build() async {
    final repository = ref.watch(courseRepositoryProvider);
    final result = await repository.getCourses();

    return result.fold(
      (failure) {
        return CourseState(
          allCourses: _mockCourses,
          filteredCourses: _mockCourses,
        );
      },
      (courses) {
        final combined = courses.isEmpty ? _mockCourses : courses;
        return CourseState(allCourses: combined, filteredCourses: combined);
      },
    );
  }

  void search(String query) {
    if (state.value == null) return;
    state = AsyncData(_filter(state.value!.copyWith(searchQuery: query)));
  }

  void filterByLevel(String? level) {
    if (state.value == null) return;
    state = AsyncData(_filter(state.value!.copyWith(selectedLevel: level)));
  }

  void filterByCategory(String? category) {
    if (state.value == null) return;
    state = AsyncData(_filter(state.value!.copyWith(selectedCategory: category)));
  }

  void toggleFreeOnly(bool freeOnly) {
    if (state.value == null) return;
    state = AsyncData(_filter(state.value!.copyWith(freeOnly: freeOnly)));
  }

  CourseState _filter(CourseState currentState) {
    var filtered = currentState.allCourses;

    if (currentState.searchQuery.isNotEmpty) {
      final q = currentState.searchQuery.toLowerCase();
      filtered = filtered.where((course) {
        return course.title.toLowerCase().contains(q) ||
            course.description.toLowerCase().contains(q) ||
            (course.categoryName?.toLowerCase().contains(q) ?? false) ||
            (course.instructorName?.toLowerCase().contains(q) ?? false);
      }).toList();
    }

    if (currentState.selectedLevel != null &&
        currentState.selectedLevel!.isNotEmpty &&
        currentState.selectedLevel != 'All Levels') {
      final selected = currentState.selectedLevel!.toLowerCase();
      filtered = filtered.where((course) {
        return course.difficulty.toLowerCase() == selected ||
            (course.level?.toLowerCase() == selected);
      }).toList();
    }

    if (currentState.selectedCategory != null &&
        currentState.selectedCategory!.isNotEmpty &&
        currentState.selectedCategory != 'all') {
      final selectedCat = currentState.selectedCategory!.toLowerCase();
      filtered = filtered.where((course) {
        return (course.categorySlug?.toLowerCase() == selectedCat) ||
            (course.categoryName?.toLowerCase() == selectedCat);
      }).toList();
    }

    if (currentState.freeOnly) {
      filtered = filtered.where((course) => course.isFree || course.price <= 0).toList();
    }

    return currentState.copyWith(filteredCourses: filtered);
  }

  Future<bool> enrollInCourse(String slug) async {
    final repository = ref.read(courseRepositoryProvider);
    final result = await repository.enrollInCourse(slug);
    return result.fold(
      (failure) => false,
      (success) {
        if (state.value != null) {
          final updatedAll = state.value!.allCourses.map((c) {
            if (c.slug == slug) {
              return c.copyWith(isEnrolled: true);
            }
            return c;
          }).toList();
          final updatedFiltered = state.value!.filteredCourses.map((c) {
            if (c.slug == slug) {
              return c.copyWith(isEnrolled: true);
            }
            return c;
          }).toList();
          state = AsyncData(state.value!.copyWith(
            allCourses: updatedAll,
            filteredCourses: updatedFiltered,
          ));
        }
        ref.invalidate(myCoursesProvider);
        ref.invalidate(enrolledCoursesCountProvider);
        return success;
      },
    );
  }
}

final courseDetailProvider =
    FutureProvider.family.autoDispose<Course, String>((ref, slug) async {
  final repository = ref.watch(courseRepositoryProvider);
  final result = await repository.getCourseDetail(slug);
  return result.fold(
    (failure) => throw failure,
    (course) => course,
  );
});

final courseCategoriesProvider =
    FutureProvider<List<CourseCategory>>((ref) async {
  final repository = ref.watch(courseRepositoryProvider);
  final result = await repository.getCategories();
  return result.fold(
    (failure) => [
      const CourseCategory(id: '1', name: 'Engineering', slug: 'engineering', icon: 'code', courseCount: 12),
      const CourseCategory(id: '2', name: 'Computer Science', slug: 'computer-science', icon: 'terminal', courseCount: 8),
      const CourseCategory(id: '3', name: 'AI & Data', slug: 'ai', icon: 'psychology', courseCount: 15),
      const CourseCategory(id: '4', name: 'Design', slug: 'design', icon: 'brush', courseCount: 6),
    ],
    (categories) => categories,
  );
});

final featuredCoursesProvider = FutureProvider<List<Course>>((ref) async {
  final repository = ref.watch(courseRepositoryProvider);
  final result = await repository.getFeaturedCourses();
  return result.fold(
    (failure) => const [],
    (courses) => courses,
  );
});

final trendingCoursesProvider = FutureProvider<List<Course>>((ref) async {
  final repository = ref.watch(courseRepositoryProvider);
  final result = await repository.getTrendingCourses();
  return result.fold(
    (failure) => const [],
    (courses) => courses,
  );
});

final myCoursesProvider = FutureProvider<List<Course>>((ref) async {
  final repository = ref.watch(courseRepositoryProvider);
  try {
    return await repository.getMyCourses();
  } catch (_) {
    return const [];
  }
});

final courseProgressProvider =
    FutureProvider.family<CourseProgressSummary?, String>((ref, slug) async {
  final repository = ref.watch(courseRepositoryProvider);
  final result = await repository.getProgressSummary(slug);
  return result.fold(
    (failure) => null,
    (summary) => summary,
  );
});

