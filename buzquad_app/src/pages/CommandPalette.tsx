import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface PaletteItem {
  label: string;
  path: string;
  icon: string;
  shortcut?: string;
}

const ITEMS: PaletteItem[] = [
  // Quick create
  { label: 'New post',          path: '/feed?compose=1',         icon: '✍️' },
  { label: 'New community',     path: '/communities?compose=1',  icon: '➕' },
  { label: 'New event',         path: '/events?compose=1',       icon: '📅' },
  { label: 'New poll',          path: '/polls?compose=1',        icon: '📊' },
  { label: 'New note',          path: '/notes?compose=1',        icon: '📝' },
  // Navigate
  { label: 'Home Feed',         path: '/feed',          icon: '🏠', shortcut: 'G H' },
  { label: 'Communities & Groups', path: '/communities', icon: '🏘️', shortcut: 'G C' },
  { label: 'Inbox',             path: '/inbox',         icon: '💬', shortcut: 'M' },
  { label: 'Friends & Private Circle', path: '/friends', icon: '👥' },
  { label: 'Call history',      path: '/calls',         icon: '📞' },
  { label: 'Activity Hub',      path: '/activity',      icon: '⚡', shortcut: 'G A' },
  { label: 'Events',            path: '/events',        icon: '📅', shortcut: 'G E' },
  { label: 'Polls',             path: '/polls',         icon: '📊' },
  { label: 'Search',            path: '/search',        icon: '🔍' },
  { label: 'Profile',           path: '/profile',       icon: '👤' },
  { label: 'Notifications',     path: '/notifications', icon: '🔔' },
  { label: 'Backup',            path: '/backup',        icon: '💾' },
  { label: 'Notes',             path: '/notes',         icon: '📝' },
  { label: 'Watchlist & Shelves', path: '/watchlist',   icon: '📺' },
  { label: 'Buzquad Wrapped',   path: '/wrapped',       icon: '🎁' },
  { label: 'Settings',          path: '/settings',      icon: '⚙️' },
  { label: 'Admin Dashboard',   path: '/admin',         icon: '🛡️' },
  { label: 'Help',              path: '/help',          icon: '❓' },
  { label: 'Keyboard Shortcuts', path: '/help/shortcuts', icon: '⌨️' },
  { label: 'Privacy Policy',    path: '/privacy',       icon: '🔒' },
  { label: 'Terms of Service',  path: '/terms',         icon: '📄' },
];

function fuzzyMatch(query: string, label: string) {
  const q = query.toLowerCase();
  const l = label.toLowerCase();
  if (l.includes(q)) return true;
  let qi = 0;
  for (let i = 0; i < l.length && qi < q.length; i++) {
    if (l[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const filtered = query
    ? ITEMS.filter((item) => fuzzyMatch(query, item.label))
    : ITEMS;

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => { setSelected(0); }, [query]);

  const go = (item: PaletteItem) => {
    navigate(item.path);
    onClose();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter') { if (filtered[selected]) go(filtered[selected]); }
    else if (e.key === 'Escape') onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-slide-up"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Command palette"
        aria-modal="true"
      >
        <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
          <span style={{ color: 'var(--text-3)' }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Go to… (type to search)"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[color:var(--text-3)]"
            style={{ color: 'var(--text)' }}
            aria-label="Search commands"
          />
          <kbd className="rounded px-1.5 py-0.5 text-xs font-mono" style={{ background: 'var(--bg-subtle)', color: 'var(--text-3)' }}>Esc</kbd>
        </div>

        <ul className="max-h-80 overflow-y-auto py-1" role="listbox">
          {filtered.length === 0 && (
            <li className="px-4 py-3 text-sm" style={{ color: 'var(--text-3)' }}>No results for "{query}"</li>
          )}
          {filtered.map((item, i) => (
            <li
              key={item.path}
              role="option"
              aria-selected={i === selected}
              onClick={() => go(item)}
              onMouseEnter={() => setSelected(i)}
              className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition"
              style={{
                background: i === selected ? 'var(--bg-subtle)' : 'transparent',
                color: i === selected ? 'var(--text)' : 'var(--text-2)',
              }}
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.shortcut && (
                <kbd className="rounded px-1.5 py-0.5 text-[10px] font-mono" style={{ background: 'var(--bg-subtle)', color: 'var(--text-3)' }}>{item.shortcut}</kbd>
              )}
            </li>
          ))}
        </ul>

        <div className="border-t px-4 py-2 text-[10px] flex gap-4" style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}>
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>Esc close</span>
        </div>
      </div>
    </div>
  );
}
