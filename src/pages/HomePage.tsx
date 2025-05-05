// src/pages/HomePage.tsx

import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom'; // Import Link for the save prompt
import RecipeForm from '@/components/RecipeForm'; // The form component
import RecipeDisplay from '@/components/RecipeDisplay'; // The recipe display component
import LoadingSpinner from '@/components/LoadingSpinner'; // A reusable loading spinner
import ChatBot from '@/components/ChatBot'; // The chatbot component
import { saveRecipe } from '@/lib/appwrite'; // Appwrite save function
import type { Recipe } from '@/lib/gemini';
import { useAuth } from '@/hooks/useAuth'; // Auth context hook
import { useToast } from '@/hooks/use-toast'; // ShadCN UI toast hook
import { Separator } from '@/components/ui/separator'; // ShadCN UI Separator
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // ShadCN UI Alert
import { Sparkles, Info } from 'lucide-react'; // Icons

/**
 * HomePage Component
 *
 * This page serves as the main interface for generating recipes.
 * It includes the recipe generation form, displays the results,
 * allows saving recipes for logged-in users, and integrates a chatbot.
 */
const HomePage: React.FC = () => {
  // --- State Management ---
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- Hooks ---
  const { currentUser } = useAuth(); // Get current user state from the updated AuthContext via hook
  const { toast } = useToast(); // Toast notifications

  // --- Callbacks ---

  /**
   * Handles the recipe generated event from the RecipeForm.
   * Updates the state and scrolls the result into view.
   * @param recipe The newly generated Recipe object.
   */
  const handleRecipeGenerated = useCallback((recipe: Recipe) => {
    console.log("--- Recipe Received in HomePage ---");
    console.log("Title:", recipe.title);
    console.log("Ingredients Array:", recipe.ingredients); // <<< Check this array
    console.log("Instructions:", recipe.instructions);
    console.log("----------------------------------");
    setGeneratedRecipe(recipe);
    // Smooth scroll to the results section after generation
    // Ensure the target element exists before scrolling
    setTimeout(() => { // Timeout helps ensure the element is rendered
        const resultElement = document.getElementById('recipe-result-section');
        resultElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100); // Small delay
  }, []);

  /**
   * Handles the save recipe action.
   * Checks for authentication and calls the Appwrite save function.
   */
  const handleSaveRecipe = async () => {
    if (!generatedRecipe) {
      toast({
        title: "No Recipe Generated",
        description: "Please generate a recipe first.",
        variant: "destructive",
      });
      return;
    }
    // Check currentUser from useAuth hook
    if (!currentUser) {
      toast({
        title: "Login Required",
        description: "Please log in or sign up to save recipes.",
        variant: "destructive", // Use destructive variant for errors/warnings
      });
      return;
    }

    setIsSaving(true);
    try {
      // Call the saveRecipe function from appwrite.ts, which handles user association
      await saveRecipe(generatedRecipe);
      toast({
        title: "Recipe Saved!",
        description: `"${generatedRecipe.title}" added to your collection.`,
        variant: "default", // Use default variant for success
      });
    } catch (error: unknown) {
      console.error('Error saving recipe:', error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        title: "Failed to Save Recipe",
        description: `Could not save the recipe. ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // --- Render Logic ---
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12">

      {/* --- Page Header / Introduction --- */}
      <section className="mb-10 md:mb-16 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 text-gray-900 dark:text-white tracking-tight">
          AI Recipe <span className="text-recipe-primary">Innovator</span>
        </h1>
        <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Turn kitchen staples into culinary delights! Enter your ingredients, set your preferences,
          and let our AI chef whip up a unique recipe just for you.
        </p>
      </section>

      {/* --- Recipe Generation Form Section --- */}
      <section className="mb-10 md:mb-16">
        {/* The RecipeForm component handles its own internal state and layout */}
        <RecipeForm
          onRecipeGenerated={handleRecipeGenerated}
          isGenerating={isGenerating}
          setIsGenerating={setIsGenerating} // Pass setter to control loading state
        />
      </section>

      {/* --- Separator and Result Section --- */}
      {(isGenerating || generatedRecipe) && <Separator className="my-10 md:my-16" />}

      <section id="recipe-result-section" className="min-h-[200px]"> {/* Added min-height */}
        {/* Loading State */}
        {isGenerating && (
          <div className="flex flex-col items-center justify-center text-center my-12 py-8 space-y-4">
            <LoadingSpinner size="lg" className="text-recipe-primary" />
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
              Crafting your recipe...
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Our AI chef is mixing ingredients and checking the oven!
            </p>
          </div>
        )}

        {/* Recipe Display State */}
        {!isGenerating && generatedRecipe && (
          <div className="space-y-6">
             <h2 className="text-2xl md:text-3xl font-bold text-center mb-6 text-gray-900 dark:text-white">
                Your <span className="text-recipe-secondary">Generated Recipe</span>
             </h2>
            {/* The RecipeDisplay component handles the recipe presentation */}
            <RecipeDisplay
              recipe={generatedRecipe}
              onSave={handleSaveRecipe} // Pass the save handler
              isSaving={isSaving}       // Pass the saving state
            />

            {/* Login/Signup Prompt for saving (only if not logged in) */}
            {/* Check currentUser from useAuth hook */}
            {!currentUser && (
                 <Alert variant="default" className="max-w-2xl mx-auto mt-6 border-recipe-primary/30 bg-recipe-light/30 dark:bg-gray-800/30">
                    <Info className="h-4 w-4" />
                    <AlertTitle className="font-semibold">Want to save this recipe?</AlertTitle>
                    <AlertDescription className="text-sm">
                        <Link to="/login" className="font-medium text-recipe-primary hover:underline">Log in</Link> or{' '}
                        <Link to="/signup" className="font-medium text-recipe-primary hover:underline">sign up</Link>
                        {' '}to add this creation to your personal collection.
                    </AlertDescription>
                </Alert>
            )}
          </div>
        )}
      </section>

      {/* --- ChatBot --- */}
      {/* The ChatBot component is likely fixed position via its own styling */}
      {/* It receives the current recipe to potentially modify it */}
      <ChatBot
        initialRecipe={generatedRecipe} // Pass the current recipe to the chatbot
        onRecipeGenerated={handleRecipeGenerated} // Allow chatbot to update the displayed recipe
      />
    </div>
  );
};

export default HomePage;