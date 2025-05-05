// src/pages/MyRecipesPage.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  fetchUserRecipes,
  SavedRecipeDocument,
  deleteRecipe,
  convertDocumentToRecipe,
  Query // Keep Query if needed elsewhere, otherwise remove if unused
} from '@/lib/appwrite';
import type { Recipe } from '@/lib/gemini';
import RecipeCard from '@/components/RecipeCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose // Import DialogClose
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from '@/components/ui/badge';
import RecipeSearch from '@/components/recipes/RecipeSearch';
import RecipeFilters, { RecipeFilterOptions } from '@/components/recipes/RecipeFilters';
// Import the default export from RecipeSkeleton
import RecipeSkeleton from '@/components/recipes/RecipeSkeleton';
import {
  ChefHat, Plus, ListOrdered, Soup, Clock, Users, Zap, BarChart3, Lightbulb, Info, Edit, Printer, X // Added X for close button
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Helper to format instructions (handles potential numbering issues) ---
const formatInstructions = (instructions: string | undefined): string[] => {
  if (!instructions) return [];
  // Split by newline, filter empty, trim, and remove existing numbering/bullets
  return instructions.split(/\n+/)
    .map(line => line.trim().replace(/^[\d.*-]+\s*/, ''))
    .filter(line => line.length > 0);
};

const MyRecipesPage: React.FC = () => {
  // --- State ---
  const [recipes, setRecipes] = useState<SavedRecipeDocument[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<SavedRecipeDocument[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedRecipeForModal, setSelectedRecipeForModal] = useState<Recipe | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<RecipeFilterOptions>({});

  // --- Hooks ---
  const { toast } = useToast();
  const navigate = useNavigate();

  // --- Data Fetching ---
  const loadRecipes = useCallback(async () => {
    setIsLoading(true);
    try {
      const userRecipes = await fetchUserRecipes();
      setRecipes(userRecipes);
      // Initial filtering/sorting happens in the useEffect below
    } catch (error) {
      console.error('Error fetching recipes:', error);
      toast({
        title: 'Error Loading Recipes',
        description: 'Failed to load your saved recipes. Please try refreshing.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  // --- Filter, Search, and Sort Logic ---
  useEffect(() => {
    let result = [...recipes];

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(recipe =>
        recipe.title.toLowerCase().includes(query) ||
        (recipe.description && recipe.description.toLowerCase().includes(query)) ||
        recipe.ingredients.some(ingredient => ingredient.toLowerCase().includes(query))
      );
    }

    // Apply difficulty filter
    if (activeFilters.difficulty && activeFilters.difficulty !== 'Any') { // Check for 'Any'
      result = result.filter(recipe =>
        recipe.difficulty === activeFilters.difficulty
      );
    }

    // Apply sorting
    if (activeFilters.sortBy) {
      switch (activeFilters.sortBy) {
        case 'newest':
          result.sort((a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime());
          break;
        case 'oldest':
          result.sort((a, b) => new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime());
          break;
        case 'alphabetical':
          result.sort((a, b) => a.title.localeCompare(b.title));
          break;
        // Add cases for difficulty, time etc. if needed
        default:
          // Default sort (usually by creation date descending if no other sort applied)
          result.sort((a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime());
          break;
      }
    } else {
        // Default sort if no specific sort is chosen
        result.sort((a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime());
    }

    setFilteredRecipes(result);
  }, [recipes, searchQuery, activeFilters]);

  // --- Event Handlers ---
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleApplyFilters = (filters: RecipeFilterOptions) => {
    setActiveFilters(filters);
  };

  const handleDeleteRecipe = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteRecipe(id);
      setRecipes(prev => prev.filter(recipe => recipe.$id !== id));
      toast({
        title: 'Recipe Removed',
        description: 'The recipe has been successfully removed.',
        variant: 'default',
      });
      // Close modal if the deleted recipe was open
      if (selectedDocumentId === id) {
        setIsModalOpen(false);
        setSelectedRecipeForModal(null);
        setSelectedDocumentId(null);
      }
    } catch (error) {
      console.error('Error deleting recipe:', error);
      toast({
        title: 'Deletion Failed',
        description: 'Could not delete the recipe. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Convert document to Recipe object when opening modal
  const handleViewDetails = useCallback((recipeDoc: SavedRecipeDocument) => {
    setSelectedRecipeForModal(convertDocumentToRecipe(recipeDoc));
    setSelectedDocumentId(recipeDoc.$id);
    setIsModalOpen(true);
  }, []);

  // Handle Edit action
  const handleEditRecipe = (docId: string | null) => {
    if (!docId) return;
    setIsModalOpen(false); // Close modal before navigating
    navigate(`/edit-recipe/${docId}`);
  };

  // Handle Print action - Using enhanced styles from RecipeDisplay
  const handlePrintRecipe = () => {
    if (!selectedRecipeForModal) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Print Error",
        description: "Unable to open print window. Please check your browser settings.",
        variant: "destructive"
      });
      return;
    }

    const recipe = selectedRecipeForModal; // Alias for clarity

    // Enhanced Print Styles (copied from RecipeDisplay)
    const printContent = `
      <html>
      <head>
        <title>${recipe.title || "Recipe"}</title>
        <style>
          @media print {
            body {
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
              line-height: 1.6;
              margin: 20px; /* Add margins for printing */
              font-size: 11pt; /* Slightly smaller for print */
            }
            h1 {
              font-size: 18pt;
              color: #111827; /* Darker color for print */
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 8px;
              margin-bottom: 16px;
            }
            h2 {
              font-size: 14pt;
              color: #374151;
              margin-top: 24px;
              margin-bottom: 12px;
              border-bottom: 1px dashed #d1d5db;
              padding-bottom: 4px;
            }
            .description {
              font-style: italic;
              color: #4b5563;
              margin-bottom: 20px;
              font-size: 11pt;
            }
            .meta {
              display: flex;
              flex-wrap: wrap; /* Allow wrapping */
              gap: 12px;
              margin-bottom: 20px;
              padding: 10px;
              background-color: #f9fafb; /* Light background for meta */
              border-radius: 4px;
            }
            .meta-item {
              background: #e5e7eb;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 10pt;
              color: #374151;
            }
            ul, ol {
              padding-left: 20px;
              margin-bottom: 16px;
            }
            li {
              margin-bottom: 6px;
              line-height: 1.5;
            }
            .instructions li {
              margin-bottom: 10px;
            }
            .macros {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 6px 12px; /* Row and column gap */
              margin-top: 10px;
              font-size: 10pt;
              padding: 10px;
              border: 1px solid #e5e7eb;
              border-radius: 4px;
            }
            .macros div { padding: 2px 0; }
            .macros span { font-weight: 600; color: #4b5563; } /* Style macro labels */
            .tip {
              background: #fefce8; /* Lighter yellow */
              padding: 10px 14px;
              border-left: 3px solid #facc15; /* Yellow border */
              margin-bottom: 10px;
              font-size: 10pt;
              color: #713f12; /* Darker text for yellow bg */
            }
            .reasoning {
              background: #f0f9ff; /* Light blue */
              padding: 10px 14px;
              border-left: 3px solid #38bdf8; /* Blue border */
              margin-top: 16px;
              font-style: italic;
              color: #075985; /* Darker blue text */
              font-size: 10pt;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <h1>${recipe.title || "Untitled Recipe"}</h1>
        ${recipe.description ? `<p class="description">${recipe.description}</p>` : ''}

        <div class="meta">
          ${recipe.difficulty ? `<span class="meta-item">Difficulty: ${recipe.difficulty}</span>` : ''}
          ${recipe.servings ? `<span class="meta-item">Servings: ${recipe.servings}</span>` : ''}
          ${recipe.totalTime ? `<span class="meta-item">Time: ${recipe.totalTime}</span>` : ''}
          ${!recipe.totalTime && recipe.prepTime ? `<span class="meta-item">Prep: ${recipe.prepTime}</span>` : ''}
          ${!recipe.totalTime && recipe.cookTime ? `<span class="meta-item">Cook: ${recipe.cookTime}</span>` : ''}
        </div>

        <h2>Ingredients</h2>
        <ul>
          ${recipe.ingredients && recipe.ingredients.map(ingredient => `<li>${ingredient}</li>`).join('')}
        </ul>

        <h2>Instructions</h2>
        <ol class="instructions">
          ${formatInstructions(recipe.instructions).map(step => `<li>${step}</li>`).join('')}
        </ol>

        ${recipe.macros ? `
          <h2>Nutrition Information (per serving)</h2>
          <div class="macros">
            ${recipe.macros.calories ? `<div><span>Calories:</span> ${recipe.macros.calories}</div>` : ''}
            ${recipe.macros.protein ? `<div><span>Protein:</span> ${recipe.macros.protein}</div>` : ''}
            ${recipe.macros.carbs ? `<div><span>Carbs:</span> ${recipe.macros.carbs}</div>` : ''}
            ${recipe.macros.fat ? `<div><span>Fat:</span> ${recipe.macros.fat}</div>` : ''}
          </div>
        ` : ''}

        ${recipe.tips && recipe.tips.length > 0 ? `
          <h2>Tips & Variations</h2>
          ${recipe.tips.map(tip => `<div class="tip">${tip}</div>`).join('')}
        ` : ''}

        ${recipe.reasoning ? `
          <h2>Chef's Notes</h2>
          <p class="reasoning">${recipe.reasoning}</p>
        ` : ''}

        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <p>Printing recipe...</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();

    // Let the content render before printing
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      // Optional: Close the window after printing attempt
      // setTimeout(() => printWindow.close(), 1000);
    }, 500); // Adjust delay if needed
  };

  // --- Content Skeletons ---
  const RecipeGridSkeletons = () => (
    <>
      {Array.from({ length: 8 }).map((_, index) => (
        <RecipeSkeleton key={index} type="card" /> // Use the imported RecipeSkeleton
      ))}
    </>
  );

  // --- Render Logic ---
  return (
    <>
      {/* Page Container */}
      <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 md:mb-12 gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            My Recipe Collection
          </h1>
          <Button
            className="bg-recipe-primary hover:bg-recipe-secondary text-white dark:bg-recipe-accent dark:hover:bg-recipe-primary transition-colors shadow hover:shadow-md"
            asChild
          >
            <Link to="/create">
              <Plus className="mr-2 h-5 w-5" />
              Generate New Recipe
            </Link>
          </Button>
        </div>

        {/* Search and Filters - Only show if not loading and there are recipes */}
        {!isLoading && recipes.length > 0 && (
          <div className="mb-8 space-y-6">
            <RecipeSearch onSearch={handleSearch} />
            <RecipeFilters onApplyFilters={handleApplyFilters} />
          </div>
        )}

        {/* Content Area: Loading, Empty, or Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            <RecipeGridSkeletons />
          </div>
        ) : recipes.length === 0 ? (
          // Empty State - No recipes saved yet
          <div className="text-center py-16 px-6 bg-gradient-to-br from-recipe-light/30 to-white dark:from-gray-900/50 dark:to-gray-950 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 shadow-inner">
            <ChefHat className="h-20 w-20 mx-auto text-gray-400 dark:text-gray-600 mb-6 opacity-50" />
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
              Your Recipe Box Awaits!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              It seems empty right now. Let's fill it with some delicious creations!
              Generate a recipe and save it here for easy access.
            </p>
            <Button size="lg" className="bg-recipe-primary hover:bg-recipe-secondary text-white dark:bg-recipe-accent dark:hover:bg-recipe-primary transition-colors shadow hover:shadow-md" asChild>
              <Link to="/create"><Plus className="mr-2 h-5 w-5" />Generate Your First Recipe</Link>
            </Button>
          </div>
        ) : filteredRecipes.length === 0 ? (
          // Empty State - Filters applied, no results
          <div className="text-center py-16 px-6 bg-gradient-to-br from-recipe-light/30 to-white dark:from-gray-900/50 dark:to-gray-950 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 shadow-inner">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
              No Matching Recipes
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              We couldn't find any recipes matching your current search and filters.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setActiveFilters({});
                // Consider resetting filter components externally if needed
              }}
            >
              Clear Search & Filters
            </Button>
          </div>
        ) : (
          // Recipe Grid
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {filteredRecipes.map(recipeDoc => (
              <RecipeCard
                key={recipeDoc.$id}
                recipeDoc={recipeDoc}
                onDelete={handleDeleteRecipe}
                onViewDetails={handleViewDetails}
                isDeleting={deletingId === recipeDoc.$id}
              />
            ))}
          </div>
        )}
      </div>

      {/* --- Recipe Details Modal --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-4xl max-h-[90vh] flex flex-col p-0 shadow-2xl rounded-lg bg-white dark:bg-gray-950">
          {selectedRecipeForModal ? (
            <>
              {/* Modal Header - Improved Layout & Styling */}
              <DialogHeader className="p-5 sm:p-6 pb-4 border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 rounded-t-lg relative">
                {/* Action Buttons Container */}
                 <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                     <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => handleEditRecipe(selectedDocumentId)}
                        title="Edit this recipe"
                     >
                         <Edit className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                         <span className="sr-only">Edit</span>
                     </Button>
                     <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={handlePrintRecipe}
                        title="Print this recipe"
                     >
                         <Printer className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                         <span className="sr-only">Print</span>
                     </Button>
                     {/* Explicit Close Button */}
                     <DialogClose asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                            title="Close"
                        >
                            <X className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                            <span className="sr-only">Close</span>
                        </Button>
                     </DialogClose>
                 </div>

                <DialogTitle className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mr-24 sm:mr-32"> {/* Added margin for buttons */}
                  {selectedRecipeForModal.title}
                </DialogTitle>
                {selectedRecipeForModal.description && (
                    <DialogDescription className="text-sm sm:text-base text-gray-600 dark:text-gray-400 pt-1 mr-24 sm:mr-32"> {/* Added margin */}
                        {selectedRecipeForModal.description}
                    </DialogDescription>
                )}
                {/* Badges - Using RecipeDisplay styles */}
                <div className="flex flex-wrap gap-2 pt-3">
                    {selectedRecipeForModal.difficulty && <Badge variant="outline" className="border-yellow-400/50 bg-yellow-50/50 text-yellow-800 dark:border-yellow-600/40 dark:bg-yellow-900/20 dark:text-yellow-300"><Zap size={14} className="mr-1.5"/>{selectedRecipeForModal.difficulty}</Badge>}
                    {selectedRecipeForModal.servings && <Badge variant="outline" className="border-blue-400/50 bg-blue-50/50 text-blue-800 dark:border-blue-600/40 dark:bg-blue-900/20 dark:text-blue-300"><Users size={14} className="mr-1.5"/>{selectedRecipeForModal.servings}</Badge>}
                    {selectedRecipeForModal.totalTime && <Badge variant="outline" className="border-green-400/50 bg-green-50/50 text-green-800 dark:border-green-600/40 dark:bg-green-900/20 dark:text-green-300"><Clock size={14} className="mr-1.5"/>{selectedRecipeForModal.totalTime}</Badge>}
                    {!selectedRecipeForModal.totalTime && selectedRecipeForModal.prepTime && <Badge variant="outline" className="border-green-400/50 bg-green-50/50 text-green-800 dark:border-green-600/40 dark:bg-green-900/20 dark:text-green-300"><Clock size={14} className="mr-1.5"/>Prep: {selectedRecipeForModal.prepTime}</Badge>}
                    {!selectedRecipeForModal.totalTime && selectedRecipeForModal.cookTime && <Badge variant="outline" className="border-green-400/50 bg-green-50/50 text-green-800 dark:border-green-600/40 dark:bg-green-900/20 dark:text-green-300"><Clock size={14} className="mr-1.5"/>Cook: {selectedRecipeForModal.cookTime}</Badge>}
                </div>
              </DialogHeader>

              {/* Scrollable Content Area - Applying RecipeDisplay structure */}
              <ScrollArea className="flex-grow overflow-y-auto bg-white dark:bg-gray-950">
                <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-x-8 gap-y-6">
                  {/* Ingredients & Macros Column */}
                  <div className="lg:col-span-1 space-y-5 lg:border-r lg:pr-8 border-gray-200 dark:border-gray-700/50">
                    {/* Ingredients */}
                    <div>
                        <h3 className="text-xl font-semibold flex items-center gap-2 mb-3 text-gray-800 dark:text-gray-200">
                            <Soup size={20} className="text-recipe-secondary dark:text-recipe-accent"/> Ingredients
                        </h3>
                        {selectedRecipeForModal.ingredients && selectedRecipeForModal.ingredients.length > 0 ? (
                            <ul className="list-none space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
                            {selectedRecipeForModal.ingredients.map((ingredient, idx) => (
                                <li key={idx} className="flex items-start">
                                {/* Using a simple bullet point for saved view */}
                                <span className="text-recipe-primary dark:text-recipe-accent mr-2 mt-1 flex-shrink-0">•</span>
                                <span>{ingredient}</span>
                                </li>
                            ))}
                            </ul>
                        ) : <p className="text-sm text-gray-500 italic">No ingredients listed.</p>}
                    </div>

                    {/* Macros */}
                    {selectedRecipeForModal.macros && (
                        <div className="pt-5 border-t dark:border-gray-700/50">
                            <h3 className="text-base font-semibold flex items-center gap-2 mb-2 text-gray-800 dark:text-gray-200">
                                <BarChart3 size={18} className="text-recipe-secondary dark:text-recipe-accent"/> Estimated Macros <span className="text-xs font-normal text-gray-500">(per serving)</span>
                            </h3>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                {selectedRecipeForModal.macros.calories && <p><span className="font-medium text-gray-600 dark:text-gray-400">Calories:</span> {selectedRecipeForModal.macros.calories}</p>}
                                {selectedRecipeForModal.macros.protein && <p><span className="font-medium text-gray-600 dark:text-gray-400">Protein:</span> {selectedRecipeForModal.macros.protein}</p>}
                                {selectedRecipeForModal.macros.carbs && <p><span className="font-medium text-gray-600 dark:text-gray-400">Carbs:</span> {selectedRecipeForModal.macros.carbs}</p>}
                                {selectedRecipeForModal.macros.fat && <p><span className="font-medium text-gray-600 dark:text-gray-400">Fat:</span> {selectedRecipeForModal.macros.fat}</p>}
                                {Object.keys(selectedRecipeForModal.macros).length === 0 && <p className="text-gray-500 italic col-span-2">Estimation unavailable.</p>}
                            </div>
                        </div>
                    )}
                  </div>

                  {/* Instructions & Other Info Column */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Instructions */}
                    <div>
                        <h3 className="text-xl font-semibold flex items-center gap-2 mb-4 text-gray-800 dark:text-gray-200">
                            <ListOrdered size={20} className="text-recipe-secondary dark:text-recipe-accent"/> Instructions
                        </h3>
                        {selectedRecipeForModal.instructions && selectedRecipeForModal.instructions.length > 0 ? (
                            <div className="space-y-4">
                                {formatInstructions(selectedRecipeForModal.instructions).map((step, idx) => (
                                    <div key={idx} className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center mt-0.5">
                                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{idx + 1}</span>
                                        </div>
                                        <p className="flex-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                                            {step}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-sm text-gray-500 italic">No instructions provided.</p>}
                    </div>

                    {/* Tips */}
                    {selectedRecipeForModal.tips && selectedRecipeForModal.tips.length > 0 && (
                        <div className="pt-5 border-t border-gray-200 dark:border-gray-700/50">
                            <h3 className="text-lg font-semibold flex items-center gap-2 mb-3 text-gray-800 dark:text-gray-200">
                                <Lightbulb size={18} className="text-recipe-secondary dark:text-recipe-accent"/> Tips & Variations
                            </h3>
                            <div className="space-y-3">
                                {selectedRecipeForModal.tips.map((tip, idx) => (
                                    <div key={idx} className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md border-l-4 border-amber-400 dark:border-amber-600/60">
                                        <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">{tip}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Reasoning */}
                    {selectedRecipeForModal.reasoning && (
                        <div className="pt-5 border-t border-gray-200 dark:border-gray-700/50">
                            <h3 className="text-base font-semibold flex items-center gap-2 mb-2 text-gray-800 dark:text-gray-200">
                                <Info size={18} className="text-recipe-secondary dark:text-recipe-accent"/> Chef's Notes
                            </h3>
                            <blockquote className="border-l-4 border-blue-300 dark:border-blue-600/60 pl-4 italic text-sm text-gray-600 dark:text-gray-400 leading-relaxed bg-blue-50 dark:bg-blue-950/30 p-3 rounded-r-md">
                                {selectedRecipeForModal.reasoning}
                            </blockquote>
                        </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </>
          ) : (
            // Loading state within the modal
            <div className="p-6 text-center flex flex-col items-center justify-center min-h-[200px]">
                <LoadingSpinner />
                <p className="mt-3 text-gray-500">Loading recipe details...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MyRecipesPage;