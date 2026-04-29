# Learning Module 144: Production ML Engineering

## 1. Sparse Autoencoders (SAE) — Mechanistic Interpretability

**What:** Decompose opaque neural network activations into human-readable "features."

**Architecture:**
```
encoder: z = ReLU(W_enc · (x - b_dec) + b_enc)   → sparse code
decoder: x̂ = W_dec · z + b_dec                     → reconstruction

Loss: L = ||x - x̂||² + λ·||z||₁
       MSE recon    +  L1 sparsity
```

**Why it matters:** Anthropic uses SAEs to find safety-relevant features inside Claude. Each active feature corresponds to one interpretable concept (e.g., "Golden Gate Bridge" vs "orange color").

**Dead features problem:** Some features never activate. The `dead_feature_ratio` metric tracks this — too many dead features means wasted capacity.

---

## 2. Mixture of Depths (MoD) — Dynamic Compute

**Key Insight:** Not all tokens need the same depth of processing.

```
For each token at each layer:
  router(x) > threshold → COMPUTE through this layer
  router(x) ≤ threshold → SKIP (identity/residual only)
```

**Capacity constraint:** At most C% of tokens are processed per layer (default 50%). This enforces compute savings.

**Result:** ~50% FLOPs reduction with minimal quality loss. "The" doesn't need 96 layers, but "eigenvalue" does.

---

## 3. Quantization — Running LLMs on Phones

**Core Math:**
```
Quantize:   q = round(x / scale) + zero_point
Dequantize: x̂ = (q - zero_point) × scale
```

| Precision | Size per weight | Compression | Use case |
|-----------|----------------|-------------|----------|
| FP32      | 4 bytes        | 1x          | Training |
| FP16      | 2 bytes        | 2x          | GPU inference |
| INT8      | 1 byte         | 4x          | Server inference |
| INT4      | 0.5 bytes      | 8x          | Mobile/edge |

**AWQ (Activation-Aware):** Protects "salient" weights (those connected to high-activation channels) from quantization error by scaling them up before quantizing, then down after.

---

## 4. Speculative Decoding — 2-3x Faster LLMs

**Algorithm:**
1. Small draft model (7B) proposes K=5 tokens autoregressively
2. Large target model (70B) verifies ALL 5 in ONE parallel forward pass
3. Accept where P_target ≥ P_draft (mathematically exact sampling)
4. On rejection, resample from adjusted distribution

**Why it works:** LLM inference is memory-bandwidth bound. Verifying 5 tokens costs almost the same as generating 1.

**Result:** Same output quality, 2-3x wall-clock speedup. Used in vLLM, TensorRT-LLM, and production deployments.

---

## 5. Synthetic Data Pipeline — Self-Improving AI

**Pipeline:** Seed Topics → Evol-Instruct → Generate → Score → Filter → Decontaminate

**Evol-Instruct:** Evolve simple prompts into complex ones:
- "Write a function" → "Write a function in O(n log n) with edge case handling, formal proof of correctness, and 3 test cases"

**Quality Scoring:** Multi-criteria scoring (clarity, completeness, factual consistency, safety).

**Decontamination:** 13-gram overlap check against benchmarks. Without this, models inflate their scores on test sets without learning anything.

**Impact:** This is how Phi-3 achieves near-GPT-4 quality at 1/50th the size.
