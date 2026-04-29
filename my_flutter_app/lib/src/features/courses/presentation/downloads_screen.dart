import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:my_flutter_app/src/core/widgets/glass_container.dart';

class DownloadsScreen extends StatefulWidget {
  const DownloadsScreen({super.key});

  @override
  State<DownloadsScreen> createState() => _DownloadsScreenState();
}

class _DownloadsScreenState extends State<DownloadsScreen> {
  bool _smartDownloadsEnabled = true;
  String _selectedFilter = 'All';

  final List<DownloadItem> _downloads = [
    DownloadItem(
      title: 'Introduction to UX Design',
      author: 'Sarah Jenkins',
      size: '450 MB',
      duration: '12:40',
      status: DownloadStatus.completed,
      type: 'video',
      color: const Color(0xFFE0C879),
    ),
    DownloadItem(
      title: 'Advanced Python: Data Analysis',
      author: 'David Miller',
      size: '1.2 GB',
      duration: '45:10',
      status: DownloadStatus.completed,
      type: 'video',
      color: const Color(0xFF10B981),
    ),
    DownloadItem(
      title: 'Marketing 101 Cheat Sheet',
      author: 'PDF',
      size: '2 MB',
      duration: '',
      status: DownloadStatus.completed,
      type: 'document',
      color: const Color(0xFFF97316),
    ),
    DownloadItem(
      title: 'React Native Animations',
      author: 'Downloading...',
      size: '65%',
      duration: '',
      status: DownloadStatus.downloading,
      progress: 0.65,
      type: 'video',
      color: const Color(0xFF64748B),
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0F172A), Color(0xFF334155)], // Deep Slate
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              _buildAppBar(context),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    _buildStorageCard()
                        .animate()
                        .fadeIn()
                        .slideY(begin: -0.1, duration: 500.ms),
                    const SizedBox(height: 16),
                    _buildSmartDownloadsTile()
                        .animate()
                        .fadeIn(delay: 200.ms)
                        .slideX(begin: -0.1),
                    const SizedBox(height: 24),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: ['All', 'Courses', 'Videos', 'Documents']
                            .map((e) => Padding(
                                  padding: const EdgeInsets.only(right: 12),
                                  child: _buildFilterChip(e),
                                ).animate().scale(delay: 300.ms))
                            .toList(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    ..._downloads.asMap().entries.map((entry) {
                      return _buildDownloadItem(entry.value, entry.key);
                    }),
                    _buildEmptyStatePrompt().animate().fadeIn(delay: 600.ms),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAppBar(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            icon: const Icon(Icons.arrow_back_ios_new,
                size: 20, color: Colors.white),
            onPressed: () => context.pop(),
          ),
          Text(
            'Downloads',
            style: GoogleFonts.outfit(
                fontWeight: FontWeight.bold, fontSize: 20, color: Colors.white),
          ),
          TextButton(
            onPressed: () {},
            child: Text(
              'Edit',
              style: GoogleFonts.outfit(
                color: const Color(0xFF3B82F6),
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStorageCard() {
    return GlassContainer(
      opacity: 0.05,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Storage',
                style: GoogleFonts.outfit(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              Row(
                children: [
                  Text(
                    'Manage',
                    style: GoogleFonts.outfit(
                      color: const Color(0xFF3B82F6),
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                  const Icon(Icons.chevron_right,
                      color: Color(0xFF3B82F6), size: 18),
                ],
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '12.5 GB Used of 64 GB',
            style: GoogleFonts.outfit(color: Colors.grey, fontSize: 13),
          ),
          const SizedBox(height: 16),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: Row(
              children: [
                Expanded(
                  flex: 20,
                  child: Container(
                    height: 6,
                    decoration: BoxDecoration(
                      color: const Color(0xFF3B82F6),
                      borderRadius: BorderRadius.circular(4),
                      boxShadow: [
                        BoxShadow(
                            color:
                                const Color(0xFF3B82F6).withValues(alpha: 0.5),
                            blurRadius: 6)
                      ],
                    ),
                  ),
                ),
                Expanded(
                  flex: 80,
                  child: Container(
                    height: 6,
                    color: Colors.white.withValues(alpha: 0.1),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _buildLegendDot(const Color(0xFF3B82F6), 'LearningHub (12.5 GB)'),
              const Spacer(),
              _buildLegendDot(Colors.white.withValues(alpha: 0.2), 'Other'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLegendDot(Color color, String label) {
    return Row(
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 8),
        Text(
          label,
          style: GoogleFonts.outfit(color: Colors.grey, fontSize: 12),
        ),
      ],
    );
  }

  Widget _buildSmartDownloadsTile() {
    return GlassContainer(
      opacity: 0.05,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFF3B82F6).withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.wifi, color: Color(0xFF3B82F6), size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Smart Downloads',
                  style: GoogleFonts.outfit(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
                Text(
                  'Next ep. via WiFi only',
                  style: GoogleFonts.outfit(color: Colors.grey, fontSize: 12),
                ),
              ],
            ),
          ),
          Switch.adaptive(
            value: _smartDownloadsEnabled,
            activeTrackColor: const Color(0xFF3B82F6),
            onChanged: (val) => setState(() => _smartDownloadsEnabled = val),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label) {
    final isSelected = _selectedFilter == label;
    return GestureDetector(
      onTap: () => setState(() => _selectedFilter = label),
      child: AnimatedContainer(
        duration: 300.ms,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFF3B82F6)
              : Colors.white.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
              color: isSelected
                  ? Colors.transparent
                  : Colors.white.withValues(alpha: 0.1)),
        ),
        child: Text(
          label,
          style: GoogleFonts.outfit(
            color: isSelected ? Colors.white : Colors.grey,
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
      ),
    );
  }

  Widget _buildDownloadItem(DownloadItem item, int index) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GlassContainer(
        opacity: 0.03,
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              width: 70,
              height: 70,
              decoration: BoxDecoration(
                color: item.color.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: item.color.withValues(alpha: 0.3)),
              ),
              child: item.status == DownloadStatus.downloading
                  ? Stack(
                      alignment: Alignment.center,
                      children: [
                        CircularProgressIndicator(
                          value: item.progress,
                          color: item.color,
                          strokeWidth: 3,
                        ),
                        if (item.type == 'video')
                          Icon(Icons.pause, color: item.color, size: 20),
                      ],
                    )
                  : Center(
                      child: item.type == 'document'
                          ? Icon(Icons.picture_as_pdf,
                              color: item.color, size: 28)
                          : Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.play_circle_outline,
                                    color: item.color, size: 24),
                                const SizedBox(height: 2),
                                Text(
                                  item.duration,
                                  style: GoogleFonts.outfit(
                                    color: item.color,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 10,
                                  ),
                                ),
                              ],
                            ),
                    ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title,
                    style: GoogleFonts.outfit(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${item.author} • ${item.size}',
                    style: GoogleFonts.outfit(color: Colors.grey, fontSize: 13),
                  ),
                  if (item.status == DownloadStatus.downloading) ...[
                    const SizedBox(height: 4),
                    Text(
                      'Downloading...',
                      style: GoogleFonts.outfit(
                        color: const Color(0xFF3B82F6),
                        fontSize: 12,
                      ),
                    ),
                  ] else if (item.status == DownloadStatus.completed) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.check_circle_outline,
                            color: Color(0xFF10B981), size: 12),
                        const SizedBox(width: 4),
                        Text(
                          'Downloaded',
                          style: GoogleFonts.outfit(
                            color: const Color(0xFF10B981),
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            if (item.status == DownloadStatus.completed)
              IconButton(
                icon: Icon(
                  Icons.play_arrow_rounded,
                  color: Colors.white.withValues(alpha: 0.8),
                  size: 28,
                ),
                onPressed: () {},
              ),
            IconButton(
              icon: Icon(Icons.more_vert,
                  color: Colors.white.withValues(alpha: 0.5)),
              onPressed: () {},
            ),
          ],
        ),
      ),
    ).animate().fadeIn(delay: (index * 100).ms).slideX(begin: 0.1);
  }

  Widget _buildEmptyStatePrompt() {
    return Container(
      margin: const EdgeInsets.only(top: 24, bottom: 40),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Icon(Icons.cloud_download_outlined,
              size: 40, color: Colors.grey[600]),
          const SizedBox(height: 12),
          Text(
            'Save more courses for offline learning',
            style: GoogleFonts.outfit(color: Colors.grey),
          ),
          const SizedBox(height: 12),
          OutlinedButton(
            onPressed: () => context.go('/courses'),
            style: OutlinedButton.styleFrom(
              side: BorderSide(color: Colors.white.withValues(alpha: 0.2)),
            ),
            child: Text(
              'Browse Catalog',
              style: GoogleFonts.outfit(
                  fontWeight: FontWeight.bold, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }
}

enum DownloadStatus { completed, downloading, paused }

class DownloadItem {
  DownloadItem({
    required this.title,
    required this.author,
    required this.size,
    required this.duration,
    required this.status,
    required this.type,
    required this.color,
    this.progress = 0.0,
  });
  final String title;
  final String author;
  final String size;
  final String duration;
  final DownloadStatus status;
  final String type; // video, document
  final Color color;
  final double progress;
}
