export interface SpotlightItem {
  id: string;
  type: 'post' | 'community' | 'link';
  title: string;
  description?: string;
  url?: string;
  refId?: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  tags?: string[];
  externalUrl?: string;
  date?: string;
  type: 'project' | 'design' | 'writing' | 'code' | 'art' | 'music' | 'video' | 'other';
  featured?: boolean;
}

export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  bio?: string;
  pronouns?: string;
  location?: string;
  timezone?: string;
  links?: string[];
  avatarUrl?: string;
  coverUrl?: string;
  interests?: string[];
  onboardingStep?: number;
  spotlight?: SpotlightItem[];
  portfolio?: PortfolioItem[];
  privacyMode?: 'public' | 'private' | 'circle-only';
  showActivity?: boolean;
  showOnline?: boolean;
  // §42 Theme
  theme?: 'system' | 'light' | 'dark' | 'oled';
  accentColor?: string;
  density?: 'comfortable' | 'compact' | 'cozy';
  fontStyle?: 'system' | 'serif' | 'dyslexic';
  // §43 Notification prefs
  notifLevel?: 'all' | 'mentions' | 'important' | 'muted';
  dndStart?: string; // HH:MM
  dndEnd?: string;
  digestFrequency?: 'realtime' | 'daily' | 'weekly';
  // §46 Content filters
  contentWarningPref?: 'hide' | 'show' | 'selective';
  keywordFilters?: string[];
  // §49 Streaks
  loginStreak?: number;
  postStreak?: number;
  lastLoginDate?: string;
  lastPostDate?: string;
  streaksEnabled?: boolean;
  // §50 i18n
  language?: string;
  // §51 Progressive disclosure
  seenTooltips?: string[];
  advancedMode?: boolean;
  // §54 AI assists
  kudosReceived?: number;
  kudosSentToday?: number;
  kudosSentDate?: string;
  updatedAt: string | unknown;
  createdAt: string | unknown;
}
