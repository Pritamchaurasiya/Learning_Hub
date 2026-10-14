with open('learninghub/backend/src/services/ai/AIRouter.ts', 'r') as f:
    content = f.read()

import re

# Remove 'mock' from priority array
content = re.sub(r", 'mock'", "", content)
# Remove the mock check
content = re.sub(r" && providerName !== 'mock'", "", content)

with open('learninghub/backend/src/services/ai/AIRouter.ts', 'w') as f:
    f.write(content)
