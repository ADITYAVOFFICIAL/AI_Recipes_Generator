import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom'; // Added useLocation
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ChefHat, LogIn, AlertCircle } from 'lucide-react'; // Added AlertCircle
import LoadingSpinner from '@/components/LoadingSpinner'; // Assuming you have this
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert components

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login, isLoading, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // Get location state for redirect

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser && !isLoading) {
      // Redirect to intended destination or default
      const from = location.state?.from?.pathname || '/create';
      console.log(`Login Page: User already logged in, redirecting to ${from}`);
      navigate(from, { replace: true });
    }
  }, [currentUser, isLoading, navigate, location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Clear previous errors

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      await login(email, password);
      // Redirect is handled by AuthContext or the useEffect above after state update
    } catch (err: unknown) {
      console.error('Login Page Error:', err);
      // Set a user-friendly error message
      setError(err instanceof Error ? err.message : 'Invalid credentials or server error. Please try again.');
    }
  };

  // Render loading state centered
  if (isLoading && !currentUser) { // Show loading only if not already logged in (avoids flash)
    return (
      <div className="container flex items-center justify-center min-h-[80vh] py-8">
        <LoadingSpinner size="lg" text="Checking authentication..." />
      </div>
    );
  }

  // Don't render the form if redirecting
  if (currentUser) {
     return null; // Or a minimal loading indicator while redirect happens
  }

  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-150px)] py-8 animate-fade-in"> {/* Added animation */}
      <Card className="w-full max-w-md shadow-xl border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden"> {/* Enhanced styling */}
        <CardHeader className="space-y-2 text-center bg-gray-50 dark:bg-gray-900/50 p-6 border-b dark:border-gray-800">
          <div className="flex justify-center mb-3">
            <ChefHat className="h-14 w-14 text-recipe-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome Back!</CardTitle>
          <CardDescription>
            Log in to access your saved recipes and preferences.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="p-6 space-y-5"> {/* Increased spacing */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Login Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                aria-describedby={error ? "error-message" : undefined} // For screen readers
                className="text-base sm:text-sm" // Adjust text size
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                aria-describedby={error ? "error-message" : undefined} // For screen readers
                className="text-base sm:text-sm" // Adjust text size
              />
              {/* Optional: Add Forgot Password link here */}
              {/* <div className="text-right text-sm">
                <Link to="/forgot-password" className="text-recipe-primary hover:underline">
                  Forgot password?
                </Link>
              </div> */}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 p-6 pt-4"> {/* Adjusted padding */}
            <Button
              type="submit"
              className="w-full bg-recipe-primary hover:bg-recipe-secondary text-white dark:bg-recipe-accent dark:hover:bg-recipe-primary dark:text-black text-base font-semibold py-2.5 shadow-md transition-all duration-200 hover:shadow-lg disabled:opacity-60" // Enhanced styling
              disabled={isLoading}
              size="lg" // Larger button
            >
              {isLoading ? (
                <LoadingSpinner size="sm" className="mr-2 border-t-white" /> // White spinner on colored bg
              ) : (
                <LogIn className="mr-2 h-5 w-5" />
              )}
              {isLoading ? 'Logging In...' : 'Log In'}
            </Button>
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link to="/signup" className="font-medium text-recipe-primary hover:underline">
                Sign up here
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default LoginPage;