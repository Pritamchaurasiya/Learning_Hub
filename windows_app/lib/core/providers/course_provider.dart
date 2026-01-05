import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/course_service.dart';
import '../../data/models/course_model.dart';

final courseServiceProvider = Provider<CourseService>((ref) {
  return CourseService.instance;
});

final courseListProvider = FutureProvider.autoDispose
    .family<List<Course>, String?>((ref, category) async {
  final service = ref.watch(courseServiceProvider);
  return service.getCourses(category: category);
});

final courseDetailsProvider =
    FutureProvider.autoDispose.family<Course?, String>((ref, courseId) async {
  final service = ref.watch(courseServiceProvider);
  return service.getCourse(courseId);
});

final featuredCoursesProvider =
    FutureProvider.autoDispose<List<Course>>((ref) async {
  final service = ref.watch(courseServiceProvider);
  return service.getFeaturedCourses();
});

final userProgressProvider =
    FutureProvider.autoDispose<Map<String, CourseProgress>>((ref) async {
  final service = ref.watch(courseServiceProvider);
  return service.getUserProgress();
});
