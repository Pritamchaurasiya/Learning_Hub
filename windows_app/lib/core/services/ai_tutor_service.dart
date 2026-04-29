import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'ai/backend_llm_client.dart';
import 'ai/llm_client.dart';

import 'ai/embedding_client.dart';
import 'ai/gemini_embedding_client.dart';
import 'ai/mock_embedding_client.dart';
import '../../data/models/course_model.dart';
import '../repositories/knowledge_repository.dart';

/// AI Tutor persona types
enum TutorPersona {
  socratic,
  mentor,
  coach,
  expert,
  friendly,
  godMode,
}

/// Conversation message
class TutorMessage {
  final String id;
  final String role; // 'user', 'assistant', 'system'
  final String content;
  final DateTime timestamp;
  final Map<String, dynamic>? metadata;

  const TutorMessage({
    required this.id,
    required this.role,
    required this.content,
    required this.timestamp,
    this.metadata,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'role': role,
        'content': content,
        'timestamp': timestamp.toIso8601String(),
        if (metadata != null) 'metadata': metadata,
      };

  factory TutorMessage.fromJson(Map<String, dynamic> json) {
    return TutorMessage(
      id: json['id'] as String,
      role: json['role'] as String,
      content: json['content'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }
}

/// Conversation context for AI tutor
class ConversationContext {
  final String id;
  final String? lessonId;
  final String? courseId;
  final String? topicName;
  final List<TutorMessage> messages;
  final Map<String, dynamic>? learnerProfile;
  final DateTime createdAt;
  final DateTime updatedAt;

  const ConversationContext({
    required this.id,
    this.lessonId,
    this.courseId,
    this.topicName,
    this.messages = const [],
    this.learnerProfile,
    required this.createdAt,
    required this.updatedAt,
  });

  ConversationContext addMessage(TutorMessage message) {
    return ConversationContext(
      id: id,
      lessonId: lessonId,
      courseId: courseId,
      topicName: topicName,
      messages: [...messages, message],
      learnerProfile: learnerProfile,
      createdAt: createdAt,
      updatedAt: DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        if (lessonId != null) 'lessonId': lessonId,
        if (courseId != null) 'courseId': courseId,
        if (topicName != null) 'topicName': topicName,
        'messages': messages.map((m) => m.toJson()).toList(),
        if (learnerProfile != null) 'learnerProfile': learnerProfile,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
      };

  factory ConversationContext.fromJson(Map<String, dynamic> json) {
    return ConversationContext(
      id: json['id'] as String,
      lessonId: json['lessonId'] as String?,
      courseId: json['courseId'] as String?,
      topicName: json['topicName'] as String?,
      messages: (json['messages'] as List?)
              ?.map((m) => TutorMessage.fromJson(m as Map<String, dynamic>))
              .toList() ??
          [],
      learnerProfile: json['learnerProfile'] as Map<String, dynamic>?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }
}

/// Code execution result
class CodeExecutionResult {
  final bool success;
  final String? output;
  final String? error;
  final Duration executionTime;

  const CodeExecutionResult({
    required this.success,
    this.output,
    this.error,
    required this.executionTime,
  });
}

/// AI Tutor response
class TutorResponse {
  final String message;
  final List<String> suggestedFollowUps;
  final List<String> sources;
  final Map<String, dynamic>? codeExample;
  final String? explanation;
  final double confidence;

  const TutorResponse({
    required this.message,
    this.suggestedFollowUps = const [],
    this.sources = const [],
    this.codeExample,
    this.explanation,
    this.confidence = 0.9,
  });
}

/// Enhanced AI Tutor service with LLM integration patterns
class AiTutorService {
  static final AiTutorService _instance = AiTutorService._();
  static AiTutorService get instance => _instance;

  AiTutorService._() {
    _initializeClient();
  }

  static const String _conversationsBoxName = 'ai_tutor_conversations_v2';

  late LLMClient _client;
  late EmbeddingClient _embeddingClient;
  late KnowledgeRepository _knowledgeRepository;
  Box<dynamic>?
      _conversationsBox; // Nullable for test safety - initialized in initialize()
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();
  static const String _encryptionKeyPath = 'ai_tutor_encryption_key';

  final Map<String, ConversationContext> _conversations = {};
  TutorPersona _currentPersona = TutorPersona.socratic;
  String? _activeConversationId;

  void _initializeClient() {
    // 1. Try Backend (Primary)
    // We assume backend is available if not in a pure offline/mock mode
    // In a real app, we might check connectivity or feature flags
    _client = BackendLLMClient();

    // 2. Fallback to Gemini (Direct) if configured and backend fails?
    // For now, we instantiate backend client.
    // If we wanted a true fallback chain, we'd need a CompositeClient.
    // But for this phase, we switch to Backend as primary.

    // We keep Gemini for Embedding since backend embedding might not be ready
    // or we want local RAG
    const geminiKey = String.fromEnvironment('GEMINI_API_KEY');
    if (geminiKey.isNotEmpty) {
      if (kDebugMode) {
        debugPrint(
            '[AiTutorService] Gemini Key found. Using Gemini for Embeddings.');
      }
      _embeddingClient = GeminiEmbeddingClient();
    } else {
      _embeddingClient = MockEmbeddingClient();
    }

    _knowledgeRepository = KnowledgeRepository(_embeddingClient);
  }

  /// Index a course for RAG search
  Future<void> indexCourse(Course course) async {
    await _knowledgeRepository.indexCourse(course);
  }

  /// Batch index multiple courses
  Future<void> indexAllCourses(List<Course> courses) async {
    for (final course in courses) {
      await indexCourse(course);
    }
  }

  /// Knowledge base for common topics
  static const Map<String, Map<String, dynamic>> _knowledgeBase = {
    'riverpod': {
      'definition': 'A reactive state-management framework for Flutter',
      'keyPoints': [
        'Compile-safe: Catches errors at compile time',
        'Testable: Easy to mock and override providers',
        'Independent: Does not depend on widget tree',
        'Declarative: State changes are reactive',
      ],
      'codeExample': '''
// Define a provider
final counterProvider = StateProvider<int>((ref) => 0);

// Use in widget
class Counter extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(counterProvider);
    return Text('Count: \$count');
  }
}''',
      'sources': ['Official Riverpod Docs', 'Flutter State Management Guide'],
    },
    'flutter widgets': {
      'definition': 'Building blocks of Flutter UI',
      'keyPoints': [
        'Everything is a widget',
        'Immutable by design',
        'Compose small widgets into complex UI',
        'StatelessWidget vs StatefulWidget',
      ],
      'codeExample': '''
class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      child: Text('Hello Flutter!'),
    );
  }
}''',
      'sources': ['Flutter Widget Catalog', 'Flutter API Docs'],
    },
    'state management': {
      'definition': 'Managing application state across widgets',
      'keyPoints': [
        'Local state: setState, ValueNotifier',
        'App state: Provider, Riverpod, Bloc',
        'Choose based on complexity',
        'Separation of concerns',
      ],
      'sources': ['Flutter State Management Docs'],
    },
    'async programming': {
      'definition': 'Handling asynchronous operations in Dart',
      'keyPoints': [
        'Future for single async results',
        'Stream for multiple async events',
        'async/await syntax',
        'Error handling with try/catch',
      ],
      'codeExample': '''
Future<String> fetchData() async {
  try {
    final response = await http.get(Uri.parse('api/data'));
    return response.body;
    } catch (e) {
      throw ServerException(message: 'Failed to fetch: \$e', originalError: e);
    }
}''',
      'sources': ['Dart Async Programming'],
    },
    'flutter web': {
      'definition': 'Running Flutter applications in a web browser',
      'keyPoints': [
        'Single codebase for mobile and web',
        'Two renderers: HTML (size) and CanvasKit (performance/fidelity)',
        'PWA support out of the box',
        'Responsive layout required',
      ],
      'sources': ['Flutter Web Docs', 'Building PWAs with Flutter'],
    },
    'pwa': {
      'definition': 'Progressive Web App - web apps that feel like native apps',
      'keyPoints': [
        'Installable on home screen',
        'Works offline (service workers)',
        'Fast and engaging',
        'Discoverable by search engines',
      ],
      'sources': ['web.dev/pwa', 'Flutter PWA Support'],
    },
    'clean architecture': {
      'definition': 'Architecture pattern separating concerns into layers',
      'keyPoints': [
        'Domain Layer: Business logic (Entities, Use Cases)',
        'Data Layer: Data retrieval (Repositories, Data Sources)',
        'Presentation Layer: UI and State Management',
        'Dependency Rule: Outer layers depend on inner layers',
      ],
      'codeExample': '''
// Domain Entity
class User { final String id; ... }

// Use Case
class GetUser {
  final UserRepository repo;
  Future<User> call(String id) => repo.getUser(id);
}

// Data Repository Implementation
class UserRepositoryImpl implements UserRepository { ... }
''',
      'sources': [
        'Uncle Bob Clean Architecture',
        'Reso Coder Flutter Clean Architecture'
      ],
    },
    'performance': {
      'definition': 'Optimizing Flutter app speed and responsiveness',
      'keyPoints': [
        'Build method optimization (const constructors)',
        'List rendering (ListView.builder)',
        'Image caching and resizing',
        'Isolates for heavy computation',
      ],
      'sources': ['Flutter Performance Best Practices'],
    },
    'solid': {
      'definition': 'Five design principles for object-oriented programming',
      'keyPoints': [
        'SRP: Single Responsibility Principle',
        'OCP: Open/Closed Principle',
        'LSP: Liskov Substitution Principle',
        'ISP: Interface Segregation Principle',
        'DIP: Dependency Inversion Principle',
      ],
      'codeExample': '''
// SRP: Good
class UserAuth { void login() {} }
class UserEmail { void sendEmail() {} }

// DIP: Good
abstract class Database { void save(); }
class SQLDatabase implements Database { ... }
''',
      'sources': ['SOLID Principles Guide'],
    },
  };

  /// Initialize the service with encrypted storage
  Future<void> initialize() async {
    // 1. Manage encryption key securely
    final containsKey =
        await _secureStorage.containsKey(key: _encryptionKeyPath);
    if (!containsKey) {
      final key = Hive.generateSecureKey();
      await _secureStorage.write(
        key: _encryptionKeyPath,
        value: base64UrlEncode(key),
      );
    }

    final keyString = await _secureStorage.read(key: _encryptionKeyPath);
    final encryptionKey = base64Url.decode(keyString!);

    // 2. Open box with AES encryption
    _conversationsBox = await Hive.openBox(
      _conversationsBoxName,
      encryptionCipher: HiveAesCipher(encryptionKey),
    );
    _loadConversations();
  }

  /// Dispose of resources - close the Hive box
  /// Call this at app shutdown or when the service is no longer needed
  Future<void> dispose() async {
    try {
      await _conversationsBox?.close();
      _conversationsBox = null;
      _conversations.clear();
      _activeConversationId = null;
      if (kDebugMode) debugPrint('[AiTutorService] Disposed successfully');
    } catch (e) {
      if (kDebugMode) debugPrint('[AiTutorService] Error disposing: $e');
    }
  }

  /// Set tutor persona
  void setPersona(TutorPersona persona) {
    _currentPersona = persona;
  }

  /// Generate response with context
  Future<TutorResponse> generateResponse(
    String query, {
    Map<String, dynamic>? context,
    String? conversationId,
  }) async {
    // Simulate LLM latency
    await Future<void>.delayed(
        Duration(milliseconds: 500 + Random().nextInt(800)));

    // Get or create conversation
    final convId =
        conversationId ?? _activeConversationId ?? _createConversation(context);
    _activeConversationId = convId;

    // Add user message to context
    final userMessage = TutorMessage(
      id: 'msg_${DateTime.now().millisecondsSinceEpoch}',
      role: 'user',
      content: query,
      timestamp: DateTime.now(),
    );
    _addMessageToConversation(convId, userMessage);

    // 1. RAG: Knowledge retrieval
    String enrichedPrompt = query;
    List<String> sources = [];

    try {
      final snippets = await _knowledgeRepository.findRelevantSnippets(query);
      if (snippets.isNotEmpty) {
        final contextText = snippets.take(3).map((s) => s.text).join('\n\n');
        enrichedPrompt =
            'Context from course materials:\n$contextText\n\nQuestion: $query';
        sources = snippets.take(3).map((s) => 'Course: ${s.source}').toList();
      }
    } catch (e) {
      if (kDebugMode) debugPrint('[AiTutorService] RAG retrieval failed: $e');
    }

    // Delegate to LLM Client
    try {
      final history = _conversations[convId]?.messages ?? [];
      final formattedHistory = history
          .map((m) => {
                'role': m.role,
                'content': m.content,
              })
          .toList();

      final responseText = await _client.chat(formattedHistory, enrichedPrompt);

      final response = TutorResponse(
        message: responseText,
        suggestedFollowUps: [
          'Tell me more',
          'Show an example',
          'Explain this differently'
        ],
        sources: sources.isNotEmpty ? sources : ['AI Model Knowledge'],
        confidence: 1.0,
      );

      _addAssistantMessage(convId, response.message, metadata: {
        'suggestedFollowUps': response.suggestedFollowUps,
      });
      return response;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[AiTutorService] Error generating response: $e');
      }
      rethrow;
    }
  }

  /// Build response from knowledge base
  TutorResponse _buildKnowledgeResponse(
      String topic, Map<String, dynamic> knowledge) {
    final buffer = StringBuffer();
    buffer.writeln('**${topic.toUpperCase()}**');
    buffer.writeln();
    buffer.writeln(knowledge['definition']);
    buffer.writeln();

    if (knowledge['keyPoints'] != null) {
      buffer.writeln('**Key Points:**');
      for (final point in knowledge['keyPoints'] as List) {
        buffer.writeln('• $point');
      }
      buffer.writeln();
    }

    final codeExample = knowledge['codeExample'] as String?;

    buffer.writeln(
        '*Would you like a ${codeExample != null ? 'code example or ' : ''}deeper explanation?*');

    return TutorResponse(
      message: buffer.toString(),
      suggestedFollowUps: const [
        'Show me a code example',
        'What are common mistakes?',
        'How does it compare to alternatives?',
      ],
      sources: List<String>.from(
          (knowledge['sources'] ?? <String>[]) as Iterable<dynamic>),
      codeExample: codeExample != null
          ? {'language': 'dart', 'code': codeExample}
          : null,
    );
  }

  /// Generate quiz response
  TutorResponse _generateQuizResponse(Map<String, dynamic>? context) {
    final lessonName = context?['lessonName'] ?? 'Flutter';

    return TutorResponse(
      message: '''I can quiz you on **$lessonName**!

**Question 1:** What is the difference between `main()` and `runApp()` in Flutter?
A) They are the same function
B) `main()` is the Dart entry point, `runApp()` inflates the widget tree
C) `runApp()` starts the Dart isolate

*Type A, B, or C to answer.*''',
      suggestedFollowUps: const [
        'Give me a hint',
        'Skip this question',
        'Explain the answer',
      ],
    );
  }

  /// Generate code explanation
  TutorResponse _generateCodeExplanation(
      String query, Map<String, dynamic>? context) {
    return const TutorResponse(
      message: '''Let me explain the code concept you're asking about.

When analyzing code, I look for:
1. **Purpose**: What problem does it solve?
2. **Structure**: How is it organized?
3. **Flow**: How does data move through it?
4. **Patterns**: What design patterns are used?

*Paste the specific code you'd like me to explain.*''',
      suggestedFollowUps: [
        'What are best practices?',
        'How can I optimize this?',
        'Show me an alternative approach',
      ],
    );
  }

  /// Generate personalized response based on persona
  TutorResponse _generatePersonalizedResponse(
      String query, Map<String, dynamic>? context) {
    final lessonName = context?['lessonName'] ?? 'General';

    String intro;
    switch (_currentPersona) {
      case TutorPersona.socratic:
        intro =
            "That's an interesting question! Let me guide you to discover the answer.";
        break;
      case TutorPersona.mentor:
        intro =
            "Great question! Based on my experience, here's what you should know.";
        break;
      case TutorPersona.coach:
        intro =
            "You're making great progress! Let's work through this together.";
        break;
      case TutorPersona.expert:
        intro = "Here's the technical explanation:";
        break;
      case TutorPersona.friendly:
        intro = 'Hey! Good question - let me break this down for you.';
        break;
      case TutorPersona.godMode:
        intro =
            '⚡ **GOD MODE ACTIVATED** ⚡\nDirecting neural focus to kernel-level analysis:';
        break;
    }

    return TutorResponse(
      message: '''$intro

On "$query" in the context of **$lessonName**:

To master this effectively:
1. Break it down into small, manageable parts
2. Practice with hands-on code examples
3. Review the official documentation
4. Test your understanding with exercises

*Shall we dive deeper into a specific aspect?*''',
      suggestedFollowUps: const [
        'Give me a practical example',
        'What are common pitfalls?',
        'Quiz me on this topic',
      ],
    );
  }

  /// Simulate code execution (sandbox)
  Future<CodeExecutionResult> executeCode(String code, String language) async {
    final stopwatch = Stopwatch()..start();

    // Simulate execution delay
    await Future<void>.delayed(
        Duration(milliseconds: 200 + Random().nextInt(300)));

    stopwatch.stop();

    // ⚡ GOD-TIER SECURITY: Hardened sandbox with broad restriction patterns
    const forbiddenPatterns = [
      'dart:io',
      'dart:mirrors',
      'dart:ffi',
      'Process.',
      'File(',
      'Directory(',
      'Platform.',
      'InternetAddress',
      'Socket.',
      'RawSocket',
      'HttpServer',
      'HttpClient',
      'dynamic', // Prevent dynamic invocation escapes
    ];

    for (final pattern in forbiddenPatterns) {
      if (code.contains(pattern)) {
        return CodeExecutionResult(
          success: false,
          error: 'Sandbox error: Forbidden operation detected ($pattern)',
          executionTime: stopwatch.elapsed,
        );
      }
    }

    // Simulate successful output for safe code
    if (code.contains('print(')) {
      final printMatch = RegExp(r"print\((['\x22])(.*?)\1\)").firstMatch(code);
      final output = printMatch?.group(2) ?? 'Code executed successfully';

      return CodeExecutionResult(
        success: true,
        output: output,
        executionTime: stopwatch.elapsed,
      );
    }

    return CodeExecutionResult(
      success: true,
      output: 'Code compiled successfully',
      executionTime: stopwatch.elapsed,
    );
  }

  /// Stream response with real-time updates
  Stream<TutorResponse> streamGenerateResponse(
    String query, {
    Map<String, dynamic>? context,
    String? conversationId,
  }) async* {
    // Get or create conversation
    final convId =
        conversationId ?? _activeConversationId ?? _createConversation(context);
    _activeConversationId = convId;

    // Add user message
    final userMessage = TutorMessage(
      id: 'msg_${DateTime.now().millisecondsSinceEpoch}',
      role: 'user',
      content: query,
      timestamp: DateTime.now(),
    );
    _addMessageToConversation(convId, userMessage);

    // 0. Knowledge Base Match (Rule-based) - PRIORITY
    // This preserves structured data (code examples, sources) that raw LLM text streams usually lose.
    final lowerQuery = query.toLowerCase();
    for (final entry in _knowledgeBase.entries) {
      if (lowerQuery.contains(entry.key)) {
        final cannedResponse = _buildKnowledgeResponse(entry.key, entry.value);

        // Stream the canned response
        final fullText = cannedResponse.message;
        for (int i = 0; i < fullText.length; i++) {
          await Future<void>.delayed(const Duration(milliseconds: 15));
          yield TutorResponse(
            message: fullText[i], // Yield char delta
            suggestedFollowUps: cannedResponse.suggestedFollowUps,
            sources: cannedResponse.sources,
            codeExample: cannedResponse.codeExample,
          );
        }

        _addAssistantMessage(convId, fullText, metadata: {
          'sources': cannedResponse.sources,
          'codeExample': cannedResponse.codeExample,
          'suggestedFollowUps': cannedResponse.suggestedFollowUps,
        });
        return; // Exit after serving knowledge base response
      }
    }

    // Special Handlers for "quiz" or "code" if not matched above
    if (lowerQuery.contains('quiz') || lowerQuery.contains('test me')) {
      final quizResponse = _generateQuizResponse(context);
      final fullText = quizResponse.message;
      for (int i = 0; i < fullText.length; i++) {
        await Future<void>.delayed(const Duration(milliseconds: 15));
        yield TutorResponse(
            message: fullText[i],
            suggestedFollowUps: quizResponse.suggestedFollowUps);
      }
      _addAssistantMessage(convId, fullText);
      return;
    }

    // 1. RAG Retrieval
    String enrichedPrompt = query;
    List<String> sources = [];
    try {
      final snippets = await _knowledgeRepository.findRelevantSnippets(query);
      if (snippets.isNotEmpty) {
        final contextText = snippets.take(3).map((s) => s.text).join('\n\n');
        enrichedPrompt =
            'Context from course materials:\n$contextText\n\nQuestion: $query';
        sources = snippets.take(3).map((s) => 'Course: ${s.source}').toList();
      }
    } catch (e) {
      if (kDebugMode) debugPrint('[AiTutor] RAG error: $e');
    }

    // Initial yield with sources/metadata
    yield TutorResponse(
      message: '',
      sources: sources.isNotEmpty ? sources : ['AI Model'],
      suggestedFollowUps: [],
    );

    // Stream from LLM
    final history = _conversations[convId]?.messages ?? [];
    final formattedHistory = history
        .map((m) => {
              'role': m.role,
              'content': m.content,
            })
        .toList();

    final buffer = StringBuffer();

    try {
      await for (final chunk
          in _client.streamChat(formattedHistory, enrichedPrompt)) {
        buffer.write(chunk);
        yield TutorResponse(
          message: chunk, // Yield delta
          sources: sources,
        );
      }

      // Save full response
      _addAssistantMessage(convId, buffer.toString(), metadata: {
        'sources': sources,
      });
    } catch (e) {
      debugPrint('[AiTutor] Stream error: $e');
      yield const TutorResponse(
        message: 'Error generating response.',
        confidence: 0,
      );
    }
  }

  /// Deprecated: Use streamGenerateResponse
  Stream<String> streamResponse(String query,
      {Map<String, dynamic>? context}) async* {
    await for (final response
        in streamGenerateResponse(query, context: context)) {
      yield response.message;
    }
  }

  /// Get suggested follow-up questions
  List<String> getSources(String query) {
    final lowerQuery = query.toLowerCase();
    for (final entry in _knowledgeBase.entries) {
      if (lowerQuery.contains(entry.key)) {
        return List<String>.from(
            (entry.value['sources'] ?? <String>[]) as Iterable<dynamic>);
      }
    }
    return [];
  }

  /// Create new conversation
  String _createConversation(Map<String, dynamic>? context) {
    final id = 'conv_${DateTime.now().millisecondsSinceEpoch}';
    final now = DateTime.now();

    _conversations[id] = ConversationContext(
      id: id,
      lessonId: context?['lessonId'] as String?,
      courseId: context?['courseId'] as String?,
      topicName: context?['lessonName'] as String?,
      learnerProfile: context,
      createdAt: now,
      updatedAt: now,
    );

    return id;
  }

  /// Add message to conversation with token-based sliding window
  void _addMessageToConversation(String convId, TutorMessage message) {
    final conv = _conversations[convId];
    if (conv != null) {
      var updated = conv.addMessage(message);

      // God-Tier RAG Optimization: Sliding Window by Token Count
      // We estimate 1 token ≈ 4 characters. Limit to ~2000 tokens.
      const int maxTokens = 2000;
      const int charsPerToken = 4;
      const int maxChars = maxTokens * charsPerToken;

      final int currentChars =
          updated.messages.fold(0, (sum, m) => sum + m.content.length);

      if (currentChars > maxChars) {
        final trimmedMessages = <TutorMessage>[];
        int keptChars = 0;

        // Keep messages from the END (most recent) until we hit the limit
        for (final msg in updated.messages.reversed) {
          if (keptChars + msg.content.length <= maxChars) {
            trimmedMessages.insert(0, msg);
            keptChars += msg.content.length;
          } else {
            break; // Stop once we exceed the limit
          }
        }

        updated = ConversationContext(
          id: updated.id,
          lessonId: updated.lessonId,
          courseId: updated.courseId,
          topicName: updated.topicName,
          messages: trimmedMessages,
          learnerProfile: updated.learnerProfile,
          createdAt: updated.createdAt,
          updatedAt: DateTime.now(),
        );
      }

      _conversations[convId] = updated;
      _saveConversations(convId);
    }
  }

  /// Add assistant message
  void _addAssistantMessage(String convId, String content,
      {Map<String, dynamic>? metadata}) {
    _addMessageToConversation(
      convId,
      TutorMessage(
        id: 'msg_${DateTime.now().millisecondsSinceEpoch}',
        role: 'assistant',
        content: content,
        timestamp: DateTime.now(),
        metadata: metadata,
      ),
    );
  }

  /// Get conversation history
  List<TutorMessage> getConversationHistory([String? convId]) {
    final id = convId ?? _activeConversationId;
    return _conversations[id]?.messages ?? [];
  }

  /// Clear conversation
  void clearConversation([String? convId]) {
    final id = convId ?? _activeConversationId;
    if (id != null) {
      _conversations.remove(id);
      if (_activeConversationId == id) {
        _activeConversationId = null;
      }
      _conversationsBox?.delete(id); // Explicitly remove from Hive
    }
  }

  /// Load conversations from storage
  void _loadConversations() {
    if (_conversationsBox == null) return;
    try {
      _conversations.clear();
      for (final key in _conversationsBox!.keys) {
        final json = _conversationsBox!.get(key);
        if (json != null) {
          final data = jsonDecode(json as String);
          _conversations[key.toString()] =
              ConversationContext.fromJson(data as Map<String, dynamic>);
        }
      }
    } catch (e) {
      if (kDebugMode) debugPrint('Failed to load conversations: $e');
    }
  }

  /// Save conversations to storage
  Future<void> _saveConversations([String? conversationId]) async {
    if (_conversationsBox == null) return;
    try {
      final targetId = conversationId ?? _activeConversationId;
      final conv = _conversations[targetId];
      if (conv != null && targetId != null) {
        await _conversationsBox!.put(
          targetId,
          jsonEncode(conv.toJson()),
        );
      }
    } catch (e) {
      if (kDebugMode) debugPrint('Failed to save conversations: $e');
    }
  }

  /// Get all conversation IDs
  List<String> get conversationIds => _conversations.keys.toList();

  /// Get active conversation ID
  String? get activeConversationId => _activeConversationId;

  /// Set active conversation
  void setActiveConversation(String id) {
    if (_conversations.containsKey(id)) {
      _activeConversationId = id;
    }
  }
}

/// A Mock LLM Client that preserves the original hardcoded knowledge base
class MockLLMClient implements LLMClient {
  final AiTutorService _service;
  MockLLMClient(this._service);

  @override
  bool get isAvailable => true;

  @override
  Future<String> generateText(String prompt) async {
    return 'Simulated response for: $prompt';
  }

  @override
  Future<String> chat(List<Map<String, String>> history, String message) async {
    final query = message.toLowerCase();

    for (final entry in AiTutorService._knowledgeBase.entries) {
      if (query.contains(entry.key)) {
        return _service._buildKnowledgeResponse(entry.key, entry.value).message;
      }
    }

    if (query.contains('quiz') || query.contains('test me')) {
      return _service._generateQuizResponse(null).message;
    }

    if (query.contains('code') || query.contains('explain')) {
      return _service._generateCodeExplanation(message, null).message;
    }

    return _service._generatePersonalizedResponse(message, null).message;
  }

  @override
  Stream<String> streamChat(
      List<Map<String, String>> history, String message) async* {
    // Basic simulation: Get full text, then yield chars
    final fullText = await chat(history, message);
    for (int i = 0; i < fullText.length; i++) {
      yield fullText[i];
      await Future<void>.delayed(const Duration(milliseconds: 10));
    }
  }
}
