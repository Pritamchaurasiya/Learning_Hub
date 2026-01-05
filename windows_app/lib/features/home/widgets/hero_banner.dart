import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

class HeroBanner extends StatefulWidget {
  const HeroBanner({super.key});

  @override
  State<HeroBanner> createState() => _HeroBannerState();
}

class _HeroBannerState extends State<HeroBanner> {
  final PageController _pageController = PageController();
  int _currentPage = 0;
  Timer? _timer;

  final List<_HeroItem> _heroItems = [
    _HeroItem(
      title: 'Master Flutter Development',
      subtitle: 'Build beautiful native apps for any screen.',
      imagePath: 'assets/images/hero_flutter.png',
      color: const Color(0xFF02569B),
      icon: Icons.flutter_dash,
    ),
    _HeroItem(
      title: 'AI for Everyone',
      subtitle: 'Unlock the power of Artificial Intelligence.',
      imagePath: 'assets/images/hero_ai.png',
      color: const Color(0xFF673AB7),
      icon: Icons.psychology,
    ),
    _HeroItem(
      title: 'Web Development Bootcamp',
      subtitle: 'Become a full-stack developer in 2024.',
      imagePath: 'assets/images/hero_web.png',
      color: const Color(0xFFE65100),
      icon: Icons.language,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _startAutoScroll();
  }

  void _startAutoScroll() {
    _timer = Timer.periodic(const Duration(seconds: 6), (timer) {
      if (_pageController.hasClients) {
        int nextPage = _currentPage + 1;
        if (nextPage >= _heroItems.length) {
          nextPage = 0;
        }
        _pageController.animateToPage(
          nextPage,
          duration: const Duration(milliseconds: 1000),
          curve: Curves.easeInOutCubicEmphasized,
        );
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isDesktop = size.width >= 1024;
    final height = isDesktop ? 420.0 : 320.0;

    return SizedBox(
      height: height,
      child: Stack(
        alignment: Alignment.bottomCenter,
        children: [
          PageView.builder(
            controller: _pageController,
            onPageChanged: (index) {
              setState(() {
                _currentPage = index;
              });
            },
            itemCount: _heroItems.length,
            itemBuilder: (context, index) {
              return _HeroSlide(
                item: _heroItems[index],
                isDesktop: isDesktop,
                isVisible: _currentPage == index,
              );
            },
          ),

          // Indicators
          Padding(
            padding: const EdgeInsets.only(bottom: 24.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(_heroItems.length, (index) {
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  height: 8,
                  width: _currentPage == index ? 32 : 8,
                  decoration: BoxDecoration(
                    color: Colors.white
                        .withValues(alpha: _currentPage == index ? 0.9 : 0.4),
                    borderRadius: BorderRadius.circular(4),
                  ),
                );
              }),
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroSlide extends StatelessWidget {
  final _HeroItem item;
  final bool isDesktop;
  final bool isVisible;

  const _HeroSlide({
    required this.item,
    required this.isDesktop,
    required this.isVisible,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        // MESH-like multi-color gradient for vibrant depth
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            item.color,
            Color.lerp(item.color, Colors.purple, 0.3) ?? item.color,
            Color.lerp(item.color, Colors.blue, 0.4) ?? item.color,
            item.color.withValues(alpha: 0.9),
          ],
          stops: const [0.0, 0.3, 0.6, 1.0],
        ),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Animated Mesh Particle Background
          Positioned.fill(
            child: CustomPaint(
              painter: _MeshGradientPainter(color: item.color),
            ).animate(onPlay: (c) => c.repeat()).shimmer(
                duration: 4.seconds,
                color: Colors.white.withValues(alpha: 0.1)),
          ),

          // Floating orbs for depth
          ...List.generate(3, (i) {
            return Positioned(
              left: (i * 200.0) - 50,
              top: (i * 80.0) - 40,
              child: Container(
                width: 150 + (i * 50.0),
                height: 150 + (i * 50.0),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      Colors.white.withValues(alpha: 0.08),
                      Colors.transparent,
                    ],
                  ),
                ),
              )
                  .animate(onPlay: (c) => c.repeat(reverse: true))
                  .moveY(
                      begin: 0, end: 20.0 + (i * 10), duration: (3 + i).seconds)
                  .moveX(
                      begin: 0, end: 15.0 - (i * 5), duration: (4 + i).seconds),
            );
          }),

          // Background Pattern (Animated)
          Positioned(
            right: -50,
            top: -50,
            child: Icon(
              item.icon,
              size: 400,
              color: Colors.white.withValues(alpha: 0.07),
            )
                .animate(target: isVisible ? 1 : 0)
                .rotate(begin: 0, end: 0.05, duration: 10.seconds)
                .scale(
                    begin: const Offset(1, 1),
                    end: const Offset(1.1, 1.1),
                    duration: 10.seconds),
          ),

          // Social Proof Badge (Top Right)
          if (isDesktop)
            Positioned(
              right: 32,
              top: 24,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(30),
                  border:
                      Border.all(color: Colors.white.withValues(alpha: 0.3)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.1),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.people, color: Colors.white, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      'Join 10k+ Students',
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                  ],
                ),
              )
                  .animate(target: isVisible ? 1 : 0)
                  .fadeIn(delay: 800.ms, duration: 500.ms)
                  .slideY(begin: -0.5, end: 0),
            ),

          Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 1200),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24.0),
                child: Row(
                  children: [
                    Expanded(
                      flex: 3,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.title,
                            style: Theme.of(context)
                                .textTheme
                                .displaySmall
                                ?.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: isDesktop ? 48 : 32,
                                  height: 1.1,
                                ),
                          )
                              .animate(target: isVisible ? 1 : 0)
                              .fadeIn(duration: 600.ms, delay: 200.ms)
                              .slideX(begin: -0.1, end: 0),
                          const SizedBox(height: 16),
                          Text(
                            item.subtitle,
                            style: Theme.of(context)
                                .textTheme
                                .headlineSmall
                                ?.copyWith(
                                  color: Colors.white.withValues(alpha: 0.9),
                                  fontSize: isDesktop ? 22 : 18,
                                ),
                          )
                              .animate(target: isVisible ? 1 : 0)
                              .fadeIn(duration: 600.ms, delay: 400.ms)
                              .slideX(begin: -0.1, end: 0),
                          const SizedBox(height: 32),
                          ElevatedButton.icon(
                            onPressed: () {},
                            icon: const Icon(Icons.bolt, size: 20),
                            label: const Text('Start Learning Now'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.white,
                              foregroundColor: item.color,
                              padding: EdgeInsets.symmetric(
                                horizontal: isDesktop ? 32 : 24,
                                vertical: isDesktop ? 20 : 16,
                              ),
                              textStyle: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                              elevation: 4,
                            ),
                          )
                              .animate(target: isVisible ? 1 : 0)
                              .fadeIn(duration: 600.ms, delay: 600.ms)
                              .moveY(begin: 20, end: 0)
                              .shimmer(delay: 1500.ms, duration: 1500.ms),
                        ],
                      ),
                    ),
                    if (isDesktop) ...[
                      const SizedBox(width: 48),
                      // 3D-like Image Placeholder with Animation
                      Expanded(
                        flex: 2,
                        child: Container(
                          height: 320,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                Colors.white.withValues(alpha: 0.15),
                                Colors.white.withValues(alpha: 0.05)
                              ],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(24),
                            border: Border.all(
                                color: Colors.white.withValues(alpha: 0.2),
                                width: 1),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.2),
                                blurRadius: 30,
                                offset: const Offset(0, 15),
                              ),
                            ],
                          ),
                          child: Center(
                            child: Icon(item.icon,
                                size: 120,
                                color: Colors.white.withValues(alpha: 0.9)),
                          ),
                        )
                            .animate(target: isVisible ? 1 : 0)
                            .fadeIn(delay: 300.ms, duration: 800.ms)
                            .scale(begin: const Offset(0.8, 0.8))
                            .slideY(begin: 0.1, end: 0)
                            .then()
                            .animate(
                                onPlay: (controller) =>
                                    controller.repeat(reverse: true))
                            .moveY(
                                begin: 0,
                                end: -15,
                                duration: 2000.ms,
                                curve: Curves.easeInOutSine),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroItem {
  final String title;
  final String subtitle;
  final String imagePath;
  final Color color;
  final IconData icon;

  _HeroItem({
    required this.title,
    required this.subtitle,
    required this.imagePath,
    required this.color,
    required this.icon,
  });
}

/// Custom painter for animated mesh-like gradient background
class _MeshGradientPainter extends CustomPainter {
  final Color color;

  _MeshGradientPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..shader = RadialGradient(
        center: const Alignment(-0.5, -0.6),
        radius: 1.2,
        colors: [
          Colors.white.withValues(alpha: 0.1),
          Colors.transparent,
        ],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));

    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), paint);

    // Second glow layer
    final paint2 = Paint()
      ..shader = RadialGradient(
        center: const Alignment(0.8, 0.4),
        radius: 1.0,
        colors: [
          color.withValues(alpha: 0.15),
          Colors.transparent,
        ],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));

    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), paint2);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
