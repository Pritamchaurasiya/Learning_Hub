# Module 05: NLP & Large Language Models 🗣️

## 🎯 Overview

This module covers Natural Language Processing (NLP) from basics to state-of-the-art Large Language Models (LLMs). You'll understand how ChatGPT, Claude, and Gemini work under the hood.

---

## 📖 What is NLP?

### Definition

NLP is the field of AI that gives computers the ability to understand, interpret, and generate human language.

### Applications

- **Chatbots** (ChatGPT, Customer Service)
- **Translation** (Google Translate)
- **Sentiment Analysis** (Review analysis)
- **Search** (Google, semantic search)
- **Code Generation** (GitHub Copilot)

---

## 🔤 Text Preprocessing

### Step 1: Tokenization

```python
import re

def simple_tokenize(text):
    """Split text into words/tokens."""
    # Lowercase and split on non-alphanumeric
    text = text.lower()
    tokens = re.findall(r'\b\w+\b', text)
    return tokens

text = "Hello, World! How are you doing today?"
tokens = simple_tokenize(text)
# Output: ['hello', 'world', 'how', 'are', 'you', 'doing', 'today']
```

### Step 2: Subword Tokenization (BPE)

```python
# Modern LLMs use Byte Pair Encoding (BPE)
# "unhappiness" → ["un", "happiness"] or ["un", "hap", "pi", "ness"]

# This allows:
# 1. Handle unknown words
# 2. Share subword representations
# 3. Fixed vocabulary size

# Example with tiktoken (GPT tokenizer)
# import tiktoken
# enc = tiktoken.get_encoding("cl100k_base")
# tokens = enc.encode("Hello world!")
# # [9906, 1917, 0]
```

### Step 3: Removing Stop Words

```python
STOP_WORDS = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being'}

def remove_stopwords(tokens):
    return [t for t in tokens if t not in STOP_WORDS]
```

### Step 4: Stemming/Lemmatization

```python
# Stemming: Crude cutting (running → run, better → bett)
def simple_stem(word):
    suffixes = ['ing', 'ed', 'ly', 'es', 's']
    for suffix in suffixes:
        if word.endswith(suffix):
            return word[:-len(suffix)]
    return word

# Lemmatization: Dictionary-based (running → run, better → good)
# Use NLTK or spaCy for proper lemmatization
```

---

## 🔢 Text Representations

### 1. Bag of Words (BoW)

```python
from collections import Counter

def bag_of_words(documents):
    """Convert documents to frequency vectors."""
    # Build vocabulary
    vocab = set()
    for doc in documents:
        vocab.update(simple_tokenize(doc))
    vocab = sorted(vocab)
    word_to_idx = {w: i for i, w in enumerate(vocab)}

    # Convert documents to vectors
    vectors = []
    for doc in documents:
        tokens = simple_tokenize(doc)
        counts = Counter(tokens)
        vector = [counts.get(w, 0) for w in vocab]
        vectors.append(vector)

    return vectors, vocab

docs = ["I love python", "Python is great", "I love coding"]
vectors, vocab = bag_of_words(docs)
# vocab: ['coding', 'great', 'i', 'is', 'love', 'python']
# vectors[0]: [0, 0, 1, 0, 1, 1]  # "I love python"
```

### 2. TF-IDF

```python
import numpy as np

def tfidf(documents):
    """
    TF-IDF = Term Frequency × Inverse Document Frequency

    - High TF-IDF: Word is important in this document
    - Low TF-IDF: Word is common across all documents
    """
    # Get BoW vectors
    bow_vectors, vocab = bag_of_words(documents)
    bow_matrix = np.array(bow_vectors, dtype=float)

    n_docs = len(documents)

    # Calculate IDF
    doc_freq = np.sum(bow_matrix > 0, axis=0)
    idf = np.log((n_docs + 1) / (doc_freq + 1)) + 1

    # Calculate TF-IDF
    tfidf_matrix = bow_matrix * idf

    # Normalize
    norms = np.linalg.norm(tfidf_matrix, axis=1, keepdims=True)
    tfidf_matrix = tfidf_matrix / (norms + 1e-8)

    return tfidf_matrix, vocab
```

### 3. Word Embeddings (Word2Vec)

```python
class Word2Vec:
    """Simplified Word2Vec (Skip-gram) implementation."""

    def __init__(self, vocab_size, embedding_dim=100):
        # Two embedding matrices
        self.W_in = np.random.randn(vocab_size, embedding_dim) * 0.01
        self.W_out = np.random.randn(embedding_dim, vocab_size) * 0.01

    def train_step(self, center_word_idx, context_word_idx, learning_rate=0.01):
        """
        Given "The cat sat on the mat"
        If center = "sat", context = ["cat", "on"]

        Learn: similar contexts → similar embeddings
        """
        # Get center word embedding
        center_embed = self.W_in[center_word_idx]

        # Forward: predict context word
        scores = np.dot(center_embed, self.W_out)
        probs = np.exp(scores) / np.sum(np.exp(scores))

        # Loss gradient
        probs[context_word_idx] -= 1

        # Update output weights
        self.W_out -= learning_rate * np.outer(center_embed, probs)

        # Update input weights
        grad_embed = np.dot(self.W_out, probs)
        self.W_in[center_word_idx] -= learning_rate * grad_embed

    def get_embedding(self, word_idx):
        return self.W_in[word_idx]

    def similarity(self, word1_idx, word2_idx):
        """Cosine similarity between word embeddings."""
        v1 = self.W_in[word1_idx]
        v2 = self.W_in[word2_idx]
        return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))

# Famous property: king - man + woman ≈ queen
# vec("king") - vec("man") + vec("woman") ≈ vec("queen")
```

---

## 🔄 Recurrent Neural Networks (RNN)

### Basic RNN

```python
class SimpleRNN:
    """Basic RNN for sequence modeling."""

    def __init__(self, input_dim, hidden_dim, output_dim):
        # Weights
        self.Wxh = np.random.randn(input_dim, hidden_dim) * 0.01
        self.Whh = np.random.randn(hidden_dim, hidden_dim) * 0.01
        self.Why = np.random.randn(hidden_dim, output_dim) * 0.01

        # Biases
        self.bh = np.zeros((1, hidden_dim))
        self.by = np.zeros((1, output_dim))

    def forward(self, inputs, h_prev):
        """
        Process sequence one timestep at a time.

        h_t = tanh(x_t @ Wxh + h_{t-1} @ Whh + bh)
        y_t = h_t @ Why + by
        """
        outputs = []
        h = h_prev

        for x in inputs:
            h = np.tanh(np.dot(x, self.Wxh) + np.dot(h, self.Whh) + self.bh)
            y = np.dot(h, self.Why) + self.by
            outputs.append(y)

        return outputs, h

# Problem with RNN: Vanishing gradient for long sequences
# Solution: LSTM or GRU
```

### LSTM (Long Short-Term Memory)

```python
class LSTM:
    """LSTM cell - can remember long-term dependencies."""

    def __init__(self, input_dim, hidden_dim):
        self.hidden_dim = hidden_dim

        # Combined weights for efficiency
        # i=input, f=forget, o=output, c=cell
        self.W = np.random.randn(input_dim + hidden_dim, 4 * hidden_dim) * 0.01
        self.b = np.zeros((1, 4 * hidden_dim))

    def forward(self, x, h_prev, c_prev):
        """
        LSTM equations:
        f_t = σ(W_f · [h_{t-1}, x_t] + b_f)   # Forget gate
        i_t = σ(W_i · [h_{t-1}, x_t] + b_i)   # Input gate
        c̃_t = tanh(W_c · [h_{t-1}, x_t] + b_c) # Candidate
        c_t = f_t ⊙ c_{t-1} + i_t ⊙ c̃_t       # Cell state
        o_t = σ(W_o · [h_{t-1}, x_t] + b_o)   # Output gate
        h_t = o_t ⊙ tanh(c_t)                 # Hidden state
        """
        # Concatenate input and previous hidden
        combined = np.concatenate([h_prev, x], axis=1)

        # Compute all gates at once
        gates = np.dot(combined, self.W) + self.b

        # Split into 4 parts
        i = self.sigmoid(gates[:, :self.hidden_dim])
        f = self.sigmoid(gates[:, self.hidden_dim:2*self.hidden_dim])
        o = self.sigmoid(gates[:, 2*self.hidden_dim:3*self.hidden_dim])
        c_tilde = np.tanh(gates[:, 3*self.hidden_dim:])

        # Update cell and hidden state
        c = f * c_prev + i * c_tilde
        h = o * np.tanh(c)

        return h, c

    def sigmoid(self, x):
        return 1 / (1 + np.exp(-np.clip(x, -500, 500)))
```

---

## 🤖 The Transformer Architecture

### Why Transformers?

- RNNs process sequentially (slow)
- Transformers process in parallel (fast)
- Can attend to any position in sequence

### Self-Attention Mechanism

```python
def scaled_dot_product_attention(Q, K, V, mask=None):
    """
    The core of Transformers!

    Attention(Q, K, V) = softmax(QK^T / √d_k) V

    Q = Query: "What am I looking for?"
    K = Key: "What do I contain?"
    V = Value: "What do I output?"
    """
    d_k = K.shape[-1]

    # Compute attention scores
    scores = np.dot(Q, K.T) / np.sqrt(d_k)

    # Apply mask (for causal/padding masking)
    if mask is not None:
        scores = scores + (mask * -1e9)

    # Softmax to get attention weights
    attention_weights = np.exp(scores) / np.sum(np.exp(scores), axis=-1, keepdims=True)

    # Weighted sum of values
    output = np.dot(attention_weights, V)

    return output, attention_weights

# Example: "The cat sat on the mat"
# When processing "sat", attention might focus on "cat" (who sat?)
# and "mat" (where sat?)
```

### Multi-Head Attention

```python
class MultiHeadAttention:
    """Multiple attention heads capture different relationships."""

    def __init__(self, d_model, n_heads):
        self.n_heads = n_heads
        self.d_k = d_model // n_heads

        self.W_q = np.random.randn(d_model, d_model) * 0.01
        self.W_k = np.random.randn(d_model, d_model) * 0.01
        self.W_v = np.random.randn(d_model, d_model) * 0.01
        self.W_o = np.random.randn(d_model, d_model) * 0.01

    def forward(self, x, mask=None):
        batch_size, seq_len, d_model = x.shape

        # Linear projections
        Q = np.dot(x, self.W_q)
        K = np.dot(x, self.W_k)
        V = np.dot(x, self.W_v)

        # Split into heads
        Q = Q.reshape(batch_size, seq_len, self.n_heads, self.d_k).transpose(0, 2, 1, 3)
        K = K.reshape(batch_size, seq_len, self.n_heads, self.d_k).transpose(0, 2, 1, 3)
        V = V.reshape(batch_size, seq_len, self.n_heads, self.d_k).transpose(0, 2, 1, 3)

        # Apply attention to each head
        attn_output, _ = scaled_dot_product_attention(Q, K, V, mask)

        # Concatenate heads
        attn_output = attn_output.transpose(0, 2, 1, 3).reshape(batch_size, seq_len, d_model)

        # Final linear projection
        output = np.dot(attn_output, self.W_o)

        return output
```

### Transformer Block

```python
class TransformerBlock:
    """One layer of a Transformer."""

    def __init__(self, d_model, n_heads, d_ff):
        self.attention = MultiHeadAttention(d_model, n_heads)
        self.norm1 = LayerNorm(d_model)
        self.norm2 = LayerNorm(d_model)

        # Feed-forward network
        self.ff_w1 = np.random.randn(d_model, d_ff) * 0.01
        self.ff_w2 = np.random.randn(d_ff, d_model) * 0.01

    def forward(self, x, mask=None):
        # Self-attention with residual connection
        attn_output = self.attention.forward(x, mask)
        x = self.norm1.forward(x + attn_output)

        # Feed-forward with residual connection
        ff_output = np.maximum(0, np.dot(x, self.ff_w1))  # ReLU
        ff_output = np.dot(ff_output, self.ff_w2)
        x = self.norm2.forward(x + ff_output)

        return x
```

---

## 🌟 Large Language Models (LLMs)

### How LLMs Work

1. **Pretraining**: Learn language patterns from massive text corpus

   - Predict next token given context
   - Billions of parameters
   - Trillions of tokens

2. **Fine-tuning**: Specialize for specific tasks

   - Instruction following (ChatGPT)
   - Code generation (Codex)
   - Conversation (Claude)

3. **RLHF**: Align with human preferences
   - Human feedback on outputs
   - Reward model training
   - Policy optimization

### Key Concepts

```python
# Token Generation (Autoregressive)
def generate_text(model, prompt, max_tokens=100, temperature=1.0):
    """Generate text token by token."""
    tokens = tokenize(prompt)

    for _ in range(max_tokens):
        # Get probability distribution over vocabulary
        logits = model.forward(tokens)

        # Apply temperature (higher = more random)
        probs = softmax(logits[-1] / temperature)

        # Sample next token
        next_token = np.random.choice(len(probs), p=probs)

        tokens.append(next_token)

        if next_token == END_TOKEN:
            break

    return detokenize(tokens)

# Prompt Engineering Tips:
# 1. Be specific: "Write a Python function that..." vs "Write code"
# 2. Give examples (few-shot): "Here's an example: ..."
# 3. Chain of thought: "Let's think step by step..."
# 4. Role playing: "You are an expert Python developer..."
```

---

## 🔍 Retrieval-Augmented Generation (RAG)

```python
class RAGSystem:
    """Combine retrieval with LLM generation."""

    def __init__(self, documents, embedding_model, llm):
        self.documents = documents
        self.embedding_model = embedding_model
        self.llm = llm

        # Pre-compute document embeddings
        self.doc_embeddings = [
            embedding_model.embed(doc) for doc in documents
        ]

    def query(self, question, top_k=3):
        # 1. Embed the question
        q_embedding = self.embedding_model.embed(question)

        # 2. Find most relevant documents
        similarities = [
            cosine_similarity(q_embedding, doc_emb)
            for doc_emb in self.doc_embeddings
        ]
        top_indices = np.argsort(similarities)[-top_k:][::-1]
        relevant_docs = [self.documents[i] for i in top_indices]

        # 3. Create augmented prompt
        context = "\n\n".join(relevant_docs)
        prompt = f"""Based on the following context, answer the question.

Context:
{context}

Question: {question}

Answer:"""

        # 4. Generate answer with LLM
        answer = self.llm.generate(prompt)

        return answer, relevant_docs

# Benefits of RAG:
# 1. Up-to-date information (not just training data)
# 2. Reduces hallucinations (grounded in documents)
# 3. Can cite sources
# 4. Works with private data
```

---

## 🔴 Common Mistakes

1. **Not preprocessing text properly**

   - Always lowercase for classification
   - Handle special characters

2. **Using wrong tokenizer**

   - Use the model's original tokenizer

3. **Ignoring context length limits**

   - GPT-4: 128k tokens
   - Claude: 200k tokens

4. **Temperature too high/low**
   - Factual: 0.0-0.3
   - Creative: 0.7-1.0

---

## ✏️ Exercises

1. Implement Bag of Words and TF-IDF from scratch
2. Build a simple sentiment classifier using word embeddings
3. Implement self-attention mechanism
4. Create a RAG system with your own documents

---

_Next Module: 06_computer_vision.md - CNNs and Image Processing_
