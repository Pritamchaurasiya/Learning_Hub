with open('learninghub/backend/src/services/ai/AIRouter.ts', 'r') as f:
    content = f.read()

import re

# Remove MockAIAdapter import and usage
content = re.sub(r"import \{ MockAIAdapter \} from './MockAIAdapter'\n", "", content)
content = re.sub(r"\| 'mock'", "", content)
content = re.sub(r"\s*// 6\. Mock \(Always available\)\n\s*this\.providers\.set\('mock', new MockAIAdapter\(\)\)\n\s*logger\.info\('\[AIRouter\] Registered Mock provider as safety fallback'\)", "", content)

with open('learninghub/backend/src/services/ai/AIRouter.ts', 'w') as f:
    f.write(content)
