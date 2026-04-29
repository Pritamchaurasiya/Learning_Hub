
from locust import HttpUser, task, between

class WebsiteUser(HttpUser):
    wait_time = between(1, 5)

    @task(3)
    def index(self):
        self.client.get("/")

    @task(1)
    def list_courses(self):
        self.client.get("/api/courses/")

    @task(1)
    def check_health(self):
        self.client.get("/health/")

    # Simulate AI traffic (lower weight)
    @task(1)
    def ask_ai(self):
        self.client.post("/api/ai/tutor/", json={
            "question": "What is Python?",
            "module_filename": "intro_python"
        })
