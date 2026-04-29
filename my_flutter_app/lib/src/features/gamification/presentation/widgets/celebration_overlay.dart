import 'dart:math';
import 'package:flutter/material.dart';

class CelebrationOverlay extends StatefulWidget {
  const CelebrationOverlay({
    super.key,
    required this.child,
    this.isCelebrating = false,
    this.onCelebrationEnd,
  });
  final Widget child;
  final bool isCelebrating;
  final VoidCallback? onCelebrationEnd;

  @override
  State<CelebrationOverlay> createState() => _CelebrationOverlayState();
}

class _CelebrationOverlayState extends State<CelebrationOverlay>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late List<Particle> _particles;
  final Random _random = Random();

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..addListener(() {
        if (!mounted) {
          return;
        }
        setState(() {
          for (final p in _particles) {
            p.update();
          }
        });
      });

    _controller.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        widget.onCelebrationEnd?.call();
      }
    });

    _particles = List.generate(50, (_) => _generateParticle());
  }

  Particle _generateParticle() {
    return Particle(
      x: _random.nextDouble(), // 0.0 to 1.0
      y: -_random.nextDouble(), // Start above screen
      speed: _random.nextDouble() * 0.02 + 0.005,
      color: Colors.primaries[_random.nextInt(Colors.primaries.length)],
      size: _random.nextDouble() * 6 + 4,
      angle: _random.nextDouble() * 2 * pi,
      rotationSpeed: (_random.nextDouble() - 0.5) * 0.2,
    );
  }

  @override
  void didUpdateWidget(CelebrationOverlay oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isCelebrating && !oldWidget.isCelebrating) {
      _particles = List.generate(100, (_) => _generateParticle());
      _controller.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        if (_controller.isAnimating)
          Positioned.fill(
            child: IgnorePointer(
              child: CustomPaint(
                painter: ConfettiPainter(_particles),
              ),
            ),
          ),
      ],
    );
  }
}

class Particle {
  Particle({
    required this.x,
    required this.y,
    required this.speed,
    required this.color,
    required this.size,
    required this.angle,
    required this.rotationSpeed,
  });
  double x;
  double y;
  double speed;
  Color color;
  double size;
  double angle;
  double rotationSpeed;

  void update() {
    y += speed;
    angle += rotationSpeed;
    // Simple gravity/flutter effect could be added here
  }
}

class ConfettiPainter extends CustomPainter {
  ConfettiPainter(this.particles);
  final List<Particle> particles;

  @override
  void paint(Canvas canvas, Size size) {
    for (final p in particles) {
      if (p.y > 1.0) {
        continue; // Out of bounds
      }

      final paint = Paint()..color = p.color;
      final dx = p.x * size.width;
      final dy = p.y * size.height;

      canvas
        ..save()
        ..translate(dx, dy)
        ..rotate(p.angle)
        // Draw a simple rect (confetti piece)
        ..drawRect(
          Rect.fromCenter(
              center: Offset.zero, width: p.size, height: p.size * 0.6),
          paint,
        )
        ..restore();
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) =>
      true; // Always repaint on tick
}
