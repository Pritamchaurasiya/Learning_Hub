import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:my_flutter_app/src/core/widgets/glass_container.dart';
import '../data/study_group_repository.dart';
import '../domain/study_group_model.dart';

class StudyGroupsScreen extends ConsumerStatefulWidget {
  const StudyGroupsScreen({super.key});

  @override
  ConsumerState<StudyGroupsScreen> createState() => _StudyGroupsScreenState();
}

class _StudyGroupsScreenState extends ConsumerState<StudyGroupsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<StudyGroup> _allGroups = [];
  List<StudyGroup> _myGroups = [];
  bool _isLoading = true;
  String? _error;
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _fetchData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final repo = ref.read(studyGroupRepositoryProvider);
      final results = await Future.wait([
        repo.getGroups(search: _searchController.text),
        repo.getMyGroups(),
      ]);
      setState(() {
        _allGroups = results[0];
        _myGroups = results[1];
        _isLoading = false;
      });
    } on Exception catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _joinGroup(StudyGroup group) async {
    try {
      await ref.read(studyGroupRepositoryProvider).joinGroup(group.id);
      await _fetchData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Joined "${group.name}"'),
              backgroundColor: Colors.green),
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

  Future<void> _leaveGroup(StudyGroup group) async {
    try {
      await ref.read(studyGroupRepositoryProvider).leaveGroup(group.id);
      await _fetchData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Left "${group.name}"'),
              backgroundColor: Colors.orange),
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
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: Text('Study Groups',
            style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        centerTitle: true,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: const Color(0xFF3B82F6),
          indicatorWeight: 3,
          labelColor: Colors.white,
          labelStyle: GoogleFonts.outfit(fontWeight: FontWeight.bold),
          unselectedLabelColor: Colors.white54,
          tabs: const [
            Tab(text: 'Explore'),
            Tab(text: 'My Groups'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white70),
            onPressed: _fetchData,
          ),
        ],
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: GlassContainer(
                borderRadius: 12,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: TextField(
                  controller: _searchController,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    hintText: 'Search groups by name or topic...',
                    hintStyle: GoogleFonts.outfit(color: Colors.white54),
                    border: InputBorder.none,
                    icon: const Icon(Icons.search, color: Colors.white54),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon:
                                const Icon(Icons.clear, color: Colors.white54),
                            onPressed: () {
                              _searchController.clear();
                              _fetchData();
                            },
                          )
                        : null,
                  ),
                  onSubmitted: (_) => _fetchData(),
                ),
              ).animate().fadeIn(),
            ),
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildGroupList(_allGroups, isMyGroups: false),
                  _buildGroupList(_myGroups, isMyGroups: true),
                ],
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showCreateGroupDialog,
        backgroundColor: const Color(0xFF3B82F6),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: Text('Create Group',
            style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _buildGroupList(List<StudyGroup> groups, {required bool isMyGroups}) {
    if (_isLoading) {
      return const Center(
          child: CircularProgressIndicator(color: Color(0xFF3B82F6)));
    }
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.redAccent),
            const SizedBox(height: 16),
            Text('Failed to load groups',
                style: GoogleFonts.outfit(color: Colors.white70)),
            const SizedBox(height: 8),
            TextButton.icon(
                onPressed: _fetchData,
                icon: const Icon(Icons.refresh, color: Color(0xFF3B82F6)),
                label: Text('Retry',
                    style: GoogleFonts.outfit(color: const Color(0xFF3B82F6)))),
          ],
        ),
      );
    }
    if (groups.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.group_outlined, size: 80, color: Colors.white24),
            const SizedBox(height: 16),
            Text(
                isMyGroups
                    ? "You haven't joined any groups"
                    : 'No groups found',
                style: GoogleFonts.outfit(color: Colors.white70, fontSize: 18)),
            const SizedBox(height: 8),
            Text(
                isMyGroups
                    ? 'Explore and join study groups'
                    : 'Try a different search',
                style: GoogleFonts.outfit(color: Colors.white38)),
          ],
        ),
      );
    }
    return RefreshIndicator(
      color: const Color(0xFF3B82F6),
      backgroundColor: const Color(0xFF1E293B),
      onRefresh: _fetchData,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: groups.length,
        separatorBuilder: (context, index) => const SizedBox(height: 12),
        itemBuilder: (context, index) => _buildGroupCard(groups[index],
            isMyGroups: isMyGroups, index: index),
      ),
    );
  }

  Widget _buildGroupCard(StudyGroup group,
      {required bool isMyGroups, required int index}) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
        boxShadow: const [
          BoxShadow(color: Colors.black26, blurRadius: 10, offset: Offset(0, 4))
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF3B82F6), Color(0xFF2563EB)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.groups, color: Colors.white, size: 24),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(group.name,
                        style: GoogleFonts.outfit(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                            color: Colors.white)),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                              color: Colors.indigo.withValues(alpha: 0.3),
                              borderRadius: BorderRadius.circular(6)),
                          child: Text(group.topic,
                              style: GoogleFonts.outfit(
                                  fontSize: 10,
                                  color: const Color(0xFF60A5FA),
                                  fontWeight: FontWeight.w600)),
                        ),
                        const SizedBox(width: 8),
                        const Icon(Icons.people,
                            size: 14, color: Colors.white54),
                        const SizedBox(width: 4),
                        Text('${group.memberCount}/${group.maxMembers}',
                            style: GoogleFonts.outfit(
                                fontSize: 12, color: Colors.white54)),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(group.description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.outfit(color: Colors.white70, fontSize: 13)),
          const SizedBox(height: 16),
          Row(
            children: [
              CircleAvatar(
                radius: 10,
                backgroundColor: Colors.white24,
                child: Text(
                    group.creatorName.isNotEmpty ? group.creatorName[0] : '?',
                    style:
                        GoogleFonts.outfit(fontSize: 10, color: Colors.white)),
              ),
              const SizedBox(width: 8),
              Text('By ${group.creatorName}',
                  style:
                      GoogleFonts.outfit(fontSize: 12, color: Colors.white38)),
              const Spacer(),
              if (isMyGroups)
                OutlinedButton(
                  onPressed: () => _leaveGroup(group),
                  style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.redAccent,
                      side: BorderSide(
                          color: Colors.redAccent.withValues(alpha: 0.5)),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8)),
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      visualDensity: VisualDensity.compact),
                  child: Text('Leave', style: GoogleFonts.outfit(fontSize: 12)),
                )
              else if (group.isMember)
                Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                        color: Colors.green.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                            color: Colors.green.withValues(alpha: 0.5))),
                    child: Text('Joined',
                        style: GoogleFonts.outfit(
                            color: Colors.greenAccent, fontSize: 12)))
              else
                FilledButton(
                  onPressed: group.isFull ? null : () => _joinGroup(group),
                  style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF3B82F6),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8)),
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      visualDensity: VisualDensity.compact),
                  child: Text(group.isFull ? 'Full' : 'Join',
                      style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
                ),
            ],
          ),
        ],
      ),
    ).animate().slideY(delay: (100 * index).ms, begin: 0.1).fadeIn();
  }

  void _showCreateGroupDialog() {
    final nameController = TextEditingController();
    final descController = TextEditingController();
    final topicController = TextEditingController();

    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Create Study Group',
            style: GoogleFonts.outfit(color: Colors.white)),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildDialogField(nameController, 'Group Name'),
              const SizedBox(height: 12),
              _buildDialogField(topicController, 'Topic (e.g. Calculus)'),
              const SizedBox(height: 12),
              _buildDialogField(descController, 'Description', maxLines: 3),
            ],
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text('Cancel',
                  style: GoogleFonts.outfit(color: Colors.white54))),
          FilledButton(
            onPressed: () async {
              if (nameController.text.isNotEmpty &&
                  topicController.text.isNotEmpty) {
                Navigator.pop(ctx);
                try {
                  await ref.read(studyGroupRepositoryProvider).createGroup({
                    'name': nameController.text,
                    'topic': topicController.text,
                    'description': descController.text,
                  });
                  await _fetchData();
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                          content: Text('Group created!'),
                          backgroundColor: Colors.green),
                    );
                  }
                } on Exception catch (e) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                          content: Text('Error: $e'),
                          backgroundColor: Colors.red),
                    );
                  }
                }
              }
            },
            style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF3B82F6)),
            child: Text('Create',
                style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildDialogField(TextEditingController controller, String label,
      {int maxLines = 1}) {
    return TextField(
      controller: controller,
      style: const TextStyle(color: Colors.white),
      maxLines: maxLines,
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Colors.white54),
        filled: true,
        fillColor: Colors.black26,
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none),
        focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFF3B82F6))),
      ),
    );
  }
}
