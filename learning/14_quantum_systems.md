# ⚛️ MODULE 14: QUANTUM SYSTEMS ENGINEERING

## The Paradigm Shift

Classical computers work with bits (0 or 1). Quantum computers work with qubits (|ψ⟩ = α|0⟩ + β|1⟩). This allows for massive parallelism in specific problem domains.

## Why Should a Web Engineer Care?

1.  **Security**: Your RSA keys will be broken. You need to upgrade to Post-Quantum Cryptography (PQC) standards like CRYSTALS-Kyber.
2.  **Optimization**: Problems like "Traveling Salesman" (Logistics) or "Portfolio Optimization" (FinTech) can be solved exponentially faster.
3.  **Simulation**: Simulating molecular interactions for drug discovery.

## The Quantum Stack

1.  **Hardware**: Superconducting Qubits (IBM/Google), Trapped Ions (IonQ).
2.  **Control Plane**: FPGA pulses to control qubits.
3.  **Compiler**: Transpiles high-level code (Qiskit/Cirq) to pulse schedules.
4.  **Application**: Hybrid Classical-Quantum algorithms.

## Simple Qiskit Example (Python)

```python
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

# Create a Quantum Circuit with 2 qubits and 2 bits
qc = QuantumCircuit(2, 2)

# Apply Hadamard gate to qubit 0 (Superposition)
qc.h(0)

# Apply CNOT gate (Entanglement: If 0 is |1⟩, flip 1)
qc.cx(0, 1)

# Measure
qc.measure([0, 1], [0, 1])

# Simulate
simulator = AerSimulator()
compiled_circuit = transpile(qc, simulator)
job = simulator.run(compiled_circuit, shots=1000)
result = job.result()
counts = result.get_counts(qc)
print(f"Result: {counts}")
# Likely {'00': ~500, '11': ~500} -> Bell State
```

> **Takeaway**: We are preparing for a future where specific heavy-lifting (optimization, crypto) is offloaded to QPU (Quantum Processing Units) just like we offload graphics to GPUs today.
