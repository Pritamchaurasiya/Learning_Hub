// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Spanish Castilian (`es`).
class AppLocalizationsEs extends AppLocalizations {
  AppLocalizationsEs([String locale = 'es']) : super(locale);

  @override
  String get appTitle => 'Centro de Aprendizaje';

  @override
  String welcomeBack(String name) {
    return '¡Bienvenido de nuevo, $name!';
  }

  @override
  String get readyToContinue => '¿Listo para continuar tu viaje?';

  @override
  String get hoursSpent => 'Horas dedicadas';

  @override
  String get courses => 'Cursos';

  @override
  String get streak => 'Racha';

  @override
  String get continueLearning => 'Continuar aprendiendo';

  @override
  String get viewAll => 'Ver todo';

  @override
  String get recommendedForYou => 'Recomendado para ti';

  @override
  String get exploreCourses => 'Explorar cursos';
}
