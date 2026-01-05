import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/core/network/api_client.dart';
import 'package:my_flutter_app/src/features/courses/domain/course_model.dart';

final courseRepositoryProvider = Provider<CourseRepository>((ref) {
  return CourseRepository(ref.watch(apiClientProvider));
});

class CourseRepository {
  CourseRepository(this._apiClient);
  final ApiClient _apiClient;

  Future<List<Course>> getCourses() async {
    final response = await _apiClient.get('/courses/');
    final data = response.data! as List<dynamic>;
    return data.map((e) => Course.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Course> getCourseDetail(String slug) async {
    final response = await _apiClient.get('/courses/$slug/');
    return Course.fromJson(response.data!);
  }
}
