# 15. Blockchain & Decentralized Systems ⛓️

> "The blockchain is an incorruptible digital ledger of economic transactions." — Don Tapscott

## 1. The Problem: Trust

- **Centralized**: You trust the bank. If they edit the database, you lose money.
- **Decentralized**: You trust the _math_. Everyone has a copy of the database (ledger).

## 2. Core Components

### A. The Block

- **Data**: Transactions (Alice -> Bob: 5 BTC).
- **Previous Hash**: Link to the block before it. This creates the "Chain".
- **Timestamp**.
- **Nonce**: A random number used for mining.

### B. The Hash (Integrity)

If you change _one bit_ of data in Block 50, its hash changes.
Block 51 (which points to Block 50's hash) breaks.
Block 52 breaks.
To fake history, you must re-calculate the entire chain faster than the rest of the world combined.

### C. Consensus Mechanism (Sybil Resistance)

How do we agree on the next block?

- **PoW (Proof of Work)**: Spend energy (CPU/GPU) to solve a puzzle. Hard to solve, easy to verify. (Bitcoin).
- **PoS (Proof of Stake)**: Lock up money as collateral. If you cheat, you lose your money. (Ethereum).

### D. Merkle Trees

A tree of hashes. Allows you to verify _one transaction_ exists in a huge block without downloading the entire block.

## 3. Practical Python: Build a Blockchain

```python
import hashlib
import time
import json

class Block:
    def __init__(self, index, transactions, timestamp, previous_hash):
        self.index = index
        self.transactions = transactions
        self.timestamp = timestamp
        self.previous_hash = previous_hash
        self.nonce = 0
        self.hash = self.compute_hash()

    def compute_hash(self):
        block_string = json.dumps(self.__dict__, sort_keys=True)
        return hashlib.sha256(block_string.encode()).hexdigest()

class Blockchain:
    def __init__(self):
        self.unconfirmed_transactions = []
        self.chain = []
        self.create_genesis_block()

    def create_genesis_block(self):
        genesis_block = Block(0, [], time.time(), "0")
        genesis_block.hash = genesis_block.compute_hash()
        self.chain.append(genesis_block)

    @property
    def last_block(self):
        return self.chain[-1]

    def proof_of_work(self, block):
        """
        Try different nonces until hash starts with '0000'.
        """
        block.nonce = 0
        computed_hash = block.compute_hash()
        while not computed_hash.startswith('0000'):
            block.nonce += 1
            computed_hash = block.compute_hash()
        return computed_hash

    def add_block(self, block, proof):
        previous_hash = self.last_block.hash
        if previous_hash != block.previous_hash:
            return False
        if not self.is_valid_proof(block, proof):
            return False

        block.hash = proof
        self.chain.append(block)
        return True

    def is_valid_proof(self, block, block_hash):
        return (block_hash.startswith('0000') and
                block_hash == block.compute_hash())

    def add_new_transaction(self, transaction):
        self.unconfirmed_transactions.append(transaction)

    def mine(self):
        if not self.unconfirmed_transactions:
            return False

        last_block = self.last_block

        new_block = Block(index=last_block.index + 1,
                          transactions=self.unconfirmed_transactions,
                          timestamp=time.time(),
                          previous_hash=last_block.hash)

        proof = self.proof_of_work(new_block)
        self.add_block(new_block, proof)
        self.unconfirmed_transactions = []
        return new_block.index

# Usage
blockchain = Blockchain()
blockchain.add_new_transaction({"sender": "Alice", "receiver": "Bob", "amount": 5})
blockchain.mine()
print(f"Chain length: {len(blockchain.chain)}")
print(f"Last Block Hash: {blockchain.last_block.hash}")
```

## 4. Smart Contracts (Ethereum)

Code that lives on the blockchain.
"If X happens, send money to Y".
Immutable, unstoppable, autonomous.
Language: Solidity.

## 5. Research Frontiers

- **Zero-Knowledge Proofs (ZK-Snarks)**: Prove I know a password without telling you the password. (Privacy).
- **Layer 2 Scaling (Rollups)**: Process transactions off-chain, settle on-chain.
- **DAO (Decentralized Autonomous Organization)**: A company run by code, not people.
