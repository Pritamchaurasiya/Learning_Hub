import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/features/profile/data/instructor_repository.dart';
import 'package:my_flutter_app/src/features/profile/domain/instructor_model.dart';

class InstructorController extends StateNotifier<AsyncValue<Instructor>> {
  InstructorController(this._repository) : super(const AsyncValue.loading());

  final InstructorRepository _repository;

  Future<void> loadInstructor(String instructorId) async {
    state = const AsyncValue.loading();
    try {
      final instructor = await _repository.getInstructor(instructorId);
      state = AsyncValue.data(instructor);
    } on Exception catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}

final instructorControllerProvider = StateNotifierProvider.family<
    InstructorController, AsyncValue<Instructor>, String>((ref, instructorId) {
  final repository = ref.watch(instructorRepositoryProvider);
  return InstructorController(repository)..loadInstructor(instructorId);
});
