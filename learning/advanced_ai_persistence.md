# Advanced AI Systems: Context, Persistence & Security

## 1. Sliding Window Context Management

### The Challenge
Large Language Models (LLMs) have a fixed "context window" (e.g., 8k, 32k, 1M tokens). Sending your entire chat history with every request is inefficient and expensive. It increases latency and can even exceed the model's token limit, causing errors.

### Implementation: Token-Aware Trimming
Instead of just counting messages, we implement a "sliding window" that preserves the most important parts of the conversation while discarding the oldest messages.

```dart
List<Message> getTrimmedHistory(List<Message> fullHistory, {int maxTokens = 30000}) {
  final systemPrompt = fullHistory.first; // Always keep the system prompt
  final recentMessages = <Message>[];
  int currentTokenCount = estimateTokens(systemPrompt.content);

  // Add messages from newest to oldest until we fill the context window
  for (var i = fullHistory.length - 1; i > 0; i--) {
    final message = fullHistory[i];
    final messageTokens = estimateTokens(message.content);

    if (currentTokenCount + messageTokens <= maxTokens) {
      recentMessages.insert(0, message); // Add to the beginning to maintain order
      currentTokenCount += messageTokens;
    } else {
      break; // Stop when the context window is full
    }
  }

  return [systemPrompt, ...recentMessages];
}

int estimateTokens(String text) {
  // A rough but effective estimation
  return (text.length / 3).ceil();
}
```

## 2. Robust Local Persistence with Hive

### Why Hive?
- **NoSQL & Schemaless**: Perfect for storing unstructured conversation data (which is basically JSON).
- **Fast**: It's a lightweight key-value store written in pure Dart, making it very fast for simple reads and writes.
- **Easy to Use**: Simple, intuitive API.

### Hive Box Types
- **`Box`**: A standard box that loads all its data into memory when opened. Fast for small to medium datasets.
- **`LazyBox`**: Only loads keys into memory when opened. Values are fetched from disk only when you access them. Use this if you have a very large dataset that won't fit in memory.

For our chat history, a standard `Box` is perfect.

### Data Encryption at Rest
By default, Hive stores data in plaintext on the device. This is a security risk. We can easily encrypt our Hive box to protect user data.

```dart
// 1. Generate a secure encryption key
final encryptionKey = Hive.generateSecureKey();

// 2. Store the key securely (e.g., using flutter_secure_storage)
// ... store key ...

// 3. Open the box with the encryption key
final encryptedBox = await Hive.openBox(
  'conversations',
  encryptionCipher: HiveAesCipher(encryptionKey),
);
```

## 3. Secure API Design: HMAC Request Signing

### The Threat
How do you ensure that requests to your backend are actually from your app and not from a malicious actor? API keys can be stolen from your app's code. **Request signing** is the answer.

### HMAC-SHA256 Implementation
We use a **Hash-based Message Authentication Code (HMAC)** to create a unique signature for each request.

**Flow:**
1.  **Client:** Creates a unique message by combining the request details (timestamp, method, path) and a shared secret.
2.  **Client:** Hashes this message with the secret key using HMAC-SHA256 to create a `signature`.
3.  **Client:** Sends the `signature` and `timestamp` in the request headers.
4.  **Server:** Recreates the signature using the same logic and the same secret key.
5.  **Server:** If the signatures match and the timestamp is recent (e.g., within the last 5 minutes), the request is considered authentic.

```dart
// api_client.dart
import 'package:crypto/crypto.dart';
import 'dart:convert';

String signRequest(String method, String path, String secret) {
  final timestamp = DateTime.now().millisecondsSinceEpoch;
  final message = '$timestamp.$method.$path';
  
  final key = utf8.encode(secret);
  final messageBytes = utf8.encode(message);
  
  final hmac = Hmac(sha256, key);
  final digest = hmac.convert(messageBytes);
  
  return base64.encode(digest.bytes);
}
```
**Security Note**: In a real production app, the `secret` should not be hardcoded in the client. It should be a session key that is exchanged dynamically after the user logs in.

## 4. Engineering Mindset Checklist
- [x] **Edge Cases**: What if I update data that isn't currently on screen?
- [x] **Resource Limits**: What if the conversation grows to 100MB? (Fixed by token-aware trimming).
- [x] **Security**: Is my API usage traceable and secure? (Fixed by request signing).
- [x] **Data Privacy**: Is user data protected if the device is compromised? (Fixed by encryption at rest).
- [x] **Feedback Loops**: Do I handle failures gracefully? (Retries, offline logic).
