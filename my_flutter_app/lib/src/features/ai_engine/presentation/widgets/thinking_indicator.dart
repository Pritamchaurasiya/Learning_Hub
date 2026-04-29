import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

class ThinkingIndicator extends StatelessWidget {
  const ThinkingIndicator({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 5,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircleAvatar(
            radius: 8,
            backgroundColor: Color(0xFF7C3AED),
            child: Icon(Icons.auto_awesome, size: 10, color: Colors.white),
          ),
          const SizedBox(width: 8),
          Row(
            children: [
              _buildDot(0),
              const SizedBox(width: 4),
              _buildDot(200),
              const SizedBox(width: 4),
              _buildDot(400),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms);
  }

  Widget _buildDot(int delay) {
    return Container(
      width: 6,
      height: 6,
      decoration: const BoxDecoration(
        color: Color(0xFF7C3AED),
        shape: BoxShape.circle,
      ),
    ).animate(onPlay: (controller) => controller.repeat(reverse: true)).scaleXY(
        begin: 0.6,
        end: 1.2,
        duration: 600.ms,
        curve: Curves.easeInOut,
        delay: Duration(milliseconds: delay));
  }
}
