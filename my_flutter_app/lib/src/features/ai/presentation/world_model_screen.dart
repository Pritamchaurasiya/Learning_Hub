import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/core/network/api_client.dart';

// Provider to fetch World Model state
final worldModelStateProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final apiClient = ref.watch(apiClientProvider);
  final response = await apiClient.get('ai/world-models/state/');
  return response.data ?? {};
});

class WorldModelScreen extends ConsumerWidget {
  const WorldModelScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final worldModelState = ref.watch(worldModelStateProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('World Models (Dream Mode)'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(worldModelStateProvider),
          ),
        ],
      ),
      body: worldModelState.when(
        data: (data) => _buildBody(context, data),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
      ),
    );
  }

  Widget _buildBody(BuildContext context, Map<String, dynamic> data) {
    final nEpisodes = data['n_episodes'];
    final avgReward = data['final_avg_reward'];
    final steps = data['total_steps'];
    final imaginationHorizon = data['imagination_horizon'];

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Card
          Card(
            elevation: 4,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  const Icon(Icons.psychology, size: 48, color: Colors.purple),
                  const SizedBox(height: 8),
                  Text('The AI is dreaming...',
                      style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _statItem('Episodes', '$nEpisodes'),
                      _statItem('Avg Reward',
                          '${(avgReward as double?)?.toStringAsFixed(3)}'),
                      _statItem('Imagined Steps', '$imaginationHorizon'),
                    ],
                  )
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          Text('Learnable Dynamics Latent Space',
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 10),
          Expanded(
            child: Container(
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.black87,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.purpleAccent),
              ),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.auto_graph,
                        color: Colors.greenAccent, size: 64),
                    const SizedBox(height: 16),
                    const Text(
                      'Visualizing 100+ Latent Vectors',
                      style: TextStyle(color: Colors.white70),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Total Steps Experienced: $steps',
                      style:
                          const TextStyle(color: Colors.white30, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _statItem(String label, String value) {
    return Column(
      children: [
        Text(value,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
      ],
    );
  }
}
