// filepath: /Users/adityaverma/Documents/GitHub/sleek-landing-zone/src/contexts/ThemeContext.tsx
import React, { createContext, useEffect, useState, useCallback, ReactNode } from 'react'; // Removed useContext
// --- Updated Imports ---
import {
    getUserProfile,      // To fetch the profile document
    updateUserProfile,   // To update the profile document
    UserProfileData    // Type for the update payload
} from '@/lib/appwrite';
// --- End Updated Imports ---
import { useAuth } from '@/hooks/useAuth'; // Still need auth status

type Theme = 'light' | 'dark';

// Export the type for the hook
export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isThemeLoading: boolean; // Expose loading state if needed by consumers
}

// Export the context itself for the hook
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
export default ThemeContext; // Export context for use in the hook


export function ThemeProvider({ children }: { children: ReactNode }) {
  const { currentUser, isLoading: isAuthLoading } = useAuth(); // Get user and auth loading status
  const [theme, setThemeState] = useState<Theme>('light'); // Default theme
  const [isThemeLoading, setIsThemeLoading] = useState(true); // Loading state for theme determination

  // --- Effect to determine and load initial theme ---
  useEffect(() => {
    let isMounted = true;

    const determineInitialTheme = async () => {
      setIsThemeLoading(true); // Start theme loading

      try {
        let initialTheme: Theme = 'light'; // Default

        // 1. Check if user is logged in and auth is resolved
        if (!isAuthLoading && currentUser) {
          console.log("Theme Check: User logged in, fetching profile...");
          const profileDoc = await getUserProfile();
          if (profileDoc?.darkMode !== undefined) {
            // Priority 1: Use preference from user's profile document
            initialTheme = profileDoc.darkMode ? 'dark' : 'light';
            console.log("Theme Check: Found preference in profile:", initialTheme);
            // Ensure localStorage matches profile setting upon load for consistency
            localStorage.setItem('theme', initialTheme);
          } else {
            // User logged in, but no preference in profile yet
            console.log("Theme Check: No preference in profile, checking localStorage...");
            const savedTheme = localStorage.getItem('theme') as Theme | null;
            if (savedTheme) {
              // Priority 2: Use theme from localStorage
              initialTheme = savedTheme;
              console.log("Theme Check: Found preference in localStorage:", initialTheme);
            } else {
              // Priority 3: Use system preference
              const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              initialTheme = prefersDark ? 'dark' : 'light';
              console.log("Theme Check: No localStorage, using system preference:", initialTheme);
            }
          }
        } else if (!isAuthLoading) {
          // User is not logged in (or auth is resolved as logged out)
          console.log("Theme Check: User not logged in, checking localStorage...");
          const savedTheme = localStorage.getItem('theme') as Theme | null;
          if (savedTheme) {
            // Priority 2: Use theme from localStorage
            initialTheme = savedTheme;
             console.log("Theme Check: Found preference in localStorage:", initialTheme);
          } else {
            // Priority 3: Use system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            initialTheme = prefersDark ? 'dark' : 'light';
            console.log("Theme Check: No localStorage, using system preference:", initialTheme);
          }
        } else {
          // Auth is still loading, wait for it to resolve
          // Keep default theme ('light') and loading state for now
           console.log("Theme Check: Auth still loading...");
           return; // Exit early, will re-run when isAuthLoading changes
        }

        // Apply the determined theme if component is still mounted
        if (isMounted) {
          console.log("Applying initial theme:", initialTheme);
          setThemeState(initialTheme);
          document.documentElement.classList.toggle('dark', initialTheme === 'dark');
          setIsThemeLoading(false); // Finish theme loading
        }

      } catch (error) {
        console.error("Error determining initial theme:", error);
        if (isMounted) {
          // Fallback to default on error
          setThemeState('light');
          document.documentElement.classList.remove('dark');
          setIsThemeLoading(false);
        }
      }
    };

    determineInitialTheme();

    return () => {
      isMounted = false; // Cleanup
    };
  // Depend on auth loading state and the user object itself
  }, [currentUser, isAuthLoading]);


  // --- Effect to listen for system theme changes ---
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      // Only react to system changes if the user hasn't explicitly set a theme
      // We use localStorage as the indicator of an explicit choice during the session.
      // The initial load effect already syncs localStorage with the profile setting.
      if (!localStorage.getItem('theme')) {
        const newSystemTheme = e.matches ? 'dark' : 'light';
        console.log("System theme changed to:", newSystemTheme, "(applying because no explicit choice found in localStorage)");
        // Update state and document class, but DO NOT save to localStorage or Appwrite
        setThemeState(newSystemTheme);
        document.documentElement.classList.toggle('dark', newSystemTheme === 'dark');
      } else {
         console.log("System theme changed, but ignoring because an explicit choice exists in localStorage.");
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []); // No dependencies needed here, relies on localStorage check inside


  // --- Function to explicitly set the theme ---
  // Use useCallback to memoize the function if needed, though unlikely critical here
  const setTheme = useCallback((newTheme: Theme) => {
    console.log("Setting theme explicitly to:", newTheme);
    // Update state
    setThemeState(newTheme);

    // Save explicit choice to localStorage
    localStorage.setItem('theme', newTheme);

    // Update document class
    document.documentElement.classList.toggle('dark', newTheme === 'dark');

    // If user is logged in, save preference to their Appwrite profile document
    if (currentUser) {
        console.log("User logged in, attempting to save theme preference to profile...");
        // Prepare payload for profile update
        const profileUpdate: Partial<UserProfileData> = {
            darkMode: newTheme === 'dark'
        };
        // Call the function to update the profile collection
        updateUserProfile(profileUpdate)
            .then(() => {
                console.log("Successfully saved theme preference to user profile.");
            })
            .catch(error => {
                // Log error, but don't block UI operation
                console.error('Failed to save theme preference to user profile:', error);
                // Optionally show a non-blocking toast here
            });
    } else {
         console.log("User not logged in, theme saved only to localStorage.");
    }
  }, [currentUser]); // Depend on currentUser to know if saving to profile is needed


  // --- Function to toggle the theme ---
  const toggleTheme = useCallback(() => {
    // Determine the new theme based on the current state
    const newTheme = theme === 'light' ? 'dark' : 'light';
    // Call the main setTheme function to handle state update, localStorage, class, and Appwrite save
    setTheme(newTheme);
  }, [theme, setTheme]); // Depend on current theme and the setTheme function


  // Provide context value
  const value = {
    theme,
    toggleTheme,
    setTheme,
    isThemeLoading // Expose loading state
  };

  return (
    <ThemeContext.Provider value={value}>
      {/* Only render children when the theme is definitively loaded */}
      {!isThemeLoading ? children : null /* Or show a loading spinner */}
    </ThemeContext.Provider>
  );
}

// Custom hook 'useTheme' is now defined in src/hooks/useTheme.ts