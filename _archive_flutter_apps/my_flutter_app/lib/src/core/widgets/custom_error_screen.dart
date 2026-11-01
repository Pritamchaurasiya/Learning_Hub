import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:my_flutter_app/src/core/network/api_client.dart';

class CustomErrorScreen extends ConsumerStatefulWidget {
  const CustomErrorScreen({super.key, this.details});
  final FlutterErrorDetails? details;

  @override
  ConsumerState<CustomErrorScreen> createState() => _CustomErrorScreenState();
}

class _CustomErrorScreenState extends ConsumerState<CustomErrorScreen> {
  bool _isReporting = false;

  @override
  void initState() {
    super.initState();
    // Schedule error reporting after build
    if (kReleaseMode) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _reportError());
    }
  }

  Future<void> _reportError() async {
    if (_isReporting || widget.details == null) {
      return;
    }
    _isReporting = true;

    try {
      final apiClient = ref.read(apiClientProvider);
      await apiClient.post(
        '/core/client-errors/',
        data: {
          'error': widget.details!.exceptionAsString(),
          'stackTrace': widget.details!.stack.toString(),
          'platform': defaultTargetPlatform.name,
          'context': {
            'library': widget.details!.library,
            'summary': widget.details!.summary.toString(),
          }
        },
      );
    } on Object catch (e) {
      debugPrint('Failed to report error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        backgroundColor: const Color(0xFF0F172A),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.bug_report_rounded,
                  size: 64,
                  color: Colors.redAccent,
                ),
                const SizedBox(height: 24),
                Text(
                  'Ouch! Something went wrong.',
                  style: GoogleFonts.outfit(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                Text(
                  'We caught an unexpected error. The specialized team of monkeys has been dispatched.',
                  style: GoogleFonts.outfit(
                    fontSize: 16,
                    color: Colors.white70,
                  ),
                  textAlign: TextAlign.center,
                ),
                if (kDebugMode && widget.details != null) ...[
                  const SizedBox(height: 32),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.black38,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                          color: Colors.redAccent.withValues(alpha: 0.3)),
                    ),
                    child: SingleChildScrollView(
                      child: Text(
                        widget.details!.summary.toString(),
                        style: GoogleFonts.firaCode(
                          fontSize: 12,
                          color: Colors.red.shade200,
                        ),
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 32),
                FilledButton.icon(
                  onPressed: () {
                    // Try to recover or just reload
                    // In a real app we might restart specifically
                  },
                  icon: const Icon(Icons.refresh),
                  label: const Text('Try to Ignore It'),
                )
              ],
            ),
          ),
        ),
      ),
    );
  }
}
