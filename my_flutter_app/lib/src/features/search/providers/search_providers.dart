import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/core/network/api_client.dart';
import 'package:my_flutter_app/src/features/search/data/search_repository.dart';

/// Provider for the search repository
final searchRepositoryProvider = Provider<SearchRepository>((ref) {
  return SearchRepository(ref.watch(apiClientProvider));
});

/// Current search query state
final searchQueryProvider = StateProvider<String>((ref) => '');

/// Search results provider
final searchResultsProvider =
    FutureProvider.autoDispose<SearchResult>((ref) async {
  final query = ref.watch(searchQueryProvider);
  if (query.isEmpty) {
    return SearchResult(
      query: '',
      courses: [],
      instructors: [],
      totalCount: 0,
    );
  }

  final repo = ref.watch(searchRepositoryProvider);
  return repo.search(query: query);
});

/// Search suggestions provider
final searchSuggestionsProvider =
    FutureProvider.autoDispose<List<SearchSuggestion>>((ref) async {
  final query = ref.watch(searchQueryProvider);
  if (query.length < 2) return [];

  final repo = ref.watch(searchRepositoryProvider);
  return repo.getSuggestions(query: query);
});

/// Trending searches provider
final trendingSearchesProvider =
    FutureProvider.autoDispose<TrendingSearches>((ref) async {
  final repo = ref.watch(searchRepositoryProvider);
  return repo.getTrendingSearches();
});

/// Advanced search provider with filters
final advancedSearchProvider = FutureProvider.autoDispose
    .family<SearchResult, AdvancedSearchParams>((ref, params) async {
  final repo = ref.watch(searchRepositoryProvider);
  return repo.advancedSearch(
    query: params.query,
    category: params.category,
    level: params.level,
    priceMin: params.priceMin,
    priceMax: params.priceMax,
    rating: params.rating,
    sortBy: params.sortBy,
  );
});

/// Parameters for advanced search
class AdvancedSearchParams {
  final String? query;
  final String? category;
  final String? level;
  final double? priceMin;
  final double? priceMax;
  final double? rating;
  final String sortBy;

  const AdvancedSearchParams({
    this.query,
    this.category,
    this.level,
    this.priceMin,
    this.priceMax,
    this.rating,
    this.sortBy = 'relevance',
  });

  AdvancedSearchParams copyWith({
    String? query,
    String? category,
    String? level,
    double? priceMin,
    double? priceMax,
    double? rating,
    String? sortBy,
  }) {
    return AdvancedSearchParams(
      query: query ?? this.query,
      category: category ?? this.category,
      level: level ?? this.level,
      priceMin: priceMin ?? this.priceMin,
      priceMax: priceMax ?? this.priceMax,
      rating: rating ?? this.rating,
      sortBy: sortBy ?? this.sortBy,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AdvancedSearchParams &&
          runtimeType == other.runtimeType &&
          query == other.query &&
          category == other.category &&
          level == other.level &&
          priceMin == other.priceMin &&
          priceMax == other.priceMax &&
          rating == other.rating &&
          sortBy == other.sortBy;

  @override
  int get hashCode => Object.hash(
        query,
        category,
        level,
        priceMin,
        priceMax,
        rating,
        sortBy,
      );
}
