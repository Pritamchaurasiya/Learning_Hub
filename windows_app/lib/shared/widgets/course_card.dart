import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:shimmer/shimmer.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:learning_hub/core/theme/app_colors.dart';
import 'package:learning_hub/data/models/course_model.dart';

/// Course card widget for displaying course previews
/// Used in home screen, search results, and course lists
class CourseCard extends StatelessWidget {
  final Course course;
  final VoidCallback? onTap;
  final bool showProgress;
  final double? progress;
  final CourseCardStyle style;

  const CourseCard({
    super.key,
    required this.course,
    this.onTap,
    this.showProgress = false,
    this.progress,
    this.style = CourseCardStyle.vertical,
  });

  @override
  Widget build(BuildContext context) {
    switch (style) {
      case CourseCardStyle.vertical:
        return _VerticalCard(
          course: course,
          onTap: onTap,
          showProgress: showProgress,
          progress: progress,
        );
      case CourseCardStyle.horizontal:
        return _HorizontalCard(
          course: course,
          onTap: onTap,
          showProgress: showProgress,
          progress: progress,
        );
      case CourseCardStyle.compact:
        return _CompactCard(
          course: course,
          onTap: onTap,
          showProgress: showProgress,
          progress: progress,
        );
    }
  }
}

/// Card display styles
enum CourseCardStyle {
  vertical,
  horizontal,
  compact,
}

/// Vertical card layout - full card with image on top
class _VerticalCard extends StatefulWidget {
  final Course course;
  final VoidCallback? onTap;
  final bool showProgress;
  final double? progress;

  const _VerticalCard({
    required this.course,
    this.onTap,
    this.showProgress = false,
    this.progress,
  });

  @override
  State<_VerticalCard> createState() => _VerticalCardState();
}

class _VerticalCardState extends State<_VerticalCard> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        transform: _isHovered
            ? Matrix4.diagonal3Values(1.05, 1.05, 1.05)
            : Matrix4.identity(),
        child: Card(
          elevation: _isHovered ? 8 : 4,
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: () {
              if (widget.onTap != null) {
                HapticFeedback.lightImpact();
                widget.onTap!();
              }
            },
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Thumbnail with discount badge
                AspectRatio(
                  aspectRatio: 16 / 9,
                  child: Stack(
                    children: [
                      _CourseThumbnail(
                          url: widget.course.thumbnailUrl,
                          heroTag: widget.course.id),

                      // ... (rest of badges)
                      if (widget.course.discountPercentage != null)
                        Positioned(
                          top: 8,
                          left: 8,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.accent,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              '${widget.course.discountPercentage}% OFF',
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),

                      Positioned(
                        bottom: 8,
                        right: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.7),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            widget.course.formattedDuration,
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Content
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Title
                      Text(
                        widget.course.title,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),

                      // Instructor
                      Text(
                        widget.course.instructorName,
                        style: theme.textTheme.bodySmall,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 8),

                      // Rating
                      Row(
                        children: [
                          const Icon(
                            Icons.star,
                            size: 16,
                            color: AppColors.warning,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            widget.course.rating.toStringAsFixed(1),
                            style: theme.textTheme.labelMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '(${_formatCount(widget.course.reviewCount)})',
                            style: theme.textTheme.labelSmall,
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      // Price
                      Row(
                        children: [
                          if (widget.course.isFree)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.success.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                'Free',
                                style: theme.textTheme.labelMedium?.copyWith(
                                  color: AppColors.success,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            )
                          else ...[
                            Text(
                              '\$${widget.course.price.toStringAsFixed(2)}',
                              style: theme.textTheme.titleSmall?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            if (widget.course.originalPrice != null) ...[
                              const SizedBox(width: 6),
                              Text(
                                '\$${widget.course.originalPrice!.toStringAsFixed(2)}',
                                style: theme.textTheme.bodySmall?.copyWith(
                                  decoration: TextDecoration.lineThrough,
                                  color: theme.colorScheme.onSurfaceVariant,
                                ),
                              ),
                            ],
                          ],
                        ],
                      ),

                      // Progress bar if enrolled
                      if (widget.showProgress && widget.progress != null) ...[
                        const SizedBox(height: 12),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: widget.progress,
                            backgroundColor:
                                theme.colorScheme.surfaceContainerHighest,
                            color: AppColors.primary,
                            minHeight: 4,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${(widget.progress! * 100).toInt()}% complete',
                          style: theme.textTheme.labelSmall,
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Horizontal card layout - full card with hover effect
class _HorizontalCard extends StatefulWidget {
  final Course course;
  final VoidCallback? onTap;
  final bool showProgress;
  final double? progress;

  const _HorizontalCard({
    required this.course,
    this.onTap,
    this.showProgress = false,
    this.progress,
  });

  @override
  State<_HorizontalCard> createState() => _HorizontalCardState();
}

class _HorizontalCardState extends State<_HorizontalCard> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        transform: _isHovered
            ? Matrix4.diagonal3Values(1.02, 1.02, 1.02)
            : Matrix4.identity(),
        child: Card(
          elevation: _isHovered ? 6 : 2,
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: () {
              if (widget.onTap != null) {
                HapticFeedback.lightImpact();
                widget.onTap!();
              }
            },
            child: SizedBox(
              height: 120,
              child: Row(
                children: [
                  // Thumbnail
                  AspectRatio(
                    aspectRatio: 16 / 9,
                    child: _CourseThumbnail(
                        url: widget.course.thumbnailUrl,
                        heroTag: widget.course.id),
                  ),

                  // Content
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            widget.course.title,
                            style: theme.textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            widget.course.instructorName,
                            style: theme.textTheme.bodySmall,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const Spacer(),
                          Row(
                            children: [
                              const Icon(Icons.star,
                                  size: 14, color: AppColors.warning),
                              const SizedBox(width: 2),
                              Text(
                                widget.course.rating.toStringAsFixed(1),
                                style: theme.textTheme.labelSmall,
                              ),
                              const Spacer(),
                              _LevelBadge(level: widget.course.level),
                            ],
                          ),
                          if (widget.showProgress &&
                              widget.progress != null) ...[
                            const SizedBox(height: 8),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: widget.progress,
                                backgroundColor:
                                    theme.colorScheme.surfaceContainerHighest,
                                color: AppColors.primary,
                                minHeight: 3,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Compact card layout - minimal information with hover effect
class _CompactCard extends StatefulWidget {
  final Course course;
  final VoidCallback? onTap;
  final bool showProgress;
  final double? progress;

  const _CompactCard({
    required this.course,
    this.onTap,
    this.showProgress = false,
    this.progress,
  });

  @override
  State<_CompactCard> createState() => _CompactCardState();
}

class _CompactCardState extends State<_CompactCard> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        transform: _isHovered
            ? Matrix4.diagonal3Values(1.02, 1.02, 1.02)
            : Matrix4.identity(),
        child: Card(
          elevation: _isHovered ? 4 : 1,
          margin: EdgeInsets.zero,
          child: InkWell(
            onTap: () {
              if (widget.onTap != null) {
                HapticFeedback.lightImpact();
                widget.onTap!();
              }
            },
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  // Small thumbnail
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: SizedBox(
                      width: 60,
                      height: 60,
                      child: _CourseThumbnail(
                          url: widget.course.thumbnailUrl,
                          heroTag: widget.course.id),
                    ),
                  ),
                  const SizedBox(width: 12),

                  // Content
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.course.title,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${widget.course.totalLessons} lessons • ${widget.course.formattedDuration}',
                          style: theme.textTheme.labelSmall,
                        ),
                        if (widget.showProgress && widget.progress != null) ...[
                          const SizedBox(height: 6),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: widget.progress,
                              backgroundColor:
                                  theme.colorScheme.surfaceContainerHighest,
                              color: AppColors.primary,
                              minHeight: 3,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),

                  // Arrow icon
                  Icon(
                    Icons.chevron_right,
                    color: _isHovered
                        ? AppColors.primary
                        : theme.colorScheme.onSurfaceVariant,
                  ).animate(target: _isHovered ? 1 : 0).moveX(begin: 0, end: 4),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Course thumbnail with loading and error states
class _CourseThumbnail extends StatelessWidget {
  final String url;
  final String? heroTag;

  const _CourseThumbnail({required this.url, this.heroTag});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final image = CachedNetworkImage(
      imageUrl: url,
      fit: BoxFit.cover,
      placeholder: (context, url) => Shimmer.fromColors(
        baseColor: theme.colorScheme.surfaceContainerHighest,
        highlightColor: theme.colorScheme.surface,
        child: Container(color: Colors.white),
      ),
      errorWidget: (context, url, error) => Container(
        color: theme.colorScheme.surfaceContainerHighest,
        child: Icon(
          Icons.image_not_supported_outlined,
          color: theme.colorScheme.onSurfaceVariant,
        ),
      ),
    );

    if (heroTag != null) {
      return Hero(
        tag: heroTag!,
        child: image,
      );
    }
    return image;
  }
}

/// Course level badge
class _LevelBadge extends StatelessWidget {
  final CourseLevel level;

  const _LevelBadge({required this.level});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _getLevelColor(level);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        level.displayName,
        style: theme.textTheme.labelSmall?.copyWith(
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Color _getLevelColor(CourseLevel level) {
    switch (level) {
      case CourseLevel.beginner:
        return AppColors.difficultyBeginner;
      case CourseLevel.intermediate:
        return AppColors.difficultyIntermediate;
      case CourseLevel.advanced:
      case CourseLevel.expert:
        return AppColors.difficultyAdvanced;
    }
  }
}

/// Format count for display (e.g., 1234 -> 1.2K)
String _formatCount(int count) {
  if (count >= 1000000) {
    return '${(count / 1000000).toStringAsFixed(1)}M';
  } else if (count >= 1000) {
    return '${(count / 1000).toStringAsFixed(1)}K';
  }
  return count.toString();
}
