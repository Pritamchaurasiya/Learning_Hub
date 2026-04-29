# Learning Module 143: Frontier ML Paradigms 2025

## 1. State Space Models (Mamba) — The Transformer Challenger

**Core Idea:** Process sequences in O(n) instead of O(n²) using continuous-time state space equations discretized for digital computation.

**State Space Equations:**
```
dx/dt = Ax + Bu      (continuous)
x_k = Ā·x_{k-1} + B̄·u_k   (discretized)
y_k = C·x_k
```

**Mamba's Breakthrough — Selective State Spaces:**
Instead of fixed A,B,C matrices, make them INPUT-DEPENDENT:
- `Δ(x)` = large → remember this token (big state update)
- `Δ(x)` = small → forget this token (state unchanged)

This is like an LSTM gate but without quadratic attention. 5-10x faster than Transformers on sequences > 8K tokens.

**Key File:** `apps/ai_engine/state_space_model.py`

---

## 2. Diffusion Models (DDPM) — How Image Generation Works

**Forward Process:** Gradually add Gaussian noise over T steps until data becomes pure noise.
```
x_t = √(ᾱ_t)·x_0 + √(1-ᾱ_t)·ε,  where ε ~ N(0,I)
```

**Reverse Process:** A neural network (U-Net) learns to predict and remove the noise:
```
Training Loss: L = ||ε - ε_θ(x_t, t)||²
= "predict what noise was added"
```

**Cosine Schedule:** (Nichol & Dhariwal) — better than linear because it preserves more signal in early steps, giving smoother generation.

**Key File:** `apps/ai_engine/ddpm_engine.py`

---

## 3. Neural Architecture Search (NAS) — AutoML

**What:** Instead of humans designing networks, let an algorithm discover the optimal architecture.

**Evolutionary NAS Algorithm:**
1. Initialize random population of architectures
2. Evaluate fitness (accuracy, latency, params)
3. Tournament selection → keep the best
4. Mutate (change ops, connections, dimensions)
5. Crossover (combine two parents)
6. Repeat for G generations

**Real Impact:** NASNet and EfficientNet (discovered by NAS) outperform human-designed architectures on ImageNet.

**Key File:** `apps/ai_engine/nas_engine.py`

---

## 4. Kolmogorov-Arnold Networks (KAN)

**MLP:** `y = σ(Wx + b)` — fixed activation σ, learn weights W
**KAN:** `y = Σ φ_i(x_i)` — learn activation functions φ, no weights!

**Mathematical Foundation:** Kolmogorov-Arnold Theorem proves ANY continuous function can be decomposed as compositions of 1D functions. KAN implements this directly using B-spline basis functions on every edge.

**B-Splines:** Piecewise polynomials with local support — smooth, flexible, and can approximate any continuous function.

**When to use KAN:** Scientific/mathematical tasks, symbolic regression, low-dimensional problems. NOT yet proven for high-dimensional data (images, text).

**Key File:** `apps/ai_engine/kan_network.py`

---

## 5. Test-Time Compute Scaling — How o1/o3 Think

**Core Insight:** Instead of scaling MODEL SIZE (more parameters), scale INFERENCE COMPUTE (more thinking time per question).

**Strategies:**
| Method | Description | Compute | Quality |
|--------|------------|---------|---------|
| Best-of-N | Generate N, pick best | N× | Good |
| Self-Consistency | N chains + majority vote | N× | Better |
| Tree-of-Thought | Beam search over reasoning | B×D× | Best |

**Process Reward Model (PRM):** Scores EACH reasoning step (not just the final answer), enabling early pruning of bad reasoning branches.

**Key Result:** A small model with 100x inference compute can match a large model with 1x compute on reasoning tasks (Snell et al., 2024).

**Key File:** `apps/ai_engine/test_time_compute.py`
