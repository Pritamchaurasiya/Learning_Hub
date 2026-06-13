from locust import HttpUser, task, between

class LearningHubUser(HttpUser):
    wait_time = between(1, 5)

    @task
    def test_api_endpoints(self):
        self.client.get("/api/v1/courses/")
        self.client.get("/api/v1/dsa/problems/")
        self.client.get("/api/v1/gamification/leaderboard/")
        self.client.get("/api/v1/users/profile/")