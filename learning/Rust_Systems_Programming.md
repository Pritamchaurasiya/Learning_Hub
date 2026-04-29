# 🦀 RUST: SYSTEMS PROGRAMMING & MEMORY SAFETY

> [!IMPORTANT] > **Rust** is a multi-paradigm, general-purpose programming language designed for performance and safety, especially safe concurrency. It solves the "C++ problem" (manual memory management) without a Garbage Collector.

---

## 🏗️ 1. THE THREE PILLARS OF RUST

1.  **Ownership**: Each value in Rust has a variable that’s its owner. When the owner goes out of scope, the value is dropped.
2.  **Borrowing**: You can have either:
    - One mutable reference (`&mut T`).
    - Any number of immutable references (`&T`).
    - _Rule_: References must always be valid.
3.  **Lifetimes**: A way for the compiler to ensure that references don’t outlive the data they point to.

---

## 🛠️ 2. FEARLESS CONCURRENCY

Rust’s ownership rules prevent **Data Races** at compile time.

```rust
use std::thread;

fn main() {
    let v = vec![1, 2, 3];

    let handle = thread::spawn(move || {
        println!("Here's a vector: {:?}", v);
    });

    handle.join().unwrap();
}
```

_Note the `move` keyword_: It transfers ownership of `v` into the thread, preventing it from being accessed elsewhere.

---

## 📦 3. ZERO-COST ABSTRACTIONS

Rust's abstractions (like Iterators and Traits) compile down to the same machine code as hand-written assembly.

- **No Runtime**: Rust doesn't have a virtual machine or a thick runtime layer.
- **Trait-based Generics**: Static dispatch by default.

---

## 🛡️ 4. ERROR HANDLING: NO MORE NULLS

Rust uses the `Option<T>` and `Result<T, E>` enums instead of null or exceptions.

```rust
fn divide(numerator: f64, denominator: f64) -> Option<f64> {
    if denominator == 0.0 {
        None
    } else {
        Some(numerator / denominator)
    }
}
```

---

## 📊 5. CARGO: THE ULTIMATE TOOL

Cargo is Rust’s build system and package manager.

- `cargo build`: Compile.
- `cargo run`: Compile and run.
- `cargo test`: Run tests.
- `cargo doc`: Generate documentation.

---

## 🎓 CHALLENGE: THE BORROW CHECKER

Try to compile this:

```rust
let mut s = String::from("hello");
let r1 = &s;
let r2 = &mut s; // ERROR: cannot borrow `s` as mutable because it is also borrowed as immutable
println!("{}", r1);
```

**Why the error?** If `r2` modifies `s`, `r1` would point to invalid or changed data. Rust stops this _before_ you run it.
