import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

/// Note model for timestamped video notes
class VideoNote {
  final String id;
  final String courseId;
  final String lessonId;
  final String text;
  final int timestampSeconds;
  final DateTime createdAt;
  final DateTime updatedAt;

  VideoNote({
    required this.id,
    required this.courseId,
    required this.lessonId,
    required this.text,
    required this.timestampSeconds,
    required this.createdAt,
    required this.updatedAt,
  });

  VideoNote copyWith({
    String? text,
    int? timestampSeconds,
  }) {
    return VideoNote(
      id: id,
      courseId: courseId,
      lessonId: lessonId,
      text: text ?? this.text,
      timestampSeconds: timestampSeconds ?? this.timestampSeconds,
      createdAt: createdAt,
      updatedAt: DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'courseId': courseId,
        'lessonId': lessonId,
        'text': text,
        'timestampSeconds': timestampSeconds,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
      };

  factory VideoNote.fromJson(Map<String, dynamic> json) {
    return VideoNote(
      id: json['id'] as String,
      courseId: json['courseId'] as String,
      lessonId: json['lessonId'] as String,
      text: json['text'] as String,
      timestampSeconds: json['timestampSeconds'] as int,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  String get formattedTimestamp {
    final duration = Duration(seconds: timestampSeconds);
    final minutes = duration.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = duration.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '${duration.inHours > 0 ? '${duration.inHours}:' : ''}$minutes:$seconds';
  }
}

/// Service for managing video notes
class NoteService {
  NoteService._();
  static final NoteService instance = NoteService._();

  static const String _notesKey = 'user_video_notes';

  /// Get all notes for a specific lesson
  Future<List<VideoNote>> getNotesForLesson(String lessonId) async {
    final allNotes = await _getAllNotes();
    return allNotes.where((n) => n.lessonId == lessonId).toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt)); // Newest first
  }

  /// Get all notes for a course
  Future<List<VideoNote>> getNotesForCourse(String courseId) async {
    final allNotes = await _getAllNotes();
    return allNotes.where((n) => n.courseId == courseId).toList()
      ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
  }

  /// Create a new note
  Future<VideoNote> createNote({
    required String courseId,
    required String lessonId,
    required String text,
    required int timestampSeconds,
  }) async {
    final note = VideoNote(
      id: const Uuid().v4(),
      courseId: courseId,
      lessonId: lessonId,
      text: text,
      timestampSeconds: timestampSeconds,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );

    final notes = await _getAllNotes();
    notes.add(note);
    await _saveNotes(notes);

    return note;
  }

  /// Update an existing note
  Future<VideoNote?> updateNote({
    required String id,
    String? text,
  }) async {
    final notes = await _getAllNotes();
    final index = notes.indexWhere((n) => n.id == id);

    if (index == -1) {
      return null;
    }

    final updatedNote = notes[index].copyWith(text: text);
    notes[index] = updatedNote;
    await _saveNotes(notes);

    return updatedNote;
  }

  /// Delete a note
  Future<void> deleteNote(String id) async {
    final notes = await _getAllNotes();
    notes.removeWhere((n) => n.id == id);
    await _saveNotes(notes);
  }

  /// Get all notes from storage
  Future<List<VideoNote>> _getAllNotes() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = prefs.getString(_notesKey);
      if (json == null) {
        return [];
      }

      final list = jsonDecode(json) as List;
      return list
          .map((e) => VideoNote.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  /// Save notes to storage
  Future<void> _saveNotes(List<VideoNote> notes) async {
    final prefs = await SharedPreferences.getInstance();
    final json = jsonEncode(notes.map((n) => n.toJson()).toList());
    await prefs.setString(_notesKey, json);
  }
}

/// State for notes
class NotesState {
  final List<VideoNote> notes;
  final bool isLoading;

  const NotesState({
    this.notes = const [],
    this.isLoading = false,
  });

  NotesState copyWith({
    List<VideoNote>? notes,
    bool? isLoading,
  }) {
    return NotesState(
      notes: notes ?? this.notes,
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

/// Notifier for managing notes state
class NotesNotifier extends FamilyNotifier<NotesState, String> {
  final _service = NoteService.instance;

  @override
  NotesState build(String lessonId) {
    _loadNotes(lessonId);
    return const NotesState(isLoading: true);
  }

  Future<void> _loadNotes(String lessonId) async {
    final notes = await _service.getNotesForLesson(lessonId);
    state = state.copyWith(notes: notes, isLoading: false);
  }

  Future<void> addNote({
    required String courseId,
    required String text,
    required int timestampSeconds,
  }) async {
    final note = await _service.createNote(
      courseId: courseId,
      lessonId: arg, // arg is lessonId
      text: text,
      timestampSeconds: timestampSeconds,
    );

    state = state.copyWith(notes: [note, ...state.notes]);
  }

  Future<void> updateNote(String id, String text) async {
    final updated = await _service.updateNote(id: id, text: text);
    if (updated != null) {
      final newNotes =
          state.notes.map((n) => n.id == id ? updated : n).toList();
      state = state.copyWith(notes: newNotes);
    }
  }

  Future<void> deleteNote(String id) async {
    await _service.deleteNote(id);
    state = state.copyWith(
      notes: state.notes.where((n) => n.id != id).toList(),
    );
  }
}

/// Provider for notes (scoped by lesson ID)
final notesProvider =
    NotifierProvider.family<NotesNotifier, NotesState, String>(() {
  return NotesNotifier();
});
