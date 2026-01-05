import 'package:local_auth/local_auth.dart';
import 'package:flutter/services.dart';

class BiometricService {
  static final BiometricService _instance = BiometricService();
  static BiometricService get instance => _instance;

  final LocalAuthentication auth;

  BiometricService({LocalAuthentication? auth})
      : auth = auth ?? LocalAuthentication();

  Future<bool> get canCheckBiometrics async {
    try {
      return await auth.canCheckBiometrics && await auth.isDeviceSupported();
    } on PlatformException catch (_) {
      return false;
    }
  }

  Future<List<BiometricType>> getAvailableBiometrics() async {
    try {
      return await auth.getAvailableBiometrics();
    } on PlatformException catch (_) {
      return <BiometricType>[];
    }
  }

  Future<bool> authenticate({required String reason}) async {
    try {
      return await auth.authenticate(
        localizedReason: reason,
      );
    } on PlatformException catch (_) {
      return false;
    }
  }
}
