from locust import HttpUser, task, between

class LearningHubUser(HttpUser):
    wait_time = between(1, 4)
    
    def on_start(self):
        """Authenticates the user before starting tasks."""
        self.login()
        
    def login(self):
        """Mock login block - Replace with actual credentials once DB seeded"""
        # response = self.client.post("/api/v1/auth/jwt/create/", {
        #     "email": "student@test.com",
        #     "password": "Password123"
        # })
        # self.token = response.json().get("access")
        # self.client.headers.update({"Authorization": f"Bearer {self.token}"})
        pass
        
    @task(3)
    def view_student_dashboard(self):
        """Simulates heavy load on the main dashboard aggregator view."""
        # /api/v1/dashboard/student_stats/
        # With the prefetch_related fixes, this should not cause N+1 locking.
        self.client.get("/api/v1/dashboard/student_stats/")
        
    @task(2)
    def view_leaderboards(self):
        """Simulates rapid refreshing of gamification leaderboards."""
        # Should hit the Redis/Memcached cache layer added in Phase 33.
        self.client.get("/api/v1/gamification/leaderboard/")
        
    @task(2)
    def fetch_my_courses(self):
        """Simulates frequent fetching of enrolled courses."""
        # Tests the cache and select_related fixes on Enrollment serializer.
        self.client.get("/api/v1/courses/my-courses/")
        
    @task(1)
    def submit_dsa_solution(self):
        """Simulates code execution payload submission (Write Heavy)."""
        # Submissions should not lock the problem row entirely.
        payload = {
            "problem_id": 1,
            "code": "print('Hello')",
            "language": "python"
        }
        self.client.post("/api/v1/dsa/submissions/", json=payload)
        
    @task(1)
    def open_realtime_chat(self):
        """Simulates connecting to discussions to trigger JWT Auth Middleware."""
        # Tests our new JWTAuthMiddleware efficiency.
        # In a real WebSocket load test, we'd use a generic WS client, but HTTP testing
        # the initial handshake metadata endpoint is still valid.
        self.client.get("/api/v1/chat/conversations/")

