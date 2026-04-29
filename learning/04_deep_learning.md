# Module 04: Deep Learning - Neural Networks from Scratch 🧠

## 🎯 Overview

This module teaches you **Neural Networks** the way research scientists understand them - from mathematical first principles to production-ready implementations.

---

## 📖 What is a Neural Network?

### Simple Definition

A neural network is a **function approximator** that learns patterns from data through layers of connected nodes (neurons).

### Real-World Analogy

Think of it like a decision-making chain:

- Layer 1: "Is there a curve?" "Is there a line?"
- Layer 2: "Is it a circle?" "Is it a corner?"
- Layer 3: "Is this a face?" "Is this a car?"

---

## 🧮 The Perceptron: Simplest Neural Network

```python
import numpy as np

class Perceptron:
    """Single neuron - the building block of neural networks."""

    def __init__(self, n_inputs):
        # Initialize random weights
        self.weights = np.random.randn(n_inputs) * 0.01
        self.bias = 0

    def forward(self, x):
        """
        Forward pass: compute weighted sum + activation

        z = w1*x1 + w2*x2 + ... + wn*xn + bias
        output = activation(z)
        """
        z = np.dot(x, self.weights) + self.bias
        return self.sigmoid(z)

    def sigmoid(self, z):
        """Sigmoid activation: squashes output to (0, 1)"""
        return 1 / (1 + np.exp(-np.clip(z, -500, 500)))

    def train(self, X, y, learning_rate=0.1, epochs=100):
        """Train using gradient descent."""
        for epoch in range(epochs):
            for xi, yi in zip(X, y):
                # Forward pass
                prediction = self.forward(xi)

                # Calculate error
                error = yi - prediction

                # Backward pass (gradient descent)
                # dL/dw = -error * x * sigmoid'(z)
                gradient = error * prediction * (1 - prediction) * xi

                # Update weights
                self.weights += learning_rate * gradient
                self.bias += learning_rate * error

# Example: AND gate
X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]])
y = np.array([0, 0, 0, 1])  # AND logic

perceptron = Perceptron(n_inputs=2)
perceptron.train(X, y, epochs=1000)

for xi in X:
    print(f"{xi} -> {perceptron.forward(xi):.4f}")
```

---

## 🏗️ Multi-Layer Perceptron (MLP)

### Architecture

```
Input Layer    Hidden Layer(s)    Output Layer
   [x1] ─────────┬─────────►      [y1]
   [x2] ─────────┼─────────►      [y2]
   [x3] ─────────┴─────────►
```

### Implementation from Scratch

```python
class NeuralNetwork:
    """Multi-layer neural network from scratch."""

    def __init__(self, layer_sizes):
        """
        Args:
            layer_sizes: List of neurons per layer
                         e.g., [784, 128, 64, 10] for MNIST
        """
        self.layers = []

        for i in range(len(layer_sizes) - 1):
            layer = {
                'W': np.random.randn(layer_sizes[i], layer_sizes[i+1]) * 0.01,
                'b': np.zeros((1, layer_sizes[i+1]))
            }
            self.layers.append(layer)

    def relu(self, z):
        """ReLU activation: max(0, z)"""
        return np.maximum(0, z)

    def relu_derivative(self, z):
        """Derivative of ReLU"""
        return (z > 0).astype(float)

    def softmax(self, z):
        """Softmax: convert scores to probabilities"""
        exp_z = np.exp(z - np.max(z, axis=1, keepdims=True))
        return exp_z / np.sum(exp_z, axis=1, keepdims=True)

    def forward(self, X):
        """Forward pass through all layers."""
        self.activations = [X]
        self.z_values = []

        current = X
        for i, layer in enumerate(self.layers):
            z = np.dot(current, layer['W']) + layer['b']
            self.z_values.append(z)

            # Use ReLU for hidden layers, Softmax for output
            if i < len(self.layers) - 1:
                current = self.relu(z)
            else:
                current = self.softmax(z)

            self.activations.append(current)

        return current

    def backward(self, X, y, learning_rate=0.01):
        """Backpropagation: compute gradients and update weights."""
        m = X.shape[0]  # Batch size

        # Convert y to one-hot encoding
        y_onehot = np.zeros_like(self.activations[-1])
        y_onehot[np.arange(m), y] = 1

        # Output layer error
        delta = self.activations[-1] - y_onehot

        # Backpropagate through layers
        for i in range(len(self.layers) - 1, -1, -1):
            # Gradient for weights and bias
            dW = np.dot(self.activations[i].T, delta) / m
            db = np.sum(delta, axis=0, keepdims=True) / m

            # Update weights
            self.layers[i]['W'] -= learning_rate * dW
            self.layers[i]['b'] -= learning_rate * db

            # Propagate error to previous layer
            if i > 0:
                delta = np.dot(delta, self.layers[i]['W'].T)
                delta *= self.relu_derivative(self.z_values[i-1])

    def train(self, X, y, epochs=100, learning_rate=0.01, batch_size=32):
        """Train the network."""
        n_samples = X.shape[0]
        losses = []

        for epoch in range(epochs):
            # Shuffle data
            indices = np.random.permutation(n_samples)
            X_shuffled = X[indices]
            y_shuffled = y[indices]

            epoch_loss = 0
            for i in range(0, n_samples, batch_size):
                X_batch = X_shuffled[i:i+batch_size]
                y_batch = y_shuffled[i:i+batch_size]

                # Forward pass
                output = self.forward(X_batch)

                # Backward pass
                self.backward(X_batch, y_batch, learning_rate)

                # Calculate loss (cross-entropy)
                batch_loss = -np.mean(np.log(output[np.arange(len(y_batch)), y_batch] + 1e-8))
                epoch_loss += batch_loss

            losses.append(epoch_loss)

            if epoch % 10 == 0:
                print(f"Epoch {epoch}, Loss: {epoch_loss:.4f}")

        return losses

    def predict(self, X):
        """Make predictions."""
        output = self.forward(X)
        return np.argmax(output, axis=1)

# Example: Train on MNIST-like data
# nn = NeuralNetwork([784, 128, 64, 10])
# nn.train(X_train, y_train, epochs=100)
# accuracy = np.mean(nn.predict(X_test) == y_test)
```

---

## 🔥 Activation Functions

| Function   | Formula                   | When to Use                       |
| ---------- | ------------------------- | --------------------------------- |
| Sigmoid    | 1/(1+e^-x)                | Binary classification output      |
| Tanh       | (e^x - e^-x)/(e^x + e^-x) | Hidden layers (centered output)   |
| ReLU       | max(0, x)                 | Default for hidden layers         |
| Leaky ReLU | max(0.01x, x)             | When ReLU "dies"                  |
| Softmax    | e^xi / Σe^xj              | Multi-class classification output |

```python
# Visualization of activations
import numpy as np

x = np.linspace(-5, 5, 100)

# Sigmoid: smooth, 0-1 range
sigmoid = 1 / (1 + np.exp(-x))

# ReLU: simple, fast, can "die"
relu = np.maximum(0, x)

# Leaky ReLU: no dying neurons
leaky_relu = np.where(x > 0, x, 0.01 * x)

# GELU (used in Transformers)
gelu = 0.5 * x * (1 + np.tanh(np.sqrt(2/np.pi) * (x + 0.044715 * x**3)))
```

---

## 📉 Loss Functions

### Cross-Entropy (Classification)

```python
def cross_entropy_loss(y_true, y_pred):
    """
    L = -Σ y_true * log(y_pred)

    For binary classification:
    L = -[y*log(p) + (1-y)*log(1-p)]
    """
    epsilon = 1e-15  # Prevent log(0)
    y_pred = np.clip(y_pred, epsilon, 1 - epsilon)
    return -np.mean(y_true * np.log(y_pred) + (1 - y_true) * np.log(1 - y_pred))
```

### Mean Squared Error (Regression)

```python
def mse_loss(y_true, y_pred):
    """L = (1/n) * Σ(y_true - y_pred)²"""
    return np.mean((y_true - y_pred) ** 2)
```

---

## 🎛️ Optimizers

### Gradient Descent Variants

```python
class Optimizer:
    """Different optimization algorithms."""

    @staticmethod
    def sgd(params, grads, learning_rate):
        """Vanilla Stochastic Gradient Descent."""
        for param, grad in zip(params, grads):
            param -= learning_rate * grad

    @staticmethod
    def momentum(params, grads, velocities, learning_rate, momentum=0.9):
        """SGD with Momentum - accelerates in consistent direction."""
        for i, (param, grad) in enumerate(zip(params, grads)):
            velocities[i] = momentum * velocities[i] - learning_rate * grad
            param += velocities[i]

    @staticmethod
    def adam(params, grads, m, v, t, learning_rate=0.001, beta1=0.9, beta2=0.999, epsilon=1e-8):
        """Adam - Adaptive Moment Estimation (most popular)."""
        for i, (param, grad) in enumerate(zip(params, grads)):
            # Update biased first moment estimate
            m[i] = beta1 * m[i] + (1 - beta1) * grad
            # Update biased second moment estimate
            v[i] = beta2 * v[i] + (1 - beta2) * (grad ** 2)

            # Bias correction
            m_hat = m[i] / (1 - beta1 ** t)
            v_hat = v[i] / (1 - beta2 ** t)

            # Update parameters
            param -= learning_rate * m_hat / (np.sqrt(v_hat) + epsilon)
```

---

## 🛡️ Regularization Techniques

### 1. Dropout

```python
class Dropout:
    """Randomly zero out neurons during training."""

    def __init__(self, p=0.5):
        self.p = p  # Probability of dropping
        self.mask = None

    def forward(self, x, training=True):
        if training:
            self.mask = np.random.binomial(1, 1-self.p, x.shape) / (1-self.p)
            return x * self.mask
        return x

    def backward(self, grad):
        return grad * self.mask
```

### 2. L2 Regularization (Weight Decay)

```python
def compute_loss_with_l2(y_true, y_pred, weights, lambda_reg=0.01):
    """Add L2 penalty to prevent large weights."""
    data_loss = cross_entropy_loss(y_true, y_pred)
    l2_penalty = lambda_reg * sum(np.sum(w**2) for w in weights)
    return data_loss + l2_penalty
```

### 3. Batch Normalization

```python
class BatchNorm:
    """Normalize layer inputs for stable training."""

    def __init__(self, dim, epsilon=1e-5, momentum=0.9):
        self.gamma = np.ones(dim)   # Scale
        self.beta = np.zeros(dim)   # Shift
        self.epsilon = epsilon
        self.momentum = momentum
        self.running_mean = np.zeros(dim)
        self.running_var = np.ones(dim)

    def forward(self, x, training=True):
        if training:
            mean = np.mean(x, axis=0)
            var = np.var(x, axis=0)

            # Update running stats
            self.running_mean = self.momentum * self.running_mean + (1 - self.momentum) * mean
            self.running_var = self.momentum * self.running_var + (1 - self.momentum) * var
        else:
            mean = self.running_mean
            var = self.running_var

        # Normalize
        x_norm = (x - mean) / np.sqrt(var + self.epsilon)

        # Scale and shift
        return self.gamma * x_norm + self.beta
```

---

## 🏗️ Common Architectures

### Convolutional Neural Network (CNN)

```
Input Image → [Conv → ReLU → Pool] × N → Flatten → Dense → Output

Used for: Image classification, object detection
```

### Recurrent Neural Network (RNN)

```
Sequence → [RNN Cell] → [RNN Cell] → ... → Output

Used for: Time series, text, speech
```

### Transformer

```
Input → Embedding → [Self-Attention + FFN] × N → Output

Used for: NLP (GPT, BERT), Vision (ViT)
```

---

## 🔴 Common Mistakes

### 1. Vanishing/Exploding Gradients

**Problem:** Gradients become too small or too large
**Solution:** Use ReLU, proper initialization, batch normalization

### 2. Overfitting

**Signs:** Training loss ↓, Validation loss ↑
**Solution:** Dropout, L2 regularization, more data, early stopping

### 3. Wrong Learning Rate

**Too high:** Loss oscillates or explodes
**Too low:** Training too slow
**Solution:** Start with 1e-3, use learning rate scheduling

---

## ✏️ Exercises

1. Implement a 2-layer neural network to classify XOR (requires hidden layer)
2. Add batch normalization to your network and compare training speed
3. Implement dropout and show its effect on overfitting
4. Train a network on MNIST and achieve >95% accuracy

---

_Next Module: 05_nlp_llm.md - Natural Language Processing & Large Language Models_
