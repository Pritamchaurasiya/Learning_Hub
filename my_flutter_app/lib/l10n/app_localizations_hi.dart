// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Hindi (`hi`).
class AppLocalizationsHi extends AppLocalizations {
  AppLocalizationsHi([String locale = 'hi']) : super(locale);

  @override
  String get appTitle => 'Learning Hub';

  @override
  String welcomeBack(String name) {
    return 'वापसी पर स्वागत है, $name!';
  }

  @override
  String get readyToContinue =>
      'क्या आप अपनी यात्रा जारी रखने के लिए तैयार हैं?';

  @override
  String get hoursSpent => 'घंटे बिताए';

  @override
  String get courses => 'पाठ्यक्रम';

  @override
  String get streak => 'streak';

  @override
  String get continueLearning => 'सीखना जारी रखें';

  @override
  String get viewAll => 'सब देखें';

  @override
  String get recommendedForYou => 'आपके लिए अनुशंसित';

  @override
  String get exploreCourses => 'पाठ्यक्रम खोजें';
}
