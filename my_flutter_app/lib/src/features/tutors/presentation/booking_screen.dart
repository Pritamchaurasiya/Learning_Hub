import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:my_flutter_app/src/features/analytics/data/analytics_repository.dart';
import 'package:my_flutter_app/src/features/tutors/data/tutor_repository.dart';
import 'package:my_flutter_app/src/features/tutors/domain/tutor_model.dart';
import 'package:table_calendar/table_calendar.dart';

final tutorsProvider = FutureProvider.autoDispose<List<TutorProfile>>((ref) {
  return ref.watch(tutorRepositoryProvider).getTutors();
});

class BookingScreen extends ConsumerStatefulWidget {
  const BookingScreen({super.key});

  @override
  ConsumerState<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends ConsumerState<BookingScreen> {
  CalendarFormat _calendarFormat = CalendarFormat.week;
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;
  TutorProfile? _selectedTutor;
  String? _selectedSlot;

  // Dynamically generate time slots based on selected date
  List<String> _generateSlots() {
    if (_selectedDay == null) {
      return [];
    }
    final isWeekend = _selectedDay!.weekday == DateTime.saturday ||
        _selectedDay!.weekday == DateTime.sunday;
    // Fewer slots on weekends
    if (isWeekend) {
      return ['10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM'];
    }
    return [
      '09:00 AM',
      '10:00 AM',
      '11:00 AM',
      '02:00 PM',
      '03:00 PM',
      '04:00 PM',
      '05:00 PM',
    ];
  }

  @override
  void initState() {
    super.initState();
    _selectedDay = _focusedDay;
  }

  Future<void> _bookSession() async {
    if (_selectedTutor == null ||
        _selectedDay == null ||
        _selectedSlot == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Please select a tutor, date, and time.')));
      return;
    }

    try {
      // Parse slot time
      final timeParts = _selectedSlot!.split(' '); // ["09:00", "AM"]
      final hourMin = timeParts[0].split(':');
      var hour = int.parse(hourMin[0]);
      if (timeParts[1] == 'PM' && hour != 12) {
        hour += 12;
      }
      if (timeParts[1] == 'AM' && hour == 12) {
        hour = 0;
      }

      final startTime = DateTime(_selectedDay!.year, _selectedDay!.month,
          _selectedDay!.day, hour, int.parse(hourMin[1]));

      final endTime = startTime.add(const Duration(hours: 1));

      await ref.read(tutorRepositoryProvider).createBooking(
            tutorId: _selectedTutor!.id,
            startTime: startTime,
            endTime: endTime,
          );

      // Track booking for AI Heatmap - await to ensure tracking completes
      await ref.read(analyticsRepositoryProvider).trackActivity(
        action: 'booked_tutor_session',
        contentType: 'tutor',
        objectId: _selectedTutor!.id,
        metadata: {
          'tutor_name': _selectedTutor!.name,
          'date': _selectedDay!.toIso8601String(),
          'slot': _selectedSlot,
        },
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Session booked successfully! 🎉'),
          backgroundColor: Color(0xFF10B981),
        ));
      }
      if (mounted) {
        Navigator.pop(context);
      }
    } on Exception catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Booking failed: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: Text('Book a Session',
            style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildTutorSelector(ref),
            const SizedBox(height: 24),
            if (_selectedTutor != null) ...[
              Text('Select Date',
                  style: GoogleFonts.outfit(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              _buildCalendar(),
              const SizedBox(height: 24),
              Text('Available Slots',
                  style: GoogleFonts.outfit(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              _buildSlotsGrid(),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _bookSession,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.tealAccent,
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: Text('Confirm Booking',
                      style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
                ),
              ),
            ]
          ],
        ),
      ),
    );
  }

  Widget _buildTutorSelector(WidgetRef ref) {
    final tutorsAsync = ref.watch(tutorsProvider);

    return tutorsAsync.when(
      data: (tutors) {
        return DropdownButtonFormField<TutorProfile>(
          initialValue: _selectedTutor,
          hint: const Text('Select a Mentor',
              style: TextStyle(color: Colors.grey)),
          dropdownColor: const Color(0xFF1E293B),
          style: GoogleFonts.outfit(color: Colors.white),
          decoration: InputDecoration(
            filled: true,
            fillColor: const Color(0xFF1E293B),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
          items: tutors
              .map((t) => DropdownMenuItem(
                    value: t,
                    child: Text('${t.name} (\$${t.hourlyRate}/hr)'),
                  ))
              .toList(),
          onChanged: (val) => setState(() => _selectedTutor = val),
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, s) =>
          Text('Error: $e', style: const TextStyle(color: Colors.red)),
    );
  }

  Widget _buildCalendar() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
      ),
      padding: const EdgeInsets.all(8),
      child: TableCalendar<DateTime>(
        firstDay: DateTime.now(),
        lastDay: DateTime.now().add(const Duration(days: 30)),
        focusedDay: _focusedDay,
        calendarFormat: _calendarFormat,
        selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
        onDaySelected: (selectedDay, focusedDay) {
          setState(() {
            _selectedDay = selectedDay;
            _focusedDay = focusedDay;
            _selectedSlot = null; // Reset slot on date change
          });
        },
        onFormatChanged: (format) => setState(() => _calendarFormat = format),
        calendarStyle: const CalendarStyle(
          defaultTextStyle: TextStyle(color: Colors.white),
          weekendTextStyle: TextStyle(color: Colors.white70),
          selectedDecoration:
              BoxDecoration(color: Colors.tealAccent, shape: BoxShape.circle),
          todayDecoration:
              BoxDecoration(color: Colors.blueAccent, shape: BoxShape.circle),
          todayTextStyle: TextStyle(color: Colors.white),
          selectedTextStyle:
              TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
        ),
        headerStyle: HeaderStyle(
          formatButtonVisible: false,
          titleCentered: true,
          titleTextStyle: GoogleFonts.outfit(
              color: Colors.white, fontWeight: FontWeight.bold),
          leftChevronIcon: const Icon(Icons.chevron_left, color: Colors.white),
          rightChevronIcon:
              const Icon(Icons.chevron_right, color: Colors.white),
        ),
      ),
    );
  }

  Widget _buildSlotsGrid() {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: _generateSlots().map((slot) {
        final isSelected = _selectedSlot == slot;
        return ChoiceChip(
          label: Text(slot),
          selected: isSelected,
          onSelected: (selected) =>
              setState(() => _selectedSlot = selected ? slot : null),
          selectedColor: Colors.tealAccent,
          backgroundColor: const Color(0xFF1E293B),
          labelStyle: TextStyle(
            color: isSelected ? Colors.black : Colors.white,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        );
      }).toList(),
    );
  }
}
