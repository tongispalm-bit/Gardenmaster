import { useEffect, useState } from 'react';

export function useTheme() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // อ่านค่าปัจจุบันจาก class บน html element (ถูก set โดย inline script แล้ว)
    const currentlyDark = document.documentElement.classList.contains('dark');
    setIsDark(currentlyDark);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const newValue = !isDark;
    setIsDark(newValue);
    if (newValue) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme-mode', newValue ? 'dark' : 'light');
  };

  return { isDark, toggleTheme, mounted };
}
