import { PrismaClient, DifficultyLevel } from '@prisma/client'

const prisma = new PrismaClient()

const dsaProblems = [
  {
    title: 'Two Sum',
    slug: 'two-sum',
    category: 'Arrays & Hashing',
    difficulty: DifficultyLevel.BEGINNER,
    points: 100,
    tags: ['Array', 'Hash Table', 'Two Pointers'],
    description: `Given an array of integers \`nums\` and an integer \`target\`, return *indices of the two numbers such that they add up to \`target\`*.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.

### Example 1:
\`\`\`
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
\`\`\`

### Example 2:
\`\`\`
Input: nums = [3,2,4], target = 6
Output: [1,2]
\`\`\`

### Constraints:
- \`2 <= nums.length <= 10^4\`
- \`-10^9 <= nums[i] <= 10^9\`
- \`-10^9 <= target <= 10^9\`
- Only one valid answer exists.`,
    starterCode: `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`,
    testCases: JSON.stringify([
      { input: { nums: [2, 7, 11, 15], target: 9 }, expected: [0, 1] },
      { input: { nums: [3, 2, 4], target: 6 }, expected: [1, 2] },
      { input: { nums: [3, 3], target: 6 }, expected: [0, 1] },
    ]),
  },
  {
    title: 'Valid Parentheses',
    slug: 'valid-parentheses',
    category: 'Stack',
    difficulty: DifficultyLevel.BEGINNER,
    points: 100,
    tags: ['String', 'Stack'],
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

### Example 1:
\`\`\`
Input: s = "()"
Output: true
\`\`\`

### Example 2:
\`\`\`
Input: s = "()[]{}"
Output: true
\`\`\`

### Example 3:
\`\`\`
Input: s = "(]"
Output: false
\`\`\``,
    starterCode: `function isValid(s) {
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  for (const char of s) {
    if (map[char]) {
      if (stack.pop() !== map[char]) return false;
    } else {
      stack.push(char);
    }
  }
  return stack.length === 0;
}`,
    testCases: JSON.stringify([
      { input: { s: '()' }, expected: true },
      { input: { s: '()[]{}' }, expected: true },
      { input: { s: '(]' }, expected: false },
      { input: { s: '([{}])' }, expected: true },
    ]),
  },
  {
    title: 'Longest Substring Without Repeating Characters',
    slug: 'longest-substring-without-repeating-characters',
    category: 'Sliding Window',
    difficulty: DifficultyLevel.INTERMEDIATE,
    points: 200,
    tags: ['Hash Table', 'String', 'Sliding Window'],
    description: `Given a string \`s\`, find the length of the **longest substring** without repeating characters.

### Example 1:
\`\`\`
Input: s = "abcabcbb"
Output: 3
Explanation: The answer is "abc", with the length of 3.
\`\`\`

### Example 2:
\`\`\`
Input: s = "bbbbb"
Output: 1
Explanation: The answer is "b", with the length of 1.
\`\`\``,
    starterCode: `function lengthOfLongestSubstring(s) {
  let maxLength = 0;
  let left = 0;
  const seen = new Map();
  for (let right = 0; right < s.length; right++) {
    if (seen.has(s[right]) && seen.get(s[right]) >= left) {
      left = seen.get(s[right]) + 1;
    }
    seen.set(s[right], right);
    maxLength = Math.max(maxLength, right - left + 1);
  }
  return maxLength;
}`,
    testCases: JSON.stringify([
      { input: { s: 'abcabcbb' }, expected: 3 },
      { input: { s: 'bbbbb' }, expected: 1 },
      { input: { s: 'pwwkew' }, expected: 3 },
    ]),
  },
  {
    title: 'Coin Change (DP)',
    slug: 'coin-change',
    category: 'Dynamic Programming',
    difficulty: DifficultyLevel.INTERMEDIATE,
    points: 250,
    tags: ['Array', 'Dynamic Programming', 'Breadth-First Search'],
    description: `You are given an integer array \`coins\` representing coins of different denominations and an integer \`amount\` representing a total amount of money.

Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return \`-1\`.

### Example 1:
\`\`\`
Input: coins = [1,2,5], amount = 11
Output: 3
Explanation: 11 = 5 + 5 + 1
\`\`\`

### Example 2:
\`\`\`
Input: coins = [2], amount = 3
Output: -1
\`\`\``,
    starterCode: `function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let i = 1; i <= amount; i++) {
    for (const coin of coins) {
      if (i - coin >= 0) {
        dp[i] = Math.min(dp[i], dp[i - coin] + 1);
      }
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}`,
    testCases: JSON.stringify([
      { input: { coins: [1, 2, 5], amount: 11 }, expected: 3 },
      { input: { coins: [2], amount: 3 }, expected: -1 },
      { input: { coins: [1], amount: 0 }, expected: 0 },
    ]),
  },
  {
    title: 'Trapping Rain Water',
    slug: 'trapping-rain-water',
    category: 'Two Pointers',
    difficulty: DifficultyLevel.ADVANCED,
    points: 350,
    tags: ['Array', 'Two Pointers', 'Dynamic Programming', 'Stack', 'Monotonic Stack'],
    description: `Given \`n\` non-negative integers representing an elevation map where the width of each bar is \`1\`, compute how much water it can trap after raining.

### Example 1:
\`\`\`
Input: height = [0,1,0,2,1,0,1,3,2,1,2,1]
Output: 6
Explanation: The above elevation map (black section) is represented by array [0,1,0,2,1,0,1,3,2,1,2,1]. In this case, 6 units of rain water are being trapped.
\`\`\``,
    starterCode: `function trap(height) {
  let left = 0, right = height.length - 1;
  let leftMax = 0, rightMax = 0;
  let water = 0;
  while (left < right) {
    if (height[left] < height[right]) {
      if (height[left] >= leftMax) leftMax = height[left];
      else water += leftMax - height[left];
      left++;
    } else {
      if (height[right] >= rightMax) rightMax = height[right];
      else water += rightMax - height[right];
      right--;
    }
  }
  return water;
}`,
    testCases: JSON.stringify([
      { input: { height: [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1] }, expected: 6 },
      { input: { height: [4, 2, 0, 3, 2, 5] }, expected: 9 },
    ]),
  },
]

async function seed() {
  console.log('Seeding DSA problems...')
  for (const p of dsaProblems) {
    await prisma.problem.upsert({
      where: { slug: p.slug },
      update: p,
      create: p,
    })
  }
  console.log(`Successfully seeded ${dsaProblems.length} DSA problems!`)
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
