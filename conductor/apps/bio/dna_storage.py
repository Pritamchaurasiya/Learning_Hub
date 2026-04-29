"""
DNA Data Storage Service

Simulates storing digital data in biological DNA sequences.
1. Binary to ACGT Encoding.
2. Primer attachment and synthesis.
3. Sequencing coverage simulation.
"""

import logging
import random
from typing import List, Dict
from dataclasses import dataclass

logger = logging.getLogger(__name__)


class DNAEncoder:
    """
    Converts Digital (Binary) <-> Biological (DNA).
    Mapping: 00->A, 01->C, 10->G, 11->T
    """
    _map = {"00": "A", "01": "C", "10": "G", "11": "T"}
    _rev = {"A": "00", "C": "01", "G": "10", "T": "11"}

    @classmethod
    def encode(cls, binary_data: str) -> str:
        """Convert binary string to DNA sequence."""
        dna = []
        for i in range(0, len(binary_data), 2):
            chunk = binary_data[i:i+2]
            if len(chunk) < 2: chunk += "0" # Padding
            dna.append(cls._map.get(chunk, "A"))
        return "".join(dna)

    @classmethod
    def decode(cls, dna_sequence: str) -> str:
        """Convert DNA sequence back to binary."""
        binary = []
        for base in dna_sequence:
            binary.append(cls._rev.get(base, "00"))
        return "".join(binary)


class BioStorageSystem:
    """
    Simulates the wet-lab processes of DNA storage.
    """
    
    @classmethod
    def store_file(cls, filename: str, content_bytes: bytes) -> Dict[str, Any]:
        """
        Simulate Synthesis: File -> Binary -> DNA -> Oligos.
        """
        # 1. Bytes to Binary
        binary = "".join(format(byte, '08b') for byte in content_bytes)
        
        # 2. Encode to DNA
        dna_strand = DNAEncoder.encode(binary)
        
        # 3. Fragment into Oligonucleotides (Oligos) with Primers
        oligo_len = 100 # base pairs
        oligos = [dna_strand[i:i+oligo_len] for i in range(0, len(dna_strand), oligo_len)]
        
        # Add indexing primers (mock)
        primed_oligos = [f"PR{i:03d}{s}END" for i, s in enumerate(oligos)]
        
        return {
            "file": filename,
            "total_bases": len(dna_strand),
            "oligo_count": len(primed_oligos),
            "density": f"{len(dna_strand)/1024:.2f} Kb/strand",
            "sequence_sample": dna_strand[:50] + "..."
        }

    @classmethod
    def retrieve_file(cls, oligos: List[str]) -> bytes:
        """
        Simulate Sequencing: Oligos -> Assembly -> Binary -> Bytes.
        """
        # Reassembly (Sort by primer index mock)
        # Simplified: Assume perfect order for demo
        payloads = [s[5:-3] for s in oligos] # Strip mock primer/end
        full_dna = "".join(payloads)
        
        # Decode
        binary = DNAEncoder.decode(full_dna)
        
        # Binary to Bytes
        byte_array = bytearray()
        for i in range(0, len(binary), 8):
            byte = binary[i:i+8]
            if len(byte) == 8:
                byte_array.append(int(byte, 2))
                
        return bytes(byte_array)
