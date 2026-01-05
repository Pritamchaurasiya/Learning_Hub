import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../error/failures.dart';

/// Abstract UseCase class following Clean Architecture principles.
///
/// Every use case returns an [Either] to handle success and failure cases.
/// [Type] is the success return type, [Params] is the input parameters type.
///
/// Example:
/// ```dart
/// class GetUser extends UseCase<User, GetUserParams> {
///   final UserRepository repository;
///
///   GetUser(this.repository);
///
///   @override
///   Future<Either<Failure, User>> call(GetUserParams params) {
///     return repository.getUser(params.id);
///   }
/// }
/// ```
abstract class UseCase<T, Params> {
  Future<Either<Failure, T>> call(Params params);
}

/// Use this class when UseCase doesn't need any parameters
class NoParams extends Equatable {
  const NoParams();

  @override
  List<Object?> get props => [];
}

/// Stream-based UseCase for reactive data streams
abstract class StreamUseCase<T, Params> {
  Stream<Either<Failure, T>> call(Params params);
}

/// Synchronous UseCase for non-async operations
abstract class SyncUseCase<T, Params> {
  Either<Failure, T> call(Params params);
}

/// Pagination parameters for list-based use cases
class PaginationParams extends Equatable {
  final int page;
  final int limit;
  final String? sortBy;
  final bool ascending;

  const PaginationParams({
    this.page = 1,
    this.limit = 20,
    this.sortBy,
    this.ascending = true,
  });

  @override
  List<Object?> get props => [page, limit, sortBy, ascending];

  Map<String, dynamic> toQueryParams() => {
        'page': page.toString(),
        'limit': limit.toString(),
        if (sortBy != null) 'sortBy': sortBy,
        'order': ascending ? 'asc' : 'desc',
      };
}

/// Search parameters for search use cases
class SearchParams extends Equatable {
  final String query;
  final int page;
  final int limit;
  final Map<String, dynamic>? filters;

  const SearchParams({
    required this.query,
    this.page = 1,
    this.limit = 20,
    this.filters,
  });

  @override
  List<Object?> get props => [query, page, limit, filters];
}
