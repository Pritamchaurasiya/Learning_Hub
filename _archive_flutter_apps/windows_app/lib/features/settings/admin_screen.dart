import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:learning_hub/core/theme/app_colors.dart';
import 'package:learning_hub/core/providers/admin_provider.dart';
import 'package:learning_hub/core/services/health_check_service.dart';
import 'package:learning_hub/core/services/feature_flags_service.dart';

class AdminScreen extends ConsumerStatefulWidget {
  const AdminScreen({super.key});

  @override
  ConsumerState<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends ConsumerState<AdminScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Dashboard'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Feature Flags'),
            Tab(text: 'System Health'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: const [
          _FeatureFlagsTab(),
          _HealthCheckTab(),
        ],
      ),
    );
  }
}

class _FeatureFlagsTab extends ConsumerWidget {
  const _FeatureFlagsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(featureFlagsProvider);
    final notifier = ref.read(featureFlagsProvider.notifier);

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('${state.flags.length} Flags Registered',
                  style: const TextStyle(fontWeight: FontWeight.bold)),
              if (state.overrides.isNotEmpty)
                TextButton.icon(
                  onPressed: notifier.clearOverrides,
                  icon: const Icon(Icons.clear_all),
                  label: const Text('Clear All Overrides'),
                ),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
            itemCount: state.flags.length,
            itemBuilder: (context, index) {
              final key = state.flags.keys.elementAt(index);
              final flag = state.flags[key]!;
              final isOverridden = state.overrides.containsKey(key);
              final overrideValue = state.overrides[key]?.value;

              // Determine current effective value (simplified)
              // In a real inspector, we might want to run the full evaluate() with mock context
              // For now, display the default and allow override

              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: ExpansionTile(
                  leading: Icon(
                    isOverridden ? Icons.tune : Icons.flag,
                    color: isOverridden ? AppColors.warning : AppColors.primary,
                  ),
                  title: Text(flag.key),
                  subtitle: Text(flag.description ?? 'No description'),
                  trailing: isOverridden
                      ? Chip(
                          label: Text('Override: ${overrideValue.toString()}'))
                      : null,
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Type: ${flag.type.name}'),
                          Text('Default: ${flag.defaultValue}'),
                          if (flag.rolloutPercentage != null)
                            Text('Rollout: ${flag.rolloutPercentage}%'),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              const Text('Override Value: '),
                              const SizedBox(width: 8),
                              if (flag.type == FeatureFlagType.boolean)
                                Switch(
                                  value: overrideValue as bool? ??
                                      flag.defaultValue as bool,
                                  onChanged: (val) =>
                                      notifier.setOverride(flag.key, val),
                                ),
                              if (flag.type != FeatureFlagType.boolean)
                                ElevatedButton(
                                  onPressed: () {
                                    // Show dialog to input value
                                    // Keeping it simple for booleans primarily for now
                                  },
                                  child: const Text('Edit Value'),
                                ),
                              if (isOverridden)
                                TextButton(
                                  onPressed: () =>
                                      notifier.removeOverride(flag.key),
                                  child: const Text('Clear'),
                                ),
                            ],
                          )
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _HealthCheckTab extends ConsumerWidget {
  const _HealthCheckTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(healthCheckProvider);
    final notifier = ref.read(healthCheckProvider.notifier);
    final theme = Theme.of(context);

    if (state.isLoading && state.report == null) {
      return const Center(child: CircularProgressIndicator());
    }

    final report = state.report;
    if (report == null) {
      return Center(
        child: ElevatedButton(
          onPressed: notifier.refreshHealth,
          child: const Text('Run Health Check'),
        ),
      );
    }

    Color statusColor;
    IconData statusIcon;

    switch (report.overallStatus) {
      case HealthStatus.healthy:
        statusColor = AppColors.success;
        statusIcon = Icons.check_circle;
        break;
      case HealthStatus.degraded:
        statusColor = AppColors.warning;
        statusIcon = Icons.warning;
        break;
      case HealthStatus.unhealthy:
        statusColor = AppColors.error;
        statusIcon = Icons.error;
        break;
      default:
        statusColor = Colors.grey;
        statusIcon = Icons.help;
    }

    return RefreshIndicator(
      onRefresh: notifier.refreshHealth,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Overall Status
          Card(
            color: statusColor.withValues(alpha: 0.1),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  Icon(statusIcon, size: 64, color: statusColor),
                  const SizedBox(height: 16),
                  Text(report.overallStatus.name.toUpperCase(),
                      style: theme.textTheme.headlineMedium?.copyWith(
                          color: statusColor, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text(
                      'Last checked: ${report.generatedAt.toString().split('.')[0]}'),
                ],
              ),
            ),
          ),

          const SizedBox(height: 24),
          const Text('Components',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),

          ...report.components.map((component) {
            final Color cColor =
                component.isHealthy ? AppColors.success : AppColors.error;
            return Card(
              child: ListTile(
                leading: Icon(
                  component.isHealthy
                      ? Icons.check_circle_outline
                      : Icons.error_outline,
                  color: cColor,
                ),
                title: Text(component.name),
                subtitle: Text(component.message ?? ''),
                trailing:
                    Text('${component.responseTime?.inMilliseconds ?? 0}ms'),
              ),
            );
          }),

          if (state.latestMetrics != null) ...[
            const SizedBox(height: 24),
            const Text('Live Metrics',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _MetricRow('Active Requests',
                        '${state.latestMetrics!.activeRequests}'),
                    _MetricRow('Avg Response Time',
                        '${state.latestMetrics!.averageResponseTimeMs.toStringAsFixed(1)}ms'),
                    _MetricRow('Error Rate',
                        '${(state.latestMetrics!.errorRate * 100).toStringAsFixed(2)}%'),
                    _MetricRow('Cache Hit Rate',
                        '${(state.latestMetrics!.cacheHitRate * 100).toStringAsFixed(1)}%'),
                  ],
                ),
              ),
            )
          ]
        ],
      ),
    );
  }
}

class _MetricRow extends StatelessWidget {
  final String label;
  final String value;

  const _MetricRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label),
          Text(value,
              style: const TextStyle(
                  fontWeight: FontWeight.bold, fontFamily: 'monospace')),
        ],
      ),
    );
  }
}
