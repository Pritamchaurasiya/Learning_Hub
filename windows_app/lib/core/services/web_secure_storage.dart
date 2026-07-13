import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class WebSecureStorage {
  static const FlutterSecureStorage _native = FlutterSecureStorage();
  static const FlutterSecureStorage _web = FlutterSecureStorage(
    webOptions: WebOptions(useSessionStorage: true),
  );

  static FlutterSecureStorage get _effective => kIsWeb ? _web : _native;

  static Future<void> write(String key, String value) async {
    try {
      await _effective.write(key: key, value: value);
    } catch (e) {
      debugPrint('WebSecureStorage write error: $e');
    }
  }

  static Future<String?> read(String key) async {
    try {
      return await _effective.read(key: key);
    } catch (e) {
      debugPrint('WebSecureStorage read error: $e');
      return null;
    }
  }

  static Future<void> delete(String key) async {
    try {
      await _effective.delete(key: key);
    } catch (e) {
      debugPrint('WebSecureStorage delete error: $e');
    }
  }
}
