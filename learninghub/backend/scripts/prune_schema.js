const fs = require('fs')

const schemaPath = 'prisma/schema.prisma'
let schema = fs.readFileSync(schemaPath, 'utf8')

const modelsToDelete = [
  'Course',
  'UserProgress',
  'Bookmark',
  'Lesson',
  'LessonCompletion',
  'Note',
  'LiveSession',
  'Mentor',
  'MentorshipSession',
  'Module',
  'CourseReview',
  'SubscriptionTier',
  'Subscription',
  'UsageLimit',
  'Coupon',
  'Certificate',
  'Web3Profile',
  'NFTCertificate',
  'Contest',
  'ContestProblem',
  'ContestParticipant',
  'ContestSubmission',
  'Cart',
  'CartItem',
]

let lines = schema.split('\n')
let newLines = []
let inDeletedModel = false

for (let line of lines) {
  if (line.startsWith('model ')) {
    const modelName = line.split(' ')[1]
    if (modelsToDelete.includes(modelName)) {
      inDeletedModel = true
    } else {
      inDeletedModel = false
      newLines.push(line)
    }
  } else if (line.startsWith('enum ')) {
    const enumName = line.split(' ')[1]
    const enumsToDelete = [
      'CoursePhase',
      'ProgressStatus',
      'SubscriptionStatus',
      'SubscriptionInterval',
      'ContestStatus',
      'ContestDifficulty',
      'ContestType',
    ]
    if (enumsToDelete.includes(enumName)) {
      inDeletedModel = true
    } else {
      inDeletedModel = false
      newLines.push(line)
    }
  } else if (inDeletedModel) {
    if (line.startsWith('}')) {
      inDeletedModel = false
    }
  } else {
    // If we are in the User model, we need to remove relation fields pointing to deleted models
    if (!inDeletedModel) {
      if (line.match(/coursesTaught\s+Course\[\]/)) continue
      if (line.match(/lessonCompletions\s+LessonCompletion\[\]/)) continue
      if (line.match(/liveSessions\s+LiveSession\[\]/)) continue
      if (line.match(/mentoring\s+MentorshipSession\[\]/)) continue
      if (line.match(/mentorships\s+MentorshipSession\[\]/)) continue
      if (line.match(/notes\s+Note\[\]/)) continue
      if (line.match(/bookmarks\s+Bookmark\[\]/)) continue
      if (line.match(/certificates\s+Certificate\[\]/)) continue
      if (line.match(/courseReviews\s+CourseReview\[\]/)) continue
      if (line.match(/NFTCertificate\s+NFTCertificate\[\]/)) continue
      if (line.match(/subscription\s+Subscription\?/)) continue
      if (line.match(/Web3Profile\s+Web3Profile\?/)) continue
      if (line.match(/cart\s+Cart\?/)) continue
      if (line.match(/mentorProfile\s+Mentor\?/)) continue
      if (line.match(/contestParticipants\s+ContestParticipant\[\]/)) continue
      if (line.match(/progress\s+UserProgress\[\]/)) continue

      // ActivityType enum cleanup
      if (
        line.includes('COURSE_ENROLL') ||
        line.includes('COURSE_START') ||
        line.includes('COURSE_COMPLETE') ||
        line.includes('LESSON_START') ||
        line.includes('LESSON_COMPLETE') ||
        line.includes('BOOKMARK_ADD') ||
        line.includes('BOOKMARK_REMOVE') ||
        line.includes('NOTE_CREATE') ||
        line.includes('NOTE_UPDATE')
      )
        continue

      // Test model cleanup
      if (line.match(/courseId\s+String\?/)) continue
      if (line.match(/course\s+Course\?/)) continue
      if (line.match(/@@index\(\[courseId, isPublished\]/)) continue
    }

    newLines.push(line)
  }
}

fs.writeFileSync(schemaPath, newLines.join('\n'))
console.log('Schema pruned successfully.')
