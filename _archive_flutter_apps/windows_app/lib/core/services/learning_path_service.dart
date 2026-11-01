import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Learning goal types
enum LearningGoalType {
  skill,
  certification,
  jobRole,
  project,
  custom,
}

/// Course prerequisite relationship
class CoursePrerequisite {
  final String courseId;
  final String prerequisiteId;
  final bool isRequired;
  final String? description;

  const CoursePrerequisite({
    required this.courseId,
    required this.prerequisiteId,
    this.isRequired = true,
    this.description,
  });

  Map<String, dynamic> toJson() => {
        'courseId': courseId,
        'prerequisiteId': prerequisiteId,
        'isRequired': isRequired,
        if (description != null) 'description': description,
      };

  factory CoursePrerequisite.fromJson(Map<String, dynamic> json) {
    return CoursePrerequisite(
      courseId: json['courseId'] as String,
      prerequisiteId: json['prerequisiteId'] as String,
      isRequired: json['isRequired'] as bool? ?? true,
      description: json['description'] as String?,
    );
  }
}

/// Skill with proficiency level
class Skill {
  final String id;
  final String name;
  final String category;
  final int currentLevel; // 0-100
  final int targetLevel;
  final List<String> relatedCourseIds;

  const Skill({
    required this.id,
    required this.name,
    required this.category,
    this.currentLevel = 0,
    this.targetLevel = 100,
    this.relatedCourseIds = const [],
  });

  double get progress => targetLevel > 0 ? currentLevel / targetLevel : 0;
  int get gap => targetLevel - currentLevel;

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'category': category,
        'currentLevel': currentLevel,
        'targetLevel': targetLevel,
        'relatedCourseIds': relatedCourseIds,
      };

  factory Skill.fromJson(Map<String, dynamic> json) {
    return Skill(
      id: json['id'] as String,
      name: json['name'] as String,
      category: json['category'] as String,
      currentLevel: json['currentLevel'] as int? ?? 0,
      targetLevel: json['targetLevel'] as int? ?? 100,
      relatedCourseIds: List<String>.from(
          (json['relatedCourseIds'] ?? <String>[]) as Iterable<dynamic>),
    );
  }
}

/// Learning path milestone
class PathMilestone {
  final String id;
  final String title;
  final String description;
  final List<String> courseIds;
  final int order;
  final bool isCompleted;
  final DateTime? completedAt;
  final int estimatedHours;

  const PathMilestone({
    required this.id,
    required this.title,
    required this.description,
    required this.courseIds,
    required this.order,
    this.isCompleted = false,
    this.completedAt,
    this.estimatedHours = 0,
  });

  PathMilestone copyWith({bool? isCompleted, DateTime? completedAt}) {
    return PathMilestone(
      id: id,
      title: title,
      description: description,
      courseIds: courseIds,
      order: order,
      isCompleted: isCompleted ?? this.isCompleted,
      completedAt: completedAt ?? this.completedAt,
      estimatedHours: estimatedHours,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'courseIds': courseIds,
        'order': order,
        'isCompleted': isCompleted,
        if (completedAt != null) 'completedAt': completedAt!.toIso8601String(),
        'estimatedHours': estimatedHours,
      };

  factory PathMilestone.fromJson(Map<String, dynamic> json) {
    return PathMilestone(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      courseIds: List<String>.from(
          (json['courseIds'] ?? <String>[]) as Iterable<dynamic>),
      order: json['order'] as int,
      isCompleted: json['isCompleted'] as bool? ?? false,
      completedAt: json['completedAt'] != null
          ? DateTime.parse(json['completedAt'] as String)
          : null,
      estimatedHours: json['estimatedHours'] as int? ?? 0,
    );
  }
}

/// Learning path definition
class LearningPath {
  final String id;
  final String title;
  final String description;
  final LearningGoalType goalType;
  final String? targetRole;
  final List<PathMilestone> milestones;
  final List<Skill> targetSkills;
  final int totalEstimatedHours;
  final DateTime createdAt;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final bool isActive;

  const LearningPath({
    required this.id,
    required this.title,
    required this.description,
    required this.goalType,
    this.targetRole,
    required this.milestones,
    this.targetSkills = const [],
    required this.totalEstimatedHours,
    required this.createdAt,
    this.startedAt,
    this.completedAt,
    this.isActive = true,
  });

  double get progress {
    if (milestones.isEmpty) return 0;
    final completed = milestones.where((m) => m.isCompleted).length;
    return completed / milestones.length;
  }

  PathMilestone? get currentMilestone {
    for (final milestone in milestones) {
      if (!milestone.isCompleted) return milestone;
    }
    return null;
  }

  List<String> get allCourseIds {
    final ids = <String>{};
    for (final milestone in milestones) {
      ids.addAll(milestone.courseIds);
    }
    return ids.toList();
  }

  int get completedMilestones => milestones.where((m) => m.isCompleted).length;

  LearningPath copyWith({
    List<PathMilestone>? milestones,
    DateTime? startedAt,
    DateTime? completedAt,
    bool? isActive,
  }) {
    return LearningPath(
      id: id,
      title: title,
      description: description,
      goalType: goalType,
      targetRole: targetRole,
      milestones: milestones ?? this.milestones,
      targetSkills: targetSkills,
      totalEstimatedHours: totalEstimatedHours,
      createdAt: createdAt,
      startedAt: startedAt ?? this.startedAt,
      completedAt: completedAt ?? this.completedAt,
      isActive: isActive ?? this.isActive,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'goalType': goalType.index,
        if (targetRole != null) 'targetRole': targetRole,
        'milestones': milestones.map((m) => m.toJson()).toList(),
        'targetSkills': targetSkills.map((s) => s.toJson()).toList(),
        'totalEstimatedHours': totalEstimatedHours,
        'createdAt': createdAt.toIso8601String(),
        if (startedAt != null) 'startedAt': startedAt!.toIso8601String(),
        if (completedAt != null) 'completedAt': completedAt!.toIso8601String(),
        'isActive': isActive,
      };

  factory LearningPath.fromJson(Map<String, dynamic> json) {
    return LearningPath(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      goalType: LearningGoalType.values[json['goalType'] as int],
      targetRole: json['targetRole'] as String?,
      milestones: (json['milestones'] as List)
          .map((m) => PathMilestone.fromJson(m as Map<String, dynamic>))
          .toList(),
      targetSkills: (json['targetSkills'] as List?)
              ?.map((s) => Skill.fromJson(s as Map<String, dynamic>))
              .toList() ??
          [],
      totalEstimatedHours: json['totalEstimatedHours'] as int,
      createdAt: DateTime.parse(json['createdAt'] as String),
      startedAt: json['startedAt'] != null
          ? DateTime.parse(json['startedAt'] as String)
          : null,
      completedAt: json['completedAt'] != null
          ? DateTime.parse(json['completedAt'] as String)
          : null,
      isActive: json['isActive'] as bool? ?? true,
    );
  }
}

/// Skill gap analysis result
class SkillGapAnalysis {
  final List<Skill> currentSkills;
  final List<Skill> targetSkills;
  final List<Skill> skillGaps;
  final List<String> recommendedCourseIds;
  final int estimatedHoursToClose;

  const SkillGapAnalysis({
    required this.currentSkills,
    required this.targetSkills,
    required this.skillGaps,
    required this.recommendedCourseIds,
    required this.estimatedHoursToClose,
  });
}

/// Learning path templates
class LearningPathTemplate {
  final String id;
  final String title;
  final String description;
  final LearningGoalType type;
  final String? targetRole;
  final List<String> skillNames;
  final int estimatedWeeks;
  final String difficulty;

  const LearningPathTemplate({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
    this.targetRole,
    required this.skillNames,
    required this.estimatedWeeks,
    required this.difficulty,
  });
}

/// Learning path service for personalized curriculum
class LearningPathService {
  static final LearningPathService _instance = LearningPathService._();
  static LearningPathService get instance => _instance;

  LearningPathService._();

  factory LearningPathService() => _instance;

  static const String _pathsKey = 'learning_paths';
  static const String _skillsKey = 'user_skills';
  static const String _prerequisitesKey = 'course_prerequisites';

  final List<LearningPath> _activePaths = [];
  final Map<String, Skill> _userSkills = {};
  final Map<String, List<CoursePrerequisite>> _prerequisites = {};
  bool _isInitialized = false;

  /// Initialize the service
  Future<void> initialize() async {
    if (_isInitialized) return;
    await _loadPaths();
    await _loadSkills();
    await _loadPrerequisites();
    _isInitialized = true;
  }

  /// Get available path templates
  List<LearningPathTemplate> getTemplates() {
    return [
      const LearningPathTemplate(
        id: 'flutter_developer',
        title: 'Flutter Mobile Developer',
        description: 'Master Flutter development from beginner to advanced',
        type: LearningGoalType.jobRole,
        targetRole: 'Mobile Developer',
        skillNames: [
          'Dart',
          'Flutter Widgets',
          'State Management',
          'Testing',
          'CI/CD'
        ],
        estimatedWeeks: 12,
        difficulty: 'Intermediate',
      ),
      const LearningPathTemplate(
        id: 'full_stack_dart',
        title: 'Full Stack Dart Developer',
        description: 'Learn frontend and backend with Dart ecosystem',
        type: LearningGoalType.jobRole,
        targetRole: 'Full Stack Developer',
        skillNames: ['Dart', 'Flutter', 'Dart Frog', 'Firebase', 'PostgreSQL'],
        estimatedWeeks: 16,
        difficulty: 'Advanced',
      ),
      const LearningPathTemplate(
        id: 'flutter_ui_expert',
        title: 'Flutter UI/UX Expert',
        description: 'Become an expert in Flutter UI design and animations',
        type: LearningGoalType.skill,
        skillNames: [
          'UI Design',
          'Animations',
          'Custom Widgets',
          'Responsive Design'
        ],
        estimatedWeeks: 8,
        difficulty: 'Intermediate',
      ),
      const LearningPathTemplate(
        id: 'app_architecture',
        title: 'App Architecture Mastery',
        description: 'Learn clean architecture and best practices',
        type: LearningGoalType.skill,
        skillNames: [
          'Clean Architecture',
          'SOLID',
          'Design Patterns',
          'Testing'
        ],
        estimatedWeeks: 6,
        difficulty: 'Advanced',
      ),
    ];
  }

  /// Create learning path from template
  Future<LearningPath> createFromTemplate(
    LearningPathTemplate template,
    List<Map<String, dynamic>> availableCourses,
  ) async {
    // Match courses to skills
    final milestones = <PathMilestone>[];
    int totalHours = 0;

    for (int i = 0; i < template.skillNames.length; i++) {
      final skillName = template.skillNames[i];

      // Find related courses
      final relatedCourses = availableCourses.where((c) {
        final title = (c['title'] as String).toLowerCase();
        final tags = (c['tags'] as List?)?.cast<String>() ?? [];
        final skill = skillName.toLowerCase();
        return title.contains(skill) ||
            tags.any((t) => t.toLowerCase().contains(skill));
      }).toList();

      final courseIds =
          relatedCourses.take(3).map((c) => c['id'] as String).toList();
      final estimatedHours = relatedCourses.fold<int>(
        0,
        (sum, c) => sum + ((c['durationMinutes'] as int?) ?? 60) ~/ 60,
      );

      milestones.add(PathMilestone(
        id: 'milestone_${template.id}_$i',
        title: 'Master $skillName',
        description: 'Complete courses to develop $skillName proficiency',
        courseIds: courseIds,
        order: i,
        estimatedHours: estimatedHours > 0 ? estimatedHours : 5,
      ));

      totalHours += estimatedHours > 0 ? estimatedHours : 5;
    }

    final path = LearningPath(
      id: 'path_${DateTime.now().millisecondsSinceEpoch}',
      title: template.title,
      description: template.description,
      goalType: template.type,
      targetRole: template.targetRole,
      milestones: milestones,
      targetSkills: template.skillNames
          .map((name) => Skill(
                id: 'skill_${name.toLowerCase().replaceAll(' ', '_')}',
                name: name,
                category: 'Technical',
              ))
          .toList(),
      totalEstimatedHours: totalHours,
      createdAt: DateTime.now(),
      isActive: true,
    );

    _activePaths.add(path);
    await _savePaths();

    return path;
  }

  /// Generate personalized path based on skills gap
  Future<LearningPath> generatePersonalizedPath({
    required String goalTitle,
    required List<String> targetSkillNames,
    required List<Map<String, dynamic>> availableCourses,
    LearningGoalType goalType = LearningGoalType.custom,
  }) async {
    // Analyze skill gaps
    final gaps = <Skill>[];
    for (final skillName in targetSkillNames) {
      final skillId = 'skill_${skillName.toLowerCase().replaceAll(' ', '_')}';
      final current = _userSkills[skillId];
      final currentLevel = current?.currentLevel ?? 0;

      if (currentLevel < 80) {
        gaps.add(Skill(
          id: skillId,
          name: skillName,
          category: 'Technical',
          currentLevel: currentLevel,
          targetLevel: 100,
        ));
      }
    }

    // Order courses by prerequisites
    final orderedCourses = _sortByPrerequisites(availableCourses);

    // Create milestones based on gaps
    final milestones = <PathMilestone>[];
    int totalHours = 0;

    for (int i = 0; i < gaps.length; i++) {
      final skill = gaps[i];

      // Find courses for this skill
      final relatedCourses = orderedCourses.where((c) {
        final title = (c['title'] as String).toLowerCase();
        final tags = (c['tags'] as List?)?.cast<String>() ?? [];
        return title.contains(skill.name.toLowerCase()) ||
            tags.any((t) => t.toLowerCase().contains(skill.name.toLowerCase()));
      }).toList();

      final courseIds =
          relatedCourses.take(3).map((c) => c['id'] as String).toList();
      final hours = relatedCourses.fold<int>(
        0,
        (sum, c) => sum + ((c['durationMinutes'] as int?) ?? 60) ~/ 60,
      );

      milestones.add(PathMilestone(
        id: 'milestone_custom_$i',
        title: 'Develop ${skill.name}',
        description:
            'Close the gap in ${skill.name} (currently ${skill.currentLevel}%)',
        courseIds: courseIds,
        order: i,
        estimatedHours: hours > 0 ? hours : skill.gap ~/ 10,
      ));

      totalHours += hours > 0 ? hours : skill.gap ~/ 10;
    }

    final path = LearningPath(
      id: 'path_${DateTime.now().millisecondsSinceEpoch}',
      title: goalTitle,
      description: 'Personalized path to achieve $goalTitle',
      goalType: goalType,
      milestones: milestones,
      targetSkills: gaps,
      totalEstimatedHours: totalHours,
      createdAt: DateTime.now(),
      isActive: true,
    );

    _activePaths.add(path);
    await _savePaths();

    return path;
  }

  /// Sort courses by prerequisites
  List<Map<String, dynamic>> _sortByPrerequisites(
    List<Map<String, dynamic>> courses,
  ) {
    // Topological sort based on prerequisites
    final sorted = <Map<String, dynamic>>[];
    final visited = <String>{};

    void visit(Map<String, dynamic> course) {
      final id = course['id'] as String;
      if (visited.contains(id)) return;
      visited.add(id);

      // Visit prerequisites first
      final prereqs = _prerequisites[id] ?? [];
      for (final prereq in prereqs) {
        final prereqCourse = courses.firstWhere(
          (c) => c['id'] == prereq.prerequisiteId,
          orElse: () => {},
        );
        if (prereqCourse.isNotEmpty) {
          visit(prereqCourse);
        }
      }

      sorted.add(course);
    }

    for (final course in courses) {
      visit(course);
    }

    return sorted;
  }

  /// Start a learning path
  Future<void> startPath(String pathId) async {
    final index = _activePaths.indexWhere((p) => p.id == pathId);
    if (index >= 0) {
      _activePaths[index] = _activePaths[index].copyWith(
        startedAt: DateTime.now(),
      );
      await _savePaths();
    }
  }

  /// Complete a milestone
  Future<void> completeMilestone(String pathId, String milestoneId) async {
    final pathIndex = _activePaths.indexWhere((p) => p.id == pathId);
    if (pathIndex < 0) return;

    final path = _activePaths[pathIndex];
    final milestones = List<PathMilestone>.from(path.milestones);

    final milestoneIndex = milestones.indexWhere((m) => m.id == milestoneId);
    if (milestoneIndex >= 0) {
      milestones[milestoneIndex] = milestones[milestoneIndex].copyWith(
        isCompleted: true,
        completedAt: DateTime.now(),
      );

      final allCompleted = milestones.every((m) => m.isCompleted);

      _activePaths[pathIndex] = path.copyWith(
        milestones: milestones,
        completedAt: allCompleted ? DateTime.now() : null,
      );

      await _savePaths();
    }
  }

  /// Update user skill level
  Future<void> updateSkill(String skillId, int level) async {
    final existing = _userSkills[skillId];
    _userSkills[skillId] = Skill(
      id: skillId,
      name: existing?.name ?? skillId,
      category: existing?.category ?? 'Technical',
      currentLevel: level.clamp(0, 100),
      targetLevel: existing?.targetLevel ?? 100,
    );
    await _saveSkills();
  }

  /// Add course prerequisite
  Future<void> addPrerequisite(CoursePrerequisite prereq) async {
    final list = _prerequisites[prereq.courseId] ?? [];
    list.add(prereq);
    _prerequisites[prereq.courseId] = list;
    await _savePrerequisites();
  }

  /// Get skill gap analysis
  SkillGapAnalysis analyzeSkillGaps(
    List<String> targetSkillNames,
    List<Map<String, dynamic>> availableCourses,
  ) {
    final targetSkills = targetSkillNames.map((name) {
      final id = 'skill_${name.toLowerCase().replaceAll(' ', '_')}';
      return Skill(
        id: id,
        name: name,
        category: 'Technical',
        currentLevel: _userSkills[id]?.currentLevel ?? 0,
      );
    }).toList();

    final gaps = targetSkills.where((s) => s.currentLevel < 80).toList();
    final recommendedCourseIds = <String>[];

    for (final gap in gaps) {
      final courses = availableCourses.where((c) {
        final title = (c['title'] as String).toLowerCase();
        return title.contains(gap.name.toLowerCase());
      });
      recommendedCourseIds
          .addAll(courses.take(2).map((c) => c['id'] as String));
    }

    final estimatedHours = gaps.fold<int>(0, (sum, g) => sum + g.gap ~/ 10);

    return SkillGapAnalysis(
      currentSkills: _userSkills.values.toList(),
      targetSkills: targetSkills,
      skillGaps: gaps,
      recommendedCourseIds: recommendedCourseIds.toSet().toList(),
      estimatedHoursToClose: estimatedHours,
    );
  }

  /// [GOD MODE] Simulate AI-driven path optimization
  /// This mocks a connection to an advanced LLM that re-orders milestones
  /// based on user learning velocity and semantic relevance.
  Future<LearningPath> optimizePathWithAI(String pathId) async {
    // Simulate complex calculation delay
    await Future<void>.delayed(const Duration(milliseconds: 1500));

    final pathIndex = _activePaths.indexWhere((p) => p.id == pathId);
    if (pathIndex < 0) throw Exception('Path not found');

    final path = _activePaths[pathIndex];

    // "AI" optimization: Sort milestones by estimated hours (shortest first)
    // for quick wins (Gamification psychology).
    final optimizedMilestones = List<PathMilestone>.from(path.milestones)
      ..sort((a, b) => a.estimatedHours.compareTo(b.estimatedHours));

    final optimizedPath = path.copyWith(
      milestones: optimizedMilestones,
    );

    _activePaths[pathIndex] = optimizedPath;
    await _savePaths();

    return optimizedPath;
  }

  /// Get all active paths
  List<LearningPath> get activePaths => List.unmodifiable(_activePaths);

  /// Get path by ID
  LearningPath? getPath(String id) {
    return _activePaths.where((p) => p.id == id).firstOrNull;
  }

  /// Delete a path
  Future<void> deletePath(String id) async {
    _activePaths.removeWhere((p) => p.id == id);
    await _savePaths();
  }

  /// Load paths from storage
  Future<void> _loadPaths() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = prefs.getString(_pathsKey);
      if (json != null) {
        final list = jsonDecode(json) as List;
        _activePaths.clear();
        _activePaths.addAll(
          list.map((p) => LearningPath.fromJson(p as Map<String, dynamic>)),
        );
      }
    } catch (e) {
      if (kDebugMode) debugPrint('Failed to load learning paths: $e');
    }
  }

  /// Save paths to storage
  Future<void> _savePaths() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = _activePaths.map((p) => p.toJson()).toList();
      await prefs.setString(_pathsKey, jsonEncode(json));
    } catch (e) {
      if (kDebugMode) debugPrint('Failed to save learning paths: $e');
    }
  }

  /// Load skills from storage
  Future<void> _loadSkills() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = prefs.getString(_skillsKey);
      if (json != null) {
        final data = jsonDecode(json) as Map<String, dynamic>;
        _userSkills.clear();
        for (final entry in data.entries) {
          _userSkills[entry.key] =
              Skill.fromJson(entry.value as Map<String, dynamic>);
        }
      }
    } catch (e) {
      if (kDebugMode) debugPrint('Failed to load skills: $e');
    }
  }

  /// Save skills to storage
  Future<void> _saveSkills() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final data = _userSkills.map((k, v) => MapEntry(k, v.toJson()));
      await prefs.setString(_skillsKey, jsonEncode(data));
    } catch (e) {
      if (kDebugMode) debugPrint('Failed to save skills: $e');
    }
  }

  /// Load prerequisites from storage
  Future<void> _loadPrerequisites() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = prefs.getString(_prerequisitesKey);
      if (json != null) {
        final data = jsonDecode(json) as Map<String, dynamic>;
        _prerequisites.clear();
        for (final entry in data.entries) {
          _prerequisites[entry.key] = (entry.value as List)
              .map(
                  (p) => CoursePrerequisite.fromJson(p as Map<String, dynamic>))
              .toList();
        }
      }
    } catch (e) {
      if (kDebugMode) debugPrint('Failed to load prerequisites: $e');
    }
  }

  /// Save prerequisites to storage
  Future<void> _savePrerequisites() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final data = _prerequisites.map(
        (k, v) => MapEntry(k, v.map((p) => p.toJson()).toList()),
      );
      await prefs.setString(_prerequisitesKey, jsonEncode(data));
    } catch (e) {
      if (kDebugMode) debugPrint('Failed to save prerequisites: $e');
    }
  }

  /// Reset all data
  Future<void> reset() async {
    _activePaths.clear();
    _userSkills.clear();
    _prerequisites.clear();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_pathsKey);
    await prefs.remove(_skillsKey);
    await prefs.remove(_prerequisitesKey);
  }
}

/// Global learning path service
final learningPaths = LearningPathService.instance;
