import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:my_flutter_app/src/features/support/data/support_repository.dart';

final myTicketsProvider = FutureProvider.autoDispose((ref) {
  return ref.watch(supportRepositoryProvider).getMyTickets();
});

class SupportScreen extends ConsumerStatefulWidget {
  const SupportScreen({super.key});

  @override
  ConsumerState<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends ConsumerState<SupportScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _formKey = GlobalKey<FormState>();

  String _category = 'general';
  final _subjectController = TextEditingController();
  final _messageController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _subjectController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _submitTicket() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final data = {
        'category': _category,
        'subject': _subjectController.text,
        'message': _messageController.text,
      };

      await ref.read(supportRepositoryProvider).createTicket(data);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Ticket submitted successfully!')),
        );
        _subjectController.clear();
        _messageController.clear();
        _tabController.animateTo(1); // Switch to My Tickets
        final _ = ref.refresh(myTicketsProvider);
      }
    } on Exception catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: Text('Feedback & Support',
            style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.tealAccent,
          labelStyle: GoogleFonts.outfit(fontWeight: FontWeight.w600),
          tabs: const [
            Tab(text: 'Submit Ticket'),
            Tab(text: 'My Tickets'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildSubmitForm(),
          _buildTicketList(),
        ],
      ),
    );
  }

  Widget _buildSubmitForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'How can we help you?',
              style: GoogleFonts.outfit(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.white),
            ),
            const SizedBox(height: 24),
            DropdownButtonFormField<String>(
              initialValue: _category,
              dropdownColor: const Color(0xFF1E293B),
              style: GoogleFonts.outfit(color: Colors.white),
              decoration: _inputDecoration('Category'),
              items: const [
                DropdownMenuItem(
                    value: 'general', child: Text('General Inquiry')),
                DropdownMenuItem(value: 'bug', child: Text('Bug Report')),
                DropdownMenuItem(
                    value: 'content', child: Text('Course Content')),
                DropdownMenuItem(
                    value: 'billing', child: Text('Billing & Payment')),
                DropdownMenuItem(
                    value: 'feature', child: Text('Feature Request')),
              ],
              onChanged: (val) => setState(() => _category = val!),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _subjectController,
              style: GoogleFonts.outfit(color: Colors.white),
              decoration: _inputDecoration('Subject'),
              validator: (v) => v!.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _messageController,
              style: GoogleFonts.outfit(color: Colors.white),
              decoration: _inputDecoration('Message')
                  .copyWith(alignLabelWithHint: true),
              maxLines: 5,
              validator: (v) => v!.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: _isSubmitting ? null : _submitTicket,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.tealAccent,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: _isSubmitting
                  ? const CircularProgressIndicator(strokeWidth: 2)
                  : Text('Submit Ticket',
                      style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTicketList() {
    final ticketsAsync = ref.watch(myTicketsProvider);

    return ticketsAsync.when(
      data: (tickets) {
        if (tickets.isEmpty) {
          return const Center(
              child: Text('No tickets found',
                  style: TextStyle(color: Colors.grey)));
        }
        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: tickets.length,
          itemBuilder: (context, index) {
            final ticket = tickets[index];
            final hasAdminResponse = ticket.adminResponse.isNotEmpty;
            final isCritical = ticket.urgencyScore >= 8;

            return Card(
              color: const Color(0xFF1E293B),
              margin: const EdgeInsets.only(bottom: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: isCritical
                    ? const BorderSide(color: Colors.redAccent)
                    : BorderSide.none,
              ),
              child: Theme(
                data: Theme.of(context)
                    .copyWith(dividerColor: Colors.transparent),
                child: ExpansionTile(
                  tilePadding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  collapsedIconColor: Colors.grey,
                  iconColor: Colors.tealAccent,
                  title: Row(
                    children: [
                      if (isCritical)
                        const Padding(
                          padding: EdgeInsets.only(right: 8),
                          child: Icon(Icons.local_fire_department,
                              color: Colors.redAccent, size: 20),
                        ),
                      Expanded(
                        child: Text(
                          ticket.subject,
                          style: GoogleFonts.outfit(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                              fontSize: 16),
                        ),
                      ),
                    ],
                  ),
                  subtitle: Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Row(
                      children: [
                        Text(
                          '${ticket.category.toUpperCase()} • ${_formatDate(ticket.createdAt)}',
                          style:
                              const TextStyle(color: Colors.grey, fontSize: 12),
                        ),
                        const Spacer(),
                        _buildStatusBadge(ticket.status),
                      ],
                    ),
                  ),
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F172A).withValues(alpha: 0.5),
                        borderRadius: const BorderRadius.only(
                          bottomLeft: Radius.circular(12),
                          bottomRight: Radius.circular(12),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            'Your Message:',
                            style: GoogleFonts.outfit(
                                color: Colors.grey[400],
                                fontSize: 12,
                                fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            ticket.message,
                            style: GoogleFonts.outfit(
                                color: Colors.white70, fontSize: 14),
                          ),
                          if (hasAdminResponse) ...[
                            const SizedBox(height: 16),
                            const Divider(color: Colors.white10),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                const Icon(Icons.engineering,
                                    color: Colors.tealAccent, size: 16),
                                const SizedBox(width: 8),
                                Text(
                                  'Support Response:',
                                  style: GoogleFonts.outfit(
                                      color: Colors.tealAccent,
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.tealAccent.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                    color: Colors.tealAccent
                                        .withValues(alpha: 0.2)),
                              ),
                              child: Text(
                                ticket.adminResponse,
                                style: GoogleFonts.outfit(
                                    color: Colors.white, fontSize: 14),
                              ),
                            ),
                          ],
                          if (!hasAdminResponse &&
                              ticket.aiSuggestedResponse.isNotEmpty) ...[
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                const Icon(Icons.auto_awesome,
                                    color: Colors.purpleAccent, size: 14),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    'AI Agent is triaging your request. Hang tight!',
                                    style: GoogleFonts.outfit(
                                        color: Colors.purpleAccent,
                                        fontSize: 12,
                                        fontStyle: FontStyle.italic),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, s) => Center(
          child: Text('Error: $e', style: const TextStyle(color: Colors.red))),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color bgColor;
    Color textColor;
    String label;

    switch (status.toLowerCase()) {
      case 'resolved':
      case 'closed':
        bgColor = Colors.green.withValues(alpha: 0.2);
        textColor = Colors.greenAccent;
        label = 'Resolved';
        break;
      case 'in_progress':
        bgColor = Colors.blue.withValues(alpha: 0.2);
        textColor = Colors.blueAccent;
        label = 'In Progress';
        break;
      case 'open':
      default:
        bgColor = Colors.orange.withValues(alpha: 0.2);
        textColor = Colors.orangeAccent;
        label = 'Open';
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: textColor.withValues(alpha: 0.3)),
      ),
      child: Text(
        label,
        style: GoogleFonts.outfit(
            color: textColor, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }

  InputDecoration _inputDecoration(String label) {
    return InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: Colors.grey),
      filled: true,
      fillColor: const Color(0xFF1E293B),
      border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
      contentPadding: const EdgeInsets.all(16),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}
