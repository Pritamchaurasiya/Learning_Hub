import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/backend_ai_service.dart';

final backendAiServiceProvider = Provider<BackendAiService>((ref) {
  return BackendAiService();
});
