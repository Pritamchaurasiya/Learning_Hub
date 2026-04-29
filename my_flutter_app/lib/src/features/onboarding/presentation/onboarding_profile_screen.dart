import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/features/auth/data/auth_repository.dart';

// --- State Management (Controller) ---

class OnboardingState {
  OnboardingState({
    this.goal = '',
    this.level = 'Beginner',
    this.topics = const [],
    this.learningStyle = '',
  });
  final String goal;
  final String level;
  final List<String> topics;
  final String learningStyle;

  OnboardingState copyWith({
    String? goal,
    String? level,
    List<String>? topics,
    String? learningStyle,
  }) {
    return OnboardingState(
      goal: goal ?? this.goal,
      level: level ?? this.level,
      topics: topics ?? this.topics,
      learningStyle: learningStyle ?? this.learningStyle,
    );
  }
}

class OnboardingController extends StateNotifier<OnboardingState> {
  OnboardingController(this._authRepository) : super(OnboardingState());
  final AuthRepository _authRepository;

  void setGoal(String goal) => state = state.copyWith(goal: goal);
  void setLevel(String level) => state = state.copyWith(level: level);
  void setStyle(String style) => state = state.copyWith(learningStyle: style);

  void toggleTopic(String topic) {
    final current = List<String>.from(state.topics);
    if (current.contains(topic)) {
      current.remove(topic);
    } else {
      current.add(topic);
    }
    state = state.copyWith(topics: current);
  }

  Future<void> submit(BuildContext context) async {
    try {
      debugPrint(r'Submitting Onboarding: ${state.goal}, ${state.level}');

      await _authRepository.updateProfile({
        'preferences': {
          'onboarding': {
            'goal': state.goal,
            'level': state.level,
            'topics': state.topics,
            'style': state.learningStyle,
            'completed_at': DateTime.now().toIso8601String(),
          }
        }
      });

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Profile Updated!'), backgroundColor: Colors.green),
        );
      }
    } on Exception catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }
}

final onboardingProvider =
    StateNotifierProvider<OnboardingController, OnboardingState>((ref) {
  final authRepo = ref.watch(authRepositoryProvider);
  return OnboardingController(authRepo);
});

// --- UI Presentation ---

class OnboardingProfileScreen extends ConsumerWidget {
  const OnboardingProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(onboardingProvider);
    final controller = ref.read(onboardingProvider.notifier);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Slate 900
      appBar: AppBar(
        title: const Text('Step 2 of 4'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          TextButton(
            onPressed: () {},
            child: const Text('SKIP', style: TextStyle(color: Colors.white70)),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Profile Customization',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.green.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.green),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.auto_awesome, color: Colors.green, size: 16),
                      SizedBox(width: 4),
                      Text('Adaptive Mode On',
                          style: TextStyle(color: Colors.green, fontSize: 12)),
                    ],
                  ),
                )
              ],
            ).animate().fadeIn(),

            const SizedBox(height: 8),

            // Progress Bar
            LinearProgressIndicator(
              value: 0.5,
              backgroundColor: Colors.white12,
              valueColor: const AlwaysStoppedAnimation(Colors.blue),
              borderRadius: BorderRadius.circular(2),
            ),
            const SizedBox(height: 32),

            // Section 1: Goals
            const _SectionHeader(
                title: 'What brings you here?', icon: Icons.flag),
            _GoalGrid(selectedGoal: state.goal, onSelect: controller.setGoal),

            const SizedBox(height: 32),

            // Section 2: Level
            const _SectionHeader(title: 'Current Level', icon: Icons.bar_chart),
            _LevelSelector(
                selectedLevel: state.level, onSelect: controller.setLevel),

            // Recommendations Alert
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.orange.withValues(alpha: 0.1),
                border: const Border(
                    left: BorderSide(color: Colors.orange, width: 4)),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Foundational Recommendation',
                      style: TextStyle(
                          color: Colors.orange, fontWeight: FontWeight.bold)),
                  SizedBox(height: 4),
                  Text(
                      'Based on your goal to advance your career, we detected a gap in Applied Logic.',
                      style: TextStyle(color: Colors.white70, fontSize: 12)),
                ],
              ),
            ).animate().slideX(),

            const SizedBox(height: 32),

            // Section 3: Topics
            const _SectionHeader(
                title: 'Topics of Interest', icon: Icons.category),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _TopicChip(
                    'Coding', Icons.code, state.topics, controller.toggleTopic),
                _TopicChip('Design', Icons.brush, state.topics,
                    controller.toggleTopic),
                _TopicChip('Business', Icons.trending_up, state.topics,
                    controller.toggleTopic),
                _TopicChip('Marketing', Icons.campaign, state.topics,
                    controller.toggleTopic),
              ],
            ),

            const SizedBox(height: 48),

            // Submit Button
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                onPressed: () => controller.submit(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16)),
                  elevation: 8,
                  shadowColor: Colors.blue.withValues(alpha: 0.5),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text('Build My Journey',
                        style: TextStyle(
                            fontSize: 18, fontWeight: FontWeight.bold)),
                    SizedBox(width: 8),
                    Icon(Icons.arrow_forward),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, required this.icon});
  final String title;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Text(title,
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}

class _GoalGrid extends StatelessWidget {
  const _GoalGrid({required this.selectedGoal, required this.onSelect});
  final String selectedGoal;
  final void Function(String) onSelect;

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      childAspectRatio: 1.4,
      children: [
        _GoalCard(
            id: 'Career Growth',
            label: 'Career Growth',
            subLabel: '+2.4k others',
            icon: Icons.rocket_launch,
            isSelected: selectedGoal == 'Career Growth',
            onTap: () => onSelect('Career Growth')),
        _GoalCard(
            id: 'Academic',
            label: 'Academic',
            subLabel: 'Popular with students',
            icon: Icons.school,
            isSelected: selectedGoal == 'Academic',
            onTap: () => onSelect('Academic')),
        _GoalCard(
            id: 'Hobby',
            label: 'Hobby',
            subLabel: 'Learn for fun',
            icon: Icons.palette,
            isSelected: selectedGoal == 'Hobby',
            onTap: () => onSelect('Hobby')),
        _GoalCard(
            id: 'Teach',
            label: 'Teach',
            subLabel: 'Share knowledge',
            icon: Icons.cast_for_education,
            isSelected: selectedGoal == 'Teach',
            onTap: () => onSelect('Teach')),
      ],
    );
  }
}

class _GoalCard extends StatelessWidget {
  const _GoalCard({
    required this.id,
    required this.label,
    required this.subLabel,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });
  final String id;
  final String label;
  final String subLabel;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected
              ? Colors.blue.withValues(alpha: 0.2)
              : const Color(0xFF1E293B),
          border: Border.all(
              color: isSelected ? Colors.blue : Colors.transparent, width: 2),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: isSelected ? Colors.blue : Colors.white10,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, color: Colors.white, size: 20),
                ),
                if (isSelected)
                  const Icon(Icons.check_circle, color: Colors.blue, size: 20),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: const TextStyle(
                        color: Colors.white, fontWeight: FontWeight.bold)),
                Text(subLabel,
                    style:
                        const TextStyle(color: Colors.white54, fontSize: 10)),
              ],
            )
          ],
        ),
      ),
    );
  }
}

class _LevelSelector extends StatelessWidget {
  const _LevelSelector({required this.selectedLevel, required this.onSelect});
  final String selectedLevel;
  final void Function(String) onSelect;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
            child: _LevelButton('Beginner', Icons.signal_cellular_alt_1_bar,
                isSelected: selectedLevel == 'Beginner',
                onTap: () => onSelect('Beginner'))),
        const SizedBox(width: 12),
        Expanded(
            child: _LevelButton('Intermediate', Icons.signal_cellular_alt_2_bar,
                isSelected: selectedLevel == 'Intermediate',
                onTap: () => onSelect('Intermediate'))),
        const SizedBox(width: 12),
        Expanded(
            child: _LevelButton('Expert', Icons.signal_cellular_alt,
                isSelected: selectedLevel == 'Expert',
                onTap: () => onSelect('Expert'))),
      ],
    );
  }
}

class _LevelButton extends StatelessWidget {
  const _LevelButton(this.label, this.icon,
      {required this.isSelected, required this.onTap});
  final String label;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: isSelected
              ? Colors.blue.withValues(alpha: 0.1)
              : const Color(0xFF1E293B),
          border:
              Border.all(color: isSelected ? Colors.blue : Colors.transparent),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Icon(icon, color: isSelected ? Colors.blue : Colors.grey),
            const SizedBox(height: 8),
            Text(label,
                style: TextStyle(
                    color: isSelected ? Colors.blue : Colors.grey,
                    fontSize: 12)),
          ],
        ),
      ),
    );
  }
}

class _TopicChip extends StatelessWidget {
  const _TopicChip(this.label, this.icon, this.selectedTopics, this.onToggle);
  final String label;
  final IconData icon;
  final List<String> selectedTopics;
  final void Function(String) onToggle;

  @override
  Widget build(BuildContext context) {
    final isSelected = selectedTopics.contains(label);
    return GestureDetector(
      onTap: () => onToggle(label),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? Colors.blue : const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
              color: isSelected ? Colors.blueAccent : Colors.white10),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 18, color: Colors.white),
            const SizedBox(width: 8),
            Text(label,
                style: const TextStyle(
                    color: Colors.white, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }
}
