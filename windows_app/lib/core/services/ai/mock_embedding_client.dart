import 'embedding_client.dart';

/// Mock implementation of EmbeddingClient for development and testing
class MockEmbeddingClient implements EmbeddingClient {
  @override
  bool get isAvailable => true;

  @override
  Future<List<double>> generateEmbedding(String text) async {
    // Return a stable, deterministic fake embedding for testing
    return List<double>.generate(768, (i) => (text.length + i) % 100 / 100.0);
  }

  @override
  Future<List<List<double>>> generateEmbeddings(List<String> inputs) async {
    return Future.wait(inputs.map((text) => generateEmbedding(text)));
  }
}
