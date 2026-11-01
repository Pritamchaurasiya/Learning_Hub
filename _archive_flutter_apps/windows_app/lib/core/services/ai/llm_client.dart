/// Abstract interface for LLM providers
abstract class LLMClient {
  /// Generate a text response
  Future<String> generateText(String prompt);

  /// Generate a response with chat history context
  Future<String> chat(List<Map<String, String>> history, String message);

  /// Stream a response with chat history context
  Stream<String> streamChat(List<Map<String, String>> history, String message);

  /// Check if the service is configured and available
  bool get isAvailable;
}
