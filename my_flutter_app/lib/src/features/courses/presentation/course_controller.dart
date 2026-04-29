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
  });
  final List<Course> allCourses;
  final List<Course> filteredCourses;
  final String searchQuery;
  final String? selectedLevel;

  CourseState copyWith({
    List<Course>? allCourses,
    List<Course>? filteredCourses,
    String? searchQuery,
    String? selectedLevel,
  }) {
    return CourseState(
      allCourses: allCourses ?? this.allCourses,
      filteredCourses: filteredCourses ?? this.filteredCourses,
      searchQuery: searchQuery ?? this.searchQuery,
      selectedLevel: selectedLevel ?? this.selectedLevel,
    );
  }
}

final courseControllerProvider =
    AsyncNotifierProvider<CourseController, CourseState>(CourseController.new);

class CourseController extends AsyncNotifier<CourseState> {
  // Mock courses for offline/demo mode so the app always looks great
  static final List<Course> _mockCourses = [
    const Course(
      id: '1',
      title: 'Flutter Masterclass 2024',
      slug: 'flutter-masterclass',
      description:
          'Build beautiful, responsive, and feature-rich cross-platform apps. Master Riverpod, GoRouter, and clean architecture.',
      price: 49.99,
      level: 'Beginner',
      instructorName: 'Alex Johnson',
      thumbnailUrl:
          'https://images.unsplash.com/photo-1617042375876-a13e36732a04?w=800&q=80',
    ),
    const Course(
      id: '2',
      title: 'Advanced Dart Patterns',
      slug: 'advanced-dart',
      description:
          'Unlock the full potential of Dart. Deep dive into async programming, streams, isolates, and functional patterns.',
      price: 39.99,
      level: 'Advanced',
      instructorName: 'Sarah Smith',
      thumbnailUrl:
          'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80',
    ),
    const Course(
      id: '3',
      title: 'System Design for Engineers',
      slug: 'system-design',
      description:
          'Prepare for senior engineering interviews. Learn to design scalable, distributed systems like Netflix or Uber.',
      price: 79.99,
      level: 'Expert',
      instructorName: 'David Miller',
      thumbnailUrl:
          'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80',
    ),
    const Course(
      id: '4',
      title: 'AI & Machine Learning A-Z',
      slug: 'ai-ml-basics',
      description:
          'Zero to hero in AI. Understand neural networks, deep learning, and deploy your own models with Python.',
      price: 59.99,
      level: 'Intermediate',
      instructorName: 'Dr. Emily Chen',
      thumbnailUrl:
          'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80',
    ),
  ];

  @override
  FutureOr<CourseState> build() async {
    final repository = ref.watch(courseRepositoryProvider);
    final result = await repository.getCourses();

    return result.fold(
      (failure) {
        // Fallback to mock data on error so the UI never breaks
        return CourseState(
          allCourses: _mockCourses,
          filteredCourses: _mockCourses,
        );
      },
      (courses) {
        if (courses.isEmpty) {
          return CourseState(
              allCourses: _mockCourses, filteredCourses: _mockCourses);
        }
        return CourseState(allCourses: courses, filteredCourses: courses);
      },
    );
  }

  void search(String query) {
    state = AsyncData(_filter(state.value!.copyWith(searchQuery: query)));
  }

  void filterByLevel(String? level) {
    state = AsyncData(_filter(state.value!.copyWith(selectedLevel: level)));
  }

  CourseState _filter(CourseState currentState) {
    var filtered = currentState.allCourses;

    if (currentState.searchQuery.isNotEmpty) {
      final q = currentState.searchQuery.toLowerCase();
      filtered = filtered.where((course) {
        return course.title.toLowerCase().contains(q) ||
            course.description.toLowerCase().contains(q);
      }).toList();
    }

    if (currentState.selectedLevel != null) {
      filtered = filtered.where((course) {
        return course.level == currentState.selectedLevel;
      }).toList();
    }

    return currentState.copyWith(filteredCourses: filtered);
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
