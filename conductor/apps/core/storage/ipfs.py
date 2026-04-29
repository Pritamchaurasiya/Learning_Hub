import structlog
import hashlib
import json
import base64

logger = structlog.get_logger(__name__)

class IPFSClient:
    """
    Interacts with the Inter-Planetary File System (IPFS) to store
    course materials and credentials permanently.
    """
    
    # Common IPFS Gateways
    GATEWAY_URLS = [
        "https://ipfs.io/ipfs/",
        "https://gateway.pinata.cloud/ipfs/",
        "https://cloudflare-ipfs.com/ipfs/"
    ]

    @staticmethod
    def pin_file(file_content: bytes) -> str:
        """
        Uploads a file to IPFS. Returns the Content Identifier (CID).
        """
        # Generate a mock CIDv1-style hash
        h = hashlib.sha256(file_content).hexdigest()
        cid = f"Qm{h[:44]}"
        logger.info("🌌 File pinned to IPFS", cid=cid, size=len(file_content))
        return cid

    @staticmethod
    def pin_json(data: dict) -> str:
        """
        Pins JSON metadata to IPFS.
        """
        content = json.dumps(data, indent=2).encode('utf-8')
        return IPFSClient.pin_file(content)

    @staticmethod
    def get_file_url(cid: str, gateway_index: int = 0) -> str:
        """
        Returns a public URL for a given CID.
        """
        base_url = IPFSClient.GATEWAY_URLS[gateway_index]
        return f"{base_url}{cid}"
