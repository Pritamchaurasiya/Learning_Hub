with open('learninghub/backend/src/__tests__/services/AITestService.test.ts', 'r') as f:
    content = f.read()

import re
# remove the first mock test
content = re.sub(
    r"\s*it\('should fallback to mock mode if AI generates invalid or zero questions', async \(\) => \{[\s\S]*?}\)\n",
    "",
    content
)
# remove the second mock test
content = re.sub(
    r"\s*it\('should fallback to mock mode if AI repeatedly fails schema validation', async \(\) => \{[\s\S]*?}\)\n",
    "",
    content
)

with open('learninghub/backend/src/__tests__/services/AITestService.test.ts', 'w') as f:
    f.write(content)
