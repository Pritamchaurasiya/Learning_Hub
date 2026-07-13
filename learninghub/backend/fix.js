const fs = require('fs')
let content = fs.readFileSync('src/__tests__/services/AITestService.test.ts', 'utf8')

// Undo the bad edit at line 144
content = content.replace(
  "// Assert that correct answers are not leaked to frontend\n      expect((result.questions[0] as any).correct_option_id).toBe('')\n    })\n\n    it('should generate an adaptive test based on user level'",
  "expect(result.questions[0].text).toContain('[MOCK]')\n    })\n\n    it('should generate an adaptive test based on user level'"
)

// Apply the correct edit at line 105
content = content.replace(
  'expect((result.questions[0] as any).correct_option_id).toBeUndefined()',
  "expect((result.questions[0] as any).correct_option_id).toBe('')"
)

fs.writeFileSync('src/__tests__/services/AITestService.test.ts', content)
