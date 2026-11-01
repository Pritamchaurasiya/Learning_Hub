import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// A reusable stats badge widget inspired by Google Stitch design.
/// Displays an icon, value, and label in a compact horizontal layout.
class StatsBadge extends StatelessWidget {
  const StatsBadge({
    super.key,
    required this.icon,
    required this.value,
    required this.label,
    this.iconColor,
    this.valueStyle,
    this.labelStyle,
  });

  final IconData icon;
  final String value;
  final String label;
  final Color? iconColor;
  final TextStyle? valueStyle;
  final TextStyle? labelStyle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: theme.colorScheme.outline.withValues(alpha: 0.2),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 24,
            color: iconColor ?? primaryColor,
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: valueStyle ??
                GoogleFonts.outfit(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: theme.colorScheme.onSurface,
                ),
          ),
          Text(
            label,
            style: labelStyle ??
                GoogleFonts.outfit(
                  fontSize: 12,
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
                ),
          ),
        ],
      ),
    );
  }
}

/// Horizontal row of stats badges for profile screens
class StatsRow extends StatelessWidget {
  const StatsRow({
    super.key,
    required this.courses,
    required this.students,
    required this.rating,
  });

  final int courses;
  final String students;
  final double rating;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        Expanded(
          child: StatsBadge(
            icon: Icons.school_outlined,
            value: courses.toString(),
            label: 'Courses',
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: StatsBadge(
            icon: Icons.people_outline,
            value: students,
            label: 'Students',
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: StatsBadge(
            icon: Icons.star_outline,
            value: rating.toStringAsFixed(1),
            label: 'Rating',
            iconColor: Colors.amber,
          ),
        ),
      ],
    );
  }
}
