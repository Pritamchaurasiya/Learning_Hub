import 'package:learning_hub/data/models/course_model.dart';
import 'package:learning_hub/data/models/live_class_model.dart';

/// Home data model
class HomeData {
  final String userName;
  final List<ContinueLearningItem> continueLearning;
  final List<Course> featuredCourses;
  final List<Course> trendingCourses;
  final List<Course> recommendedCourses;
  final List<LiveClassModel> upcomingLiveClasses;

  HomeData({
    required this.userName,
    required this.continueLearning,
    required this.featuredCourses,
    required this.trendingCourses,
    required this.recommendedCourses,
    required this.upcomingLiveClasses,
  });

  factory HomeData.mockData() {
    return HomeData(
      userName: 'Learner',
      continueLearning: [
        ContinueLearningItem(
          courseId: '1',
          courseTitle: 'Complete Flutter Development Bootcamp',
          thumbnailUrl: 'https://picsum.photos/200/120?random=1',
          nextLessonId: 'l1',
          nextLessonTitle: 'Lesson 12: State Management',
          progress: 0.45,
        ),
        ContinueLearningItem(
          courseId: '2',
          courseTitle: 'Python for Data Science',
          thumbnailUrl: 'https://picsum.photos/200/120?random=2',
          nextLessonId: 'l2',
          nextLessonTitle: 'Chapter 5: Pandas Basics',
          progress: 0.32,
        ),
      ],
      featuredCourses: List.generate(5, (i) => _mockCourse(i, featured: true)),
      trendingCourses: List.generate(8, (i) => _mockCourse(i + 5)),
      recommendedCourses: List.generate(8, (i) => _mockCourse(i + 13)),
      upcomingLiveClasses: [
        LiveClassModel(
          id: 'live1',
          title: 'Building Real-time Apps',
          instructorName: 'Sarah Johnson',
          scheduledTime: DateTime.now().add(const Duration(hours: 3)),
        ),
        LiveClassModel(
          id: 'live2',
          title: 'AI/ML Workshop',
          instructorName: 'Dr. Michael Chen',
          scheduledTime: DateTime.now().add(const Duration(days: 1, hours: 10)),
        ),
      ],
    );
  }
}

Course _mockCourse(int index, {bool featured = false}) {
  final titles = [
    'Complete Flutter Development',
    'Python Machine Learning',
    'React & Node.js Masterclass',
    'Data Science with Python',
    'iOS Development with Swift',
    'Advanced JavaScript',
    'Cloud Computing with AWS',
    'Cybersecurity Fundamentals',
    'UI/UX Design Principles',
    'Blockchain Development',
    'DevOps Engineering',
    'Kubernetes Mastery',
    'GraphQL API Design',
    'TypeScript Deep Dive',
    'Mobile App Security',
    'Microservices Architecture',
    'Docker for Developers',
    'Vue.js Complete Guide',
    'Angular Advanced Patterns',
    'System Design Interview',
  ];

  return Course(
    id: 'course_$index',
    title: titles[index % titles.length],
    slug: 'course-$index',
    description: 'Learn everything about ${titles[index % titles.length]}',
    shortDescription: 'Master ${titles[index % titles.length]} from scratch',
    thumbnailUrl: 'https://picsum.photos/400/225?random=${index + 100}',
    instructorId: 'instructor_$index',
    instructorName: [
      'John Doe',
      'Jane Smith',
      'Alex Johnson',
      'Sarah Brown'
    ][index % 4],
    instructorAvatar: 'https://i.pravatar.cc/150?u=$index',
    category: ['Development', 'Data Science', 'Design', 'Business'][index % 4],
    tags: ['flutter', 'mobile', 'dart'],
    rating: 4.0 + (index % 10) / 10,
    reviewCount: 100 + index * 50,
    enrollmentCount: 1000 + index * 200,
    totalLessons: 30 + index,
    totalDuration: Duration(hours: 10 + index, minutes: 30),
    level: CourseLevel.values[index % 3],
    language: 'English',
    price: featured ? 0 : (29.99 + index * 10),
    originalPrice: featured ? null : (49.99 + index * 10),
    isFree: featured && index == 0,
    isPublished: true,
    hasCertificate: true,
    createdAt: DateTime.now().subtract(Duration(days: index * 10)),
    updatedAt: DateTime.now().subtract(Duration(days: index)),
    sections: [],
    requirements: ['Basic programming knowledge'],
    whatYouWillLearn: ['Build real-world projects'],
  );
}

/// Continue learning item model
class ContinueLearningItem {
  final String courseId;
  final String courseTitle;
  final String thumbnailUrl;
  final String nextLessonId;
  final String nextLessonTitle;
  final double progress;

  ContinueLearningItem({
    required this.courseId,
    required this.courseTitle,
    required this.thumbnailUrl,
    required this.nextLessonId,
    required this.nextLessonTitle,
    required this.progress,
  });
}
