const fs = require('fs')
const path = require('path')

function replaceInFile(filePath, searchRegex, replaceWith) {
  const fullPath = path.resolve(__dirname, filePath)
  if (!fs.existsSync(fullPath)) return
  let content = fs.readFileSync(fullPath, 'utf8')
  content = content.replace(searchRegex, replaceWith)
  fs.writeFileSync(fullPath, content)
  console.log(`Updated ${filePath}`)
}

replaceInFile('src/services/TestScoringService.ts', /'SHORT_ANSWER'/g, "'SUBJECTIVE'")
replaceInFile('src/services/TestScoringService.ts', /'MULTIPLE_SELECT'/g, "'MSQ'")

replaceInFile(
  'src/services/AITestService.ts',
  /userId_topicName: \{ userId, topicName \}/g,
  'userId_topicId: { userId, topicId: topicName }'
)
replaceInFile(
  'src/services/TopicPerformanceService.ts',
  /userId_topicName: \{ userId, topicName \}/g,
  'userId_topicId: { userId, topicId: topicName }'
)
replaceInFile('src/services/AITestService.ts', /bloomLevel: string/g, 'bloomLevel: any')
replaceInFile(
  'src/services/TopicPerformanceService.ts',
  /topicName: string \| null/g,
  'topicName: any'
)
replaceInFile(
  'src/services/RecommendationService.ts',
  /topicName: string \| null/g,
  'topicName: any'
)
replaceInFile(
  'src/services/NotificationService.ts',
  /type: String\(event\.type\)/g,
  'type: String(event.type) as any'
)

console.log('Done replacing.')
