export type SubscriptionTier = 'free' | 'pro' | 'lifetime';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string;
  isPro: boolean;
  planTier: SubscriptionTier;
  aiCreditsRemaining: number;
  polarCustomerId?: string;
  polarSubscriptionId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isPro: boolean;
}
