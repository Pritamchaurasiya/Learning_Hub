import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/core/network/api_client.dart';

final causalGraphProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final apiClient = ref.watch(apiClientProvider);
  final response = await apiClient.get('ai/causal/graph/');
  return response.data ?? {};
});

class CausalGraphScreen extends ConsumerStatefulWidget {
  const CausalGraphScreen({super.key});

  @override
  ConsumerState<CausalGraphScreen> createState() => _CausalGraphScreenState();
}

class _CausalGraphScreenState extends ConsumerState<CausalGraphScreen> {
  String? _interventionResult;

  Future<void> _performIntervention(String treatment, int value) async {
    try {
      final apiClient = ref.read(apiClientProvider);
      final response = await apiClient.post(
        'ai/causal/intervene/',
        data: {'treatment': treatment, 'value': value},
      );
      setState(() {
        final data = response.data?['data'] as Map<String, dynamic>?;
        _interventionResult = data != null
            ? "${data['explanation']}\nExpected Value: ${(data['expected_value'] as double).toStringAsFixed(2)}"
            : 'No result';
      });
    } on Exception catch (e) {
      setState(() {
        _interventionResult = 'Error: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final graphAsync = ref.watch(causalGraphProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Causal Inference (Phase 31)')),
      body: Row(
        children: [
          // Left: Graph Visualization & Stats
          Expanded(
            flex: 2,
            child: graphAsync.when(
              data: (data) => _buildGraphPanel(context, data),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, s) => Center(child: Text('Error: $e')),
            ),
          ),
          // Right: Intervention Controls
          Expanded(
            child: Card(
              margin: const EdgeInsets.all(16),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text('Intervention Engine (Do-Calculus)',
                        style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 20),
                    ElevatedButton.icon(
                      icon: const Icon(Icons.medical_services),
                      label: const Text('DO(Smoking = True)'),
                      onPressed: () => _performIntervention('smoking', 1),
                      style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.redAccent,
                          foregroundColor: Colors.white),
                    ),
                    const SizedBox(height: 10),
                    ElevatedButton.icon(
                      icon: const Icon(Icons.health_and_safety),
                      label: const Text('DO(Smoking = False)'),
                      onPressed: () => _performIntervention('smoking', 0),
                      style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green,
                          foregroundColor: Colors.white),
                    ),
                    const Divider(height: 40),
                    if (_interventionResult != null)
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.blueGrey.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(_interventionResult!,
                            style:
                                const TextStyle(fontWeight: FontWeight.bold)),
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

  Widget _buildGraphPanel(BuildContext context, Map<String, dynamic> data) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              Chip(label: Text("Edges: ${data['graph_edges']}")),
              Chip(
                  label: Text(
                      "ATE (Smoking->Cancer): ${(data['ate_smoking_cancer'] as double?)?.toStringAsFixed(3)}")),
              const Chip(label: Text('Algorithm: PC')),
            ],
          ),
        ),
        Expanded(
          child: Center(
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey),
                borderRadius: BorderRadius.circular(150), // Circle layout
              ),
              child: Stack(
                children: [
                  _node('Smoking', Alignment.topLeft, Colors.orange),
                  _node('Cancer', Alignment.bottomCenter, Colors.red),
                  _node('Yellow Fingers', Alignment.topRight, Colors.yellow),
                  _node('Genetics', Alignment.bottomLeft, Colors.blue),
                  const Center(child: Icon(Icons.arrow_downward)),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _node(String label, Alignment alignment, Color color) {
    return Align(
      alignment: alignment,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: CircleAvatar(
          radius: 30,
          backgroundColor: color.withValues(alpha: 0.2),
          child: Text(label,
              style: TextStyle(
                  fontSize: 10, color: color, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center),
        ),
      ),
    );
  }
}
