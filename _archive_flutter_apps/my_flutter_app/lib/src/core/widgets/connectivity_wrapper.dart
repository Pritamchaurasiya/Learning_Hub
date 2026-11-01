import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:internet_connection_checker_plus/internet_connection_checker_plus.dart';

class ConnectivityWrapper extends StatefulWidget {
  const ConnectivityWrapper({super.key, required this.child});
  final Widget child;

  @override
  State<ConnectivityWrapper> createState() => _ConnectivityWrapperState();
}

class _ConnectivityWrapperState extends State<ConnectivityWrapper> {
  StreamSubscription<InternetStatus>? _subscription;
  bool _isOffline = false;

  @override
  void initState() {
    super.initState();
    _subscription = InternetConnection().onStatusChange.listen((status) {
      final isOffline = status == InternetStatus.disconnected;
      if (_isOffline != isOffline) {
        setState(() {
          _isOffline = isOffline;
        });
      }
    });
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: _isOffline ? 'Offline mode active' : 'Online',
      child: Column(
        children: [
          if (_isOffline)
            Material(
              color: Colors.redAccent,
              child: SafeArea(
                bottom: false,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.wifi_off, size: 16, color: Colors.white),
                      const SizedBox(width: 8),
                      Text(
                        'No Internet Connection',
                        style: GoogleFonts.outfit(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          Expanded(child: widget.child),
        ],
      ),
    );
  }
}
