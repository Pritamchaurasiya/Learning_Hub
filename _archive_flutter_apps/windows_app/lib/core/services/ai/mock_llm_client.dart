import 'dart:async';
import 'llm_client.dart';

/// Mock and offline fallback implementation of LLMClient
class MockLLMClient implements LLMClient {
  @override
  bool get isAvailable => true;

  @override
  Future<String> generateText(String prompt) async {
    return "Here is a structured response for '$prompt': Break the problem down into fundamentals, build a working prototype, and iterate with tests.";
  }

  @override
  Future<String> chat(List<Map<String, String>> history, String message) async {
    return "Great question! To master '$message', start by understanding the core concepts, implement practical examples step-by-step, and test your solutions thoroughly.";
  }

  @override
  Stream<String> streamChat(
      List<Map<String, String>> history, String message) async* {
    final words = "Great question! To master '$message', start by understanding the core concepts, implement practical examples step-by-step, and test your solutions thoroughly.".split(' ');
    for (final word in words) {
      yield '$word ';
      await Future<void>.delayed(const Duration(milliseconds: 10));
    }
  }
}
