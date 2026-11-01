import 'package:flutter_test/flutter_test.dart';
import 'package:learning_hub/core/services/search_service.dart';
import 'package:learning_hub/data/models/course_model.dart';

void main() {
  late SearchService searchService;

  final mockCourses = [
    Course(
      id: 'c1',
      title: 'Flutter Masterclass',
      description: 'Learn Flutter from scratch',
      instructorName: 'Angela Yu',
      instructorAvatar: '',
      category: 'Development',
      tags: ['flutter', 'dart', 'mobile'],
      rating: 4.8,
      price: 19.99,
      requirements: [],
      whatYouWillLearn: [],
      sections: [],
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
      slug: 'flutter-masterclass',
      shortDescription: 'Flutter course',
      thumbnailUrl: '',
      previewVideoUrl: '',
      instructorId: 'i1',
      reviewCount: 100,
      enrollmentCount: 5000,
      totalLessons: 50,
      totalDuration: const Duration(hours: 10),
      level: CourseLevel.beginner,
      language: 'English',
      originalPrice: 99.99,
      isFree: false,
      isPublished: true,
      hasCertificate: true,
    ),
    Course(
      id: 'c2',
      title: 'Python for Data Science',
      description: 'Master Python analysis',
      instructorName: 'Jose Portilla',
      instructorAvatar: '',
      category: 'Data Science',
      tags: ['python', 'data', 'pandas'],
      rating: 4.6,
      price: 14.99,
      requirements: [],
      whatYouWillLearn: [],
      sections: [],
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
      slug: 'python-data-science',
      shortDescription: 'Python course',
      thumbnailUrl: '',
      previewVideoUrl: '',
      instructorId: 'i2',
      reviewCount: 80,
      enrollmentCount: 3000,
      totalLessons: 40,
      totalDuration: const Duration(hours: 12),
      level: CourseLevel.intermediate,
      language: 'English',
      originalPrice: 89.99,
      isFree: false,
      isPublished: true,
      hasCertificate: true,
    ),
  ];

  setUp(() {
    searchService = SearchService.instance;
    searchService.configure(const SearchConfig(
      fuzzyMatching: true,
      fuzzyThreshold: 0.6, // Tighter matching to avoid cross-course noise
    ));
    searchService.clearHistory();
  });

  group('SearchService Tests', () {
    test('Exact match returns high score', () {
      final results = searchService.searchCourses(mockCourses, 'Flutter');
      expect(results.length, 1);
      expect(results.first.item.id, 'c1');
      expect(results.first.score, greaterThan(3.0)); // Title weight is 3.0
    });

    test('Fuzzy match finds typo', () {
      // "Fluter" instead of "Flutter"
      final results = searchService.searchCourses(mockCourses, 'Fluter');
      expect(results.length, 1);
      expect(results.first.item.id, 'c1');
    });

    test('Instructor search works', () {
      final results = searchService.searchCourses(mockCourses, 'Angela');
      expect(results.length, 1);
      expect(results.first.item.instructorName, 'Angela Yu');
    });

    test('Filtering by category works', () {
      final results = searchService.searchCourses(
        mockCourses,
        'Flutter',
        filter: const SearchFilter(category: 'Data Science'),
      );
      expect(results.isEmpty, true);
    });

    test('Search suggestions work', () {
      searchService.searchCourses(mockCourses, 'Flutter');
      searchService.searchCourses(mockCourses, 'Dart');

      final suggestions = searchService.getSuggestions('Flu');
      expect(suggestions.any((s) => s.text == 'Flutter'), true);
    });
  });
}
