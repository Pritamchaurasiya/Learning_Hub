import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:learning_hub/core/providers/search_provider.dart';
import 'package:learning_hub/data/models/course_model.dart';
import 'package:learning_hub/shared/widgets/course_card.dart';

/// Search screen with filters and course results
class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _searchController = TextEditingController();
  final _focusNode = FocusNode();
  bool _showFilters = false;

  final List<String> _categories = [
    'All',
    'Development',
    'Design',
    'Business',
    'Marketing',
    'Data Science',
    'AI & ML',
    'Mobile',
    'Cloud'
  ];

  final List<String> _levels = ['All', 'Beginner', 'Intermediate', 'Advanced'];
  final List<String> _sortOptions = [
    'Relevance',
    'Most Popular',
    'Highest Rated',
    'Newest',
    'Price: Low to High',
    'Price: High to Low'
  ];

  @override
  void initState() {
    super.initState();
    // Initialize query from provider if exists
    final params = ref.read(searchProvider).filters;
    if (params.query.isNotEmpty) {
      _searchController.text = params.query;
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final size = MediaQuery.of(context).size;
    final isDesktop = size.width >= 1024;

    final state = ref.watch(searchProvider);
    final notifier = ref.read(searchProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Search Courses'),
        actions: [
          IconButton(
            icon:
                Icon(_showFilters ? Icons.filter_list_off : Icons.filter_list),
            onPressed: () {
              setState(() => _showFilters = !_showFilters);
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Search Bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: _searchController,
                  focusNode: _focusNode,
                  decoration: InputDecoration(
                    hintText: 'Search courses, topics, instructors...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              notifier.updateQuery('');
                            },
                          )
                        : null,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onChanged: (value) {
                    notifier.updateQuery(value);
                  },
                ),
                // Suggestions
                if (state.suggestions.isNotEmpty && _focusNode.hasFocus)
                  Container(
                    margin: const EdgeInsets.only(top: 8),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surface,
                      borderRadius: BorderRadius.circular(8),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.1),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    constraints: const BoxConstraints(maxHeight: 200),
                    child: ListView.builder(
                      shrinkWrap: true,
                      itemCount: state.suggestions.length,
                      itemBuilder: (context, index) {
                        final suggestion = state.suggestions[index];
                        return ListTile(
                          leading: const Icon(Icons.search, size: 16),
                          title: Text(suggestion),
                          dense: true,
                          onTap: () {
                            _searchController.text = suggestion;
                            _focusNode.unfocus();
                            notifier.updateQuery(suggestion);
                          },
                        );
                      },
                    ),
                  ),
              ],
            ),
          ),

          // Filters Panel
          if (_showFilters)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Category chips
                  Text('Category',
                      style: theme.textTheme.labelLarge
                          ?.copyWith(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 36,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: _categories.length,
                      itemBuilder: (context, index) {
                        final category = _categories[index];
                        final isSelected = state.filters.category == category;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            label: Text(category),
                            selected: isSelected,
                            onSelected: (selected) {
                              notifier.updateFilters(category: category);
                            },
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Level and Sort Row
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Level',
                                style: theme.textTheme.labelLarge
                                    ?.copyWith(fontWeight: FontWeight.w600)),
                            const SizedBox(height: 8),
                            DropdownButtonFormField<String>(
                              initialValue: state.filters.level,
                              decoration: const InputDecoration(
                                contentPadding: EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 8),
                                isDense: true,
                                border: OutlineInputBorder(),
                              ),
                              items: _levels.map((level) {
                                return DropdownMenuItem(
                                    value: level, child: Text(level));
                              }).toList(),
                              onChanged: (value) {
                                notifier.updateFilters(level: value);
                              },
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Sort By',
                                style: theme.textTheme.labelLarge
                                    ?.copyWith(fontWeight: FontWeight.w600)),
                            const SizedBox(height: 8),
                            DropdownButtonFormField<String>(
                              initialValue: state.filters.sortBy,
                              decoration: const InputDecoration(
                                contentPadding: EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 8),
                                isDense: true,
                                border: OutlineInputBorder(),
                              ),
                              items: _sortOptions.map((option) {
                                return DropdownMenuItem(
                                    value: option, child: Text(option));
                              }).toList(),
                              onChanged: (value) {
                                notifier.updateFilters(sortBy: value);
                              },
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Divider(),
                ],
              ),
            ),

          // Results Count
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  state.filters.query.isEmpty
                      ? '${state.results.length} courses available'
                      : '${state.results.length} results for "${state.filters.query}"',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),

          // Results Grid/List
          Expanded(
            child: state.isLoading
                ? const Center(child: CircularProgressIndicator())
                : state.filters.query.isEmpty && state.filters.category == 'All'
                    ? _buildDiscoverView(theme, state.recentSearches, notifier)
                    : state.results.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.search_off,
                                  size: 64,
                                  color: theme.colorScheme.onSurfaceVariant,
                                ),
                                const SizedBox(height: 16),
                                Text('No courses found',
                                    style: theme.textTheme.titleMedium),
                              ],
                            ),
                          )
                        : isDesktop
                            ? _buildDesktopGrid(state.results)
                            : _buildMobileList(state.results),
          ),
        ],
      ),
    );
  }

  Widget _buildDesktopGrid(List<Course> results) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 4,
        childAspectRatio: 0.75,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
      ),
      itemCount: results.length,
      itemBuilder: (context, index) {
        final course = results[index];
        return CourseCard(
          course: course,
          onTap: () => context.push('/course/${course.id}'),
        );
      },
    );
  }

  Widget _buildMobileList(List<Course> results) {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      itemCount: results.length,
      itemBuilder: (context, index) {
        final course = results[index];
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: CourseCard(
            course: course,
            style: CourseCardStyle.horizontal,
            onTap: () => context.push('/course/${course.id}'),
          ),
        );
      },
    );
  }

  Widget _buildDiscoverView(
      ThemeData theme, List<String> recentSearches, SearchNotifier notifier) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Recent Searches
          if (recentSearches.isNotEmpty) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Recent Searches',
                    style: theme.textTheme.titleMedium
                        ?.copyWith(fontWeight: FontWeight.bold)),
                TextButton(
                  onPressed: () => notifier.clearHistory(),
                  child: const Text('Clear'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: recentSearches.map((term) {
                return ActionChip(
                  avatar: const Icon(Icons.history, size: 16),
                  label: Text(term),
                  onPressed: () {
                    _searchController.text = term;
                    notifier.updateQuery(term);
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 24),
          ],

          // Browse Categories
          Text('Browse Categories',
              style: theme.textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 3,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
            ),
            itemCount: 8,
            itemBuilder: (context, index) {
              final cat = _categories.skip(1).toList()[index];
              return InkWell(
                onTap: () {
                  notifier.updateFilters(category: cat);
                },
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surfaceContainerHighest
                        .withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                        color: theme.colorScheme.outlineVariant
                            .withValues(alpha: 0.5)),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.category_outlined,
                          size: 20, color: theme.colorScheme.primary),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          cat,
                          style: theme.textTheme.bodyMedium
                              ?.copyWith(fontWeight: FontWeight.w500),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 24),

          // Top Skills - could be dynamic later
          Text('Popular Skills',
              style: theme.textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              'ChatGPT',
              'Project Management',
              'SQL',
              'Leadership',
              'Excel',
              'Docker',
              'Digital Marketing'
            ].map((skill) {
              return FilterChip(
                label: Text(skill),
                onSelected: (_) {
                  _searchController.text = skill;
                  notifier.updateQuery(skill);
                },
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}
