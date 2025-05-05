// filepath: src/hooks/useTheme.ts
import { useContext } from 'react';
import ThemeContext, { ThemeContextType } from '@/contexts/ThemeContext';

/**
 * Custom hook to use the theme context.
 * Ensures the hook is used within a ThemeProvider.
 * @returns The theme context value.
 * @throws Error if used outside of a ThemeProvider.
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};