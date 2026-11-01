import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../core/providers/connectivity_provider.dart';
import '../../core/theme/app_colors.dart';

/// Animated connectivity banner that slides in when offline and out when back online
class ConnectivityBanner extends ConsumerStatefulWidget {
  const ConnectivityBanner({super.key});

  @override
  ConsumerState<ConnectivityBanner> createState() => _ConnectivityBannerState();
}

class _ConnectivityBannerState extends ConsumerState<ConnectivityBanner> {
  bool _showBanner = false;
  bool _wasOffline = false;
  bool _showOnlineMessage = false;

  @override
  Widget build(BuildContext context) {
    ref.listen<NetworkStatus>(connectivityProvider, (previous, next) {
      if (next == NetworkStatus.offline) {
        setState(() {
          _showBanner = true;
          _wasOffline = true;
          _showOnlineMessage = false;
        });
      } else if (next == NetworkStatus.online && _wasOffline) {
        setState(() {
          _showOnlineMessage = true;
        });
        // Auto-dismiss after 3 seconds
        Future.delayed(const Duration(seconds: 3), () {
          if (mounted) {
            setState(() {
              _showBanner = false;
              _showOnlineMessage = false;
              _wasOffline = false;
            });
          }
        });
      }
    });

    if (!_showBanner) return const SizedBox.shrink();

    final isOnline = _showOnlineMessage;

    return AnimatedSlide(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
      offset: _showBanner ? Offset.zero : const Offset(0, -1),
      child: Material(
        elevation: 4,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 400),
          width: double.infinity,
          padding: EdgeInsets.only(
            top: MediaQuery.of(context).padding.top + 8,
            bottom: 10,
            left: 16,
            right: 16,
          ),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: isOnline
                  ? [const Color(0xFF00C853), const Color(0xFF69F0AE)]
                  : [AppColors.error, const Color(0xFFEF5350)],
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                isOnline ? Icons.wifi : Icons.wifi_off,
                color: Colors.white,
                size: 18,
              ),
              const SizedBox(width: 8),
              Text(
                isOnline ? 'Back online' : 'No internet connection',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
              if (!isOnline) ...[
                const SizedBox(width: 8),
                const SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white70),
                  ),
                ),
              ],
            ],
          ).animate().fadeIn(duration: 300.ms),
        ),
      ),
    );
  }
}
