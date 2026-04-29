# Learning Module 141: Advanced Machine Learning Paradigms

## 1. Multimodal Vision AI (Gemini Vision)
**What is it?** 
Multimodal AI refers to models that can process more than one type of data (modality) simultaneously—such as text and images.
**Why do we need it?** 
In education, students often submit handwritten work. Text-only models can't see the work; vision models can.
**How it works:**
The model (e.g., Gemini 1.5 Pro) uses a Vision Encoder to turn pixels into embeddings, which are then interleaved with text tokens in the Transformer.
**Common Mistake:**
Not providing enough "context" (text) for the image. The model needs to know what it is looking for.

## 2. Federated Learning (FedAvg)
**What is it?**
A decentralized machine learning technique where the model is trained on edge devices (like smartphones) without moving the user's data to a central server.
**The Math:**
$$w_{t+1} = \sum_{k=1}^{K} \frac{n_k}{n} w_{t+1}^k$$
Where $w$ are the model weights, $n_k$ is the data size on client $k$, and $n$ is total data.
**Differential Privacy:**
We add Laplacian noise to the aggregated weights to prevent "Model Inversion Attacks" where an attacker tries to guess the training data from the weights.

## 3. Graph Neural Networks (GNN)
**What is it?**
Neural networks designed to operate on non-Euclidean data structured as a graph (nodes and edges).
**Concept: Message Passing**
Each node updates its state by aggregating features from its neighbors.
$h_i^{(l+1)} = \sigma( \sum_{j \in \mathcal{N}(i)} \frac{1}{c_{ij}} h_j^{(l)} W^{(l)} )$
**Educational Use:**
Modeling "Prerequisite Graphs." If you know Algebra, you are 80% likely to understand Calculus. The GNN learns these implicit probabilities.

## 4. RLHF (Reinforcement Learning from Human Feedback)
**What is it?**
Fine-tuning a model based on human "rankings" of generated text.
**Workflow:**
1. Collect Preferences (Response A > Response B).
2. Train a Reward Model (RM).
3. Update the Policy using PPO (Proximal Policy Optimization).
**Why PPO?**
It uses a "Clipped Objective" to ensure the model doesn't change too much in one step, preventing catastrophic forgetting.

## Summary Checklist for You:
- [ ] Can you explain why we add noise to Federated Learning weights?
- [ ] What happens to a GNN if the graph has no edges? (Hint: it becomes a standard MLP).
- [ ] Try submitting two different tutor responses and choose the better one via the `/ai/rlhf/preference/` endpoint.
