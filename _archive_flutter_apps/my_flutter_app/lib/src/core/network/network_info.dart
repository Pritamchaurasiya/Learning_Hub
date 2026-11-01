import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:internet_connection_checker_plus/internet_connection_checker_plus.dart';

abstract class NetworkInfo {
  Future<bool> get isConnected;
}

class NetworkInfoImpl implements NetworkInfo {

  NetworkInfoImpl(this.connection);
  final InternetConnection connection;

  @override
  Future<bool> get isConnected async {
    final status = await connection.internetStatus;
    return status == InternetStatus.connected;
  }
}

final networkInfoProvider = Provider<NetworkInfo>((ref) {
  return NetworkInfoImpl(InternetConnection());
});
