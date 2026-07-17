import { useEffect, useState } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark' | 'oled';
export type Density = 'comfortable' | 'compact' | 'cozy';
export type FontStyle = 'system' | 'serif' | 'dyslexic';

export const ACCENT_COLORS: { id: string; label: string; value: string }[] = [
  { id: 'violet', label: 'Violet',  value: '#6366f1' },
  { id: 'blue',   label: 'Blue',    value: '#3b82f6' },
  { id: 'teal',   label: 'Teal',    value: '#14b8a6' },
  { id: 'green',  label: 'Green',   value: '#22c55e' },
  { id: 'orange', label: 'Orange',  value: '#f97316' },
  { id: 'rose',   label: 'Rose',    value: '#f43f5e' },
  { id: 'amber',  label: 'Amber',   value: '#f59e0b' },
  { id: 'slate',  label: 'Slate',   value: '#64748b' },
];

export interface AppearanceSettings {
  mode: ThemeMode;
  accent: string;
  density: Density;
  font: FontStyle;
  reduceMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  disableAutoplay: boolean;
}

const DEFAULTS: AppearanceSettings = {
  mode: 'system',
  accent: '#6366f1',
  density: 'comfortable',
  font: 'system',
  reduceMotion: false,
  highContrast: false,
  largeText: false,
  disableAutoplay: false,
};

function load(): AppearanceSettings {
  try {
    const stored = localStorage.getItem('bq_appearance');
    if (stored) return { ...DEFAULTS, ...JSON.parse(stored) as Partial<AppearanceSettings> };
  } catch { /* ignore */ }
  return DEFAULTS;
}

function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === 'dark' || mode === 'oled') return true;
  if (mode === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function apply(s: AppearanceSettings) {
  const root = document.documentElement;
  const isDark = resolveIsDark(s.mode);

  // Theme class
  root.classList.toggle('dark', isDark);
  root.classList.toggle('oled', s.mode === 'oled');
  root.classList.toggle('high-contrast', s.highContrast);
  root.classList.toggle('large-text', s.largeText);
  root.classList.toggle('reduce-motion', s.reduceMotion);

  // Accent color
  root.style.setProperty('--brand', s.accent);
  const hover = s.accent + 'cc'; // slightly transparent for hover
  root.style.setProperty('--brand-hover', hover);

  // Density
  const densityMap: Record<Density, string> = { comfortable: '1rem', compact: '0.625rem', cozy: '1.375rem' };
  root.style.setProperty('--density-pad', densityMap[s.density]);

  // Font
  const fontMap: Record<FontStyle, string> = {
    system: 'Inter, ui-sans-serif, system-ui, sans-serif',
    serif: 'Georgia, "Times New Roman", serif',
    dyslexic: '"OpenDyslexic", "Comic Sans MS", cursive',
  };
  root.style.setProperty('--font-family', fontMap[s.font]);
  root.style.fontFamily = fontMap[s.font];

  // Persist
  localStorage.setItem('bq_appearance', JSON.stringify(s));
}

export function useTheme() {
  const [settings, setSettings] = useState<AppearanceSettings>(load);

  useEffect(() => {
    apply(settings);
  }, [settings]);

  // Listen for OS dark mode changes when mode is 'system'
  useEffect(() => {
    if (settings.mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => apply(settings);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings]);

  const update = (patch: Partial<AppearanceSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  };

  const toggle = () => {
    const next: ThemeMode = settings.mode === 'dark' ? 'light' : settings.mode === 'light' ? 'dark' : resolveIsDark(settings.mode) ? 'light' : 'dark';
    update({ mode: next });
  };

  return {
    settings,
    update,
    toggle,
    isDark: resolveIsDark(settings.mode),
    accentColors: ACCENT_COLORS,
  };
}
