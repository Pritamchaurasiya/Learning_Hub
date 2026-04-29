import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

/// Comprehensive loading state widgets
/// 
/// Features:
/// - Skeleton loading screens
/// - Progress indicators
/// - Shimmer effects
/// - Loading overlays

/// Skeleton loading card
class SkeletonCard extends StatelessWidget {
  final double height;
  final EdgeInsetsGeometry margin;
  final bool showImage;
  final bool showTitle;
  final bool showSubtitle;
  final int lines;

  const SkeletonCard({
    super.key,
    this.height = 120,
    this.margin = const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
    this.showImage = true,
    this.showTitle = true,
    this.showSubtitle = true,
    this.lines = 2,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      margin: margin,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Theme.of(context).colorScheme.outline.withOpacity(0.2),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (showImage) ...[
            _buildShimmerBox(80, 80, 8),
            const SizedBox(width: 16),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (showTitle) ...[
                  _buildShimmerBox(double.infinity, 20, 4),
                  const SizedBox(height: 8),
                ],
                if (showSubtitle) ...[
                  _buildShimmerBox(150, 16, 4),
                  const SizedBox(height: 8),
                ],
                for (int i = 0; i < lines; i++) ...[
                  _buildShimmerBox(
                    i == lines - 1 ? 200 : double.infinity,
                    14,
                    4,
                  ),
                  if (i < lines - 1) const SizedBox(height: 4),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildShimmerBox(double width, double height, double radius) {
    return Shimmer.fromColors(
      baseColor: Colors.grey[300]!,
      highlightColor: Colors.grey[100]!,
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(radius),
        ),
      ),
    );
  }
}

/// Skeleton loading list
class SkeletonList extends StatelessWidget {
  final int itemCount;
  final double itemHeight;

  const SkeletonList({
    super.key,
    this.itemCount = 5,
    this.itemHeight = 120,
  });

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: itemCount,
      itemBuilder: (context, index) {
        return SkeletonCard(height: itemHeight);
      },
    );
  }
}

/// Skeleton loading grid
class SkeletonGrid extends StatelessWidget {
  final int crossAxisCount;
  final int itemCount;

  const SkeletonGrid({
    super.key,
    this.crossAxisCount = 2,
    this.itemCount = 6,
  });

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
        childAspectRatio: 0.75,
      ),
      itemCount: itemCount,
      itemBuilder: (context, index) {
        return Shimmer.fromColors(
          baseColor: Colors.grey[300]!,
          highlightColor: Colors.grey[100]!,
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        );
      },
    );
  }
}

/// Full screen loading overlay
class LoadingOverlay extends StatelessWidget {
  final bool isLoading;
  final Widget child;
  final String? loadingText;
  final Color? backgroundColor;

  const LoadingOverlay({
    super.key,
    required this.isLoading,
    required this.child,
    this.loadingText,
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        child,
        if (isLoading)
          Container(
            color: backgroundColor ??
                Colors.black.withOpacity(0.5),
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const CircularProgressIndicator(
                    color: Colors.white,
                  ),
                  if (loadingText != null) ...[
                    const SizedBox(height: 16),
                    Text(
                      loadingText!,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
      ],
    );
  }
}

/// Linear progress indicator with percentage
class LinearProgressWithLabel extends StatelessWidget {
  final double value;
  final String? label;

  const LinearProgressWithLabel({
    super.key,
    required this.value,
    this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              label!,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        LinearProgressIndicator(
          value: value,
          minHeight: 8,
          borderRadius: BorderRadius.circular(4),
        ),
        const SizedBox(height: 4),
        Text(
          '${(value * 100).toInt()}%',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}

/// Animated loading dots
class LoadingDots extends StatefulWidget {
  final Color? color;
  final double size;

  const LoadingDots({
    super.key,
    this.color,
    this.size = 12,
  });

  @override
  State<LoadingDots> createState() => _LoadingDotsState();
}

class _LoadingDotsState extends State<LoadingDots>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color = widget.color ?? Theme.of(context).colorScheme.primary;
    
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(3, (index) {
        return AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            final delay = index * 0.2;
            final progress = (_controller.value - delay) % 1.0;
            final scale = progress < 0.5
                ? 0.5 + progress
                : 1.5 - progress;
            
            return Container(
              width: widget.size,
              height: widget.size,
              margin: const EdgeInsets.symmetric(horizontal: 4),
              decoration: BoxDecoration(
                color: color.withOpacity(scale.clamp(0.3, 1.0)),
                shape: BoxShape.circle,
              ),
            );
          },
        );
      }),
    );
  }
}

/// Pulsing loading indicator
class PulsingLoadingIndicator extends StatefulWidget {
  final double size;
  final Color? color;

  const PulsingLoadingIndicator({
    super.key,
    this.size = 48,
    this.color,
  });

  @override
  State<PulsingLoadingIndicator> createState() => _PulsingLoadingIndicatorState();
}

class _PulsingLoadingIndicatorState extends State<PulsingLoadingIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
    
    _animation = Tween<double>(begin: 0.5, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.easeInOut,
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color = widget.color ?? Theme.of(context).colorScheme.primary;
    
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Container(
          width: widget.size,
          height: widget.size,
          decoration: BoxDecoration(
            color: color.withOpacity(1 - _animation.value * 0.5),
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Icon(
              Icons.refresh,
              color: Colors.white,
              size: widget.size * 0.5,
            ),
          ),
        );
      },
    );
  }
}

/// Content placeholder for mixed loading states
class ContentPlaceholder extends StatelessWidget {
  final bool isLoading;
  final Widget content;
  final Widget placeholder;

  const ContentPlaceholder({
    super.key,
    required this.isLoading,
    required this.content,
    required this.placeholder,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 300),
      child: isLoading ? placeholder : content,
    );
  }
}

/// Pull to refresh wrapper
class PullToRefreshWrapper extends StatelessWidget {
  final Widget child;
  final Future<void> Function() onRefresh;
  final Color? indicatorColor;

  const PullToRefreshWrapper({
    super.key,
    required this.child,
    required this.onRefresh,
    this.indicatorColor,
  });

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      color: indicatorColor ?? Theme.of(context).colorScheme.primary,
      backgroundColor: Theme.of(context).colorScheme.surface,
      child: child,
    );
  }
}
