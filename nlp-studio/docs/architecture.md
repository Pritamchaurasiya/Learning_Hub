# NLP Studio — Architecture Documentation

## Overview
NLP Studio is an enterprise-grade, full-stack web application that operates entirely client-side. It provides advanced Natural Language Processing capabilities without requiring a backend server for the core NLP logic, ensuring maximum privacy, low latency, and high scalability.

## Core Architecture

### 1. Reactive State Management (`src/core/store.js`)
Uses a custom Proxy-based reactive store. This allows components to subscribe to specific paths in the state and re-render only when that data changes.
- **Path-based subscriptions**: `store.subscribe('nlp.results.sentiment', callback)`
- **Immutability**: State is deep-cloned to prevent direct mutations.
- **Middleware**: Supports extensible middleware for logging, persistence, or sync.

### 2. Event-Driven Communication (`src/core/event-bus.js`)
Decouples UI components from business logic. Components emit events for user actions, and service modules listen to these events.
- **Events**: `toast`, `error:global`, `analysis:start`, `analysis:complete`.

### 3. NLP Pipeline (`src/nlp/pipeline.js`)
Orchestrates the execution of multiple NLP engines.
- **Parallel Processing**: Uses `Promise.all` to run sentiment, NER, and summarization concurrently.
- **Modular Engines**: Each NLP task (sentiment, NER, summarizer, translator, intent) is a standalone module.

## NLP Engines

### Sentiment Analysis (`src/nlp/sentiment.js`)
- **AFINN Lexicon**: Uses a subset of AFINN-165 for word-level sentiment scoring.
- **Negation Detection**: Flips scores when negation words (not, don't, etc.) are detected.
- **Intensifiers**: Scaled scores based on adverbs (very, extremely).
- **Emoji Support**: Native emoji sentiment scoring.

### Named Entity Recognition (`src/nlp/ner.js`)
- **Compromise.js**: Leverages the compromise library for fast, rule-based entity extraction.
- **Classification**: Identifies Persons, Places, Organizations, Dates, and Values.

### Summarization (`src/nlp/summarizer.js`)
- **Extractive TF-IDF**: Ranks sentences based on term frequency and inverse document frequency within the text.
- **Position Bias**: Weighs the first and last sentences higher, as they often contain thematic summaries.

### Translation (`src/nlp/translator.js`)
- **MyMemory API**: Integrated via fetch with rate limiting and LRU caching (30 requests/min).

### Intent Detection (`src/nlp/intent.js`)
- **Pattern Matching**: Keyword and regex-based intent classification for 10 common intents.

## Security Practices
- **Sanitization**: All user input is sanitized using a custom security module and `DOMPurify` (optional dependency).
- **CSP**: Strict Content Security Policy headers defined in `index.html`.
- **Validation**: Strict length and type validation for all text inputs.
- **Rate Limiting**: Client-side rate limiting for API-dependent services (Translation).

## Performance Optimization
- **Tree Shaking**: Vite removes unused code from dependencies.
- **Code Splitting**: Dynamic imports for the `compromise` library and page-level logic.
- **Memory Management**: LRU caching for translation results to prevent unbounded memory growth.
