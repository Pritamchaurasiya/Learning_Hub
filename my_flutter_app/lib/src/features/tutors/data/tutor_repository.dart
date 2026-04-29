import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/core/constants/api_constants.dart';
import 'package:my_flutter_app/src/core/network/api_client.dart';
import 'package:my_flutter_app/src/features/tutors/domain/tutor_model.dart';

final tutorRepositoryProvider = Provider<TutorRepository>((ref) {
  return TutorRepository(ref.watch(apiClientProvider));
});

class TutorRepository {
  TutorRepository(this._apiClient);
  final ApiClient _apiClient;

  Future<List<TutorProfile>> getTutors() async {
    final response = await _apiClient.get(ApiConstants.tutors);
    final data = response.data;
    final List<dynamic> rawList;

    if (data != null && data.containsKey('results')) {
      rawList = (data['results'] as List<dynamic>?) ?? [];
    } else {
      rawList = [];
    }

    return rawList
        .map((dynamic e) => TutorProfile.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<Booking>> getMyBookings() async {
    final response = await _apiClient.get(ApiConstants.bookings);
    final data = response.data;
    final List<dynamic> rawList;

    if (data != null && data.containsKey('results')) {
      rawList = (data['results'] as List<dynamic>?) ?? [];
    } else {
      rawList = [];
    }

    return rawList
        .map((dynamic e) => Booking.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> createBooking({
    required int tutorId,
    required DateTime startTime,
    required DateTime endTime,
    String? notes,
  }) async {
    await _apiClient.post(ApiConstants.bookings, data: {
      'tutor': tutorId,
      'start_time': startTime.toIso8601String(),
      'end_time': endTime.toIso8601String(),
      'notes': notes ?? '',
    });
  }
}
