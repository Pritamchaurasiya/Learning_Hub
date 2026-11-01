import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:google_fonts/google_fonts.dart';

class AiSummaryCard extends StatelessWidget {
  const AiSummaryCard({
    super.key,
    required this.summary,
    required this.keyTakeaways,
    this.relatedQuestion,
    this.onRelatedQuestionTap,
  });

  final String summary;
  final List<String> keyTakeaways;
  final String? relatedQuestion;
  final VoidCallback? onRelatedQuestionTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF7C3AED).withAlpha(77)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF7C3AED).withAlpha(13),
            blurRadius: 10,
            spreadRadius: 1,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: const BoxDecoration(
                  color: Color(0xFF7C3AED),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.auto_awesome,
                    color: Colors.white, size: 14),
              ),
              const SizedBox(width: 8),
              Text(
                'AI Tutor Insights',
                style: GoogleFonts.outfit(
                  color: const Color(0xFFC4B5FD),
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'DISCUSSION SUMMARY',
            style: GoogleFonts.outfit(
                color: Colors.grey, fontSize: 10, letterSpacing: 1),
          ),
          const SizedBox(height: 4),
          // Use MarkdownBody for rich text rendering
          MarkdownBody(
            data: summary,
            styleSheet: MarkdownStyleSheet(
              p: GoogleFonts.outfit(color: Colors.white, height: 1.5),
              strong: GoogleFonts.outfit(
                  color: Colors.white, fontWeight: FontWeight.bold),
            ),
          ),
          if (keyTakeaways.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text(
              'DIVE DEEPER',
              style: GoogleFonts.outfit(
                  color: Colors.grey, fontSize: 10, letterSpacing: 1),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: keyTakeaways
                  .map((takeaway) => Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFF7C3AED).withAlpha(26),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                              color: const Color(0xFF7C3AED).withAlpha(51)),
                        ),
                        child: Text(
                          takeaway,
                          style: GoogleFonts.outfit(
                              color: const Color(0xFFC4B5FD), fontSize: 11),
                        ),
                      ))
                  .toList(),
            ),
            const SizedBox(height: 16),
            if (relatedQuestion != null)
              InkWell(
                onTap: onRelatedQuestionTap,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      relatedQuestion!,
                      style: const TextStyle(
                          color: Color(0xFF3B82F6), fontSize: 12),
                    ),
                    const SizedBox(width: 4),
                    const Icon(Icons.arrow_forward,
                        size: 12, color: Color(0xFF3B82F6))
                  ],
                ),
              ),
          ],
        ],
      ),
    );
  }
}

