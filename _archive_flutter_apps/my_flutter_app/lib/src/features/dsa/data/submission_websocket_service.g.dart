// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'submission_websocket_service.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$submissionWebSocketServiceHash() =>
    r'bcfdb9a2276b26610b6e8055280bccfc7503e1dd';

/// Copied from Dart SDK
class _SystemHash {
  _SystemHash._();

  static int combine(int hash, int value) {
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + value);
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + ((0x0007ffff & hash) << 10));
    return hash ^ (hash >> 6);
  }

  static int finish(int hash) {
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + ((0x03ffffff & hash) << 3));
    // ignore: parameter_assignments
    hash = hash ^ (hash >> 11);
    return 0x1fffffff & (hash + ((0x00003fff & hash) << 15));
  }
}

abstract class _$SubmissionWebSocketService
    extends BuildlessAutoDisposeStreamNotifier<Map<String, dynamic>> {
  late final String userId;

  Stream<Map<String, dynamic>> build(
    String userId,
  );
}

/// See also [SubmissionWebSocketService].
@ProviderFor(SubmissionWebSocketService)
const submissionWebSocketServiceProvider = SubmissionWebSocketServiceFamily();

/// See also [SubmissionWebSocketService].
class SubmissionWebSocketServiceFamily
    extends Family<AsyncValue<Map<String, dynamic>>> {
  /// See also [SubmissionWebSocketService].
  const SubmissionWebSocketServiceFamily();

  /// See also [SubmissionWebSocketService].
  SubmissionWebSocketServiceProvider call(
    String userId,
  ) {
    return SubmissionWebSocketServiceProvider(
      userId,
    );
  }

  @override
  SubmissionWebSocketServiceProvider getProviderOverride(
    covariant SubmissionWebSocketServiceProvider provider,
  ) {
    return call(
      provider.userId,
    );
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'submissionWebSocketServiceProvider';
}

/// See also [SubmissionWebSocketService].
class SubmissionWebSocketServiceProvider
    extends AutoDisposeStreamNotifierProviderImpl<SubmissionWebSocketService,
        Map<String, dynamic>> {
  /// See also [SubmissionWebSocketService].
  SubmissionWebSocketServiceProvider(
    String userId,
  ) : this._internal(
          () => SubmissionWebSocketService()..userId = userId,
          from: submissionWebSocketServiceProvider,
          name: r'submissionWebSocketServiceProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$submissionWebSocketServiceHash,
          dependencies: SubmissionWebSocketServiceFamily._dependencies,
          allTransitiveDependencies:
              SubmissionWebSocketServiceFamily._allTransitiveDependencies,
          userId: userId,
        );

  SubmissionWebSocketServiceProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.userId,
  }) : super.internal();

  final String userId;

  @override
  Stream<Map<String, dynamic>> runNotifierBuild(
    covariant SubmissionWebSocketService notifier,
  ) {
    return notifier.build(
      userId,
    );
  }

  @override
  Override overrideWith(SubmissionWebSocketService Function() create) {
    return ProviderOverride(
      origin: this,
      override: SubmissionWebSocketServiceProvider._internal(
        () => create()..userId = userId,
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        userId: userId,
      ),
    );
  }

  @override
  AutoDisposeStreamNotifierProviderElement<SubmissionWebSocketService,
      Map<String, dynamic>> createElement() {
    return _SubmissionWebSocketServiceProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is SubmissionWebSocketServiceProvider &&
        other.userId == userId;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, userId.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin SubmissionWebSocketServiceRef
    on AutoDisposeStreamNotifierProviderRef<Map<String, dynamic>> {
  /// The parameter `userId` of this provider.
  String get userId;
}

class _SubmissionWebSocketServiceProviderElement
    extends AutoDisposeStreamNotifierProviderElement<SubmissionWebSocketService,
        Map<String, dynamic>> with SubmissionWebSocketServiceRef {
  _SubmissionWebSocketServiceProviderElement(super.provider);

  @override
  String get userId => (origin as SubmissionWebSocketServiceProvider).userId;
}
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
