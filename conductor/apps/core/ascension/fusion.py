import structlog
import random

logger = structlog.get_logger(__name__)

class FusionReactorController:
    """
    Controls the magnetic confinement field of a Tokamak Fusion Reactor.
    Ensures plasma stability to power the AI data center endlessly.
    """

    MAX_TEMP_KELVIN = 150_000_000 # 150 Million K

    @staticmethod
    def adjust_magnetic_field(plasma_instability: float):
        """
        Adjusts superconducting magnets to contain the plasma within the Torus.
        """
        logger.info(f"☀️ Plasma Instability Detected: {plasma_instability:.4f}")
        
        if plasma_instability > 0.05:
            correction = "Increasing Poloidal Field by 12 Tesla"
            logger.warning(f"⚠️ Instability Warning! Action: {correction}")
        else:
            correction = "Field Stable. Maintaining Ignited Plasma."
            logger.info("✅ Fusion Reaction Self-Sustaining (Q > 10).")

        return correction

    @staticmethod
    def harvest_energy() -> float:
        """
        Returns energy output in Megawatts.
        """
        output = 2000 * random.uniform(0.9, 1.1)
        logger.info(f"🔋 Harvesting {output:.2f} MW of clean fusion energy.")
        return output
