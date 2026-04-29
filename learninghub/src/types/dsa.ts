export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface Problem {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  points: number;
  tags: Tag[];
  constraints: string;
  input_format: string;
  output_format: string;
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  acceptance_rate?: number;
  total_submissions?: number;
  user_status?: 'SOLVED' | 'ATTEMPTED' | 'UNATTEMPTED';
}

export interface TestCase {
  id: string;
  input_data: string;
  expected_output: string;
  is_hidden: boolean;
  explanation?: string;
}

export type SubmissionStatus =
  | 'PENDING'
  | 'AC'
  | 'WA'
  | 'TLE'
  | 'RE'
  | 'CE';

export interface Submission {
  id: string;
  problem: string;
  code: string;
  language: string;
  status: SubmissionStatus;
  passed_tests: number;
  total_tests: number;
  execution_time_ms: number | null;
  memory_kb: number | null;
  feedback: string | null;
  created_at: string;
}

export type ProgrammingLanguage =
  | 'python'
  | 'javascript'
  | 'java'
  | 'cpp'
  | 'c'
  | 'typescript'
  | 'go'
  | 'rust';

export interface LanguageConfig {
  id: ProgrammingLanguage;
  name: string;
  extension: string;
  version: string;
  template: string;
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    id: 'python',
    name: 'Python',
    extension: 'py',
    version: '3.11',
    template: '# Write your solution here\n',
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    extension: 'js',
    version: 'ES2023',
    template: '// Write your solution here\n',
  },
  {
    id: 'java',
    name: 'Java',
    extension: 'java',
    version: '17',
    template: 'class Solution {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}',
  },
  {
    id: 'cpp',
    name: 'C++',
    extension: 'cpp',
    version: '17',
    template: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}',
  },
];

export interface Contest {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  problems: Problem[];
  is_active: boolean;
  participant_count: number;
  is_registered: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar?: string;
  score: number;
  problems_solved: number;
  total_time: number;
  last_submission_time: string;
}

export interface DSAStats {
  total_problems: number;
  solved_problems: number;
  attempted_problems: number;
  submissions_count: number;
  acceptance_rate: number;
  current_streak: number;
  longest_streak: number;
  rank: number;
  easy_solved: number;
  medium_solved: number;
  hard_solved: number;
  total_easy: number;
  total_medium: number;
  total_hard: number;
}
