#!/usr/bin/env python
"""
API Integration Examples
Demonstrates how to integrate with the Learning Hub API
"""

import requests
import json
from typing import Dict, List, Optional

# Configuration
BASE_URL = "http://localhost:8000/api/v1"


class LearningHubAPI:
    """
    Learning Hub API Client
    
    Example usage:
        api = LearningHubAPI()
        api.login("user@example.com", "password123")
        courses = api.get_courses()
    """
    
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.access_token = None
        self.refresh_token = None
    
    def _get_headers(self) -> Dict:
        """Get request headers with authentication."""
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        return headers
    
    # ====================================================================================
    # AUTHENTICATION
    # ====================================================================================
    
    def register(self, email: str, username: str, password: str, 
                 display_name: str = None) -> Dict:
        """
        Register a new user.
        
        Example:
            api = LearningHubAPI()
            response = api.register(
                email="newuser@example.com",
                username="newuser",
                password="SecurePass123!",
                display_name="New User"
            )
            print(f"User registered: {response['data']['user']['email']}")
        """
        url = f"{self.base_url}/auth/register/"
        data = {
            "email": email,
            "username": username,
            "password": password,
            "password_confirm": password,
            "display_name": display_name or username
        }
        
        response = requests.post(url, json=data)
        
        if response.status_code == 201:
            result = response.json()
            self.access_token = result['data']['accessToken']
            self.refresh_token = result['data']['refreshToken']
            return result
        else:
            raise Exception(f"Registration failed: {response.text}")
    
    def login(self, email: str, password: str) -> Dict:
        """
        Login and get access token.
        
        Example:
            api = LearningHubAPI()
            response = api.login("user@example.com", "password123")
            print(f"Logged in as: {response['data']['user']['email']}")
        """
        url = f"{self.base_url}/auth/login/"
        data = {
            "email": email,
            "password": password
        }
        
        response = requests.post(url, json=data)
        
        if response.status_code == 200:
            result = response.json()
            self.access_token = result['data']['accessToken']
            self.refresh_token = result['data']['refreshToken']
            return result
        else:
            raise Exception(f"Login failed: {response.text}")
    
    def refresh_token(self) -> Dict:
        """
        Refresh access token.
        
        Example:
            api.refresh_token()
        """
        url = f"{self.base_url}/auth/refresh/"
        data = {
            "refresh": self.refresh_token
        }
        
        response = requests.post(url, json=data)
        
        if response.status_code == 200:
            result = response.json()
            self.access_token = result['data']['access']
            return result
        else:
            raise Exception(f"Token refresh failed: {response.text}")
    
    def logout(self) -> None:
        """
        Logout and clear tokens.
        
        Example:
            api.logout()
        """
        self.access_token = None
        self.refresh_token = None
    
    # ====================================================================================
    # USERS
    # ====================================================================================
    
    def get_current_user(self) -> Dict:
        """
        Get current user profile.
        
        Example:
            user = api.get_current_user()
            print(f"User: {user['data']['email']}")
        """
        url = f"{self.base_url}/users/me/"
        response = requests.get(url, headers=self._get_headers())
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Failed to get user: {response.text}")
    
    def update_profile(self, **kwargs) -> Dict:
        """
        Update user profile.
        
        Example:
            api.update_profile(
                display_name="Updated Name",
                bio="My bio"
            )
        """
        url = f"{self.base_url}/users/me/"
        response = requests.patch(url, json=kwargs, headers=self._get_headers())
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Failed to update profile: {response.text}")
    
    # ====================================================================================
    # COURSES
    # ====================================================================================
    
    def get_courses(self, page: int = 1, category: str = None,
                   search: str = None, ordering: str = None) -> Dict:
        """
        Get list of courses.
        
        Example:
            # Get all courses
            courses = api.get_courses()
            
            # Search courses
            courses = api.get_courses(search="Python")
            
            # Filter by category
            courses = api.get_courses(category="programming")
            
            # Order by rating
            courses = api.get_courses(ordering="-avg_rating")
        """
        url = f"{self.base_url}/courses/"
        params = {"page": page}
        
        if category:
            params["category"] = category
        if search:
            params["search"] = search
        if ordering:
            params["ordering"] = ordering
        
        response = requests.get(url, params=params, headers=self._get_headers())
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Failed to get courses: {response.text}")
    
    def get_course_detail(self, slug: str) -> Dict:
        """
        Get course details.
        
        Example:
            course = api.get_course_detail("python-basics")
            print(f"Course: {course['data']['title']}")
        """
        url = f"{self.base_url}/courses/{slug}/"
        response = requests.get(url, headers=self._get_headers())
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Failed to get course: {response.text}")
    
    def enroll_in_course(self, slug: str) -> Dict:
        """
        Enroll in a course.
        
        Example:
            result = api.enroll_in_course("python-basics")
            print(f"Enrolled: {result['message']}")
        """
        url = f"{self.base_url}/courses/{slug}/enroll/"
        response = requests.post(url, headers=self._get_headers())
        
        if response.status_code == 201:
            return response.json()
        else:
            raise Exception(f"Failed to enroll: {response.text}")
    
    def submit_review(self, slug: str, rating: int, title: str, 
                      content: str) -> Dict:
        """
        Submit a course review.
        
        Example:
            api.submit_review(
                slug="python-basics",
                rating=5,
                title="Excellent course!",
                content="Great content and explanations."
            )
        """
        url = f"{self.base_url}/courses/{slug}/review/"
        data = {
            "rating": rating,
            "title": title,
            "content": content
        }
        
        response = requests.post(url, json=data, headers=self._get_headers())
        
        if response.status_code == 201:
            return response.json()
        else:
            raise Exception(f"Failed to submit review: {response.text}")
    
    # ====================================================================================
    # CATEGORIES
    # ====================================================================================
    
    def get_categories(self) -> Dict:
        """
        Get all categories.
        
        Example:
            categories = api.get_categories()
            for cat in categories['data']:
                print(f"{cat['name']}: {cat['course_count']} courses")
        """
        url = f"{self.base_url}/categories/"
        response = requests.get(url, headers=self._get_headers())
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Failed to get categories: {response.text}")
    
    # ====================================================================================
    # ENROLLMENTS & PROGRESS
    # ====================================================================================
    
    def get_my_enrollments(self, status: str = None) -> Dict:
        """
        Get user's enrollments.
        
        Example:
            # All enrollments
            enrollments = api.get_my_enrollments()
            
            # Only completed
            completed = api.get_my_enrollments(status="completed")
            
            # In progress
            active = api.get_my_enrollments(status="active")
        """
        url = f"{self.base_url}/enrollments/"
        params = {}
        if status:
            params["status"] = status
        
        response = requests.get(url, params=params, headers=self._get_headers())
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Failed to get enrollments: {response.text}")
    
    def update_progress(self, slug: str, progress_percentage: float) -> Dict:
        """
        Update course progress.
        
        Example:
            api.update_progress("python-basics", 50.0)
        """
        url = f"{self.base_url}/courses/{slug}/progress/"
        data = {
            "progress_percentage": progress_percentage
        }
        
        response = requests.patch(url, json=data, headers=self._get_headers())
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Failed to update progress: {response.text}")
    
    # ====================================================================================
    # GAMIFICATION
    # ====================================================================================
    
    def get_my_stats(self) -> Dict:
        """
        Get user's gamification stats (XP, badges, streaks).
        
        Example:
            stats = api.get_my_stats()
            print(f"XP: {stats['data']['xp']['total_xp']}")
            print(f"Level: {stats['data']['xp']['level']}")
        """
        url = f"{self.base_url}/gamification/stats/"
        response = requests.get(url, headers=self._get_headers())
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Failed to get stats: {response.text}")
    
    def get_leaderboard(self, limit: int = 10) -> Dict:
        """
        Get leaderboard.
        
        Example:
            leaderboard = api.get_leaderboard(limit=20)
            for user in leaderboard['data']:
                print(f"{user['rank']}. {user['username']} - {user['total_xp']} XP")
        """
        url = f"{self.base_url}/gamification/leaderboard/"
        params = {"limit": limit}
        
        response = requests.get(url, params=params, headers=self._get_headers())
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Failed to get leaderboard: {response.text}")
    
    # ====================================================================================
    # NOTIFICATIONS
    # ====================================================================================
    
    def get_notifications(self, unread_only: bool = False) -> Dict:
        """
        Get user notifications.
        
        Example:
            # All notifications
            all_notifs = api.get_notifications()
            
            # Only unread
            unread = api.get_notifications(unread_only=True)
        """
        url = f"{self.base_url}/notifications/"
        params = {}
        if unread_only:
            params["is_read"] = "false"
        
        response = requests.get(url, params=params, headers=self._get_headers())
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Failed to get notifications: {response.text}")
    
    def mark_notification_read(self, notification_id: int) -> Dict:
        """
        Mark notification as read.
        
        Example:
            api.mark_notification_read(123)
        """
        url = f"{self.base_url}/notifications/{notification_id}/read/"
        response = requests.post(url, headers=self._get_headers())
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Failed to mark notification: {response.text}")


# ====================================================================================
# EXAMPLE USAGE
# ====================================================================================

def main_example():
    """
    Complete example of using the Learning Hub API.
    """
    api = LearningHubAPI()
    
    try:
        # 1. Login
        print("1. Logging in...")
        login_result = api.login("user@example.com", "password123")
        print(f"   Logged in as: {login_result['data']['user']['email']}")
        
        # 2. Get user profile
        print("\n2. Getting user profile...")
        user = api.get_current_user()
        print(f"   User: {user['data']['display_name']} ({user['data']['email']})")
        
        # 3. Browse courses
        print("\n3. Browsing courses...")
        courses = api.get_courses(search="Python", ordering="-avg_rating")
        print(f"   Found {courses['pagination']['total']} courses")
        
        # Print first 3 courses
        for course in courses['data'][:3]:
            print(f"   - {course['title']} (Rating: {course['avg_rating']})")
        
        # 4. Get course details
        if courses['data']:
            slug = courses['data'][0]['slug']
            print(f"\n4. Getting course details for '{slug}'...")
            detail = api.get_course_detail(slug)
            print(f"   Description: {detail['data']['description'][:100]}...")
        
        # 5. Enroll in course
        print(f"\n5. Enrolling in course...")
        try:
            enrollment = api.enroll_in_course(slug)
            print(f"   Enrolled successfully!")
        except Exception as e:
            print(f"   Already enrolled or error: {e}")
        
        # 6. Get my enrollments
        print("\n6. Getting my enrollments...")
        my_courses = api.get_my_enrollments()
        print(f"   Enrolled in {len(my_courses['data'])} courses")
        
        # 7. Get gamification stats
        print("\n7. Getting gamification stats...")
        stats = api.get_my_stats()
        print(f"   XP: {stats['data']['xp']['total_xp']}")
        print(f"   Level: {stats['data']['xp']['level']}")
        print(f"   Badges: {len(stats['data']['badges'])}")
        
        # 8. Get leaderboard
        print("\n8. Getting leaderboard...")
        leaderboard = api.get_leaderboard(limit=5)
        print("   Top 5 users:")
        for user in leaderboard['data']:
            print(f"   {user['rank']}. {user['username']} - {user['total_xp']} XP")
        
        # 9. Get notifications
        print("\n9. Getting notifications...")
        notifications = api.get_notifications(unread_only=True)
        print(f"   Unread notifications: {len(notifications['data'])}")
        
        print("\n✓ All operations completed successfully!")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")


if __name__ == "__main__":
    main_example()
