import React, { Suspense } from 'react'; // Import React and Suspense
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom"; // Removed Navigate as it's not used directly here
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";

// Components
import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";
import LoadingSpinner from './components/LoadingSpinner'; // Import a loading indicator

// Dynamically import Pages using React.lazy
const LandingPage = React.lazy(() => import("./pages/LandingPage"));
const HomePage = React.lazy(() => import("./pages/HomePage"));
const LoginPage = React.lazy(() => import("./pages/LoginPage"));
const SignupPage = React.lazy(() => import("./pages/SignupPage"));
const MyRecipesPage = React.lazy(() => import("./pages/MyRecipesPage"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const EditRecipePage = React.lazy(() => import("./pages/EditRecipePage"));
const ProfilePage = React.lazy(() => import("./pages/ProfilePage"));
const IngredientsPage = React.lazy(() => import("./pages/IngredientsPage"));

const queryClient = new QueryClient();

// Simple Loading Fallback Component
const LoadingFallback = () => (
  <div className="flex justify-center items-center h-[calc(100vh-80px)]"> {/* Adjust height as needed */}
    <LoadingSpinner size="lg" />
  </div>
);

// AppLayout remains the same
const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8"> {/* Added container/padding */}
        {children}
      </main>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            {/* Suspense wraps the Routes to handle loading states of lazy components */}
            <Suspense fallback={<LoadingFallback />}>
              <AppLayout>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />

                  {/* Protected routes */}
                  <Route path="/create" element={
                    <ProtectedRoute>
                      <HomePage />
                    </ProtectedRoute>
                  } />
                  <Route path="/my-recipes" element={
                    <ProtectedRoute>
                      <MyRecipesPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/edit-recipe/:recipeId" element={
                    <ProtectedRoute>
                      <EditRecipePage />
                    </ProtectedRoute>
                  } />
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  } />
                  <Route path="/ingredients" element={
                    <ProtectedRoute>
                      <IngredientsPage />
                    </ProtectedRoute>
                  } />

                  {/* Catch-all Not Found route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppLayout>
            </Suspense>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;