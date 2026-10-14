with open('learninghub/backend/src/services/ai/AIAgent.ts', 'r') as f:
    content = f.read()

import re
content = re.sub(r" \| 'mock'", "", content)

with open('learninghub/backend/src/services/ai/AIAgent.ts', 'w') as f:
    f.write(content)
