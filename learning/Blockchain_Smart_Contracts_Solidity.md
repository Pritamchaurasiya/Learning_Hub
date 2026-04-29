# 🔗 BLOCKCHAIN: WEB3, SMART CONTRACTS & SOLIDITY

> [!IMPORTANT]
> A **Blockchain** is a distributed, immutable ledger. It allows for trustless transactions and decentralized applications (dApps).

---

## 🏗️ 1. CORE CONCEPTS

- **Nodes**: Computers participating in the network.
- **Blocks**: Batches of transactions linked via hashes.
- **Consensus**: How nodes agree on the state (Proof of Work vs. Proof of Stake).
- **Gas**: The cost of executing a transaction (to prevent spam).

---

## 📜 2. SMART CONTRACTS (Solidty)

Smart contracts are self-executing contracts with the terms of the agreement directly written into code.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStorage {
    uint256 public storedData;

    function set(uint256 x) public {
        storedData = x;
    }

    function get() public view returns (uint256) {
        return storedData;
    }
}
```

---

## 🧱 3. ETHEREUM VIRTUAL MACHINE (EVM)

The EVM is the global computer that executes smart contracts.

- **World State**: The current balances and data of all accounts.
- **Opcodes**: Low-level instructions the EVM understands.

---

## ⚡ 4. LAYER 2 & SCALING

Since L1 (Ethereum/Bitcoin) can be slow and expensive, **Layer 2** solutions move transactions off-chain.

- **Rollups (Optimistic & ZK)**: Bundling transactions and posting a proof to L1.
- **Sidechains**: Independent blockchains linked to L1.

---

## 🌐 5. DECENTRALIZED FINANCE (DeFi)

- **AMM (Automated Market Makers)**: decentralized exchanges (e.g., Uniswap).
- **Staking**: Earning rewards for securing the network.
- **NFTs**: Non-Fungible Tokens representing unique ownership.

---

## 🛡️ 6. SECURITY: THE DAO HACK

Smart contracts are public and immutable. One bug can lead to millions lost.

- **Reentrancy**: A contract calls an external contract before updating its state.
- **Overflow**: Numbers exceeding their bit limit (Fixed in Solidity 0.8+).

---

## 🎓 CONCEPT: WEB3

The shift from read-only (Web1) to social (Web2) to **ownership-based** (Web3) internet.
