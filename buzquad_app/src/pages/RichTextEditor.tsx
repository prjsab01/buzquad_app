import { useEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  /** If true, only bold/italic/code/quote subset (for chat) */
  compact?: boolean;
}

type FormatCmd =
  | 'bold' | 'italic' | 'strikeThrough' | 'insertUnorderedList'
  | 'insertOrderedList' | 'formatBlock';

interface ToolbarButton {
  label: string;
  title: string;
  cmd: FormatCmd;
  arg?: string;
}

const FULL_BUTTONS: ToolbarButton[] = [
  { label: 'B', title: 'Bold (Ctrl+B)', cmd: 'bold' },
  { label: 'I', title: 'Italic (Ctrl+I)', cmd: 'italic' },
  { label: 'S', title: 'Strikethrough', cmd: 'strikeThrough' },
  { label: '•', title: 'Bullet list', cmd: 'insertUnorderedList' },
  { label: '1.', title: 'Numbered list', cmd: 'insertOrderedList' },
  { label: 'H2', title: 'Heading', cmd: 'formatBlock', arg: 'h2' },
  { label: '"', title: 'Blockquote', cmd: 'formatBlock', arg: 'blockquote' },
  { label: '</>', title: 'Code block', cmd: 'formatBlock', arg: 'pre' },
];

const COMPACT_BUTTONS: ToolbarButton[] = [
  { label: 'B', title: 'Bold (Ctrl+B)', cmd: 'bold' },
  { label: 'I', title: 'Italic (Ctrl+I)', cmd: 'italic' },
  { label: '"', title: 'Blockquote', cmd: 'formatBlock', arg: 'blockquote' },
  { label: '</>', title: 'Code', cmd: 'formatBlock', arg: 'pre' },
];

/** Strip dangerous tags/attrs — minimal sanitizer, no new deps */
export function sanitizeHtml(html: string): string {
  const allowed = new Set(['b', 'strong', 'i', 'em', 's', 'del', 'u', 'br', 'p',
    'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'h2', 'h3', 'hr', 'a', 'span']);
  const div = document.createElement('div');
  div.innerHTML = html;
  const walk = (node: Element) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element;
        if (!allowed.has(el.tagName.toLowerCase())) {
          el.replaceWith(...Array.from(el.childNodes));
        } else {
          // Strip all attrs except href on <a>
          Array.from(el.attributes).forEach((attr) => {
            if (!(el.tagName.toLowerCase() === 'a' && attr.name === 'href')) {
              el.removeAttribute(attr.name);
            }
          });
          walk(el);
        }
      }
    });
  };
  walk(div);
  return div.innerHTML;
}

/** Extract plain text from HTML for notifications/previews */
export function htmlToPlainText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent ?? div.innerText ?? '';
}

export default function RichTextEditor({
  value, onChange, placeholder = 'Write something...', minHeight = '80px', className = '', compact = false,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  // Sync external value → editor (only when value changes externally)
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (isInternalChange.current) { isInternalChange.current = false; return; }
    if (el.innerHTML !== value) el.innerHTML = value;
  }, [value]);

  const exec = (cmd: FormatCmd, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, arg);
    handleInput();
  };

  const handleInput = () => {
    isInternalChange.current = true;
    const html = editorRef.current?.innerHTML ?? '';
    onChange(html === '<br>' ? '' : html);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); exec('bold'); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); exec('italic'); }
  };

  const buttons = compact ? COMPACT_BUTTONS : FULL_BUTTONS;

  return (
    <div className={`rounded-xl border overflow-hidden transition-colors focus-within:ring-2 ${className}`}
      style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
      onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--brand)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--brand) 15%, transparent)'; }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; } }}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap gap-0.5 border-b px-2 py-1" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }} role="toolbar" aria-label="Text formatting">
        {buttons.map((btn) => (
          <button
            key={btn.title}
            type="button"
            title={btn.title}
            aria-label={btn.title}
            onMouseDown={(e) => { e.preventDefault(); exec(btn.cmd, btn.arg); }}
            className="rounded px-2 py-0.5 text-xs font-medium transition"
            style={{ color: 'var(--text-2)' }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'var(--border)'; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'transparent'; }}
          >
            {btn.label}
          </button>
        ))}
      </div>
      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        style={{ minHeight, color: 'var(--text)' }}
        className="px-4 py-3 text-sm outline-none rich-editor"
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder}
      />
    </div>
  );
}
