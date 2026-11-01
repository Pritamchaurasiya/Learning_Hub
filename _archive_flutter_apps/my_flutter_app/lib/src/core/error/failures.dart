import 'package:equatable/equatable.dart';

abstract class Failure extends Equatable {
  const Failure([this.message = 'An unexpected error occurred']);
  final String message;

  @override
  List<Object?> get props => [message];
}

class ServerFailure extends Failure {
  const ServerFailure([super.message = 'Server Error']);
}

class CacheFailure extends Failure {
  const CacheFailure([super.message = 'Cache Error']);
}

class NetworkFailure extends Failure {
  const NetworkFailure(
      [super.message = 'Please check your internet connection']);
}

class AuthFailure extends Failure {
  const AuthFailure([super.message = 'Authentication Failed']);
}

class DataParsingFailure extends Failure {
  const DataParsingFailure([super.message = 'Data Parsing Error']);
}
