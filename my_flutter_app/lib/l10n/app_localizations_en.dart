// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Learning Hub';

  @override
  String welcomeBack(String name) {
    return 'Welcome back, $name!';
  }

  @override
  String get readyToContinue => 'Ready to continue your journey?';

  @override
  String get hoursSpent => 'Hours Spent';

  @override
  String get courses => 'Courses';

  @override
  String get streak => 'Streak';

  @override
  String get continueLearning => 'Continue Learning';

  @override
  String get viewAll => 'View All';

  @override
  String get recommendedForYou => 'Recommended for You';

  @override
  String get exploreCourses => 'Explore Courses';
}
