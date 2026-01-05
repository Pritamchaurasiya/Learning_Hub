import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../data/models/note_model.dart';

/// Service to handle local storage of notes
class NotesService {
  static const String _storageKey = 'user_notes';

  Future<List<Note>> getNotes(String courseId) async {
    final prefs = await SharedPreferences.getInstance();
    final jsonString = prefs.getString(_storageKey);
    if (jsonString == null) return [];

    final List<dynamic> jsonList = jsonDecode(jsonString) as List<dynamic>;
    final allNotes =
        jsonList.map((j) => Note.fromJson(j as Map<String, dynamic>)).toList();

    // Filter by course
    return allNotes.where((n) => n.courseId == courseId).toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt)); // Newest first
  }

  Future<void> saveNote(Note note) async {
    final prefs = await SharedPreferences.getInstance();
    final jsonString = prefs.getString(_storageKey);
    List<Note> allNotes = [];

    if (jsonString != null) {
      final List<dynamic> jsonList = jsonDecode(jsonString) as List<dynamic>;
      allNotes = jsonList
          .map((j) => Note.fromJson(j as Map<String, dynamic>))
          .toList();
    }

    // Check if update or new
    final index = allNotes.indexWhere((n) => n.id == note.id);
    if (index >= 0) {
      allNotes[index] = note;
    } else {
      allNotes.add(note);
    }

    await prefs.setString(
      _storageKey,
      jsonEncode(allNotes.map((n) => n.toJson()).toList()),
    );
  }

  Future<void> deleteNote(String noteId) async {
    final prefs = await SharedPreferences.getInstance();
    final jsonString = prefs.getString(_storageKey);
    if (jsonString == null) return;

    final List<dynamic> jsonList = jsonDecode(jsonString) as List<dynamic>;
    final allNotes =
        jsonList.map((j) => Note.fromJson(j as Map<String, dynamic>)).toList();

    allNotes.removeWhere((n) => n.id == noteId);

    await prefs.setString(
      _storageKey,
      jsonEncode(allNotes.map((n) => n.toJson()).toList()),
    );
  }
}

/// Provider definition
final notesServiceProvider = Provider((ref) => NotesService());

final courseNotesProvider =
    StateNotifierProvider.family<NotesNotifier, AsyncValue<List<Note>>, String>(
        (ref, courseId) {
  return NotesNotifier(ref.watch(notesServiceProvider), courseId);
});

class NotesNotifier extends StateNotifier<AsyncValue<List<Note>>> {
  final NotesService _service;
  final String _courseId;

  NotesNotifier(this._service, this._courseId)
      : super(const AsyncValue.loading()) {
    loadNotes();
  }

  Future<void> loadNotes() async {
    try {
      final notes = await _service.getNotes(_courseId);
      state = AsyncValue.data(notes);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> addNote({
    required String content,
    String? lessonId,
    Duration? timestamp,
  }) async {
    try {
      final newNote = Note(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        courseId: _courseId,
        lessonId: lessonId,
        content: content,
        timestamp: timestamp,
        createdAt: DateTime.now(),
      );

      await _service.saveNote(newNote);
      await loadNotes();
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> updateNote(Note note) async {
    try {
      await _service.saveNote(note);
      await loadNotes();
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> deleteNote(String noteId) async {
    try {
      await _service.deleteNote(noteId);
      await loadNotes();
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}
