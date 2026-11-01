import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rxdart/rxdart.dart';
import '../services/search_service.dart';
import '../services/course_service.dart';
import '../../data/models/course_model.dart';

/// Search Filter State
class SearchFilters {
  final String query;
  final String category;
  final String level;
  final String sortBy;
  final double? minRating;
  final RangeValues? priceRange;

  const SearchFilters({
    this.query = '',
    this.category = 'All',
    this.level = 'All',
    this.sortBy = 'Relevance',
    this.minRating,
    this.priceRange,
  });

  SearchFilters copyWith({
    String? query,
    String? category,
    String? level,
    String? sortBy,
    double? minRating,
    RangeValues? priceRange,
  }) {
    return SearchFilters(
      query: query ?? this.query,
      category: category ?? this.category,
      level: level ?? this.level,
      sortBy: sortBy ?? this.sortBy,
      minRating: minRating ?? this.minRating,
      priceRange: priceRange ?? this.priceRange,
    );
  }
}

/// Search State
class SearchState {
  final List<Course> results;
  final bool isLoading;
  final bool hasMore;
  final int currentPage;
  final List<String> recentSearches;
  final List<String> suggestions;
  final SearchFilters filters;

  const SearchState({
    required this.results,
    required this.filters,
    this.isLoading = false,
    this.hasMore = true,
    this.currentPage = 0,
    this.recentSearches = const [],
    this.suggestions = const [],
  });

  SearchState copyWith({
    List<Course>? results,
    SearchFilters? filters,
    bool? isLoading,
    bool? hasMore,
    int? currentPage,
    List<String>? recentSearches,
    List<String>? suggestions,
  }) {
    return SearchState(
      results: results ?? this.results,
      filters: filters ?? this.filters,
      isLoading: isLoading ?? this.isLoading,
      hasMore: hasMore ?? this.hasMore,
      currentPage: currentPage ?? this.currentPage,
      recentSearches: recentSearches ?? this.recentSearches,
      suggestions: suggestions ?? this.suggestions,
    );
  }
}

/// Search Notifier
class SearchNotifier extends Notifier<SearchState> {
  final _searchService = SearchService.instance;
  final _courseService = CourseService.instance;
  final _searchSubject = PublishSubject<String>();

  static const int _pageSize = 20;
  List<Course> _allCourses = [];

  @override
  SearchState build() {
    _loadHistory();

    _searchSubject
        .debounceTime(const Duration(milliseconds: 300))
        .listen((query) {
      _allCourses = [];
      _performSearch(query, refresh: true);
    });

    return const SearchState(
      results: [],
      filters: SearchFilters(),
      recentSearches: [],
    );
  }

  Future<void> _loadHistory() async {
    final history = _searchService.getSearchHistory();
    state = state.copyWith(recentSearches: history);
  }

  void updateQuery(String query) {
    state = state.copyWith(
      filters: state.filters.copyWith(query: query),
      suggestions: query.isEmpty
          ? []
          : _searchService.getSuggestions(query).map((s) => s.text).toList(),
    );
    _searchSubject.add(query);
  }

  void updateFilters({
    String? category,
    String? level,
    String? sortBy,
  }) {
    state = state.copyWith(
      filters: state.filters.copyWith(
        category: category,
        level: level,
        sortBy: sortBy,
      ),
    );
    _allCourses = [];
    unawaited(_performSearch(state.filters.query, refresh: true));
  }

  Future<void> loadMore() async {
    if (state.isLoading || !state.hasMore) return;
    unawaited(_performSearch(state.filters.query, refresh: false));
  }

  Future<void> _performSearch(String query, {bool refresh = false}) async {
    if (query.isEmpty &&
        state.filters.category == 'All' &&
        state.filters.level == 'All') {
      state = state.copyWith(results: [], isLoading: false, currentPage: 0);
      return;
    }

    state = state.copyWith(isLoading: true);

    try {
      if (_allCourses.isEmpty) {
        _allCourses = await _courseService.getCourses();
      }

      final results = _searchService.searchCourses(
        _allCourses,
        query,
        filter: SearchFilter(
          category:
              state.filters.category == 'All' ? null : state.filters.category,
          difficulty: state.filters.level == 'All' ? null : state.filters.level,
          minRating: state.filters.minRating,
        ),
        sortBy: _mapSortOption(state.filters.sortBy),
      );

      final courseResults = results.map((r) => r.item).toList();
      final totalCount = courseResults.length;
      final startIndex = refresh ? 0 : (state.currentPage * _pageSize);
      final endIndex = (startIndex + _pageSize).clamp(0, totalCount);
      final pageResults = courseResults.sublist(startIndex, endIndex);

      state = state.copyWith(
        results: refresh ? pageResults : [...state.results, ...pageResults],
        isLoading: false,
        hasMore: endIndex < totalCount,
        currentPage: refresh ? 1 : state.currentPage + 1,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, results: []);
    }
  }

  SearchSortBy _mapSortOption(String sort) {
    switch (sort) {
      case 'Relevance':
        return SearchSortBy.relevance;
      case 'Most Popular':
        return SearchSortBy.popularity;
      case 'Highest Rated':
        return SearchSortBy.rating;
      case 'Newest':
        return SearchSortBy.newest;
      default:
        return SearchSortBy.relevance;
    }
  }

  void clearHistory() {
    _searchService.clearHistory();
    state = state.copyWith(recentSearches: []);
  }

  List<String> getSuggestions(String query) {
    return _searchService.getSuggestions(query).map((s) => s.text).toList();
  }
}

final searchProvider = NotifierProvider<SearchNotifier, SearchState>(() {
  return SearchNotifier();
});
