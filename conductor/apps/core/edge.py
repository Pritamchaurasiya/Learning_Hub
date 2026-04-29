import structlog
import time
import random

logger = structlog.get_logger(__name__)

class EdgeComputeRouter:
    """
    Simulates a smart router that dispatches requests to the nearest edge node.
    """

    NODES = [
        {"id": "edge-nyc-1", "region": "us-east-1", "latency": 15},
        {"id": "edge-lon-1", "region": "eu-west-2", "latency": 85},
        {"id": "edge-tok-1", "region": "ap-northeast-1", "latency": 140},
        {"id": "edge-blr-1", "region": "ap-south-1", "latency": 220},
    ]

    @staticmethod
    def route_request(user_ip: str, request_type: str):
        """
        Determines the optimal edge node for a user based on simulated IP geolocation.
        """
        logger.info(f"🌐 Routing request from {user_ip} for {request_type}...")
        
        # Simulating Geo-IP lookup
        # In production, use MaxMind or Cloudflare headers
        if user_ip.startswith("10."):
            nearest = EdgeComputeRouter.NODES[0] # Local/VPN -> NYC
        elif user_ip.startswith("192."):
            nearest = EdgeComputeRouter.NODES[1] # LAN -> London (Simulated)
        else:
            nearest = random.choice(EdgeComputeRouter.NODES)

        logger.info(f"⚡ Nearest Edge Node: {nearest['id']} ({nearest['latency']}ms)")
        
        if request_type == "ai_inference":
             logger.info("🤖 Offloading AI inference to Edge GPU Cluster...")
             time.sleep(0.01) # Ultra-low latency simulation
        
        return {
            "node_id": nearest["id"],
            "region": nearest["region"],
            "status": "routed"
        }
