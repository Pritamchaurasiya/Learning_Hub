import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/core/constants/api_constants.dart';
import 'package:my_flutter_app/src/core/error/exceptions.dart';
import 'package:my_flutter_app/src/core/network/api_client.dart';
import 'package:my_flutter_app/src/core/utils/logger.dart';

final searchRepositoryProvider = Provider<SearchRepository>((ref) {
  return SearchRepository(ref.watch(apiClientProvider));
});

class SearchRepository {
  SearchRepository(this._apiClient);

  final ApiClient _apiClient;

  /// Global search across courses and instructors
  Future<SearchResult> search({
    required String query,
    String type = 'all',
    String? category,
    String? level,
    String sortBy = 'relevance',
  }) async {
    try {
      AppLogger.d('SearchRepository: Searching for "$query"');

      final response = await _apiClient.get(
        ApiConstants.search,
        queryParameters: {
          'q': query,
          'type': type,
          if (category != null) 'category': category,
          if (level != null) 'level': level,
          'sort': sortBy,
        },
      );

      final data = response.data;
      if (data == null) {
        throw ServerException(message: 'No data received from search');
      }

      return SearchResult.fromJson(data);
    } on Exception catch (e) {
      AppLogger.e('SearchRepository: Search failed', e);
      rethrow;
    }
  }

  /// Get search suggestions for auto-complete
  Future<List<SearchSuggestion>> getSuggestions({
    required String query,
    int limit = 10,
  }) async {
    try {
      if (query.isEmpty) return [];

      final response = await _apiClient.get(
        ApiConstants.searchSuggestions,
        queryParameters: {
          'q': query,
          'limit': limit,
        },
      );

      final data = response.data;
      if (data == null || data['suggestions'] == null) {
        return [];
      }

      final suggestions = (data['suggestions'] as List)
          .map((e) => SearchSuggestion.fromJson(e as Map<String, dynamic>))
          .toList();

      return suggestions;
    } on Exception catch (e) {
      AppLogger.e('SearchRepository: Suggestions failed', e);
      return [];
    }
  }

  /// Advanced search with multiple filters
  Future<SearchResult> advancedSearch({
    String? query,
    String? category,
    String? level,
    double? priceMin,
    double? priceMax,
    double? rating,
    String? duration,
    bool? hasCertificate,
    String sortBy = 'relevance',
    int page = 1,
    int perPage = 20,
  }) async {
    try {
      AppLogger.d('SearchRepository: Advanced search');

      final queryParameters = <String, dynamic>{
        'sort': sortBy,
        'page': page,
        'per_page': perPage,
      };

      if (query != null && query.isNotEmpty) {
        queryParameters['q'] = query;
      }
      if (category != null) queryParameters['category'] = category;
      if (level != null) queryParameters['level'] = level;
      if (priceMin != null) queryParameters['price_min'] = priceMin;
      if (priceMax != null) queryParameters['price_max'] = priceMax;
      if (rating != null) queryParameters['rating'] = rating;
      if (duration != null) queryParameters['duration'] = duration;
      if (hasCertificate != null) {
        queryParameters['has_certificate'] = hasCertificate;
      }

      final response = await _apiClient.get(
        ApiConstants.searchAdvanced,
        queryParameters: queryParameters,
      );

      final data = response.data;
      if (data == null) {
        throw ServerException(message: 'No data received from advanced search');
      }

      return SearchResult.fromJson(data);
    } on Exception catch (e) {
      AppLogger.e('SearchRepository: Advanced search failed', e);
      rethrow;
    }
  }

  /// Get trending searches and popular content
  Future<TrendingSearches> getTrendingSearches() async {
    try {
      final response = await _apiClient.get(ApiConstants.searchTrending);

      final data = response.data;
      if (data == null) {
        throw ServerException(message: 'No data received');
      }

      return TrendingSearches.fromJson(data);
    } on Exception catch (e) {
      AppLogger.e('SearchRepository: Trending searches failed', e);
      rethrow;
    }
  }
}

/// Search result model
class SearchResult {
  final String query;
  final List<CourseSearchResult> courses;
  final List<InstructorSearchResult> instructors;
  final int totalCount;
  final PaginationInfo? pagination;

  SearchResult({
    required this.query,
    required this.courses,
    required this.instructors,
    required this.totalCount,
    this.pagination,
  });

  factory SearchResult.fromJson(Map<String, dynamic> json) {
    return SearchResult(
      query: json['query'] as String? ?? '',
      courses: (json['courses'] as List? ?? [])
          .map((e) => CourseSearchResult.fromJson(e as Map<String, dynamic>))
          .toList(),
      instructors: (json['instructors'] as List? ?? [])
          .map((e) => InstructorSearchResult.fromJson(e as Map<String, dynamic>))
          .toList(),
      totalCount: json['total_count'] as int? ?? 0,
      pagination: json['pagination'] != null
          ? PaginationInfo.fromJson(json['pagination'] as Map<String, dynamic>)
          : null,
    );
  }
}

/// Course search result
class CourseSearchResult {
  final String id;
  final String slug;
  final String title;
  final String description;
  final String? thumbnail;
  final String instructor;
  final String? category;
  final String level;
  final String price;
  final double? rating;
  final int enrollmentCount;
  final int? duration;

  CourseSearchResult({
    required this.id,
    required this.slug,
    required this.title,
    required this.description,
    this.thumbnail,
    required this.instructor,
    this.category,
    required this.level,
    required this.price,
    this.rating,
    required this.enrollmentCount,
    this.duration,
  });

  factory CourseSearchResult.fromJson(Map<String, dynamic> json) {
    return CourseSearchResult(
      id: json['id'] as String,
      slug: json['slug'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      thumbnail: json['thumbnail'] as String?,
      instructor: json['instructor'] as String,
      category: json['category'] as String?,
      level: json['level'] as String,
      price: json['price'] as String,
      rating: (json['rating'] as num?)?.toDouble(),
      enrollmentCount: json['enrollment_count'] as int? ?? 0,
      duration: json['duration'] as int?,
    );
  }
}

/// Instructor search result
class InstructorSearchResult {
  final String id;
  final String username;
  final String name;
  final String? avatar;
  final String bio;
  final int courseCount;

  InstructorSearchResult({
    required this.id,
    required this.username,
    required this.name,
    this.avatar,
    required this.bio,
    required this.courseCount,
  });

  factory InstructorSearchResult.fromJson(Map<String, dynamic> json) {
    return InstructorSearchResult(
      id: json['id'] as String,
      username: json['username'] as String,
      name: json['name'] as String,
      avatar: json['avatar'] as String?,
      bio: json['bio'] as String? ?? '',
      courseCount: json['course_count'] as int? ?? 0,
    );
  }
}

/// Search suggestion
class SearchSuggestion {
  final String type;
  final String text;
  final String highlight;

  SearchSuggestion({
    required this.type,
    required this.text,
    required this.highlight,
  });

  factory SearchSuggestion.fromJson(Map<String, dynamic> json) {
    return SearchSuggestion(
      type: json['type'] as String,
      text: json['text'] as String,
      highlight: json['highlight'] as String,
    );
  }
}

/// Trending searches
class TrendingSearches {
  final List<String> popularSearches;
  final List<CategoryInfo> popularCategories;
  final List<TrendingCourse> trendingCourses;
  final List<NewCourse> newCourses;

  TrendingSearches({
    required this.popularSearches,
    required this.popularCategories,
    required this.trendingCourses,
    required this.newCourses,
  });

  factory TrendingSearches.fromJson(Map<String, dynamic> json) {
    return TrendingSearches(
      popularSearches: (json['popular_searches'] as List? ?? [])
          .map((e) => e as String)
          .toList(),
      popularCategories: (json['popular_categories'] as List? ?? [])
          .map((e) => CategoryInfo.fromJson(e as Map<String, dynamic>))
          .toList(),
      trendingCourses: (json['trending_courses'] as List? ?? [])
          .map((e) => TrendingCourse.fromJson(e as Map<String, dynamic>))
          .toList(),
      newCourses: (json['new_courses'] as List? ?? [])
          .map((e) => NewCourse.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class CategoryInfo {
  final String slug;
  final String name;
  final int courseCount;

  CategoryInfo({
    required this.slug,
    required this.name,
    required this.courseCount,
  });

  factory CategoryInfo.fromJson(Map<String, dynamic> json) {
    return CategoryInfo(
      slug: json['slug'] as String,
      name: json['name'] as String,
      courseCount: json['course_count'] as int? ?? 0,
    );
  }
}

class TrendingCourse {
  final String id;
  final String slug;
  final String title;
  final String? thumbnail;
  final String instructor;
  final int recentEnrollments;

  TrendingCourse({
    required this.id,
    required this.slug,
    required this.title,
    this.thumbnail,
    required this.instructor,
    required this.recentEnrollments,
  });

  factory TrendingCourse.fromJson(Map<String, dynamic> json) {
    return TrendingCourse(
      id: json['id'] as String,
      slug: json['slug'] as String,
      title: json['title'] as String,
      thumbnail: json['thumbnail'] as String?,
      instructor: json['instructor'] as String,
      recentEnrollments: json['recent_enrollments'] as int? ?? 0,
    );
  }
}

class NewCourse {
  final String id;
  final String slug;
  final String title;
  final String? thumbnail;

  NewCourse({
    required this.id,
    required this.slug,
    required this.title,
    this.thumbnail,
  });

  factory NewCourse.fromJson(Map<String, dynamic> json) {
    return NewCourse(
      id: json['id'] as String,
      slug: json['slug'] as String,
      title: json['title'] as String,
      thumbnail: json['thumbnail'] as String?,
    );
  }
}

/// Pagination info
class PaginationInfo {
  final int page;
  final int perPage;
  final int totalCount;
  final int totalPages;

  PaginationInfo({
    required this.page,
    required this.perPage,
    required this.totalCount,
    required this.totalPages,
  });

  factory PaginationInfo.fromJson(Map<String, dynamic> json) {
    return PaginationInfo(
      page: json['page'] as int? ?? 1,
      perPage: json['per_page'] as int? ?? 20,
      totalCount: json['total_count'] as int? ?? 0,
      totalPages: json['total_pages'] as int? ?? 1,
    );
  }
}
