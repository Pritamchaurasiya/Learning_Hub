import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:my_flutter_app/src/core/widgets/glass_container.dart';

/// AI Hub Screen — central navigation for all AI features.
class AiHubScreen extends StatelessWidget {
  const AiHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: Text(
          'AI Lab',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
        ),
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0F172A), Color(0xFF1E1B4B)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Explore AI Features',
                  style: GoogleFonts.outfit(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ).animate().fadeIn(),
                const SizedBox(height: 8),
                Text(
                  'Leverage cutting-edge AI to supercharge your learning.',
                  style: GoogleFonts.outfit(
                    fontSize: 14,
                    color: Colors.white60,
                  ),
                ).animate().fadeIn(delay: 100.ms),
                const SizedBox(height: 32),
                Expanded(
                  child: GridView.count(
                    crossAxisCount: 2,
                    mainAxisSpacing: 16,
                    crossAxisSpacing: 16,
                    childAspectRatio: 0.95,
                    children: [
                      _AiFeatureCard(
                        icon: Icons.psychology,
                        title: 'World Models',
                        subtitle: 'Explore AI dream states',
                        color: Colors.purpleAccent,
                        onTap: () => context.push('/ai/world-models'),
                      ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.2),
                      _AiFeatureCard(
                        icon: Icons.account_tree,
                        title: 'Causal Graph',
                        subtitle: 'Visual reasoning engine',
                        color: Colors.tealAccent,
                        onTap: () => context.push('/ai/causal'),
                      ).animate().fadeIn(delay: 300.ms).slideY(begin: 0.2),
                      _AiFeatureCard(
                        icon: Icons.auto_awesome,
                        title: 'AI Chat',
                        subtitle: 'Conversational assistant',
                        color: const Color(0xFF6366F1),
                        onTap: () => context.push('/ai-chat'),
                      ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.2),
                      _AiFeatureCard(
                        icon: Icons.school,
                        title: 'AI Tutor',
                        subtitle: 'Personalized tutoring',
                        color: const Color(0xFF3B82F6),
                        onTap: () => context.push('/ai-tutor'),
                      ).animate().fadeIn(delay: 500.ms).slideY(begin: 0.2),
                      _AiFeatureCard(
                        icon: Icons.menu_book,
                        title: 'Curriculum',
                        subtitle: 'AI-generated courses',
                        color: Colors.orangeAccent,
                        onTap: () => context.push('/curriculum'),
                      ).animate().fadeIn(delay: 600.ms).slideY(begin: 0.2),
                      _AiFeatureCard(
                        icon: Icons.leaderboard,
                        title: 'Skill Assessment',
                        subtitle: 'Evaluate your progress',
                        color: Colors.greenAccent,
                        onTap: () => context.push('/hub'),
                      ).animate().fadeIn(delay: 700.ms).slideY(begin: 0.2),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _AiFeatureCard extends StatelessWidget {
  const _AiFeatureCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: GlassContainer(
        opacity: 0.08,
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: color, size: 28),
            ),
            const Spacer(),
            Text(
              title,
              style: GoogleFonts.outfit(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              style: GoogleFonts.outfit(
                fontSize: 12,
                color: Colors.white54,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
