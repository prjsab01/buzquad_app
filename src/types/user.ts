export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  bio?: string;
  pronouns?: string;
  location?: string;
  avatarUrl?: string;
  updatedAt: string | unknown;
  createdAt: string | unknown;
}
