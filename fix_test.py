with open('learninghub/backend/src/__tests__/services/AITestService.test.ts', 'r') as f:
    content = f.read()

import re

# Remove any stray "  })"
content = re.sub(r"  \}\)\n  \}\)", "  })", content)

with open('learninghub/backend/src/__tests__/services/AITestService.test.ts', 'w') as f:
    f.write(content)
