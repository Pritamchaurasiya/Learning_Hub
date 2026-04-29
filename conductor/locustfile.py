from locust import HttpUser, task, between

class LearningHubUser(HttpUser):
    wait_time = between(1, 5)

    @task
    def test_api_endpoints(self):
        self.client.get("/api/courses/")
        self.client.get("/api/dsa/problems/")
        self.client.get("/api/gamification/leaderboard/")
        self.client.get("/api/users/profile/")