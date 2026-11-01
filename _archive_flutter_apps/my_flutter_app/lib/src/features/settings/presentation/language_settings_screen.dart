import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

class LanguageSettingsScreen extends ConsumerStatefulWidget {
  const LanguageSettingsScreen({super.key});

  @override
  ConsumerState<LanguageSettingsScreen> createState() =>
      _LanguageSettingsScreenState();
}

class _LanguageSettingsScreenState
    extends ConsumerState<LanguageSettingsScreen> {
  bool _aiTranslationEnabled = true;
  final String _appLanguage = 'English';
  final String _contentLanguage = 'English';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text('Language & Region',
            style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Save'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Search
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(12),
            ),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search language or region...',
                hintStyle: GoogleFonts.outfit(color: Colors.grey),
                border: InputBorder.none,
                icon: const Icon(Icons.search, color: Colors.grey),
              ),
            ),
          ),
          const SizedBox(height: 24),

          // AI Enhancement Section
          _buildSectionHeader('AI ENHANCEMENT'),
          Container(
            decoration: _cardDecoration(),
            child: SwitchListTile(
              value: _aiTranslationEnabled,
              onChanged: (val) => setState(() => _aiTranslationEnabled = val),
              activeThumbColor: const Color(0xFF7C3AED),
              title: Row(
                children: [
                  const Icon(Icons.auto_awesome,
                      color: Color(0xFF7C3AED), size: 18),
                  const SizedBox(width: 8),
                  Text('AI Translate Content',
                      style: GoogleFonts.outfit(
                          color: Colors.white, fontWeight: FontWeight.bold)),
                ],
              ),
              subtitle: Text(
                'Real-time translation for courses',
                style: GoogleFonts.outfit(color: Colors.grey, fontSize: 12),
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Interface Section
          _buildSectionHeader('INTERFACE'),
          Container(
            decoration: _cardDecoration(),
            child: ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: const BoxDecoration(
                    color: Colors.blue, shape: BoxShape.circle),
                child:
                    const Icon(Icons.language, color: Colors.white, size: 16),
              ),
              title: Text('App Language',
                  style: GoogleFonts.outfit(color: Colors.white)),
              subtitle: Text('Auto-Detected',
                  style: GoogleFonts.outfit(color: Colors.grey, fontSize: 12)),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(_appLanguage,
                      style: const TextStyle(color: Colors.grey)),
                  const Icon(Icons.chevron_right, color: Colors.grey),
                ],
              ),
              onTap: () {},
            ),
          ),
          const SizedBox(height: 24),

          // Content Preferences
          _buildSectionHeader('CONTENT PREFERENCES'),
          Container(
            decoration: _cardDecoration(),
            child: Column(
              children: [
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: const BoxDecoration(
                        color: Colors.purple, shape: BoxShape.circle),
                    child: const Icon(Icons.video_library,
                        color: Colors.white, size: 16),
                  ),
                  title: Text('Primary Language',
                      style: GoogleFonts.outfit(color: Colors.white)),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(_contentLanguage,
                          style: const TextStyle(color: Colors.grey)),
                      const Icon(Icons.chevron_right, color: Colors.grey),
                    ],
                  ),
                ),
                Divider(color: Colors.white.withAlpha(26), height: 1),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: const BoxDecoration(
                        color: Colors.indigo, shape: BoxShape.circle),
                    child: const Icon(Icons.translate,
                        color: Colors.white, size: 16),
                  ),
                  title: Text('Secondary Language',
                      style: GoogleFonts.outfit(color: Colors.white)),
                  subtitle: const Text('For bilingual content',
                      style: TextStyle(color: Colors.grey, fontSize: 10)),
                  trailing: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('Spanish', style: TextStyle(color: Colors.grey)),
                      Icon(Icons.chevron_right, color: Colors.grey),
                    ],
                  ),
                ),
              ],
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(8),
            child: Row(
              children: [
                const Icon(Icons.info_outline, color: Colors.orange, size: 16),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Impact on Availability: Changing your region setting directly affects the availability of certain courses.',
                    style: GoogleFonts.outfit(color: Colors.grey, fontSize: 10),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, left: 4),
      child: Text(
        title,
        style: GoogleFonts.outfit(
            color: Colors.grey,
            fontSize: 12,
            fontWeight: FontWeight.bold,
            letterSpacing: 1),
      ),
    );
  }

  BoxDecoration _cardDecoration() {
    return BoxDecoration(
      color: const Color(0xFF1E293B),
      borderRadius: BorderRadius.circular(16),
    );
  }
}
