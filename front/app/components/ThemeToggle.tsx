'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export type Theme = 'light' | 'dark';

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    // Récupérer le thème depuis localStorage au chargement
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className={`p-3 rounded-xl bg-white/30 dark:bg-white/10 backdrop-blur-sm border border-white/40 dark:border-white/20 hover:bg-white/50 dark:hover:bg-white/20 transition-all duration-300 cursor-pointer group ${className}`}
      title={`Passer en mode ${theme === 'dark' ? 'clair' : 'sombre'}`}
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-yellow-400 group-hover:scale-110 transition-transform" />
      ) : (
        <Moon className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
      )}
    </button>
  );
} 