import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/features/discussions/data/discussion_repository.dart';
import 'package:my_flutter_app/src/features/discussions/domain/discussion_models.dart';

class DiscussionSummaryState {
  const DiscussionSummaryState({
    this.isLoading = false,
    this.data,
    this.error,
  });

  factory DiscussionSummaryState.initial() => const DiscussionSummaryState();

  factory DiscussionSummaryState.loading() =>
      const DiscussionSummaryState(isLoading: true);

  factory DiscussionSummaryState.success(Map<String, dynamic> data) =>
      DiscussionSummaryState(data: data);

  factory DiscussionSummaryState.error(String message) =>
      DiscussionSummaryState(error: message);
  final bool isLoading;
  final Map<String, dynamic>? data;
  final String? error;
}

class DiscussionSummaryController
    extends StateNotifier<DiscussionSummaryState> {
  DiscussionSummaryController(this._repository)
      : super(const DiscussionSummaryState());

  final DiscussionRepository _repository;

  Future<void> generateSummary(String threadId) async {
    state = DiscussionSummaryState.loading();
    try {
      final data = await _repository.getThreadSummary(threadId);
      state = DiscussionSummaryState.success(data);
    } on Exception catch (e) {
      state = DiscussionSummaryState.error(e.toString());
    }
  }
}

final discussionSummaryControllerProvider = StateNotifierProvider.family<
    DiscussionSummaryController,
    DiscussionSummaryState,
    String>((ref, threadId) {
  final repository = ref.watch(discussionRepositoryProvider);
  return DiscussionSummaryController(repository);
});

final discussionRepliesProvider =
    FutureProvider.family<List<DiscussionReply>, String>((ref, threadId) async {
  final repo = ref.watch(discussionRepositoryProvider);
  final dataList = await repo.getReplies(threadId);
  return dataList
      .map((e) => DiscussionReply.fromJson(e as Map<String, dynamic>))
      .toList();
});

class DiscussionReplyController extends StateNotifier<AsyncValue<void>> {
  DiscussionReplyController(this._repository, this._ref)
      : super(const AsyncData(null));

  final DiscussionRepository _repository;
  final Ref _ref;

  Future<void> submitReply(String threadId, String content) async {
    state = const AsyncLoading();
    try {
      await _repository.createReply(threadId, content);
      state = const AsyncData(null);
      _ref.invalidate(discussionRepliesProvider(threadId));
    } on Exception catch (e, st) {
      state = AsyncError(e, st);
    }
  }
}

final discussionReplyControllerProvider =
    StateNotifierProvider<DiscussionReplyController, AsyncValue<void>>((ref) {
  return DiscussionReplyController(
      ref.watch(discussionRepositoryProvider), ref);
});
