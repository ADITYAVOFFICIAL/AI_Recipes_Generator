// filepath: src/hooks/useAuth.ts
import { useContext } from 'react';
import AuthContext, { AuthContextType } from '@/contexts/AuthContext';

/**
 * Custom hook to easily consume the AuthContext.
 * Ensures the hook is used within an AuthProvider.
 * @returns The authentication context value.
 * @throws Error if used outside of an AuthProvider.
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};