import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart'; // For kIsWeb
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';
import '../../core/theme/app_colors.dart';
import '../../core/services/certificate_service.dart';
import '../../data/models/certificate_model.dart';
import '../../shared/widgets/app_feedback.dart';

/// Certificates screen displaying earned certificates
class CertificatesScreen extends ConsumerWidget {
  const CertificatesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final certificatesState = ref.watch(certificatesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Certificates'),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner),
            onPressed: () => _showVerifyDialog(context, ref),
            tooltip: 'Verify Certificate',
          ),
        ],
      ),
      body: certificatesState.isLoading
          ? const Center(child: CircularProgressIndicator())
          : certificatesState.certificates.isEmpty
              ? _EmptyCertificates()
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: certificatesState.certificates.length,
                  itemBuilder: (context, index) {
                    return _CertificateCard(
                      certificate: certificatesState.certificates[index],
                    )
                        .animate()
                        .fadeIn(delay: (100 * index).ms, duration: 400.ms);
                  },
                ),
    );
  }

  void _showVerifyDialog(BuildContext context, WidgetRef ref) {
    final controller = TextEditingController();

    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Verify Certificate'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Enter the verification code to verify a certificate:'),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              decoration: const InputDecoration(
                labelText: 'Verification Code',
                hintText: 'e.g., ABCD-1234-EFGH',
                border: OutlineInputBorder(),
              ),
              textCapitalization: TextCapitalization.characters,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              final code = controller.text.trim();
              if (code.isEmpty) {
                return;
              }

              Navigator.pop(context);

              final result =
                  await ref.read(certificatesProvider.notifier).verify(code);
              if (context.mounted) {
                _showVerificationResult(context, result);
              }
            },
            child: const Text('Verify'),
          ),
        ],
      ),
    );
  }

  void _showVerificationResult(
      BuildContext context, CertificateVerificationResult result) {
    final theme = Theme.of(context);

    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        icon: Icon(
          result.isValid ? Icons.verified : Icons.error,
          size: 48,
          color: result.isValid ? AppColors.success : AppColors.error,
        ),
        title:
            Text(result.isValid ? 'Certificate Valid' : 'Verification Failed'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(result.message),
            if (result.certificate != null) ...[
              const SizedBox(height: 16),
              Text(
                result.certificate!.courseTitle,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text('Issued to: ${result.certificate!.recipientName}'),
              Text('Date: ${result.certificate!.formattedIssueDate}'),
            ],
          ],
        ),
        actions: [
          FilledButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }
}

/// Empty state for no certificates
class _EmptyCertificates extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.workspace_premium_outlined,
                size: 60,
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'No Certificates Yet',
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Complete courses to earn certificates that showcase your achievements.',
              style: theme.textTheme.bodyLarge?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: () {
                // Navigate to courses
              },
              icon: const Icon(Icons.school),
              label: const Text('Browse Courses'),
            ),
          ],
        ),
      ),
    );
  }
}

/// Certificate card widget
class _CertificateCard extends ConsumerWidget {
  final Certificate certificate;

  const _CertificateCard({required this.certificate});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => _showCertificateDetails(context, ref),
        child: Column(
          children: [
            // Certificate Header with gradient
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                gradient: AppColors.primaryGradient,
              ),
              child: Row(
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.workspace_premium,
                      color: Colors.white,
                      size: 32,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Certificate of Completion',
                          style: theme.textTheme.labelMedium?.copyWith(
                            color: Colors.white70,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          certificate.courseTitle,
                          style: theme.textTheme.titleMedium?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Certificate Details
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _DetailRow(
                    icon: Icons.person_outline,
                    label: 'Issued to',
                    value: certificate.recipientName,
                  ),
                  const SizedBox(height: 8),
                  _DetailRow(
                    icon: Icons.calendar_today_outlined,
                    label: 'Issue Date',
                    value: certificate.formattedIssueDate,
                  ),
                  if (certificate.instructorName != null) ...[
                    const SizedBox(height: 8),
                    _DetailRow(
                      icon: Icons.school_outlined,
                      label: 'Instructor',
                      value: certificate.instructorName!,
                    ),
                  ],
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () =>
                              _showCertificateDetails(context, ref),
                          icon: const Icon(Icons.visibility),
                          label: const Text('View'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: () => _shareCertificate(context),
                          icon: const Icon(Icons.share),
                          label: const Text('Share'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showCertificateDetails(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.9,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) => SingleChildScrollView(
          controller: scrollController,
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              // Handle
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: theme.colorScheme.outlineVariant,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 24),

              // Certificate Preview Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF1a1a2e), Color(0xFF16213e)],
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: AppColors.gold.withValues(alpha: 0.5),
                    width: 2,
                  ),
                ),
                child: Column(
                  children: [
                    const Icon(
                      Icons.workspace_premium,
                      color: AppColors.gold,
                      size: 48,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'CERTIFICATE OF COMPLETION',
                      style: theme.textTheme.labelLarge?.copyWith(
                        color: AppColors.gold,
                        letterSpacing: 2,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'This is to certify that',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: Colors.white70,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      certificate.recipientName,
                      style: theme.textTheme.headlineSmall?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'has successfully completed',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: Colors.white70,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      certificate.courseTitle,
                      style: theme.textTheme.titleLarge?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    if (certificate.instructorName != null) ...[
                      const SizedBox(height: 16),
                      Text(
                        'Instructor: ${certificate.instructorName}',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: Colors.white70,
                        ),
                      ),
                    ],
                    const SizedBox(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Issued: ${certificate.formattedIssueDate}',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: Colors.white60,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Container(
                          width: 4,
                          height: 4,
                          decoration: const BoxDecoration(
                            color: Colors.white60,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Text(
                          'ID: ${certificate.id.substring(0, 20)}...',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: Colors.white60,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // QR Code
              Text(
                'Verification QR Code',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: QrImageView(
                  data: certificate.verificationUrl,
                  version: QrVersions.auto,
                  size: 180,
                ),
              ),
              const SizedBox(height: 12),
              SelectableText(
                certificate.verificationCode,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontFamily: 'monospace',
                  letterSpacing: 2,
                ),
              ),

              const SizedBox(height: 24),

              // Actions
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        try {
                          await ref
                              .read(certificatesProvider.notifier)
                              .downloadCertificate(certificate);
                        } catch (e) {
                          if (context.mounted) {
                            AppFeedback.showError(
                                context, 'Error downloading certificate: $e');
                          }
                        }
                      },
                      icon: const Icon(Icons.download),
                      label: const Text('Download PDF'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () => _shareCertificate(context),
                      icon: const Icon(Icons.share),
                      label: const Text('Share'),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  void _shareCertificate(BuildContext context) {
    if (kIsWeb) {
      // Show snackbar for web sharing limitation if needed, or implement web sharing
      // For now share_plus works on web too usually
    }
    SharePlus.instance.share(
      ShareParams(
        text:
            'I earned a certificate for completing "${certificate.courseTitle}" on LearningHub! 🎓\n\n'
            'Verify at: ${certificate.verificationUrl}',
        subject: 'My LearningHub Certificate',
      ),
    );
  }
}

/// Detail row widget
class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _DetailRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        Icon(icon, size: 18, color: theme.colorScheme.onSurfaceVariant),
        const SizedBox(width: 8),
        Text(
          '$label: ',
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }
}
