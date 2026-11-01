import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';

import 'visualizers/pathfinding/pathfinding_visualizer.dart';
import 'visualizers/sorting/sorting_visualizer.dart';
import 'visualizers/tree/tree_visualizer.dart';
import 'widgets/challenge_list.dart';

class DSAScreen extends StatelessWidget {
  const DSAScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 4,
      child: Scaffold(
        extendBodyBehindAppBar: true,
        appBar: AppBar(
          title: Text(
            'DSA Laboratory',
            style: GoogleFonts.outfit(
                fontWeight: FontWeight.w900, letterSpacing: 1.2),
          ).animate().fadeIn(duration: 600.ms).slideY(begin: -0.2),
          centerTitle: true,
          backgroundColor: Colors.transparent,
          flexibleSpace: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Colors.blue.shade900.withAlpha(230),
                  Colors.purple.shade900.withAlpha(230)
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withAlpha(77),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                )
              ],
            ),
          ).animate().fadeIn(),
          bottom: const TabBar(
            isScrollable: true,
            indicatorColor: Colors.cyanAccent,
            indicatorWeight: 4,
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white70,
            tabs: [
              Tab(icon: Icon(Icons.code), text: 'Challenges'),
              Tab(icon: Icon(Icons.bar_chart), text: 'Sorting'),
              Tab(icon: Icon(Icons.polyline), text: 'Pathfinding'),
              Tab(icon: Icon(Icons.account_tree), text: 'BST & Traversals'),
            ],
          ),
          elevation: 0,
        ),
        body: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [
                Color(0xFF0F172A),
                Color(0xFF1E293B)
              ], // Deep Slate for coding
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.only(top: kToolbarHeight + 60),
            child: const TabBarView(
              children: [
                DsaChallengeList(),
                SortingVisualizer(),
                PathfindingVisualizer(),
                TreeVisualizer(),
              ],
            ).animate().fadeIn(delay: 300.ms),
          ),
        ),
      ),
    );
  }
}
