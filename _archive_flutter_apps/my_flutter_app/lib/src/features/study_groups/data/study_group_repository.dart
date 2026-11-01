import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../domain/study_group_model.dart';

final studyGroupRepositoryProvider = Provider<StudyGroupRepository>((ref) {
  return StudyGroupRepository(ref.watch(apiClientProvider));
});

class StudyGroupRepository {

  StudyGroupRepository(this._apiClient);
  final ApiClient _apiClient;

  Future<List<StudyGroup>> getGroups({String? topic, String? search}) async {
    var url = ApiConstants.studyGroups;
    final params = <String>[];
    if (topic != null && topic.isNotEmpty) {
      params.add('topic=$topic');
    }
    if (search != null && search.isNotEmpty) {
      params.add('search=$search');
    }
    if (params.isNotEmpty) {
      url += '?${params.join('&')}';
    }
    final response = await _apiClient.get(url);
    final dynamic data = response.data;
    if (data is Map<String, dynamic> && data.containsKey('results')) {
      final results = data['results'] as List<dynamic>;
      return results
          .map((json) => StudyGroup.fromJson(json as Map<String, dynamic>))
          .toList();
    }
    if (data is List<dynamic>) {
      return data
          .map((json) => StudyGroup.fromJson(json as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<List<StudyGroup>> getMyGroups() async {
    final response =
        await _apiClient.get('${ApiConstants.studyGroups}my_groups/');
    final dynamic data = response.data;
    if (data is List<dynamic>) {
      return data
          .map((json) => StudyGroup.fromJson(json as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<void> joinGroup(int groupId) async {
    await _apiClient.post('${ApiConstants.studyGroups}$groupId/join/');
  }

  Future<void> leaveGroup(int groupId) async {
    await _apiClient.post('${ApiConstants.studyGroups}$groupId/leave/');
  }

  Future<StudyGroup> createGroup(Map<String, dynamic> data) async {
    final response =
        await _apiClient.post(ApiConstants.studyGroups, data: data);
    return StudyGroup.fromJson(response.data!);
  }
}
