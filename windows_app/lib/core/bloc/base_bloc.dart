import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:dartz/dartz.dart';
import '../error/failures.dart';

/// Base state class for all BLoC states
abstract class BaseState extends Equatable {
  const BaseState();
}

/// Initial state - hasn't started yet
class InitialState extends BaseState {
  const InitialState();

  @override
  List<Object?> get props => [];
}

/// Loading state - operation in progress
class LoadingState extends BaseState {
  final String? message;

  const LoadingState({this.message});

  @override
  List<Object?> get props => [message];
}

/// Error state - operation failed
class ErrorState extends BaseState {
  final Failure failure;
  final String message;

  const ErrorState({
    required this.failure,
    required this.message,
  });

  @override
  List<Object?> get props => [failure, message];
}

/// Base event class for all BLoC events
abstract class BaseEvent extends Equatable {
  const BaseEvent();

  @override
  List<Object?> get props => [];
}

/// Mixin for common BLoC patterns
mixin BlocHelperMixin<E extends BaseEvent, S extends BaseState> on Bloc<E, S> {
  /// Handle Either result from use cases
  S handleEither<T>(
    Either<Failure, T> result,
    S Function(T data) onSuccess,
    S Function(Failure failure) onFailure,
  ) {
    return result.fold(
      (failure) => onFailure(failure),
      (data) => onSuccess(data),
    );
  }

  /// Safe emit to avoid emitting after BLoC is closed
  void safeEmit(S state) {
    if (!isClosed) {
      // ignore: invalid_use_of_visible_for_testing_member
      emit(state);
    }
  }
}

/// BLoC observer for debugging and monitoring
class AppBlocObserver extends BlocObserver {
  @override
  void onCreate(BlocBase<dynamic> bloc) {
    super.onCreate(bloc);
    // AppLogger.debug('BLoC Created: ${bloc.runtimeType}');
  }

  @override
  void onEvent(Bloc<dynamic, dynamic> bloc, Object? event) {
    super.onEvent(bloc, event);
    // AppLogger.debug('BLoC Event: ${bloc.runtimeType} -> $event');
  }

  @override
  void onChange(BlocBase<dynamic> bloc, Change<dynamic> change) {
    super.onChange(bloc, change);
    // AppLogger.debug(
    //   'BLoC Change: ${bloc.runtimeType}',
    //   {'current': change.currentState, 'next': change.nextState},
    // );
  }

  @override
  void onTransition(
    Bloc<dynamic, dynamic> bloc,
    Transition<dynamic, dynamic> transition,
  ) {
    super.onTransition(bloc, transition);
  }

  @override
  void onError(BlocBase<dynamic> bloc, Object error, StackTrace stackTrace) {
    super.onError(bloc, error, stackTrace);
    // AppLogger.error(
    //   'BLoC Error: ${bloc.runtimeType}',
    //   error,
    //   stackTrace,
    // );
  }

  @override
  void onClose(BlocBase<dynamic> bloc) {
    super.onClose(bloc);
    // AppLogger.debug('BLoC Closed: ${bloc.runtimeType}');
  }
}
