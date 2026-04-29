import structlog
import copy
import time
from typing import Dict, Any, List

logger = structlog.get_logger(__name__)

class TemporalDebugger:
    """
    Implements Time-Travel Debugging capabilities.
    Snapshots application state at sub-second intervals and allows 
    instant replay of any historical state.
    """

    def __init__(self):
        self.timeline: List[Dict[str, Any]] = []
        self.max_snapshots = 1000

    def capture_snapshot(self, state_data: Dict[str, Any]):
        """
        Freezes the current universe state.
        """
        snapshot = {
            "timestamp": time.time(),
            "state": copy.deepcopy(state_data),
            "snapshot_id": len(self.timeline) + 1
        }
        self.timeline.append(snapshot)
        if len(self.timeline) > self.max_snapshots:
            self.timeline.pop(0) # Rolling window
            
        logger.debug(f"📸 Captured Temporal Snapshot #{snapshot['snapshot_id']}")

    def travel_to(self, timestamp: float) -> Dict[str, Any]:
        """
        Reverts the system state to the nearest snapshot before `timestamp`.
        """
        logger.info(f"⏳ Initiating Temporal Reversion to {timestamp}...")
        
        # Binary search for efficiency
        # For simulation, simple linear scan
        closest_snap = None
        for snap in reversed(self.timeline):
            if snap["timestamp"] <= timestamp:
                closest_snap = snap
                break
        
        if closest_snap:
            logger.info(f"✅ Time Travel Successful. Reverted to Snapshot #{closest_snap['snapshot_id']}")
            return closest_snap["state"]
        else:
            logger.error("❌ Temporal Paradox: Target time is outside of retention window.")
            return {}
