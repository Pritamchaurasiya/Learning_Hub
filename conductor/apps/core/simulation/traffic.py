import simpy
import random
import structlog
from dataclasses import dataclass

logger = structlog.get_logger(__name__)

@dataclass
class UserAgent:
    id: int
    patience: float
    learning_speed: float

class DigitalTwinSimulator:
    """
    Simulates the entire Learning Hub ecosystem using Discrete Event Simulation (SimPy).
    Predicts system load and user retention outcomes based on behavior models.
    """
    
    def __init__(self, duration_hours=24):
        self.env = simpy.Environment()
        self.duration = duration_hours * 60  # minutes
        self.active_users = 0
        self.server_load = 0
        self.failed_requests = 0

    def user_behavior(self, agent: UserAgent):
        """
        Models a single user's session.
        """
        arrival_time = self.env.now
        self.active_users += 1
        
        # Simulate browsing courses
        yield self.env.timeout(random.randint(2, 10)) 
        
        # Simulate watching a video (heavy load)
        if random.random() < 0.7:
            with self.request_server_resources():
                yield self.env.timeout(random.randint(10, 45))
        
        # Simulate taking a quiz
        if random.random() < 0.4:
            if random.random() > agent.learning_speed: # Struggle
                yield self.env.timeout(15) # Retrying
            
        self.active_users -= 1
        logger.debug(f"User {agent.id} finished session at {self.env.now}")

    def request_server_resources(self):
        """
        Simulates load on backend infrastructure.
        """
        class ServerRequest:
            def __enter__(s):
                self.server_load += 1
                if self.server_load > 1000: # Capacity limit
                    self.failed_requests += 1
            def __exit__(s, *args):
                self.server_load -= 1
        return ServerRequest()

    def user_generator(self):
        """
        Generates users arriving at the platform.
        """
        user_id = 0
        while True:
            # Poisson arrival process
            interarrival = random.expovariate(1.0 / 5.0) # Avg every 5 mins
            yield self.env.timeout(interarrival)
            
            user_id += 1
            agent = UserAgent(id=user_id, patience=random.uniform(0.5, 1.0), learning_speed=random.random())
            self.env.process(self.user_behavior(agent))

    def run_simulation(self):
        logger.info(f"🔮 Starting Digital Twin Simulation for {self.duration} minutes...")
        self.env.process(self.user_generator())
        self.env.run(until=self.duration)
        
        stats = {
            "total_users_simulated": self.active_users, # Remaining active
            "failed_requests": self.failed_requests,
            "peak_load": "N/A (needs monitoring logic)"
        }
        logger.info(f"✅ Simulation Complete. Stats: {stats}")
        return stats
