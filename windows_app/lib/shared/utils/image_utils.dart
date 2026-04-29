import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

/// Optimized image loading with caching and lazy loading
/// 
/// Features:
/// - Automatic caching
/// - Placeholder and error handling
/// - Progressive loading
/// - Memory management
class OptimizedImage extends StatelessWidget {
  final String imageUrl;
  final double? width;
  final double? height;
  final BoxFit fit;
  final Widget? placeholder;
  final Widget? errorWidget;
  final BorderRadius? borderRadius;
  final Duration fadeInDuration;
  final Map<String, String>? headers;

  const OptimizedImage({
    super.key,
    required this.imageUrl,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.placeholder,
    this.errorWidget,
    this.borderRadius,
    this.fadeInDuration = const Duration(milliseconds: 300),
    this.headers,
  });

  @override
  Widget build(BuildContext context) {
    Widget image = CachedNetworkImage(
      imageUrl: imageUrl,
      width: width,
      height: height,
      fit: fit,
      fadeInDuration: fadeInDuration,
      httpHeaders: headers,
      placeholder: (context, url) =>
          placeholder ??
          _DefaultPlaceholder(
            width: width,
            height: height,
          ),
      errorWidget: (context, url, error) =>
          errorWidget ??
          _ErrorWidget(
            width: width,
            height: height,
          ),
    );

    if (borderRadius != null) {
      image = ClipRRect(
        borderRadius: borderRadius!,
        child: image,
      );
    }

    return image;
  }
}

/// Avatar image with optimized loading
class OptimizedAvatar extends StatelessWidget {
  final String? imageUrl;
  final double radius;
  final String? fallbackText;
  final Color? backgroundColor;
  final Color? foregroundColor;

  const OptimizedAvatar({
    super.key,
    this.imageUrl,
    this.radius = 24,
    this.fallbackText,
    this.backgroundColor,
    this.foregroundColor,
  });

  @override
  Widget build(BuildContext context) {
    final bgColor = backgroundColor ??
        Theme.of(context).colorScheme.primaryContainer;
    final fgColor = foregroundColor ??
        Theme.of(context).colorScheme.onPrimaryContainer;

    if (imageUrl == null || imageUrl!.isEmpty) {
      return CircleAvatar(
        radius: radius,
        backgroundColor: bgColor,
        child: fallbackText != null
            ? Text(
                fallbackText![0].toUpperCase(),
                style: TextStyle(
                  color: fgColor,
                  fontSize: radius,
                  fontWeight: FontWeight.bold,
                ),
              )
            : Icon(Icons.person, color: fgColor),
      );
    }

    return CachedNetworkImage(
      imageUrl: imageUrl!,
      imageBuilder: (context, imageProvider) => CircleAvatar(
        radius: radius,
        backgroundImage: imageProvider,
      ),
      placeholder: (context, url) => CircleAvatar(
        radius: radius,
        backgroundColor: bgColor,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          color: fgColor,
        ),
      ),
      errorWidget: (context, url, error) => CircleAvatar(
        radius: radius,
        backgroundColor: bgColor,
        child: fallbackText != null
            ? Text(
                fallbackText![0].toUpperCase(),
                style: TextStyle(
                  color: fgColor,
                  fontSize: radius,
                  fontWeight: FontWeight.bold,
                ),
              )
            : Icon(Icons.person, color: fgColor),
      ),
    );
  }
}

/// Default placeholder for loading images
class _DefaultPlaceholder extends StatelessWidget {
  final double? width;
  final double? height;

  const _DefaultPlaceholder({
    this.width,
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: const Center(
        child: CircularProgressIndicator(
          strokeWidth: 2,
        ),
      ),
    );
  }
}

/// Error widget for failed image loads
class _ErrorWidget extends StatelessWidget {
  final double? width;
  final double? height;

  const _ErrorWidget({
    this.width,
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      color: Theme.of(context).colorScheme.errorContainer,
      child: Icon(
        Icons.broken_image,
        color: Theme.of(context).colorScheme.error,
      ),
    );
  }
}

/// Image preloading utility for better UX
class ImagePreloader {
  /// Preload a list of images
  static Future<void> preloadImages(
    BuildContext context,
    List<String> imageUrls,
  ) async {
    final futures = <Future<void>>[];
    
    for (final url in imageUrls) {
      final future = precacheImage(
        CachedNetworkImageProvider(url),
        context,
      );
      futures.add(future);
    }
    
    await Future.wait(futures);
  }

  /// Preload a single image
  static Future<void> preloadImage(
    BuildContext context,
    String imageUrl,
  ) async {
    await precacheImage(
      CachedNetworkImageProvider(imageUrl),
      context,
    );
  }

  /// Clear image cache
  static Future<void> clearCache() async {
    await CachedNetworkImage.evictFromCache('');
  }

  /// Clear specific image from cache
  static Future<void> clearImageFromCache(String imageUrl) async {
    await CachedNetworkImage.evictFromCache(imageUrl);
  }
}

/// Lazy loading image grid
class LazyImageGrid extends StatelessWidget {
  final List<String> imageUrls;
  final int crossAxisCount;
  final double spacing;
  final double aspectRatio;
  final Function(String url, int index)? onImageTap;

  const LazyImageGrid({
    super.key,
    required this.imageUrls,
    this.crossAxisCount = 3,
    this.spacing = 8,
    this.aspectRatio = 1.0,
    this.onImageTap,
  });

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      padding: EdgeInsets.all(spacing),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        crossAxisSpacing: spacing,
        mainAxisSpacing: spacing,
        childAspectRatio: aspectRatio,
      ),
      itemCount: imageUrls.length,
      itemBuilder: (context, index) {
        final url = imageUrls[index];
        return GestureDetector(
          onTap: () => onImageTap?.call(url, index),
          child: OptimizedImage(
            imageUrl: url,
            borderRadius: BorderRadius.circular(8),
          ),
        );
      },
    );
  }
}

/// Hero image with optimized loading
class HeroOptimizedImage extends StatelessWidget {
  final String imageUrl;
  final String heroTag;
  final VoidCallback? onTap;

  const HeroOptimizedImage({
    super.key,
    required this.imageUrl,
    required this.heroTag,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Hero(
        tag: heroTag,
        child: OptimizedImage(
          imageUrl: imageUrl,
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }
}
