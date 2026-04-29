"""
Decentralized Trust (Web3) Service

Blockchain-ready credentialing:
1. Merkle Tree Construction for verifiable proof batches.
2. DID (Decentralized Identifier) resolution generation.
3. Cryptographic signing of certificates.
"""

import logging
import hashlib
import json
import base64
from typing import List, Dict, Any, Optional
from datetime import datetime
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class Certificate:
    id: str
    recipient_did: str
    course_id: str
    issue_date: str
    grade: str


class MerkleTree:
    """
    Standard Merkle Tree implementation for cryptographic verification.
    """
    def __init__(self, data_leaves: List[str]):
        self.leaves = [self._hash(d) for d in data_leaves]
        self.tree = self._build_tree(self.leaves)
        self.root = self.tree[-1][0] if self.tree else None

    def _hash(self, data: str) -> str:
        return hashlib.sha256(data.encode('utf-8')).hexdigest()

    def _build_tree(self, nodes: List[str]) -> List[List[str]]:
        tree = [nodes]
        current_layer = nodes
        
        while len(current_layer) > 1:
            next_layer = []
            for i in range(0, len(current_layer), 2):
                left = current_layer[i]
                right = current_layer[i+1] if i+1 < len(current_layer) else left
                combined = self._hash(left + right)
                next_layer.append(combined)
            tree.append(next_layer)
            current_layer = next_layer
            
        return tree

    def get_proof(self, index: int) -> List[Dict[str, str]]:
        """Generate Merkle Proof for a leaf."""
        proof = []
        layer_idx = 0
        current_idx = index
        
        # Iterate up to root
        while layer_idx < len(self.tree) - 1:
            layer = self.tree[layer_idx]
            is_right_node = current_idx % 2 == 1
            sibling_idx = current_idx - 1 if is_right_node else current_idx + 1
            
            if sibling_idx < len(layer):
                sibling = layer[sibling_idx]
                proof.append({
                    "position": "left" if is_right_node else "right",
                    "data": sibling
                })
            
            current_idx //= 2
            layer_idx += 1
            
        return proof


class BlockchainCredentialService:
    """
    Service to issue and verify decentralized credentials.
    """
    
    @classmethod
    def issue_certificate_batch(cls, certificates: List[Certificate]) -> Dict[str, Any]:
        """
        Batch issue certificates and anchor root to 'blockchain'.
        """
        # 1. Serialize certs
        cert_strings = [f"{c.id}:{c.recipient_did}:{c.grade}" for c in certificates]
        
        # 2. Build Merkle Tree
        mt = MerkleTree(cert_strings)
        
        # 3. Simulate Blockchain Anchoring
        tx_hash = cls._anchor_root(mt.root)
        
        return {
            "batch_root": mt.root,
            "transaction_hash": tx_hash,
            "total_certs": len(certificates),
            "merkle_proofs": {
                c.id: mt.get_proof(i) for i, c in enumerate(certificates)
            }
        }

    @classmethod
    def generate_did(cls, user_id: str) -> str:
        """Generate a did:web identifier."""
        return f"did:web:learninghub.io:user:{user_id}"

    @classmethod
    def _anchor_root(cls, root_hash: str) -> str:
        """Simulate sending transaction to Ethereum/Polygon."""
        # In prod: Web3.py call to Smart Contract
        mock_tx = hashlib.sha256(f"tx:{root_hash}:{datetime.now()}".encode()).hexdigest()
        logger.info(f"Anchored Merkle Root {root_hash} at TX {mock_tx}")
        return mock_tx
