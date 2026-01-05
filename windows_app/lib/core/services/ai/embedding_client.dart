/// Interface for generating text embeddings (vector representations)
abstract class EmbeddingClient {
  /// Generate an embedding vector for the given text
  Future<List<double>> generateEmbedding(String text);

  /// Generate embeddings for a batch of text inputs
  Future<List<List<double>>> generateEmbeddings(List<String> inputs);

  /// Check if the service is configured and available
  bool get isAvailable;
}
