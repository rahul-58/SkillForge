import { User } from 'firebase/auth';

export interface AuthHook {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<any>;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthHook; 