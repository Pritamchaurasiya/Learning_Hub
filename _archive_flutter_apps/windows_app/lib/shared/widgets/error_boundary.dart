import 'dart:ui' show PlatformDispatcher;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Error boundary widget for catching and handling widget errors
///
/// Features:
/// - Catches Flutter widget errors
/// - Shows user-friendly error UI
/// - Logs errors for debugging
/// - Allows recovery/retry
class ErrorBoundary extends StatefulWidget {
  final Widget child;
  final Widget Function(FlutterErrorDetails error)? errorBuilder;
  final VoidCallback? onError;
  final bool showStackTrace;

  const ErrorBoundary({
    super.key,
    required this.child,
    this.errorBuilder,
    this.onError,
    this.showStackTrace = false,
  });

  @override
  State<ErrorBoundary> createState() => _ErrorBoundaryState();
}

class _ErrorBoundaryState extends State<ErrorBoundary> {
  FlutterErrorDetails? _error;

  @override
  void initState() {
    super.initState();
    FlutterError.onError = _handleFlutterError;
  }

  void _handleFlutterError(FlutterErrorDetails details) {
    setState(() {
      _error = details;
    });

    widget.onError?.call();

    // Log error
    debugPrint('ErrorBoundary caught error: ${details.exception}');
    debugPrint('Stack trace: ${details.stack}');

    // Report to error tracking service (e.g., Sentry)
    // ErrorTrackingService.reportError(details.exception, details.stack);
  }

  void _resetError() {
    setState(() {
      _error = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      if (widget.errorBuilder != null) {
        return widget.errorBuilder!(_error!);
      }
      return _DefaultErrorWidget(
        error: _error!,
        onRetry: _resetError,
        showStackTrace: widget.showStackTrace,
      );
    }
    return widget.child;
  }
}

/// Default error widget with retry functionality
class _DefaultErrorWidget extends StatelessWidget {
  final FlutterErrorDetails error;
  final VoidCallback onRetry;
  final bool showStackTrace;

  const _DefaultErrorWidget({
    required this.error,
    required this.onRetry,
    this.showStackTrace = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Material(
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.error_outline,
                size: 64,
                color: theme.colorScheme.error,
              ),
              const SizedBox(height: 24),
              Text(
                'Something went wrong',
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'We apologize for the inconvenience. Please try again.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              if (showStackTrace) ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.errorContainer,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    error.exception.toString(),
                    style: TextStyle(
                      color: theme.colorScheme.onErrorContainer,
                      fontFamily: 'monospace',
                      fontSize: 12,
                    ),
                  ),
                ),
                const SizedBox(height: 24),
              ],
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: const Text('Try Again'),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () {
                  // Copy error to clipboard
                  Clipboard.setData(ClipboardData(
                    text: '${error.exception}\n${error.stack}',
                  ));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Error details copied to clipboard'),
                    ),
                  );
                },
                child: const Text('Copy Error Details'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Async error handler for FutureBuilder and StreamBuilder
class AsyncErrorHandler<T> extends StatelessWidget {
  final AsyncSnapshot<T> snapshot;
  final Widget Function(T data) builder;
  final Widget Function(Object error)? errorBuilder;
  final Widget? loadingWidget;
  final VoidCallback? onRetry;

  const AsyncErrorHandler({
    super.key,
    required this.snapshot,
    required this.builder,
    this.errorBuilder,
    this.loadingWidget,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    if (snapshot.connectionState == ConnectionState.waiting) {
      return loadingWidget ?? const Center(child: CircularProgressIndicator());
    }

    if (snapshot.hasError) {
      if (errorBuilder != null) {
        return errorBuilder!(snapshot.error!);
      }
      return _AsyncErrorWidget(
        error: snapshot.error!,
        onRetry: onRetry,
      );
    }

    if (!snapshot.hasData) {
      return const Center(
        child: Text('No data available'),
      );
    }

    return builder(snapshot.data as T);
  }
}

/// Error widget for async operations
class _AsyncErrorWidget extends StatelessWidget {
  final Object error;
  final VoidCallback? onRetry;

  const _AsyncErrorWidget({
    required this.error,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.cloud_off,
              size: 64,
              color: theme.colorScheme.error,
            ),
            const SizedBox(height: 16),
            Text(
              'Failed to load data',
              style: theme.textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              error.toString(),
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Global exception handler for uncaught errors
class GlobalExceptionHandler {
  static void initialize() {
    // Handle Flutter framework errors
    FlutterError.onError = (FlutterErrorDetails details) {
      FlutterError.presentError(details);
      _logError('Flutter Error', details.exception, details.stack);
    };

    // Handle platform/Dart errors
    PlatformDispatcher.instance.onError = (Object error, StackTrace stack) {
      _logError('Platform Error', error, stack);
      return true;
    };
  }

  static void _logError(String type, Object error, StackTrace? stack) {
    debugPrint('=== $type ===');
    debugPrint('Error: $error');
    debugPrint('Stack trace: $stack');
    debugPrint('================');

    // TODO: Send to error tracking service
    // Sentry.captureException(error, stackTrace: stack);
  }
}

/// Network error handler with retry logic
class NetworkErrorHandler {
  static const int maxRetries = 3;
  static const Duration retryDelay = Duration(seconds: 2);

  static Future<T> withRetry<T>(
    Future<T> Function() operation, {
    int maxAttempts = maxRetries,
    Duration delay = retryDelay,
  }) async {
    int attempts = 0;

    while (attempts < maxAttempts) {
      try {
        return await operation();
      } catch (e) {
        attempts++;

        if (attempts >= maxAttempts) {
          throw Exception('Failed after $maxAttempts attempts: $e');
        }

        debugPrint(
            'Attempt $attempts failed, retrying in ${delay.inSeconds}s...');
        await Future<void>.delayed(delay * attempts);
      }
    }

    throw Exception('Max retries exceeded');
  }
}
