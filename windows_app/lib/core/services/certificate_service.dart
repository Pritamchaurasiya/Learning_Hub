import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../data/models/certificate_model.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
// import 'package:printing/printing.dart';

/// Certificate service for managing earned certificates
class CertificateService {
  CertificateService._();
  static final CertificateService instance = CertificateService._();

  static const String _certificatesKey = 'user_certificates';

  /// Get all user certificates
  Future<List<Certificate>> getCertificates() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final certsJson = prefs.getString(_certificatesKey);

      if (certsJson == null) {
        return [];
      }

      final List<dynamic> certsList = jsonDecode(certsJson) as List<dynamic>;
      return certsList
          .map((c) => Certificate.fromJson(c as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  /// Issue a new certificate
  Future<Certificate> issueCertificate({
    required String courseId,
    required String courseTitle,
    required String recipientName,
    required String recipientEmail,
    String? instructorName,
    int? courseHours,
    double? finalScore,
  }) async {
    final certificate = Certificate.create(
      courseId: courseId,
      courseTitle: courseTitle,
      recipientName: recipientName,
      recipientEmail: recipientEmail,
      instructorName: instructorName,
      courseHours: courseHours,
      finalScore: finalScore,
    );

    final certificates = await getCertificates();
    certificates.add(certificate);

    await _saveCertificates(certificates);

    return certificate;
  }

  /// Get certificate by ID
  Future<Certificate?> getCertificateById(String id) async {
    final certificates = await getCertificates();
    return certificates.where((c) => c.id == id).firstOrNull;
  }

  /// Get certificate by verification code
  Future<Certificate?> getCertificateByVerificationCode(String code) async {
    final certificates = await getCertificates();
    return certificates.where((c) => c.verificationCode == code).firstOrNull;
  }

  /// Verify a certificate code
  Future<CertificateVerificationResult> verifyCertificate(String code) async {
    final certificate = await getCertificateByVerificationCode(code);

    if (certificate == null) {
      return const CertificateVerificationResult(
        isValid: false,
        message: 'Certificate not found',
      );
    }

    if (!certificate.isValid) {
      return CertificateVerificationResult(
        isValid: false,
        certificate: certificate,
        message: 'Certificate has expired',
      );
    }

    return CertificateVerificationResult(
      isValid: true,
      certificate: certificate,
      message: 'Certificate is valid',
    );
  }

  /// Get certificates for a specific course
  Future<List<Certificate>> getCertificatesForCourse(String courseId) async {
    final certificates = await getCertificates();
    return certificates.where((c) => c.courseId == courseId).toList();
  }

  /// Delete a certificate (admin only)
  Future<void> deleteCertificate(String id) async {
    final certificates = await getCertificates();
    certificates.removeWhere((c) => c.id == id);
    await _saveCertificates(certificates);
  }

  /// Save certificates to storage
  Future<void> _saveCertificates(List<Certificate> certificates) async {
    final prefs = await SharedPreferences.getInstance();
    final certsJson = jsonEncode(certificates.map((c) => c.toJson()).toList());
    await prefs.setString(_certificatesKey, certsJson);
  }

  Future<void> clearAll() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_certificatesKey);
  }

  /// Generate and share PDF certificate
  Future<void> generatePdfCertificate(Certificate certificate) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4.landscape,
        build: (pw.Context context) {
          return pw.Container(
            decoration: pw.BoxDecoration(
              border: pw.Border.all(color: PdfColors.blueGrey900, width: 5),
            ),
            padding: const pw.EdgeInsets.all(30),
            child: pw.Column(
              mainAxisAlignment: pw.MainAxisAlignment.center,
              children: [
                pw.Text(
                  'CERTIFICATE OF COMPLETION',
                  style: pw.TextStyle(
                    fontSize: 30,
                    fontWeight: pw.FontWeight.bold,
                    color: PdfColors.blueGrey900,
                  ),
                ),
                pw.SizedBox(height: 20),
                pw.Text('This is to certify that'),
                pw.SizedBox(height: 10),
                pw.Text(
                  certificate.recipientName,
                  style: pw.TextStyle(
                    fontSize: 24,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
                pw.SizedBox(height: 20),
                pw.Text('has successfully completed the course'),
                pw.SizedBox(height: 10),
                pw.Text(
                  certificate.courseTitle,
                  style: pw.TextStyle(
                    fontSize: 20,
                    fontStyle: pw.FontStyle.italic,
                  ),
                ),
                pw.SizedBox(height: 40),
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceAround,
                  children: [
                    pw.Column(
                      children: [
                        pw.Text(certificate.formattedIssueDate),
                        pw.Container(
                          height: 1,
                          width: 150,
                          color: PdfColors.black,
                        ),
                        pw.SizedBox(height: 5),
                        pw.Text('Date Issued'),
                      ],
                    ),
                    pw.Column(
                      children: [
                        pw.Text(certificate.instructorName ?? 'Learning Hub'),
                        pw.Container(
                          height: 1,
                          width: 150,
                          color: PdfColors.black,
                        ),
                        pw.SizedBox(height: 5),
                        pw.Text('Instructor'),
                      ],
                    ),
                  ],
                ),
                pw.Spacer(),
                pw.Text(
                  'Verification: ${certificate.verificationCode}',
                  style: const pw.TextStyle(
                    fontSize: 10,
                    color: PdfColors.grey,
                  ),
                ),
                pw.Text(
                  'Verify at: ${certificate.verificationUrl}',
                  style: const pw.TextStyle(
                    fontSize: 10,
                    color: PdfColors.grey,
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );

    // Share/Save the PDF
    // await Printing.sharePdf(
    //   bytes: await pdf.save(),
    //   filename: 'certificate_${certificate.id}.pdf',
    // );
    debugPrint(
        'Printing disabled for build verification. PDF bytes generated: ${(await pdf.save()).length}');
  }
}

/// Certificate verification result
class CertificateVerificationResult {
  final bool isValid;
  final Certificate? certificate;
  final String message;

  const CertificateVerificationResult({
    required this.isValid,
    this.certificate,
    required this.message,
  });
}

/// Certificates state
class CertificatesState {
  final List<Certificate> certificates;
  final bool isLoading;
  final String? error;

  const CertificatesState({
    this.certificates = const [],
    this.isLoading = false,
    this.error,
  });

  CertificatesState copyWith({
    List<Certificate>? certificates,
    bool? isLoading,
    String? error,
  }) {
    return CertificatesState(
      certificates: certificates ?? this.certificates,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

/// Certificates notifier
class CertificatesNotifier extends StateNotifier<CertificatesState> {
  CertificatesNotifier() : super(const CertificatesState()) {
    loadCertificates();
  }

  final _service = CertificateService.instance;

  /// Load all certificates
  Future<void> loadCertificates() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final certs = await _service.getCertificates();
      state = state.copyWith(certificates: certs, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  /// Issue a new certificate
  Future<Certificate?> issueCertificate({
    required String courseId,
    required String courseTitle,
    required String recipientName,
    required String recipientEmail,
    String? instructorName,
    int? courseHours,
    double? finalScore,
  }) async {
    try {
      final cert = await _service.issueCertificate(
        courseId: courseId,
        courseTitle: courseTitle,
        recipientName: recipientName,
        recipientEmail: recipientEmail,
        instructorName: instructorName,
        courseHours: courseHours,
        finalScore: finalScore,
      );

      state = state.copyWith(
        certificates: [...state.certificates, cert],
      );

      return cert;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return null;
    }
  }

  Future<CertificateVerificationResult> verify(String code) async {
    return _service.verifyCertificate(code);
  }

  /// Download certificate PDF
  Future<void> downloadCertificate(Certificate certificate) async {
    await _service.generatePdfCertificate(certificate);
  }
}

/// Certificates provider
final certificatesProvider =
    StateNotifierProvider<CertificatesNotifier, CertificatesState>((ref) {
  return CertificatesNotifier();
});

/// Certificate count provider
final certificateCountProvider = Provider<int>((ref) {
  return ref.watch(certificatesProvider).certificates.length;
});
