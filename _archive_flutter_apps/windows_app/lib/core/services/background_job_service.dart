import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

/// Job status enum
enum JobStatus {
  pending,
  running,
  completed,
  failed,
  cancelled,
}

/// Job priority enum
enum JobPriority {
  low,
  normal,
  high,
  critical,
}

/// Job definition
class BackgroundJob {
  final String id;
  final String type;
  final Map<String, dynamic> data;
  final JobPriority priority;
  final int maxRetries;
  final DateTime createdAt;
  DateTime? scheduledAt;

  // Mutable state
  JobStatus status;
  int retryCount;
  String? lastError;
  DateTime? startedAt;
  DateTime? completedAt;

  BackgroundJob({
    String? id,
    required this.type,
    this.data = const {},
    this.priority = JobPriority.normal,
    this.maxRetries = 3,
    DateTime? createdAt,
    this.scheduledAt,
    this.status = JobStatus.pending,
    this.retryCount = 0,
    this.lastError,
    this.startedAt,
    this.completedAt,
  })  : id = id ?? const Uuid().v4(),
        createdAt = createdAt ?? DateTime.now();

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type,
        'data': data,
        'priority': priority.index,
        'maxRetries': maxRetries,
        'createdAt': createdAt.toIso8601String(),
        if (scheduledAt != null) 'scheduledAt': scheduledAt!.toIso8601String(),
        'status': status.index,
        'retryCount': retryCount,
        if (lastError != null) 'lastError': lastError,
        if (startedAt != null) 'startedAt': startedAt!.toIso8601String(),
        if (completedAt != null) 'completedAt': completedAt!.toIso8601String(),
      };

  factory BackgroundJob.fromJson(Map<String, dynamic> json) {
    return BackgroundJob(
      id: json['id'] as String?,
      type: json['type'] as String,
      data: (json['data'] ?? <String, dynamic>{}) as Map<String, dynamic>,
      priority: JobPriority.values[(json['priority'] ?? 1) as int],
      maxRetries: (json['maxRetries'] ?? 3) as int,
      createdAt: DateTime.parse(json['createdAt'] as String),
      scheduledAt: json['scheduledAt'] != null
          ? DateTime.parse(json['scheduledAt'] as String)
          : null,
      status: JobStatus.values[(json['status'] ?? 0) as int],
      retryCount: (json['retryCount'] ?? 0) as int,
      lastError: json['lastError'] as String?,
      startedAt: json['startedAt'] != null
          ? DateTime.parse(json['startedAt'] as String)
          : null,
      completedAt: json['completedAt'] != null
          ? DateTime.parse(json['completedAt'] as String)
          : null,
    );
  }

  bool get canRetry => retryCount < maxRetries;
}

/// Processor function definition
typedef JobProcessor = Future<void> Function(Map<String, dynamic> data);

/// Service to manage background jobs
class BackgroundJobService {
  static final BackgroundJobService _instance = BackgroundJobService._();
  static BackgroundJobService get instance => _instance;

  BackgroundJobService._();

  static const String _storageKey = 'background_jobs_queue';
  final Map<String, JobProcessor> _processors = {};
  List<BackgroundJob> _queue = [];
  bool _isProcessing = false;
  Timer? _schedulerTimer;

  /// Initialize the service
  Future<void> initialize() async {
    await _loadQueue();
    _startScheduler();
    if (kDebugMode) {
      debugPrint(
          'BackgroundJobService: Initialized with ${_queue.length} jobs');
    }
  }

  /// Register a processor for a job type
  void registerProcessor(String type, JobProcessor processor) {
    _processors[type] = processor;
  }

  /// Schedule a new job
  Future<String> scheduleJob(
    String type, {
    Map<String, dynamic> data = const {},
    JobPriority priority = JobPriority.normal,
    int maxRetries = 3,
    DateTime? scheduledAt,
  }) async {
    final job = BackgroundJob(
      type: type,
      data: data,
      priority: priority,
      maxRetries: maxRetries,
      scheduledAt: scheduledAt,
    );

    _queue.add(job);
    _sortQueue();
    await _saveQueue();

    // Trigger processing if immediate
    if (scheduledAt == null || scheduledAt.isBefore(DateTime.now())) {
      unawaited(_processNext());
    }

    return job.id;
  }

  /// Process the next job in the queue
  Future<void> _processNext() async {
    if (_isProcessing || _queue.isEmpty) return;

    final now = DateTime.now();

    // Find next eligible job
    BackgroundJob? job;
    try {
      job = _queue.firstWhere((j) =>
          j.status == JobStatus.pending &&
          (j.scheduledAt == null || j.scheduledAt!.isBefore(now)));
    } catch (e) {
      return;
    }

    _isProcessing = true;
    job.status = JobStatus.running;
    job.startedAt = DateTime.now();
    await _saveQueue();

    if (kDebugMode) {
      debugPrint(
          'BackgroundJobService: Processing job ${job.id} (${job.type})');
    }

    final processor = _processors[job.type];
    if (processor == null) {
      _handleJobFailure(job, 'No processor registered for type ${job.type}');
      return;
    }

    try {
      // Execute in isolated future to prevent main thread blocking for heavy tasks
      // In a real heavy scenario, use compute() or Isolate.run() here.
      // For now, we ensure it's at least async gap protected.
      await Future.microtask(() => processor(job!.data));
      _handleJobSuccess(job);
    } catch (e, stack) {
      _handleJobFailure(job, e.toString());
      if (kDebugMode) {
        debugPrint('BackgroundJobService: Job failed: $e');
        debugPrint(stack.toString());
      }
    } finally {
      _isProcessing = false;
      // Continue processing if more jobs exist
      unawaited(_processNext());
    }
  }

  void _handleJobSuccess(BackgroundJob job) {
    job.status = JobStatus.completed;
    job.completedAt = DateTime.now();

    // Auto-prune logic: Remove successful jobs immediately or keep for short history
    // For God-Tier persistence, we keep them but prune old ones periodically
    _saveQueue();
    _pruneOldJobs();
  }

  void _handleJobFailure(BackgroundJob job, String error) {
    job.lastError = error;
    job.retryCount++;

    if (job.canRetry) {
      job.status = JobStatus.pending;
      // Exponential backoff with 1 hour cap
      final backoffSeconds = min(3600, pow(2, job.retryCount) * 10);
      job.scheduledAt =
          DateTime.now().add(Duration(seconds: backoffSeconds.toInt()));
      if (kDebugMode) {
        debugPrint(
            'BackgroundJobService: Scheduling retry ${job.retryCount} for job ${job.id} in ${backoffSeconds}s');
      }
    } else {
      job.status = JobStatus.failed;
      job.completedAt = DateTime.now();
    }

    _sortQueue();
    _saveQueue();
  }

  /// Prune jobs older than 24 hours to prevent storage bloat
  Future<void> _pruneOldJobs() async {
    final cutoff = DateTime.now().subtract(const Duration(hours: 24));
    final initialCount = _queue.length;

    _queue.removeWhere((job) =>
        (job.status == JobStatus.completed || job.status == JobStatus.failed) &&
        job.completedAt != null &&
        job.completedAt!.isBefore(cutoff));

    if (_queue.length != initialCount) {
      await _saveQueue();
      if (kDebugMode) {
        debugPrint(
            'BackgroundJobService: Pruned ${initialCount - _queue.length} old jobs');
      }
    }
  }

  /// Sort queue by priority and schedule time
  void _sortQueue() {
    _queue.sort((a, b) {
      final priorityComp = b.priority.index.compareTo(a.priority.index);
      if (priorityComp != 0) return priorityComp;

      final timeA = a.scheduledAt ?? a.createdAt;
      final timeB = b.scheduledAt ?? b.createdAt;
      return timeA.compareTo(timeB);
    });
  }

  /// Load queue from storage
  Future<void> _loadQueue() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonStr = prefs.getString(_storageKey);
      if (jsonStr != null) {
        final List<dynamic> list = jsonDecode(jsonStr) as List<dynamic>;
        _queue = list
            .map((item) => BackgroundJob.fromJson(item as Map<String, dynamic>))
            .toList();

        // Reset running jobs to pending on restart
        for (final job in _queue) {
          if (job.status == JobStatus.running) {
            job.status = JobStatus.pending;
            job.retryCount++;
          }
        }
        _sortQueue();
        await _pruneOldJobs(); // Cleanup on start
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('BackgroundJobService: Failed to load queue: $e');
      }
    }
  }

  /// Save queue to storage
  Future<void> _saveQueue() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonStr = jsonEncode(_queue.map((j) => j.toJson()).toList());
      await prefs.setString(_storageKey, jsonStr);
    } catch (e) {
      if (kDebugMode) {
        debugPrint('BackgroundJobService: Failed to save queue: $e');
      }
    }
  }

  /// Start scheduler for future jobs
  void _startScheduler() {
    _schedulerTimer?.cancel();
    _schedulerTimer = Timer.periodic(const Duration(minutes: 1), (timer) {
      _processNext();
    });
  }

  /// Stop the service
  void dispose() {
    _schedulerTimer?.cancel();
  }

  /// Get job by ID
  BackgroundJob? getJob(String id) {
    try {
      return _queue.firstWhere((j) => j.id == id);
    } catch (e) {
      return null;
    }
  }

  /// Cancel a job
  Future<void> cancelJob(String id) async {
    final job = getJob(id);
    if (job != null &&
        job.status != JobStatus.completed &&
        job.status != JobStatus.failed) {
      job.status = JobStatus.cancelled;
      job.completedAt = DateTime.now();
      await _saveQueue();
    }
  }
}

/// Internal helper for exponential backoff calculation
num pow(num x, num exponent) {
  if (exponent == 0) return 1;
  return x * pow(x, exponent - 1);
}
