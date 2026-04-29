# 13. Compiler Design & OS Internals 💻

> "If you don't know how compilers work, then you don't know how computers work." — Steve Yegge

## 1. The Stack

1.  **High-Level Code** (Python/Dart): "Human readable".
2.  **Assembly** (x86_64/ARM): "Machine readable".
3.  **Machine Code** (Binary): "CPU executable".

The **Compiler** is the bridge.

## 2. Phases of Compilation

### A. Lexical Analysis (Lexing)

- **Input**: Source code string. `x = 5 + 3`
- **Output**: Stream of **Tokens**. `[IDENTIFIER(x), ASSIGN, NUMBER(5), PLUS, NUMBER(3)]`
- **Tool**: Regex.

### B. Parsing (Syntax Analysis)

- **Input**: Tokens.
- **Output**: **AST (Abstract Syntax Tree)**.
- **Structure**:
  ```
      Assign
     /      \
    x       Add
           /   \
          5     3
  ```
- **Grammar**: defined in BNF (Backus-Naur Form).

### C. Semantic Analysis

- Checks meaning. "Can I add a String to an Int?" (Type Checking).

### D. Implementation (Mini-Interpreter in Python)

```python
# 1. Token Types
INTEGER, PLUS, EOF = 'INTEGER', 'PLUS', 'EOF'

class Token:
    def __init__(self, type, value):
        self.type = type
        self.value = value

class Interpreter:
    def __init__(self, text):
        self.text = text
        self.pos = 0
        self.current_token = None

    def get_next_token(self):
        """Lexer"""
        if self.pos > len(self.text) - 1:
            return Token(EOF, None)

        current_char = self.text[self.pos]

        if current_char.isdigit():
            self.pos += 1
            return Token(INTEGER, int(current_char))

        if current_char == '+':
            self.pos += 1
            return Token(PLUS, '+')

        raise Exception('Invalid character')

    def eat(self, token_type):
        if self.current_token.type == token_type:
            self.current_token = self.get_next_token()
        else:
            raise Exception('Parsing Error')

    def expr(self):
        """Parser + Interpreter"""
        self.current_token = self.get_next_token()

        left = self.current_token
        self.eat(INTEGER)

        op = self.current_token
        self.eat(PLUS)

        right = self.current_token
        self.eat(INTEGER)

        return left.value + right.value

interpreter = Interpreter("3+5")
print(interpreter.expr())  # 8
```

## 3. OS Internals: Memory Management

### Stack vs. Heap

- **Stack**: Fast, LIFO, function local variables. Automatically managed. (Main variable storage).
- **Heap**: Slower, dynamic size. Manually managed (malloc/free in C) or Garbage Collected (Python/Java).

### Garbage Collection (GC)

- **Reference Counting** (Python): Keep a count of pointers to an object. If 0, delete. _Problem: Cyclic references._
- **Mark and Sweep** (Java/Go): Stop the world. Start from "roots" (global vars, stack). Mark everything reachable. Sweep (delete) everything else.
- **Generational GC**: "Young" objects die young. "Old" objects survive longer. Check young generation frequently, old generation rarely.

## 4. Virtual Memory

- Programs think they have contiguous RAM (e.g., address 0 to 4GB).
- **MMU (Memory Management Unit)** maps Virtual Addresses to Physical RAM.
- Allows **Paging** (swapping ram to disk to have "more" memory).

## 5. Mini-Project

Write a JSON parser from scratch.

1. Lexer: Tokenize `{`, `}`, `:`, `,`, strings, numbers.
2. Parser: Build a Python dict from the tokens.
3. Verification: Compare your output with `json.loads()`.
