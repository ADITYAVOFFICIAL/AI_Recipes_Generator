// filepath: /Users/adityaverma/Documents/GitHub/sleek-landing-zone/src/contexts/AuthContext.tsx
import React, { createContext, useState, useEffect, ReactNode } from 'react'; // Removed useContext
import {
  // Core Auth functions still needed
  getCurrentUser,
  createUserAccount,
  loginUser,
  logoutUser,
  // Type for the core Appwrite user object
  User,
  // --- Removed imports related to account.prefs ---
  // updateUserPreferences,
  // UserPreferences

  // --- Import profile functions if needed elsewhere, but not directly used for updating *within* AuthContext anymore ---
  // getUserProfile,
  // updateUserProfile,
  // UserProfileData
} from '@/lib/appwrite';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useLocation } from 'react-router-dom';

// Interface defining the context structure
export interface AuthContextType {
  currentUser: User | null; // Holds the basic Appwrite User object
  isLoading: boolean;       // Indicates if auth state is being determined
  isAuthenticated: boolean; // Derived from currentUser != null
  signup: (email: string, password: string, name?: string) => Promise<User | null>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  // Removed updateUserPrefs - profile updates are handled directly via updateUserProfile where needed
  // Removed updateCurrentUser - direct local state updates are discouraged; rely on refetching or component state
}

// Create the context with an initial undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider component definition
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // State for the authenticated user object (basic Appwrite User)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // State to track the initial loading of authentication status
  const [isLoading, setIsLoading] = useState(true);
  // Hook for showing toasts
  const { toast } = useToast();
  // Hooks for navigation and location checking
  const navigate = useNavigate();
  const location = useLocation();

  // Effect to check authentication status on initial load and context mount
  useEffect(() => {
    const initAuth = async () => {
      // Don't setIsLoading(true) here, it's set initially
      try {
        // Fetch the core Appwrite user object
        const user = await getCurrentUser();
        setCurrentUser(user);
        console.log('Auth initialized, user:', user ? user.$id : 'none');
      } catch (error) {
        // Log error but don't necessarily show toast, user might just not be logged in
        console.error('Error initializing auth state:', error);
        setCurrentUser(null);
      } finally {
        // Mark loading as complete after check
        setIsLoading(false);
      }
    };

    initAuth();
    // Run only once on mount
  }, []);

  // Effect to redirect authenticated users away from public-only pages (login/signup)
  useEffect(() => {
    // Check if loading is finished and user is authenticated
    if (!isLoading && currentUser && (location.pathname === '/login' || location.pathname === '/signup')) {
      // Determine where to redirect (intended destination or default like '/create')
      const intendedDestination = location.state?.from?.pathname || '/create';
      console.log(`User authenticated, redirecting from ${location.pathname} to ${intendedDestination}`);
      navigate(intendedDestination, { replace: true }); // Use replace to avoid history clutter
    }
    // Depend on loading state, user object, location, and navigate function
  }, [currentUser, isLoading, location, navigate]);

  // Login function
  const login = async (email: string, password: string) => {
    setIsLoading(true); // Indicate loading during login attempt
    try {
      console.log('Attempting login for:', email);
      // Call Appwrite SDK login function
      await loginUser(email, password);
      // Refetch the user object after successful login
      const user = await getCurrentUser();
      setCurrentUser(user); // Update context state
      console.log('Login successful, user:', user?.$id);

      // Show success toast
      toast({
        title: "Login Successful",
        description: `Welcome back${user?.name ? `, ${user.name}` : ''}!`,
        duration: 3000,
      });

      // Redirect after successful login
      const intendedDestination = location.state?.from?.pathname || '/create';
      navigate(intendedDestination, { replace: true });

    } catch (error) {
      console.error('Login error:', error);
      // Show error toast
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Could not log in. Please check credentials.",
        variant: "destructive",
      });
      // Re-throw error for potential component-level handling (e.g., form state)
      throw error;
    } finally {
      setIsLoading(false); // Stop loading indicator
    }
  };

  // Signup function
  const signup = async (email: string, password: string, name?: string): Promise<User | null> => {
    setIsLoading(true); // Indicate loading during signup
    try {
      console.log('Attempting signup for:', email);
      // Call Appwrite SDK create account function
      // This function now ALSO handles creating the initial UserProfile document via ensureUserProfileExists
      const newUser = await createUserAccount(email, password, name);
      // Refetch the user object to ensure context has the latest state after login-post-creation
      const user = await getCurrentUser();
      setCurrentUser(user);
      console.log('Signup successful, user:', user?.$id);

      // Show success toast
      toast({
        title: "Account Created",
        description: "Welcome! Your account is ready.",
        duration: 3000,
      });

      // Redirect after successful signup (e.g., to profile setup or main app area)
      navigate('/create', { replace: true }); // Or '/profile' or similar

      return newUser; // Return the newly created user object

    } catch (error) {
      console.error('Signup error:', error);
      // Show error toast
      toast({
        title: "Signup Failed",
        description: error instanceof Error ? error.message : "Could not create account. Please try again.",
        variant: "destructive",
      });
      // Re-throw error for component-level handling
      throw error;
    } finally {
      setIsLoading(false); // Stop loading indicator
    }
  };

  // Logout function
  const logout = async () => {
    setIsLoading(true); // Indicate loading during logout
    try {
      console.log('Attempting logout for user:', currentUser?.$id);
      // Call Appwrite SDK logout function
      await logoutUser();
      setCurrentUser(null); // Clear user state in context
      console.log('Logout successful');

      // Show success toast
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });

      // Redirect to a public page (e.g., landing page) after logout
      navigate('/', { replace: true });

    } catch (error) {
      console.error('Logout error:', error);
      // Show error toast
      toast({
        title: "Logout Error",
        description: "There was a problem logging out. Please try again.",
        variant: "destructive",
      });
      // Optionally re-throw if needed, but often logout errors can be ignored client-side
    } finally {
      setIsLoading(false); // Stop loading indicator
    }
  };

  // --- Removed updateUserPrefs function ---
  // Profile updates (preferences, ingredients, etc.) should now be done
  // by calling `updateUserProfile` directly from the relevant component (e.g., ProfilePage, IngredientsPage)
  // This keeps AuthContext focused solely on authentication state.

  // --- Removed updateCurrentUser function ---
  // Directly updating local state without backend sync can lead to inconsistencies.
  // If a component needs to reflect changes made elsewhere (e.g., profile update),
  // it should either refetch the necessary data or rely on state management patterns
  // that handle data synchronization. The AuthContext primarily provides the core auth user object.


  // Value object provided by the context
  const value: AuthContextType = {
    currentUser,          // The authenticated user object (or null)
    isLoading,            // Loading status of auth check
    isAuthenticated: !!currentUser, // Boolean flag for authentication status
    signup,               // Signup function
    login,                // Login function
    logout,               // Logout function
    // Removed updateUserPrefs
    // Removed updateCurrentUser
  };

  // Provide the context value to children components
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// --- Custom hook to easily consume the AuthContext removed ---


export default AuthContext; // Export the context itself if needed elsewhere