with open('learninghub/backend/src/services/AITestService.ts', 'r') as f:
    content = f.read()

import re

# Fix error TS2304: Cannot find name 'isMock'.
content = re.sub(
    r"isMock = true",
    "",
    content
)

with open('learninghub/backend/src/services/AITestService.ts', 'w') as f:
    f.write(content)
