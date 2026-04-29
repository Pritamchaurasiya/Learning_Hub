import 'package:flutter/material.dart';

/// Optimized ListView widget with performance enhancements for large lists
/// 
/// Features:
/// - Automatic viewport caching
/// - Item extent optimization
/// - Scroll performance improvements
/// - Memory efficient rendering
class OptimizedListView<T> extends StatelessWidget {
  final List<T> items;
  final Widget Function(BuildContext context, T item, int index) itemBuilder;
  final Widget? emptyWidget;
  final String? emptyMessage;
  final EdgeInsetsGeometry padding;
  final ScrollPhysics? physics;
  final bool shrinkWrap;
  final Axis scrollDirection;
  final double? itemExtent;
  final int? cacheExtent;
  final bool addAutomaticKeepAlives;
  final bool addRepaintBoundaries;
  final bool addSemanticIndexes;
  final ScrollController? controller;
  final Future<void> Function()? onRefresh;
  final Future<void> Function()? onLoadMore;
  final bool isLoadingMore;

  const OptimizedListView({
    super.key,
    required this.items,
    required this.itemBuilder,
    this.emptyWidget,
    this.emptyMessage,
    this.padding = const EdgeInsets.all(16),
    this.physics,
    this.shrinkWrap = false,
    this.scrollDirection = Axis.vertical,
    this.itemExtent,
    this.cacheExtent,
    this.addAutomaticKeepAlives = true,
    this.addRepaintBoundaries = true,
    this.addSemanticIndexes = true,
    this.controller,
    this.onRefresh,
    this.onLoadMore,
    this.isLoadingMore = false,
  });

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return emptyWidget ?? 
        Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.inbox_outlined,
                size: 64,
                color: Theme.of(context).colorScheme.outline,
              ),
              const SizedBox(height: 16),
              Text(
                emptyMessage ?? 'No items found',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: Theme.of(context).colorScheme.outline,
                ),
              ),
            ],
          ),
        );
    }

    Widget listView = ListView.builder(
      controller: controller,
      padding: padding,
      physics: physics ?? const AlwaysScrollableScrollPhysics(),
      shrinkWrap: shrinkWrap,
      scrollDirection: scrollDirection,
      itemCount: items.length + (isLoadingMore ? 1 : 0),
      itemExtent: itemExtent,
      cacheExtent: cacheExtent ?? 250.0,
      addAutomaticKeepAlives: addAutomaticKeepAlives,
      addRepaintBoundaries: addRepaintBoundaries,
      addSemanticIndexes: addSemanticIndexes,
      itemBuilder: (context, index) {
        // Show loading indicator at the end
        if (index == items.length && isLoadingMore) {
          return const Padding(
            padding: EdgeInsets.all(16),
            child: Center(
              child: CircularProgressIndicator(),
            ),
          );
        }
        
        final item = items[index];
        return _OptimizedListItem(
          key: ValueKey('${item.hashCode}_$index'),
          child: itemBuilder(context, item, index),
        );
      },
    );

    // Add pull-to-refresh if callback provided
    if (onRefresh != null) {
      listView = RefreshIndicator(
        onRefresh: onRefresh!,
        child: listView,
      );
    }

    // Add scroll listener for load more
    if (onLoadMore != null) {
      listView = NotificationListener<ScrollNotification>(
        onNotification: (notification) {
          if (notification is ScrollEndNotification) {
            final metrics = notification.metrics;
            if (metrics.extentAfter < 500 && !isLoadingMore) {
              onLoadMore!();
            }
          }
          return false;
        },
        child: listView,
      );
    }

    return listView;
  }
}

/// Optimized list item with automatic keep-alive and repaint boundary
class _OptimizedListItem extends StatefulWidget {
  final Widget child;

  const _OptimizedListItem({
    super.key,
    required this.child,
  });

  @override
  State<_OptimizedListItem> createState() => _OptimizedListItemState();
}

class _OptimizedListItemState extends State<_OptimizedListItem>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return RepaintBoundary(
      child: widget.child,
    );
  }
}

/// Shimmer loading effect for list items
class ListItemShimmer extends StatelessWidget {
  final double height;
  final EdgeInsetsGeometry margin;

  const ListItemShimmer({
    super.key,
    this.height = 80,
    this.margin = const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      margin: margin,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
    );
  }
}

/// Skeleton loading screen for lists
class ListSkeletonLoading extends StatelessWidget {
  final int itemCount;

  const ListSkeletonLoading({
    super.key,
    this.itemCount = 5,
  });

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: itemCount,
      itemBuilder: (context, index) {
        return const ListItemShimmer();
      },
    );
  }
}
