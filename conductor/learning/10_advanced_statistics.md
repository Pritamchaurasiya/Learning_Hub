# 10. Advanced Statistics & Probability for AI 📊

> "Statistics is the grammar of science." — Karl Pearson

To be an AI Research Scientist, you must move beyond "import sklearn". You need to understand the **stochastic nature** of reality and models.

## 1. Bayesian vs. Frequentist Views

### Frequentist (The "Traditional" View)

- Probability = Long-run frequency of events.
- Parameters (like model weights) are **fixed constants** (unknown).
- Data is random.
- **MLE (Maximum Likelihood Estimation)**: "What parameters make this observed data most probable?"

### Bayesian (The "AI Inference" View)

- Probability = Degree of belief/uncertainty.
- Parameters are **random variables** with distributions.
- Data is fixed (once observed).
- **MAP (Maximum A Posteriori)**: "Given this data and my prior content, what are the parameters?"
- **Formula**:
  $$ P(\theta|D) = \frac{P(D|\theta) \cdot P(\theta)}{P(D)} $$
  _Posterior = (Likelihood × Prior) / Evidence_

## 2. Key Distributions in ML

1.  **Bernoulli/Binomial**: Binary outcomes (Logistic Regression).
2.  **Gaussian (Normal)**: The Central Limit Theorem makes this king. Most error terms assume this.
3.  **Poisson**: Count data (e.g., number of clicks per hour).
4.  **Beta/Dirichlet**: Distributions _over_ probabilities (used in LDA (Topic Modeling)).

## 3. Information Theory

### Entropy (Uncertainty)

$$ H(X) = - \sum p(x) \log p(x) $$
High entropy = pure chaos (uniform distribution). Low entropy = high certainty.

### KL Divergence (Relative Entropy)

Measures the "distance" between two distributions $P$ and $Q$.
$$ D\_{KL}(P || Q) = \sum P(x) \log \frac{P(x)}{Q(x)} $$
**Crucial usage**: VAEs (Variational Autoencoders) use KL Divergence in their loss function to force the latent space to be Gaussian.

## 4. Hypothesis Testing & Significance

- **P-value**: The probability of seeing results _at least as extreme_ as yours, assuming the Null Hypothesis is true. It does NOT mean "probability the hypothesis is true".
- **A/B Testing**:
  - **Power**: Probability of correctly rejecting null (finding a real effect).
  - **Confidence Interval**: Range where the true parameter lies 95% of the time.

## 5. Practical Python Implementation

Let's compute **KL Divergence** and visualize **Bayesian Updating**.

```python
import numpy as np
import scipy.stats as stats

def kl_divergence(p, q):
    """
    Compute Kullback-Leibler divergence D(P || Q)
    P: True distribution
    Q: Approximated distribution
    """
    return np.sum(np.where(p != 0, p * np.log(p / q), 0))

# Example: True distribution is a fair die, Q is loaded
p = np.array([1/6]*6)
q = np.array([0.1, 0.1, 0.1, 0.1, 0.1, 0.5]) # Loaded die

kl = kl_divergence(p, q)
print(f"Information Loss (KL): {kl:.4f} nats")

# Bayesian Updating (Beta-Binomial Conjugacy)
# Prior: Beta(1,1) (Uniform - we know nothing)
alpha_prior, beta_prior = 1, 1

# Observation: We flip a coin 10 times, 8 heads (1), 2 tails (0)
heads = 8
tails = 2

# Posterior: Beta(alpha + heads, beta + tails)
alpha_post = alpha_prior + heads
beta_post = beta_prior + tails

print(f"Prior Mean: {alpha_prior / (alpha_prior + beta_prior)}")
print(f"Posterior Mean: {alpha_post / (alpha_post + beta_post)}")
# Result: Shifts from 0.5 to ~0.75. The data updated our belief.
```

## 6. Monte Carlo Methods (MCMC)

When equations are too hard to solve, we simulate.

- **Markov Chain Monte Carlo**: Techniques to sample from complex distributions.
- **Gibbs Sampling**: Used in training RBMs (Restricted Boltzmann Machines).

## 7. Research Concept: The "Manifold Hypothesis"

Real-world high-dimensional data (like images) actually lies on lower-dimensional manifolds embedded in that space.

- This is why dimension reduction (PCA, t-SNE, Autoencoders) works.
- This is why interpolation in Latent Space (GANs) generates smooth morphing faces.
