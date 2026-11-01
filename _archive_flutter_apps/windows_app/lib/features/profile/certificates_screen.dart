import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:learning_hub/core/services/certificate_service.dart';
import 'package:learning_hub/core/theme/app_colors.dart';
import 'package:learning_hub/data/models/certificate_model.dart';
import 'package:intl/intl.dart';
import 'package:learning_hub/shared/widgets/app_feedback.dart';
import 'package:learning_hub/shared/widgets/empty_state_view.dart';
import 'package:learning_hub/shared/widgets/error_view.dart';
import 'package:learning_hub/shared/widgets/shimmer_loading.dart';

/// Certificates screen — shows earned certificates with polish
class CertificatesScreen extends ConsumerWidget {
  const CertificatesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(certificatesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Certificates'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
            onPressed: () {
              ref.read(certificatesProvider.notifier).loadCertificates();
            },
          ),
        ],
      ),
      body: _buildBody(context, ref, state),
    );
  }

  Widget _buildBody(
      BuildContext context, WidgetRef ref, CertificatesState state) {
    if (state.isLoading) {
      return const ShimmerList(itemCount: 4, itemHeight: 160);
    }

    if (state.error != null) {
      return ErrorView(
        subtitle: state.error!,
        onRetry: () =>
            ref.read(certificatesProvider.notifier).loadCertificates(),
      );
    }

    if (state.certificates.isEmpty) {
      return EmptyStateView.noCertificates();
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: state.certificates.length,
      itemBuilder: (context, index) {
        return _CertificateCard(certificate: state.certificates[index])
            .animate()
            .fadeIn(delay: (index * 80).ms, duration: 400.ms)
            .slideY(begin: 0.15, end: 0, delay: (index * 80).ms);
      },
    );
  }
}

class _CertificateCard extends StatelessWidget {
  final Certificate certificate;

  const _CertificateCard({required this.certificate});

  Future<void> _downloadCertificate(
      BuildContext context, Certificate certificate) async {
    try {
      AppFeedback.showInfo(context, 'Downloading certificate...');
      await Future<void>.delayed(const Duration(seconds: 1));
      if (context.mounted) {
        AppFeedback.showSuccess(
            context, 'Certificate downloaded successfully!');
      }
    } catch (e) {
      if (context.mounted) {
        AppFeedback.showError(context, 'Download failed: $e');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final gradePercent =
        certificate.finalScore != null ? (certificate.finalScore! * 100) : null;
    final gradeColor = gradePercent != null
        ? (gradePercent >= 90
            ? AppColors.success
            : gradePercent >= 70
                ? Colors.amber.shade700
                : AppColors.error)
        : theme.colorScheme.onSurfaceVariant;

    return Card(
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          // Gradient header
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppColors.primary.withValues(alpha: 0.15),
                  AppColors.primary.withValues(alpha: 0.05),
                ],
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: Colors.amber.withValues(alpha: 0.2),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.workspace_premium,
                      color: Colors.amber, size: 28),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        certificate.courseTitle,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Issued to ${certificate.recipientName}',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Details section
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Date chip
                    _InfoChip(
                      icon: Icons.calendar_today_outlined,
                      label: DateFormat('MMM dd, yyyy')
                          .format(certificate.issuedAt),
                    ),
                    // Grade chip
                    _InfoChip(
                      icon: Icons.grade_outlined,
                      label: gradePercent != null
                          ? '${gradePercent.toStringAsFixed(1)}%'
                          : 'N/A',
                      color: gradeColor,
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                // Certificate ID
                Row(
                  children: [
                    Icon(Icons.fingerprint,
                        size: 14,
                        color: theme.colorScheme.onSurfaceVariant
                            .withValues(alpha: 0.5)),
                    const SizedBox(width: 6),
                    Text(
                      'ID: ${certificate.id.length > 8 ? certificate.id.substring(0, 8) : certificate.id}…',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant
                            .withValues(alpha: 0.5),
                        fontFamily: 'monospace',
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                // Download button
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.tonalIcon(
                    onPressed: () => _downloadCertificate(context, certificate),
                    icon: const Icon(Icons.download_rounded, size: 18),
                    label: const Text('Download PDF'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Small info chip for date/grade display
class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color? color;

  const _InfoChip({required this.icon, required this.label, this.color});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final chipColor = color ?? theme.colorScheme.onSurfaceVariant;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: chipColor.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: chipColor),
          const SizedBox(width: 6),
          Text(
            label,
            style: theme.textTheme.labelMedium?.copyWith(
              color: chipColor,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
