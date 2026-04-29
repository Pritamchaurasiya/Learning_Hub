import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

class TimelineView extends StatelessWidget {
  const TimelineView({super.key});

  @override
  Widget build(BuildContext context) {
    // Colors from the design (Dark Theme adaptation)
    const kCardColor = Color(0xFF1E2746);
    const kPrimaryColor = Color(0xFF3B82F6);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Dark Background
      appBar: AppBar(
        title: const Text('Reminders & Schedule',
            style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
              onPressed: () {}, icon: const Icon(Icons.notifications_active)),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Search Bar
            TextField(
              decoration: InputDecoration(
                filled: true,
                fillColor: kCardColor,
                prefixIcon: const Icon(Icons.search, color: Colors.grey),
                hintText: 'Search tasks, quizzes, classes...',
                hintStyle: const TextStyle(color: Colors.grey),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildChip('All', true),
                  _buildChip('Deadlines', false),
                  _buildChip('Live Classes', false),
                  _buildChip('Group Study', false),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Overdue Alert Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF3F1518), // Dark Red
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.red.withValues(alpha: 0.2),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.warning, color: Colors.red),
                  ),
                  const SizedBox(width: 16),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Overdue: Macroeconomics Quiz',
                            style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold)),
                        Text('Due yesterday at 11:59 PM • Est. 45 min',
                            style: TextStyle(color: Colors.grey, fontSize: 12)),
                      ],
                    ),
                  ),
                  ElevatedButton(
                    style:
                        ElevatedButton.styleFrom(backgroundColor: Colors.red),
                    onPressed: () {},
                    child: const Text('Catch Up'),
                  )
                ],
              ),
            ).animate().slideX(),
            const SizedBox(height: 16),

            // Streak Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [kCardColor, kCardColor.withValues(alpha: 0.8)],
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  const Icon(Icons.local_fire_department, color: Colors.orange),
                  const SizedBox(width: 8),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('3 Day Streak',
                          style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 18)),
                      Text('Complete 1 more lesson to hit your weekly goal',
                          style: TextStyle(color: Colors.grey, fontSize: 12)),
                    ],
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: const BoxDecoration(
                      color: Colors.orange,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.emoji_events, color: Colors.white),
                  )
                ],
              ),
            ).animate().slideX(delay: 100.ms),

            const SizedBox(height: 24),

            // "Timeline" Header with Dropdown
            const Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Timeline',
                    style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold)),
                Text('September 2023', style: TextStyle(color: kPrimaryColor)),
              ],
            ),
            const SizedBox(height: 16),

            // Horizontal Date Strip (Mock)
            SizedBox(
              height: 80,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: 7,
                itemBuilder: (context, index) {
                  final isSelected = index == 1; // "Tue 12" selected in design
                  return Container(
                    margin: const EdgeInsets.only(right: 12),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: isSelected ? kPrimaryColor : kCardColor,
                      borderRadius: BorderRadius.circular(24),
                      border:
                          isSelected ? null : Border.all(color: Colors.white10),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                            [
                              'MON',
                              'TUE',
                              'WED',
                              'THU',
                              'FRI',
                              'SAT',
                              'SUN'
                            ][index],
                            style: TextStyle(
                              fontSize: 10,
                              color: isSelected ? Colors.white : Colors.grey,
                            )),
                        const SizedBox(height: 4),
                        Text(
                          '${11 + index}',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: isSelected ? Colors.white : Colors.white70,
                          ),
                        ),
                        if (isSelected)
                          Container(
                            margin: const EdgeInsets.only(top: 4),
                            width: 4,
                            height: 4,
                            decoration: const BoxDecoration(
                                color: Colors.white, shape: BoxShape.circle),
                          )
                      ],
                    ),
                  );
                },
              ),
            ),

            const SizedBox(height: 24),
            const Text('TODAY',
                style: TextStyle(
                    color: Colors.grey,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.2)),
            const SizedBox(height: 16),

            // Today's Items
            _buildTimelineItem(
              time: 'NOW',
              title: 'Live Class: Data Science',
              subtitle: '4:00 PM - 5:30 PM',
              icon: Icons.videocam,
              color: kPrimaryColor,
              isNow: true,
            ),
            _buildTimelineItem(
              time: '8:00 PM',
              title: 'Group Study: UX Principles',
              subtitle: '3 Members',
              icon: Icons.group,
              color: Colors.purple,
            ),
            _buildTimelineItem(
              time: '15 mins',
              title: 'Reading: Chapter 4',
              subtitle: 'Estimated time',
              icon: Icons.book,
              color: Colors.teal,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildChip(String label, bool isSelected) {
    return Container(
      margin: const EdgeInsets.only(right: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: isSelected ? const Color(0xFF3B82F6) : const Color(0xFF1E2746),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(label, style: const TextStyle(color: Colors.white)),
    );
  }

  Widget _buildTimelineItem(
      {required String time,
      required String title,
      required String subtitle,
      required IconData icon,
      required Color color,
      bool isNow = false}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E2746),
        borderRadius: BorderRadius.circular(16),
        border: isNow ? Border.all(color: color, width: 1.5) : null,
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(title,
                        style: const TextStyle(
                            color: Colors.white, fontWeight: FontWeight.bold)),
                    if (isNow)
                      Container(
                        margin: const EdgeInsets.only(left: 8),
                        width: 6,
                        height: 6,
                        decoration: const BoxDecoration(
                            color: Colors.red, shape: BoxShape.circle),
                      )
                  ],
                ),
                const SizedBox(height: 4),
                Text(subtitle,
                    style: const TextStyle(color: Colors.grey, fontSize: 12)),
              ],
            ),
          ),
          if (isNow)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8)),
              child: Text(time,
                  style: TextStyle(
                      color: color, fontSize: 10, fontWeight: FontWeight.bold)),
            )
        ],
      ),
    ).animate().fadeIn().slideX();
  }
}
