# Learning Module 142: Research-Grade ML Paradigms

## 1. Mixture-of-Experts (MoE) — How GPT-4 and Mixtral Scale

**What is it?**
Instead of one giant neural network processing every input, MoE uses a "gating network" to route each input to only 2 out of 8 specialized experts. This means you get 8x the model capacity for only 2x the compute cost.

**The Math:**
```
G(x) = TopK(Softmax(W_g · x + noise), k=2)
y = Σ G(x)_i · Expert_i(x)
```

**Load Balancing Loss:** Prevents "expert collapse" — where all inputs get routed to the same expert and the other 7 remain useless.
```
L_balance = N · Σ f_i²  
(target: each expert gets 1/N of the traffic)
```

**Common Mistake:** Not adding noise to the gating logits. Without noise, the softmax quickly saturates and the model only ever uses 1-2 experts.

---

## 2. Transformer Architecture (from First Principles)

**What is it?**
The architecture behind GPT, BERT, Gemini, T5, and every modern AI model. Built entirely from scratch in pure Python.

**Key Components:**
1. **Positional Encoding**: `PE(pos, 2i) = sin(pos / 10000^(2i/d))` — tells the model WHERE each token is
2. **Multi-Head Attention**: Runs parallel attention heads, each looking at different aspects (syntax, semantics, position)
3. **Layer Norm + Residual**: Prevents gradient vanishing in deep networks
4. **GELU Activation**: Smooth variant of ReLU used in GPT-2+

**Why Multiple Heads?**
One head might learn "what word follows what" (syntax), another learns "what concepts are related" (semantics), and a third tracks "how far apart are these words" (position).

**Common Mistake:** Forgetting the `1/√d_k` scaling in attention. Without it, dot products grow large for high dimensions, pushing softmax into saturation where gradients vanish.

---

## 3. MLOps Model Registry & A/B Testing

**What is it?**
Production ML lifecycle management — version control for models, not code.

**Pipeline:** Development → Staging → Production → Archived

**A/B Testing Math (Two-Proportion Z-Test):**
```
Z = (p_B - p_A) / √(p̂(1-p̂)(1/n_A + 1/n_B))
```
If Z > 1.96 (p < 0.05), model B is statistically significantly better.

**Real-World Example:** You trained a new tutor model. Before deploying to all students, you route 50% of traffic to the new model. After 300 interactions, you compute the Z-statistic to determine if the new model genuinely improves learning outcomes or if the difference is just noise.

---

## 4. RAFT (Retrieval-Augmented Fine-Tuning)

**What is it?**
RAG retrieves documents at inference time. RAFT goes further: during fine-tuning, the model learns to DISTINGUISH useful documents from distractors.

**Training Strategy:**
- 80% of the time: Include the correct document + 3 distractors
- 20% of the time: Only distractors (teaches the model to say "I don't know")

**Why this matters for EdTech:**
Without RAFT, the AI tutor might confidently cite irrelevant course material. With RAFT, it learns to say "This particular topic isn't covered in the course materials, but here's what I know from general knowledge..."

---

## 5. Bayesian Knowledge Tracing (BKT)

**What is it?**
A Hidden Markov Model that estimates the probability a student has truly "learned" a skill, distinguishing between genuine knowledge and lucky guesses.

**The 4 Parameters:**
- P(L₀) = Initial knowledge (usually 0.2-0.3)
- P(T) = Learning rate per practice (0.1-0.2)
- P(G) = Guessing probability (0.2-0.3)
- P(S) = Slipping probability (0.05-0.15)

**Bayes' Update:**
```
If correct: P(L|correct) = P(L) × (1-P(S)) / P(correct)
If wrong:   P(L|wrong)   = P(L) × P(S) / P(wrong)
Then:       P(L_new)     = P(L|obs) + (1 - P(L|obs)) × P(T)
```

**Spaced Repetition (Ebbinghaus Curve):**
```
R(t) = e^(-t/S)    (retention decays exponentially)
Review when: R(t) < 0.85  (85% retention threshold)
```

**Desirable Difficulty:** Reviewing something you barely remember (low R) is MORE effective than reviewing something fresh. The stability increase is proportional to `(1 - R)`.

## Self-Assessment Checklist:
- [ ] Can you explain why MoE uses noise in the gating network?
- [ ] What happens to a Transformer without positional encoding?
- [ ] Why does RAFT train with 20% "no oracle" examples?
- [ ] How does BKT distinguish a lucky guess from real knowledge?
