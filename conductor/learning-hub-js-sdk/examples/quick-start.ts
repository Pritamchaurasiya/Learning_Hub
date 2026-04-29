/**
 * Quick Start Example for Learning Hub JavaScript/TypeScript SDK
 */

import { LearningHubClient, AuthenticationError } from '../src/index';

async function main() {
  try {
    // Initialize client (use API key or username/password)
    const client = new LearningHubClient({
      baseURL: 'https://api.learninghub.com',
      apiKey: 'your-api-key-here'
      // OR
      // username: 'your-username',
      // password: 'your-password'
    });

    // Health check
    console.log('Checking API health...');
    const health = await client.healthCheck();
    console.log('API Status:', health);

    // Get current user
    console.log('\nGetting current user...');
    const user = await client.getCurrentUser();
    console.log(`User: ${user.fullName} (${user.email})`);

    // List courses
    console.log('\nListing courses...');
    const courses = await client.getCourses({ page_size: 5 });
    console.log(`Found ${courses.count} courses:`);
    courses.results.forEach(course => {
      console.log(`  - ${course.title} (${course.formattedPrice})`);
    });

    // Get specific course
    if (courses.results.length > 0) {
      const course = courses.results[0];
      console.log(`\nGetting course details for ID ${course.id}...`);
      console.log(`Course: ${course.title}`);
      console.log(`Description: ${course.description}`);
      console.log(`Duration: ${course.formattedDuration}`);

      // Create enrollment
      console.log(`\nEnrolling in course...`);
      const enrollment = await client.enrollUser(user.id, course.id);
      console.log(`Enrolled at: ${enrollment.enrolled_at}`);

      // Get progress
      const progress = await client.getUserProgress(user.id, course.id);
      console.log(`Progress: ${progress.formattedProgress}`);
    }

  } catch (error) {
    if (error instanceof AuthenticationError) {
      console.error(`Authentication failed: ${error.message}`);
    } else {
      console.error(`Error: ${error}`);
    }
  }
}

main();
