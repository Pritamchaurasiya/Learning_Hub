import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

class NoteEntry {
  NoteEntry({
    required this.id,
    required this.text,
    required this.timestamp,
  });

  factory NoteEntry.fromJson(Map<String, dynamic> json) {
    return NoteEntry(
      id: json['id'] as String,
      text: json['text'] as String,
      timestamp: json['timestamp'] as String,
    );
  }

  final String id;
  final String text;
  final String timestamp;

  Map<String, dynamic> toJson() => {
        'id': id,
        'text': text,
        'timestamp': timestamp,
      };
}

class LessonNotesNotifier extends StateNotifier<AsyncValue<List<NoteEntry>>> {
  LessonNotesNotifier(this.courseId) : super(const AsyncLoading()) {
    _loadNotes();
  }

  final String courseId;

  String get _storageKey => 'lesson_notes_$courseId';

  Future<void> _loadNotes() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonString = prefs.getString(_storageKey);

      if (jsonString != null && jsonString.isNotEmpty) {
        final decodedList = jsonDecode(jsonString) as List<dynamic>;
        final notes = decodedList
            .map((e) => NoteEntry.fromJson(e as Map<String, dynamic>))
            .toList();
        state = AsyncData(notes);
      } else {
        state = const AsyncData([]);
      }
    } on Exception catch (e, st) {
      debugPrint('LessonNotesNotifier._loadNotes error: $e');
      state = AsyncError(e, st);
    }
  }

  Future<void> addNote(String text, String timestamp) async {
    final currentNotes = state.valueOrNull ?? [];
    final newNote = NoteEntry(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      text: text,
      timestamp: timestamp,
    );
    final updatedNotes = [...currentNotes, newNote];

    // Save locally
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
        _storageKey, jsonEncode(updatedNotes.map((e) => e.toJson()).toList()));

    state = AsyncData(updatedNotes);
  }

  Future<void> deleteNote(String noteId) async {
    final currentNotes = state.valueOrNull ?? [];
    final updatedNotes = currentNotes.where((n) => n.id != noteId).toList();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
        _storageKey, jsonEncode(updatedNotes.map((e) => e.toJson()).toList()));

    state = AsyncData(updatedNotes);
  }
}

final lessonNotesProvider = StateNotifierProvider.family<LessonNotesNotifier,
    AsyncValue<List<NoteEntry>>, String>((ref, courseId) {
  return LessonNotesNotifier(courseId);
});
