import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

/// Onboarding screen with animated slides, haptics, and premium UI.
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  final List<_OnboardingSlide> _slides = [
    _OnboardingSlide(
      title: 'Learn at your\nown pace',
      description:
          'Our adaptive learning engine crafts personalized learning paths just for you.',
      emoji: '📚',
      gradient: const [Color(0xFF1E40AF), Color(0xFF3B82F6)],
    ),
    _OnboardingSlide(
      title: 'Tailored to your\nunique style',
      description:
          'Whether visual, auditory, or hands-on — we adapt to how you learn best.',
      emoji: '🎯',
      gradient: const [Color(0xFF7C3AED), Color(0xFFA78BFA)],
    ),
    _OnboardingSlide(
      title: 'Practice with\nreal challenges',
      description:
          'Master DSA with interactive visualizers and sandboxed code execution.',
      emoji: '🚀',
      gradient: const [Color(0xFF059669), Color(0xFF34D399)],
    ),
  ];

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _nextPage() {
    if (_currentPage < _slides.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 600),
        curve: Curves.fastOutSlowIn,
      );
    } else {
      HapticFeedback.heavyImpact();
      context.go('/');
    }
  }

  void _skip() {
    HapticFeedback.mediumImpact();
    context.go('/');
  }

  void _onPageChanged(int index) {
    setState(() => _currentPage = index);
    HapticFeedback.selectionClick();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: Stack(
        children: [
          // Background Gradient Mesh (Subtle)
          Positioned(
            top: -100,
            right: -100,
            child: Container(
              width: 400,
              height: 400,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    _slides[_currentPage].gradient[0].withAlpha(51),
                    Colors.transparent,
                  ],
                ),
              ),
            ).animate().scale(duration: 1.seconds, curve: Curves.easeInOut),
          ),

          SafeArea(
            child: Column(
              children: [
                // Skip button
                Align(
                  alignment: Alignment.topRight,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: TextButton(
                      onPressed: _skip,
                      style: TextButton.styleFrom(
                        foregroundColor: Colors.white,
                      ),
                      child: Text(
                        'Skip',
                        style: GoogleFonts.outfit(
                          color: Colors.white60,
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                ),

                // Page content
                Expanded(
                  child: PageView.builder(
                    controller: _pageController,
                    onPageChanged: _onPageChanged,
                    itemCount: _slides.length,
                    itemBuilder: (context, index) {
                      final slide = _slides[index];
                      // Parallax effect can be added here if needed
                      return _buildSlide(slide, index == _currentPage);
                    },
                  ),
                ),

                // Bottom Controls
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 0, 24, 40),
                  child: Column(
                    children: [
                      // Page indicators
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(
                          _slides.length,
                          (index) => AnimatedContainer(
                            duration: const Duration(milliseconds: 300),
                            margin: const EdgeInsets.symmetric(horizontal: 4),
                            width: _currentPage == index ? 32 : 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: _currentPage == index
                                  ? _slides[_currentPage].gradient[1]
                                  : Colors.white12,
                              borderRadius: BorderRadius.circular(4),
                              boxShadow: _currentPage == index
                                  ? [
                                      BoxShadow(
                                        color: _slides[_currentPage]
                                            .gradient[1]
                                            .withAlpha(102),
                                        blurRadius: 8,
                                        offset: const Offset(0, 2),
                                      )
                                    ]
                                  : null,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 32),

                      // Primary Button
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: FilledButton(
                          onPressed: _nextPage,
                          style: FilledButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: Colors.black,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                _currentPage == _slides.length - 1
                                    ? 'Get Started'
                                    : 'Continue',
                                style: GoogleFonts.outfit(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.black,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Icon(
                                _currentPage == _slides.length - 1
                                    ? Icons.rocket_launch
                                    : Icons.arrow_forward_rounded,
                                size: 20,
                              ),
                            ],
                          ),
                        ),
                      )
                          .animate(target: 1)
                          .shimmer(delay: 2.seconds, duration: 1.seconds),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSlide(_OnboardingSlide slide, bool isActive) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Emoji with gradient background
          Container(
            width: 200,
            height: 200,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: slide.gradient,
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(50),
              boxShadow: [
                BoxShadow(
                  color: slide.gradient[0].withAlpha(77),
                  blurRadius: 40,
                  offset: const Offset(0, 20),
                ),
              ],
            ),
            child: Center(
              child: Text(
                slide.emoji,
                style: const TextStyle(fontSize: 80),
              ),
            ),
          )
              .animate(target: isActive ? 1 : 0)
              .scale(
                  begin: const Offset(0.8, 0.8),
                  curve: Curves.elasticOut,
                  duration: 800.ms)
              .fadeIn(duration: 400.ms)
              .then() // Continuous float animation
              .animate(onPlay: (controller) => controller.repeat(reverse: true))
              .moveY(
                  begin: -5,
                  end: 5,
                  duration: 2.seconds,
                  curve: Curves.easeInOut),

          const SizedBox(height: 64),

          // Title
          Text(
            slide.title,
            textAlign: TextAlign.center,
            style: GoogleFonts.outfit(
              fontSize: 36,
              fontWeight: FontWeight.bold,
              color: Colors.white,
              height: 1.1,
              letterSpacing: -0.5,
            ),
          )
              .animate(target: isActive ? 1 : 0)
              .slideY(
                  begin: 0.3,
                  duration: 500.ms,
                  curve: Curves.easeOutQuart,
                  delay: 100.ms)
              .fadeIn(),

          const SizedBox(height: 16),

          // Description
          Text(
            slide.description,
            textAlign: TextAlign.center,
            style: GoogleFonts.outfit(
              fontSize: 16,
              color: Colors.white60,
              height: 1.5,
            ),
          )
              .animate(target: isActive ? 1 : 0)
              .slideY(
                  begin: 0.3,
                  duration: 500.ms,
                  curve: Curves.easeOutQuart,
                  delay: 200.ms)
              .fadeIn(),
        ],
      ),
    );
  }
}

class _OnboardingSlide {
  _OnboardingSlide({
    required this.title,
    required this.description,
    required this.emoji,
    required this.gradient,
  });
  final String title;
  final String description;
  final String emoji;
  final List<Color> gradient;
}
