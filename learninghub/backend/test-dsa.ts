import { CodeSandboxService } from './src/services/CodeSandboxService';

async function main() {
  const result = await CodeSandboxService.execute({
    code: 'console.log("Hello, World!");',
    language: 'javascript',
    testCases: [{ input: '', output: 'Hello, World!\n' }],
    timeLimit: 5,
    memoryLimit: 256
  });
  console.log(result);
}

main().catch(console.error);
