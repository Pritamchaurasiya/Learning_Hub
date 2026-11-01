import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:my_flutter_app/src/core/widgets/glass_container.dart';
import 'package:my_flutter_app/src/features/tutors/data/tutor_repository.dart';
import 'package:my_flutter_app/src/features/tutors/domain/tutor_model.dart';

final tutorsListProvider =
    FutureProvider.autoDispose<List<TutorProfile>>((ref) {
  return ref.watch(tutorRepositoryProvider).getTutors();
});

class TutorsListScreen extends ConsumerWidget {
  const TutorsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Deep Slate Background
      appBar: AppBar(
        title: Text(
          'Find a Mentor',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            onPressed: () => _showFiltersBottomSheet(context),
            icon: const Icon(Icons.tune),
          ),
          IconButton(
            onPressed: () => _showNotificationsDialog(context),
            icon: const Icon(Icons.notifications_outlined),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            // 1. Search Bar
            SliverToBoxAdapter(
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: GlassContainer(
                  borderRadius: 12,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: TextField(
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      border: InputBorder.none,
                      hintText: "Search 'Python', 'UX Design'...",
                      hintStyle: GoogleFonts.outfit(color: Colors.white54),
                      prefixIcon:
                          const Icon(Icons.search, color: Colors.white54),
                    ),
                  ),
                ).animate().fadeIn(),
              ),
            ),
            // 2. Filter Chips
            SliverToBoxAdapter(
              child: const SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                physics: BouncingScrollPhysics(),
                child: Row(
                  children: [
                    _FilterChip(label: 'Recommended', isSelected: true),
                    SizedBox(width: 8),
                    _FilterChip(label: 'Top Rated'),
                    SizedBox(width: 8),
                    _FilterChip(label: 'Available Now'),
                    SizedBox(width: 8),
                    _FilterChip(label: 'Price', isDropdown: true),
                  ],
                ),
              ).animate().slideX(delay: 100.ms),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 8)),
            // 3. Header text
            SliverToBoxAdapter(
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Suggested for you, Alex',
                      style: GoogleFonts.outfit(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    Text(
                      'Based on Data Science',
                      style: GoogleFonts.outfit(
                        fontSize: 12,
                        color: const Color(0xFF3B82F6),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // 4. Tutor List
            ref.watch(tutorsListProvider).when(
                  data: (tutors) {
                    if (tutors.isEmpty) {
                      return const SliverToBoxAdapter(
                        child: Center(
                          child: Padding(
                            padding: EdgeInsets.all(32),
                            child: Text(
                              'No mentors found right now.',
                              style: TextStyle(color: Colors.white54),
                            ),
                          ),
                        ),
                      );
                    }
                    return SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final tutor = tutors[index];
                          return Padding(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 8),
                            child: _TutorCard(tutor: tutor)
                                .animate()
                                .slideY(delay: (100 * index).ms, begin: 0.1),
                          );
                        },
                        childCount: tutors.length,
                      ),
                    );
                  },
                  loading: () => const SliverToBoxAdapter(
                      child: Center(
                          child:
                              CircularProgressIndicator(color: Colors.white))),
                  error: (e, s) => SliverToBoxAdapter(
                      child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text('Error: $e',
                        style: const TextStyle(color: Colors.redAccent)),
                  )),
                ),
            const SliverToBoxAdapter(child: SizedBox(height: 100)),
          ],
        ),
      ),
    );
  }

  void _showFiltersBottomSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: const Color(0xFF1E293B),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Mentor Filters',
                style: GoogleFonts.outfit(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 24),
              const Text('Price Range',
                  style: TextStyle(
                      color: Colors.grey, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              RangeSlider(
                values: const RangeValues(20, 100),
                max: 200,
                divisions: 20,
                labels: const RangeLabels(r'$20', r'$100'),
                onChanged: (_) {},
                activeColor: const Color(0xFF3B82F6),
              ),
              const SizedBox(height: 16),
              const Text('Minimum Rating',
                  style: TextStyle(
                      color: Colors.grey, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Slider(
                value: 4.5,
                min: 3,
                max: 5,
                divisions: 4,
                label: '4.5+',
                onChanged: (_) {},
                activeColor: Colors.amber,
              ),
              const SizedBox(height: 32),
              FilledButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Filters applied!')),
                  );
                },
                child: const Text('Apply Filters'),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showNotificationsDialog(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: const Color(0xFF1E293B),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Notifications',
                style: GoogleFonts.outfit(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: const CircleAvatar(
                    backgroundColor: Color(0xFF3B82F6),
                    child: Icon(Icons.videocam, color: Colors.white)),
                title: const Text('Session Starting Soon',
                    style: TextStyle(
                        color: Colors.white, fontWeight: FontWeight.bold)),
                subtitle: const Text(
                    'Your mentorship session with Alex starts in 30 mins.',
                    style: TextStyle(color: Colors.grey)),
                trailing: const Text('Just now',
                    style: TextStyle(color: Colors.grey, fontSize: 12)),
                onTap: () {},
              ),
              ListTile(
                leading: const CircleAvatar(
                    backgroundColor: Colors.amber,
                    child: Icon(Icons.star, color: Colors.white)),
                title: const Text('Leave a Review',
                    style: TextStyle(
                        color: Colors.white, fontWeight: FontWeight.bold)),
                subtitle: const Text('How was your session with Sarah?',
                    style: TextStyle(color: Colors.grey)),
                trailing: const Text('2h ago',
                    style: TextStyle(color: Colors.grey, fontSize: 12)),
                onTap: () {},
              ),
              const SizedBox(height: 32),
              OutlinedButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Close'),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip(
      {required this.label, this.isSelected = false, this.isDropdown = false});
  final String label;
  final bool isSelected;
  final bool isDropdown;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: isSelected
            ? Colors.white
            : const Color(0xFF1E293B).withValues(alpha: 0.8),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isSelected ? Colors.white : Colors.white24,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: GoogleFonts.outfit(
              color: isSelected ? Colors.black : Colors.white,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              fontSize: 12,
            ),
          ),
          if (isDropdown) ...[
            const SizedBox(width: 4),
            Icon(Icons.keyboard_arrow_down,
                size: 16, color: isSelected ? Colors.black : Colors.white),
          ],
        ],
      ),
    );
  }
}

class _TutorCard extends StatelessWidget {
  const _TutorCard({required this.tutor});
  final TutorProfile tutor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B), // Card background
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
        boxShadow: const [
          BoxShadow(
            color: Colors.black26,
            blurRadius: 10,
            offset: Offset(0, 4),
          )
        ],
      ),
      child: Column(
        children: [
          // Top Row: Avatar & Info
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Avatar with Badge
              Stack(
                children: [
                  CircleAvatar(
                    radius: 32,
                    backgroundColor: Colors.indigoAccent,
                    child: Text(
                      tutor.name.isNotEmpty ? tutor.name[0].toUpperCase() : '?',
                      style: GoogleFonts.outfit(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 22,
                      ),
                    ),
                  ),
                  if (tutor.isVerified)
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: Container(
                        padding: const EdgeInsets.all(2),
                        decoration: const BoxDecoration(
                            color: Color(0xFF1E293B), shape: BoxShape.circle),
                        child: const Icon(Icons.verified,
                            color: Colors.blueAccent, size: 18),
                      ),
                    ),
                  Positioned(
                    top: 0,
                    right: 0,
                    child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                            color: const Color(0xFF3B82F6),
                            borderRadius: BorderRadius.circular(8)),
                        child: Text('98% Match',
                            style: GoogleFonts.outfit(
                                color: Colors.white,
                                fontSize: 8,
                                fontWeight: FontWeight.bold))),
                  )
                ],
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            tutor.name,
                            style: GoogleFonts.outfit(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ),
                        const Icon(Icons.bookmark_border,
                            color: Colors.white54, size: 20),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      tutor.bio.isNotEmpty
                          ? tutor.bio
                          : 'Senior Software Engineer @ TechCorp', // Fallback title
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.outfit(
                        fontSize: 12,
                        color: Colors.white70,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.star_rounded,
                            color: Colors.amber, size: 16),
                        const SizedBox(width: 4),
                        Text(
                          '${tutor.rating} ',
                          style: GoogleFonts.outfit(
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                              fontSize: 12),
                        ),
                        Text(
                          '(${tutor.totalReviews} reviews)',
                          style: GoogleFonts.outfit(
                              color: Colors.white54, fontSize: 12),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Skills Chips
          SizedBox(
            height: 24,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: tutor.skills.isNotEmpty
                  ? tutor.skills
                      .take(3)
                      .map((skill) => Container(
                            margin: const EdgeInsets.only(right: 8),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              skill,
                              style: const TextStyle(
                                  color: Colors.white70, fontSize: 10),
                            ),
                          ))
                      .toList()
                  : [
                      Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(12)),
                          child: const Text('Mentorship',
                              style: TextStyle(
                                  color: Colors.white70, fontSize: 10)))
                    ],
            ),
          ),
          const SizedBox(height: 16),
          // Actions: Price & Book
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Rate',
                    style:
                        GoogleFonts.outfit(color: Colors.white54, fontSize: 10),
                  ),
                  RichText(
                    text: TextSpan(
                      children: [
                        TextSpan(
                          text: '\$${tutor.hourlyRate.toInt()}',
                          style: GoogleFonts.outfit(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        TextSpan(
                          text: '/hr',
                          style: GoogleFonts.outfit(
                            fontSize: 12,
                            color: Colors.white70,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(left: 32),
                  child: FilledButton(
                    onPressed: () {
                      // Navigate to Booking Screen
                      context
                          .push('/tutors/book'); // Assuming this route exists
                      // Or modal bottom sheet
                    },
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF3B82F6), // Azure Blue
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text('Book Session'),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.bolt, size: 12, color: Colors.greenAccent),
              const SizedBox(width: 4),
              Text('Next available: Tomorrow, 2:00 PM',
                  style: GoogleFonts.outfit(
                      color: Colors.greenAccent, fontSize: 10))
            ],
          )
        ],
      ),
    );
  }
}
