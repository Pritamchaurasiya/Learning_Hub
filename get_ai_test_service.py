with open('learninghub/backend/src/services/AITestService.ts', 'r') as f:
    content = f.read()

import re

for match in re.finditer(r"logger\.[\w]*\([\s\S]*?fallback[\s\S]*?\)", content, re.IGNORECASE):
    print("Found fallback logger at index", match.start())
    #print(match.group(0))

for match in re.finditer(r"isMock = true", content, re.IGNORECASE):
    print("Found isMock assignment at index", match.start())
