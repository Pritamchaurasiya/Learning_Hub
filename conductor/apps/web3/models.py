from django.db import models
from django.conf import settings
from apps.core.models import BaseModel
from apps.courses.models import Course

class UserProfileWeb3(BaseModel):
    """
    Links a standard Django User to a Web3 wallet address and Decentralized Identifier (DID).
    """
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="web3_profile")
    wallet_address = models.CharField(max_length=42, unique=True, null=True, blank=True, help_text="Ethereum/Polygon wallet address (0x...)")
    did = models.CharField(max_length=255, unique=True, null=True, blank=True, help_text="Decentralized Identifier (did:web:...)")
    nonce = models.CharField(max_length=255, null=True, blank=True, help_text="Nonce used for cryptographic signature verification during Web3 login.")

    class Meta:
        db_table = "users_web3_profiles"
        verbose_name = "Web3 Profile"
        verbose_name_plural = "Web3 Profiles"

    def __str__(self):
        return f"{self.user.username}'s Web3 Profile"


class NFTCertificate(BaseModel):
    """
    A blockchain-anchored, tamper-proof learning credential.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="nft_certificates")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="nft_certificates")
    
    # Merkle / Blockchain Details
    token_id = models.CharField(max_length=255, unique=True, help_text="Unique Token ID for the NFT")
    merkle_root = models.CharField(max_length=66, help_text="Root hash of the Merkle Tree this cert belongs to")
    merkle_proof = models.JSONField(help_text="Path from leaf to root for client-side verification")
    transaction_hash = models.CharField(max_length=66, help_text="Tx Hash where root was anchored on chain")
    
    # Metadata
    metadata_uri = models.URLField(max_length=500, help_text="IPFS or Arweave URI containing the JSON metadata")
    is_revoked = models.BooleanField(default=False, help_text="Can be revoked by admin in case of cheating")

    class Meta:
        db_table = "web3_nft_certificates"
        unique_together = ["user", "course"]
        indexes = [
            models.Index(fields=["token_id"]),
            models.Index(fields=["transaction_hash"]),
        ]

    def __str__(self):
        return f"NFT Cert: {self.course.title} -> {self.user.username}"
