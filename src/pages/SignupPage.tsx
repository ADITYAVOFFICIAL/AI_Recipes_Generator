import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { ChefHat, UserPlus, AlertCircle } from 'lucide-react'; // Added AlertCircle
import LoadingSpinner from '@/components/LoadingSpinner'; // Assuming you have this
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert components

const SignupPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { signup, isLoading, currentUser } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser && !isLoading) {
      console.log("Signup Page: User already logged in, redirecting to /create");
      navigate('/create', { replace: true });
    }
  }, [currentUser, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Clear previous errors

    // Basic client-side validation
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    try {
      await signup(email, password, name || undefined); // Pass name if provided
      // Redirect is handled by AuthContext after successful signup/login
    } catch (err: unknown) {
      console.error('Signup Page Error:', err);
      // Set a user-friendly error message
      if (err instanceof Error) {
        // Customize common Appwrite errors
        if (err.message.includes('user_already_exists')) {
          setError('An account with this email already exists. Please log in.');
        } else if (err.message.includes('password_short')) {
           setError('Password must be at least 8 characters long.');
        } else {
           setError(err.message);
        }
      } else {
        setError('An unexpected error occurred during signup. Please try again.');
      }
    }
  };

  // Render loading state centered
  if (isLoading && !currentUser) { // Show loading only if not already logged in
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
          <CardTitle className="text-2xl font-bold tracking-tight">Create Your Account</CardTitle>
          <CardDescription>
            Join us to generate, save, and manage your AI recipes!
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="p-6 space-y-5"> {/* Increased spacing */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Signup Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Name (Optional)</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className="text-base sm:text-sm" // Adjust text size
              />
            </div>
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
                aria-describedby={error ? "error-message" : "password-hint"} // For screen readers
                className="text-base sm:text-sm" // Adjust text size
              />
              <p id="password-hint" className="text-xs text-gray-500 dark:text-gray-400">
                Must be at least 8 characters long.
              </p>
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
                <LoadingSpinner size="sm" className="mr-2 border-t-white" /> // White spinner
              ) : (
                <UserPlus className="mr-2 h-5 w-5" />
              )}
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </Button>
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-recipe-primary hover:underline">
                Log in instead
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default SignupPage;