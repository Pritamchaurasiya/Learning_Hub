import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:google_fonts/google_fonts.dart';

class AiResponseCard extends StatelessWidget {
  const AiResponseCard({
    super.key,
    required this.content,
    this.options,
  });

  final String content;
  final List<String>? options;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 8),
        constraints: const BoxConstraints(maxWidth: 320),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Avatar & Name
            Row(
              children: [
                const CircleAvatar(
                    radius: 12,
                    backgroundColor: Color(0xFF7C3AED),
                    child: Icon(Icons.auto_awesome,
                        size: 14, color: Colors.white)),
                const SizedBox(width: 8),
                Text(
                  'LearningHub AI',
                  style: GoogleFonts.outfit(
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(width: 4),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.purple.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text('Tutor',
                      style: TextStyle(
                          fontSize: 8,
                          color: Colors.purple[700],
                          fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Text Content
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(4),
                  topRight: Radius.circular(20),
                  bottomLeft: Radius.circular(20),
                  bottomRight: Radius.circular(20),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.02),
                    blurRadius: 5,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: MarkdownBody(
                data: content,
                styleSheet: MarkdownStyleSheet(
                  p: GoogleFonts.outfit(
                    color: Colors.black87,
                    height: 1.5,
                    fontSize: 14,
                  ),
                  code: GoogleFonts.firaCode(
                    backgroundColor: const Color(0xFFF1F5F9),
                    color: const Color(0xFFC026D3),
                    fontSize: 13,
                  ),
                  codeblockDecoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
            ),

            // Suggested Chips
            if (options != null)
              Padding(
                padding: const EdgeInsets.only(top: 8, left: 4),
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: options!
                      .map((opt) => ActionChip(
                            label: Text(opt),
                            labelStyle: GoogleFonts.outfit(
                                fontSize: 12, color: const Color(0xFF4F46E5)),
                            backgroundColor: const Color(0xFFEEF2FF),
                            side: BorderSide.none,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(20)),
                            onPressed: () {},
                            avatar: const Icon(Icons.auto_awesome,
                                size: 12, color: Color(0xFF4F46E5)),
                          ))
                      .toList()
                      .animate(interval: 100.ms)
                      .fadeIn(),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
