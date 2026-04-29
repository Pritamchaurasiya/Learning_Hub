"""
Learning Hub SDK CLI
"""

import argparse
import json
import sys
from typing import Optional

from .client import LearningHubClient
from .exceptions import LearningHubError

def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(description='Learning Hub SDK CLI')
    parser.add_argument('--base-url', required=True, help='API base URL')
    parser.add_argument('--api-key', help='API key for authentication')
    parser.add_argument('--username', help='Username for authentication')
    parser.add_argument('--password', help='Password for authentication')
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Health check command
    health_parser = subparsers.add_parser('health', help='Check API health')
    
    # Get current user command
    user_parser = subparsers.add_parser('user', help='Get current user')
    
    # List courses command
    courses_parser = subparsers.add_parser('courses', help='List courses')
    courses_parser.add_argument('--category', type=int, help='Category ID')
    courses_parser.add_argument('--search', help='Search term')
    courses_parser.add_argument('--page', type=int, default=1, help='Page number')
    courses_parser.add_argument('--page-size', type=int, default=20, help='Page size')
    
    # Get course command
    course_parser = subparsers.add_parser('course', help='Get course by ID')
    course_parser.add_argument('id', type=int, help='Course ID')
    
    # Enroll command
    enroll_parser = subparsers.add_parser('enroll', help='Enroll user in course')
    enroll_parser.add_argument('--user-id', type=int, required=True, help='User ID')
    enroll_parser.add_argument('--course-id', type=int, required=True, help='Course ID')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    try:
        # Initialize client
        client = LearningHubClient(
            base_url=args.base_url,
            api_key=args.api_key,
            username=args.username,
            password=args.password
        )
        
        # Execute command
        if args.command == 'health':
            result = client.health_check()
        elif args.command == 'user':
            result = client.get_current_user()
        elif args.command == 'courses':
            result = client.get_courses(
                category=args.category,
                search=args.search,
                page=args.page,
                page_size=args.page_size
            )
        elif args.command == 'course':
            result = client.get_course(args.id)
        elif args.command == 'enroll':
            result = client.enroll_user(args.user_id, args.course_id)
        else:
            parser.print_help()
            sys.exit(1)
        
        # Output result
        print(json.dumps(result.dict() if hasattr(result, 'dict') else result, 
                        indent=2, default=str))
        
    except LearningHubError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
