import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:my_flutter_app/src/features/courses/data/course_repository.dart';
import 'package:my_flutter_app/src/features/courses/domain/certificate_model.dart';
import 'package:url_launcher/url_launcher.dart';

final certificatesProvider = FutureProvider<List<Certificate>>((ref) async {
  final result = await ref.read(courseRepositoryProvider).getCertificates();
  return result.fold(
    (failure) => throw failure,
    (certs) => certs,
  );
});

class CertificatesScreen extends ConsumerWidget {
  const CertificatesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final certificatesAsync = ref.watch(certificatesProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: Text('My Certificates',
            style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: certificatesAsync.when(
        data: (certificates) {
          if (certificates.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.workspace_premium_outlined,
                      color: Colors.grey, size: 64),
                  const SizedBox(height: 16),
                  Text('No certificates yet',
                      style: GoogleFonts.outfit(
                          color: Colors.white, fontSize: 18)),
                  const SizedBox(height: 8),
                  Text('Complete courses to earn certificates!',
                      style: GoogleFonts.outfit(color: Colors.grey)),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () => ref.refresh(certificatesProvider.future),
            child: GridView.builder(
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 1.4, // Card shape
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
              ),
              itemCount: certificates.length,
              itemBuilder: (context, index) {
                final cert = certificates[index];
                return _CertificateCard(certificate: cert)
                    .animate(delay: (100 * index).ms)
                    .fadeIn()
                    .slideY(begin: 0.1);
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(
            child:
                Text('Error: $err', style: const TextStyle(color: Colors.red))),
      ),
    );
  }
}

class _CertificateCard extends StatelessWidget {
  const _CertificateCard({required this.certificate});
  final Certificate certificate;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white10),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            flex: 3,
            child: Container(
              decoration: const BoxDecoration(
                color: Color(0xFF334155),
                borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
              ),
              child: const Center(
                child: Icon(Icons.workspace_premium,
                    size: 48, color: Colors.amber),
              ),
            ),
          ),
          Expanded(
            flex: 2,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    certificate.courseTitle,
                    style: GoogleFonts.outfit(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        _formatDate(certificate.issuedAt),
                        style:
                            const TextStyle(color: Colors.grey, fontSize: 10),
                      ),
                      InkWell(
                        onTap: () {
                          if (certificate.fileUrl != null) {
                            launchUrl(Uri.parse(certificate.fileUrl!));
                          } else {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                  content: Text('Certificate file not ready')),
                            );
                          }
                        },
                        child: const Icon(Icons.download_rounded,
                            color: Colors.blueAccent, size: 20),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}
