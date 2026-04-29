"""
Quick Start Example for Learning Hub SDK
"""

from learning_hub_sdk import LearningHubClient, AuthenticationError

def main():
    """Quick start example."""
    # Initialize client (use API key or username/password)
    try:
        client = LearningHubClient(
            base_url="https://api.learninghub.com",
            api_key="your-api-key-here"
            # OR
            # username="your-username",
            # password="your-password"
        )
        
        # Health check
        print("Checking API health...")
        health = client.health_check()
        print(f"API Status: {health}")
        
        # Get current user
        print("
Getting current user...")
        user = client.get_current_user()
        print(f"User: {user.username} ({user.email})")
        
        # List courses
        print("
Listing courses...")
        courses = client.get_courses(page_size=5)
        print(f"Found {len(courses.results)} courses:")
        for course in courses.results:
            print(f"  - {course.title} (${course.price})")
        
        # Get specific course
        if courses.results:
            course_id = courses.results[0].id
            print(f"
Getting course details for ID {course_id}...")
            course = client.get_course(course_id)
            print(f"Course: {course.title}")
            print(f"Description: {course.description}")
            print(f"Duration: {course.duration_hours} hours")
        
        # Create enrollment
        if courses.results and user:
            print(f"
Enrolling in course...")
            enrollment = client.enroll_user(user.id, courses.results[0].id)
            print(f"Enrolled at: {enrollment.enrolled_at}")
        
    except AuthenticationError as e:
        print(f"Authentication failed: {e}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
