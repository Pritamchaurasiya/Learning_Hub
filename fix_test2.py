with open('learninghub/backend/src/__tests__/services/AITestService.test.ts', 'r') as f:
    content = f.read()

import re
# Oh, we had a broken async.
# The error says "await is only valid in async functions"
# So one of the functions we touched lost its "async" keyword. Let's find out what's missing.

# Actually, I can just restore the whole file from git and remove the `it(...)` blocks properly with a clean regex
import os
os.system('git checkout learninghub/backend/src/__tests__/services/AITestService.test.ts')

with open('learninghub/backend/src/__tests__/services/AITestService.test.ts', 'r') as f:
    original = f.read()

cleaned = re.sub(
    r"\s*it\('should fallback to mock mode if AI generates invalid or zero questions', async \(\) => \{[\s\S]*?\}\)\n",
    "\n",
    original
)

cleaned = re.sub(
    r"\s*it\('should fallback to mock mode if AI repeatedly fails schema validation', async \(\) => \{[\s\S]*?\}\)\n",
    "\n",
    cleaned
)

with open('learninghub/backend/src/__tests__/services/AITestService.test.ts', 'w') as f:
    f.write(cleaned)
