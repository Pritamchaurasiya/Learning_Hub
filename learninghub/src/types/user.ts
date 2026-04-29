/**
 * User type for authenticated user data.
 * Replaces the `any` type used previously in auth state.
 */
export interface User {
  id: string | number;
  email: string;
  username?: string;
  avatar?: string;
  xp: number;
  level: number;
  streak: number;
  lastActive: string;
  is_active?: boolean;
  date_joined?: string;
  role?: 'student' | 'instructor' | 'admin';
}
