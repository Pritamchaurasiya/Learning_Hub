import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// A testimonial card widget inspired by Google Stitch design.
/// Displays user review with avatar, name, rating, and feedback text.
class TestimonialCard extends StatelessWidget {
  const TestimonialCard({
    super.key,
    required this.userName,
    required this.userRole,
    required this.rating,
    required this.reviewText,
    this.avatarUrl,
    this.date,
  });

  final String userName;
  final String userRole;
  final double rating;
  final String reviewText;
  final String? avatarUrl;
  final DateTime? date;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      width: 300,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: theme.colorScheme.outline.withValues(alpha: 0.15),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header with avatar and user info
          Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor:
                    theme.colorScheme.primary.withValues(alpha: 0.1),
                backgroundImage:
                    avatarUrl != null ? NetworkImage(avatarUrl!) : null,
                child: avatarUrl == null
                    ? Text(
                        userName.isNotEmpty ? userName[0].toUpperCase() : '?',
                        style: GoogleFonts.outfit(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: theme.colorScheme.primary,
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      userName,
                      style: GoogleFonts.outfit(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: theme.colorScheme.onSurface,
                      ),
                    ),
                    Text(
                      userRole,
                      style: GoogleFonts.outfit(
                        fontSize: 12,
                        color:
                            theme.colorScheme.onSurface.withValues(alpha: 0.6),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Star rating
          Row(
            children: List.generate(5, (index) {
              final filled = index < rating.floor();
              final half = !filled && index < rating;
              return Icon(
                half
                    ? Icons.star_half
                    : (filled ? Icons.star : Icons.star_border),
                size: 18,
                color: Colors.amber,
              );
            }),
          ),
          const SizedBox(height: 12),

          // Review text
          Text(
            reviewText,
            style: GoogleFonts.outfit(
              fontSize: 14,
              height: 1.5,
              color: theme.colorScheme.onSurface.withValues(alpha: 0.8),
            ),
            maxLines: 4,
            overflow: TextOverflow.ellipsis,
          ),

          // Date if provided
          if (date != null) ...[
            const SizedBox(height: 12),
            Text(
              _formatDate(date!),
              style: GoogleFonts.outfit(
                fontSize: 12,
                color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    final months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }
}

/// Horizontal scrollable list of testimonials
class TestimonialsSection extends StatelessWidget {
  const TestimonialsSection({
    super.key,
    required this.testimonials,
    this.title = 'Student Testimonials',
  });

  final List<TestimonialData> testimonials;
  final String title;

  @override
  Widget build(BuildContext context) {
    if (testimonials.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            title,
            style: GoogleFonts.outfit(
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 220,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: testimonials.length,
            separatorBuilder: (_, __) => const SizedBox(width: 16),
            itemBuilder: (context, index) {
              final t = testimonials[index];
              return TestimonialCard(
                userName: t.userName,
                userRole: t.userRole,
                rating: t.rating,
                reviewText: t.reviewText,
                avatarUrl: t.avatarUrl,
                date: t.date,
              );
            },
          ),
        ),
      ],
    );
  }
}

/// Data class for testimonial information
class TestimonialData {
  const TestimonialData({
    required this.userName,
    required this.userRole,
    required this.rating,
    required this.reviewText,
    this.avatarUrl,
    this.date,
  });

  final String userName;
  final String userRole;
  final double rating;
  final String reviewText;
  final String? avatarUrl;
  final DateTime? date;
}
