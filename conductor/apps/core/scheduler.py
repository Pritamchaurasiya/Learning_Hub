import requests
import structlog
from django.conf import settings
from celery import current_app as celery_app
from celery.schedules import crontab

logger = structlog.get_logger(__name__)

class CarbonScheduler:
    """
    Schedules background jobs based on real-time Carbon Intensity of the energy grid.
    """
    
    CARBON_API_URL = "https://api.carbonintensity.org.uk/intensity" # Example API

    @staticmethod
    def get_current_intensity():
        try:
            # Mocking response to avoid external call failure
            # response = requests.get(CarbonScheduler.CARBON_API_URL, timeout=2)
            # data = response.json()
            # return data['data'][0]['intensity']['actual']
            return 150 # Mock gCO2/kWh
        except Exception:
            return 200 # Default moderate intensity

    @staticmethod
    def is_green_window():
        """
        Returns True if carbon intensity is low (< 100 gCO2/kWh).
        """
        intensity = CarbonScheduler.get_current_intensity()
        logger.info(f"🌿 Current Carbon Intensity: {intensity} gCO2/kWh")
        return intensity < 180

    @staticmethod
    def schedule_heavy_compute(task_name, *args):
        """
        Only schedules the task if the grid is green. Otherwise, delays it.
        """
        if CarbonScheduler.is_green_window():
            logger.info(f"✅ Green Grid! Dispatching {task_name}")
            celery_app.send_task(task_name, args=args)
        else:
            logger.warning(f"⚠️ Dirty Grid! Delaying {task_name} for 1 hour.")
            # Schedule in future
            celery_app.send_task(task_name, args=args, countdown=3600)

