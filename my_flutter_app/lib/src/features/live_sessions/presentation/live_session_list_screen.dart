import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../data/live_session_repository.dart';
import '../domain/live_session_model.dart';

class LiveSessionListScreen extends ConsumerStatefulWidget {
  const LiveSessionListScreen({super.key});

  @override
  ConsumerState<LiveSessionListScreen> createState() =>
      _LiveSessionListScreenState();
}

class _LiveSessionListScreenState extends ConsumerState<LiveSessionListScreen> {
  List<LiveSession> _sessions = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchSessions();
  }

  Future<void> _fetchSessions() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final sessions =
          await ref.read(liveSessionRepositoryProvider).getUpcomingSessions();
      setState(() {
        _sessions = sessions;
        _isLoading = false;
      });
    } on Exception catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _joinSession(LiveSession session) async {
    try {
      final result = await ref
          .read(liveSessionRepositoryProvider)
          .joinSession(session.id.toString());
      final meetingUrl = result['meeting_url'] as String?;
      if (meetingUrl != null && meetingUrl.isNotEmpty) {
        final uri = Uri.parse(meetingUrl);
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        }
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content:
                Text(result['message'] as String? ?? 'Joined successfully'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } on Exception catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Live Sessions'),
        backgroundColor: Colors.deepPurple,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchSessions,
          ),
        ],
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Colors.deepPurple.shade50, Colors.white],
          ),
        ),
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: Colors.red.shade300),
            const SizedBox(height: 16),
            Text('Failed to load sessions',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            ElevatedButton.icon(
              onPressed: _fetchSessions,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      );
    }
    if (_sessions.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.live_tv_outlined, size: 80, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            Text('No upcoming sessions',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text('Check back later for live classes!',
                style: Theme.of(context).textTheme.bodyMedium),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchSessions,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _sessions.length,
        itemBuilder: (context, index) => _buildSessionCard(_sessions[index]),
      ),
    );
  }

  Widget _buildSessionCard(LiveSession session) {
    final isLive = session.isLive;
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: isLive ? 8 : 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: isLive
            ? const BorderSide(color: Colors.red, width: 2)
            : BorderSide.none,
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => _joinSession(session),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  if (isLive)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.red,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                                color: Colors.white, shape: BoxShape.circle),
                          ),
                          const SizedBox(width: 4),
                          const Text('LIVE',
                              style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 10)),
                        ],
                      ),
                    ),
                  if (isLive) const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      session.title,
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                session.description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context)
                    .textTheme
                    .bodyMedium
                    ?.copyWith(color: Colors.grey.shade600),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Icon(Icons.person, size: 16, color: Colors.grey.shade600),
                  const SizedBox(width: 4),
                  Text(session.hostName,
                      style: TextStyle(color: Colors.grey.shade600)),
                  const Spacer(),
                  Icon(Icons.people, size: 16, color: Colors.grey.shade600),
                  const SizedBox(width: 4),
                  Text('${session.attendeeCount} attending',
                      style: TextStyle(color: Colors.grey.shade600)),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(Icons.schedule,
                      size: 16, color: Colors.deepPurple.shade300),
                  const SizedBox(width: 4),
                  Text(
                    _formatDateTime(session.scheduledTime),
                    style: TextStyle(
                        color: Colors.deepPurple.shade400,
                        fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(width: 16),
                  Icon(Icons.timer, size: 16, color: Colors.grey.shade600),
                  const SizedBox(width: 4),
                  Text('${session.durationMinutes} min',
                      style: TextStyle(color: Colors.grey.shade600)),
                ],
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => _joinSession(session),
                  icon: Icon(
                      isLive ? Icons.play_arrow : Icons.notifications_active),
                  label: Text(isLive
                      ? 'Join Now'
                      : (session.isAttending ? 'Registered' : 'Join Session')),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isLive ? Colors.red : Colors.deepPurple,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDateTime(DateTime dt) {
    final now = DateTime.now();
    final diff = dt.difference(now);

    if (diff.isNegative) {
      return 'Started ${-diff.inMinutes} min ago';
    }
    if (diff.inMinutes < 60) {
      return 'Starts in ${diff.inMinutes} min';
    }
    if (diff.inHours < 24) {
      return 'Starts in ${diff.inHours}h';
    }
    return '${dt.day}/${dt.month} at ${dt.hour}:${dt.minute.toString().padLeft(2, '0')}';
  }
}
