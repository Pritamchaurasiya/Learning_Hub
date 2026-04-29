// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'dsa_ai_chat_service.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$dsaAiChatServiceHash() => r'5cdf0448a6f4d9287c209e6d076dac13d7035d87';

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

abstract class _$DsaAiChatService
    extends BuildlessAutoDisposeStreamNotifier<List<ChatMessage>> {
  late final int submissionId;

  Stream<List<ChatMessage>> build(
    int submissionId,
  );
}

/// See also [DsaAiChatService].
@ProviderFor(DsaAiChatService)
const dsaAiChatServiceProvider = DsaAiChatServiceFamily();

/// See also [DsaAiChatService].
class DsaAiChatServiceFamily extends Family<AsyncValue<List<ChatMessage>>> {
  /// See also [DsaAiChatService].
  const DsaAiChatServiceFamily();

  /// See also [DsaAiChatService].
  DsaAiChatServiceProvider call(
    int submissionId,
  ) {
    return DsaAiChatServiceProvider(
      submissionId,
    );
  }

  @override
  DsaAiChatServiceProvider getProviderOverride(
    covariant DsaAiChatServiceProvider provider,
  ) {
    return call(
      provider.submissionId,
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
  String? get name => r'dsaAiChatServiceProvider';
}

/// See also [DsaAiChatService].
class DsaAiChatServiceProvider extends AutoDisposeStreamNotifierProviderImpl<
    DsaAiChatService, List<ChatMessage>> {
  /// See also [DsaAiChatService].
  DsaAiChatServiceProvider(
    int submissionId,
  ) : this._internal(
          () => DsaAiChatService()..submissionId = submissionId,
          from: dsaAiChatServiceProvider,
          name: r'dsaAiChatServiceProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$dsaAiChatServiceHash,
          dependencies: DsaAiChatServiceFamily._dependencies,
          allTransitiveDependencies:
              DsaAiChatServiceFamily._allTransitiveDependencies,
          submissionId: submissionId,
        );

  DsaAiChatServiceProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.submissionId,
  }) : super.internal();

  final int submissionId;

  @override
  Stream<List<ChatMessage>> runNotifierBuild(
    covariant DsaAiChatService notifier,
  ) {
    return notifier.build(
      submissionId,
    );
  }

  @override
  Override overrideWith(DsaAiChatService Function() create) {
    return ProviderOverride(
      origin: this,
      override: DsaAiChatServiceProvider._internal(
        () => create()..submissionId = submissionId,
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        submissionId: submissionId,
      ),
    );
  }

  @override
  AutoDisposeStreamNotifierProviderElement<DsaAiChatService, List<ChatMessage>>
      createElement() {
    return _DsaAiChatServiceProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is DsaAiChatServiceProvider &&
        other.submissionId == submissionId;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, submissionId.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin DsaAiChatServiceRef
    on AutoDisposeStreamNotifierProviderRef<List<ChatMessage>> {
  /// The parameter `submissionId` of this provider.
  int get submissionId;
}

class _DsaAiChatServiceProviderElement
    extends AutoDisposeStreamNotifierProviderElement<DsaAiChatService,
        List<ChatMessage>> with DsaAiChatServiceRef {
  _DsaAiChatServiceProviderElement(super.provider);

  @override
  int get submissionId => (origin as DsaAiChatServiceProvider).submissionId;
}
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
