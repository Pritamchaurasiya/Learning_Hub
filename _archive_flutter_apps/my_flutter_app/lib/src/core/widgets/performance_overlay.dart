import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:my_flutter_app/src/core/utils/performance_monitor.dart';

class PerformanceOverlayWidget extends StatefulWidget {
  const PerformanceOverlayWidget({super.key, required this.child});
  final Widget child;

  @override
  State<PerformanceOverlayWidget> createState() =>
      _PerformanceOverlayWidgetState();
}

class _PerformanceOverlayWidgetState extends State<PerformanceOverlayWidget> {
  final List<String> _logs = [];
  bool _isExpanded = false;
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    PerformanceMonitor().logStream.listen((log) {
      if (mounted) {
        setState(() {
          _logs.add(log);
          if (_logs.length > 50) {
            _logs.removeAt(0); // Keep last 50 logs
          }
        });
        if (_isExpanded) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (_scrollController.hasClients) {
              _scrollController.animateTo(
                _scrollController.position.maxScrollExtent,
                duration: const Duration(milliseconds: 200),
                curve: Curves.easeOut,
              );
            }
          });
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        if (kDebugMode || true) // Always show for demo (God Mode)
          Positioned(
            bottom: 50,
            right: 16,
            child: Material(
              color: Colors.transparent,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                width: _isExpanded ? 300 : 50,
                height: _isExpanded ? 200 : 50,
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.8),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                      color: Colors.greenAccent.withValues(alpha: 0.5)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.greenAccent.withValues(alpha: 0.2),
                      blurRadius: 10,
                      spreadRadius: 2,
                    )
                  ],
                ),
                child: _isExpanded
                    ? Column(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: const BoxDecoration(
                              border: Border(
                                  bottom: BorderSide(color: Colors.white24)),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  '⚡ Performance Monitor',
                                  style: TextStyle(
                                      color: Colors.greenAccent,
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold),
                                ),
                                InkWell(
                                  onTap: () =>
                                      setState(() => _isExpanded = false),
                                  child: const Icon(Icons.close,
                                      color: Colors.white, size: 16),
                                ),
                              ],
                            ),
                          ),
                          Expanded(
                            child: ListView.builder(
                              controller: _scrollController,
                              padding: const EdgeInsets.all(8),
                              itemCount: _logs.length,
                              itemBuilder: (context, index) {
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 4),
                                  child: Text(
                                    _logs[index],
                                    style: const TextStyle(
                                        color: Colors.white70,
                                        fontSize: 10,
                                        fontFamily: 'monospace'),
                                  ),
                                );
                              },
                            ),
                          ),
                        ],
                      )
                    : InkWell(
                        onTap: () => setState(() => _isExpanded = true),
                        borderRadius: BorderRadius.circular(12),
                        child: const Center(
                          child: Icon(Icons.monitor_heart,
                              color: Colors.greenAccent),
                        ),
                      ),
              ),
            ),
          ),
      ],
    );
  }
}
