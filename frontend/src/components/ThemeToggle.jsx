import { MoonStar, SunMedium } from 'lucide-react';

export function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
    >
      {isDark ? <SunMedium size={18} /> : <MoonStar size={18} />}
      <span>{isDark ? 'Tema claro' : 'Tema escuro'}</span>
    </button>
  );
}
