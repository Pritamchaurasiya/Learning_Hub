import 'package:get_it/get_it.dart';

import '../services/api_client.dart';
import '../services/user_service.dart';
import '../services/course_service.dart';
import '../services/cache_manager.dart';
import '../services/sync_service.dart';
import '../services/analytics_service.dart';

import '../services/notification_service.dart';
import '../services/ai_tutor_service.dart';
import '../services/security_service.dart';

import '../network/network_info.dart';
import '../../features/gamification/data/datasources/gamification_data_sources.dart';
import '../../features/gamification/data/datasources/gamification_remote_data_source_impl.dart';
import '../../features/gamification/data/datasources/gamification_local_data_source_impl.dart';
import '../../features/gamification/data/repositories/gamification_repository_impl.dart';
import '../../features/gamification/domain/repositories/gamification_repository.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:hive_flutter/hive_flutter.dart';

/// Global GetIt instance for dependency injection
final GetIt sl = GetIt.instance;

/// Initialize all dependencies
/// Call this in main() before runApp()
Future<void> initDependencies() async {
  // ============== CORE SERVICES ==============

  // API Client - Singleton
  sl.registerLazySingleton<ApiClient>(() => ApiClient.instance);

  // Cache Manager - Singleton
  sl.registerLazySingleton<CacheManager>(() => CacheManager.instance);

  // Sync Service - Singleton
  sl.registerLazySingleton<SyncService>(() => SyncService.instance);

  // Security Service - Singleton
  sl.registerLazySingleton<SecurityService>(() => SecurityService.instance);

  // ============== FEATURE SERVICES ==============

  // User Service - Singleton
  sl.registerLazySingleton<UserService>(() => UserService.instance);

  // Course Service - Singleton
  sl.registerLazySingleton<CourseService>(() => CourseService.instance);

  // Analytics Service - Singleton
  sl.registerLazySingleton<AnalyticsService>(() => AnalyticsService.instance);

  // Gamification Service - Singleton (uses internal singleton pattern)

  // Notification Service - Singleton
  sl.registerLazySingleton<NotificationService>(
    () => NotificationService.instance,
  );

  // AI Tutor Service - Singleton (uses internal singleton pattern)
  sl.registerLazySingleton<AiTutorService>(
    () => AiTutorService.instance,
  );

  // ============== NETWORK ==============

  // Network Info
  sl.registerLazySingleton<NetworkInfo>(
    () => NetworkInfoImpl(Connectivity()),
  );

  // ============== DATA SOURCES ==============

  // Gamification Data Sources
  sl.registerLazySingleton<GamificationRemoteDataSource>(
    () => GamificationRemoteDataSourceImpl(apiClient: sl()),
  );

  sl.registerLazySingleton<GamificationLocalDataSource>(
    () => GamificationLocalDataSourceImpl(
        gamificationBox: Hive.box('gamification')),
  );

  // ============== REPOSITORIES ==============

  // Gamification Repository
  sl.registerLazySingleton<GamificationRepository>(
    () => GamificationRepositoryImpl(
      remoteDataSource: sl(),
      localDataSource: sl(),
      networkInfo: sl(),
      syncService: sl(),
    ),
  );

  // ============== USE CASES ==============
  // TODO: Add use case registrations as they are created

  // ============== BLOCS ==============
  // TODO: Add BLoC registrations as they are created
}

/// Reset all dependencies (for testing)
Future<void> resetDependencies() async {
  await sl.reset();
}

/// Check if dependency is registered
bool isRegistered<T extends Object>() => sl.isRegistered<T>();

/// Convenience getter for dependencies
T get<T extends Object>() => sl<T>();
