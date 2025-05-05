import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  BookmarkPlus, ChefHat, Clock, Users, Zap, BarChart3, Lightbulb, Info, ListOrdered, Soup, Check, Printer, ShoppingCart
} from 'lucide-react';
import type { Recipe } from '@/lib/gemini';
import { useAuth } from '@/hooks/useAuth';
import { cn } from "@/lib/utils";
import { useToast } from '@/hooks/use-toast';

interface RecipeDisplayProps {
  recipe: Recipe;
  onSave: () => Promise<void>;
  isSaving: boolean;
}

const RecipeDisplay: React.FC<RecipeDisplayProps> = ({ recipe, onSave, isSaving }) => {
  const { currentUser } = useAuth();
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const [showShoppingList, setShowShoppingList] = useState(false);

  // Helper to format instructions (handles potential numbering issues)
  const formatInstructions = (instructions: string | undefined): string[] => {
    if (!instructions) return [];
    // Split by newline, filter empty, trim, and remove existing numbering/bullets
    return instructions.split(/\n+/)
      .map(line => line.trim().replace(/^[\d.*-]+\s*/, ''))
      .filter(line => line.length > 0);
  };

  const toggleIngredientCheck = (index: number) => {
    const newChecked = new Set(checkedIngredients);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedIngredients(newChecked);
  };

  const toggleStepComplete = (index: number) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(index)) {
      newCompleted.delete(index);
    } else {
      newCompleted.add(index);
    }
    setCompletedSteps(newCompleted);
  };

  // Handle print action
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Print Error",
        description: "Unable to open print window. Please check your browser settings.",
        variant: "destructive"
      });
      return;
    }

    // Enhanced Print Styles
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
          /* Non-print styles (optional, mostly for testing in browser) */
          body { font-family: sans-serif; line-height: 1.6; max-width: 800px; margin: 20px auto; }
          h1 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
          h2 { color: #555; margin-top: 20px; }
          .description { font-style: italic; color: #666; margin-bottom: 20px; }
          .meta { display: flex; gap: 15px; margin-bottom: 20px; background: #f9fafb; padding: 10px; border-radius: 4px; }
          .meta-item { background: #e5e7eb; padding: 5px 10px; border-radius: 4px; font-size: 14px; }
          ul { padding-left: 20px; }
          li { margin-bottom: 8px; }
          .instructions li { margin-bottom: 12px; }
          .macros { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 15px; border: 1px solid #e5e7eb; padding: 10px; border-radius: 4px; }
          .macros span { font-weight: 600; }
          .tip { background: #fffde7; padding: 8px 12px; border-left: 4px solid #ffc107; margin-bottom: 8px; }
          .reasoning { background: #f0f9ff; padding: 10px 14px; border-left: 3px solid #38bdf8; margin-top: 16px; font-style: italic; }
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

  // Generate shopping list from ingredients
  const toggleShoppingList = () => {
    setShowShoppingList(!showShoppingList);

    if (!showShoppingList) {
      toast({
        title: "Shopping List Mode",
        description: "Check items you already have. Unchecked items are needed.",
        duration: 4000,
      });
    } else {
        toast({
            title: "Recipe View Mode",
            description: "Check steps as you complete them.",
            duration: 3000,
        });
    }
  };

  const formattedInstructions = formatInstructions(recipe.instructions);
  const formattedTips = recipe.tips || [];

  return (
    <Card className={cn(
      "w-full max-w-4xl mx-auto shadow-lg border border-gray-200 dark:border-gray-700/50", // Wider max-width, adjusted border
      "recipe-container bg-white dark:bg-gray-900 rounded-xl overflow-hidden" // Darker bg
    )}>
      {/* Header with Title and Description */}
      <CardHeader className="bg-gray-50 dark:bg-gray-800/30 p-6 border-b dark:border-gray-700/50">
        <div className="flex justify-between items-start gap-4">
          <div>
            <CardTitle className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1 leading-tight">
              {recipe.title || "Untitled Recipe"}
            </CardTitle>
            {recipe.description && (
              <CardDescription className="text-base text-gray-600 dark:text-gray-300 mt-1">
                {recipe.description}
              </CardDescription>
            )}
          </div>
          <ChefHat className="h-8 w-8 text-recipe-primary dark:text-recipe-accent flex-shrink-0 mt-1 opacity-80" />
        </div>
        {/* Badges for quick info */}
        <div className="flex flex-wrap gap-2 pt-4">
          {recipe.difficulty && <Badge variant="outline" className="border-yellow-400/50 bg-yellow-50/50 text-yellow-800 dark:border-yellow-600/40 dark:bg-yellow-900/20 dark:text-yellow-300"><Zap size={14} className="mr-1.5"/>{recipe.difficulty}</Badge>}
          {recipe.servings && <Badge variant="outline" className="border-blue-400/50 bg-blue-50/50 text-blue-800 dark:border-blue-600/40 dark:bg-blue-900/20 dark:text-blue-300"><Users size={14} className="mr-1.5"/>{recipe.servings}</Badge>}
          {recipe.totalTime && <Badge variant="outline" className="border-green-400/50 bg-green-50/50 text-green-800 dark:border-green-600/40 dark:bg-green-900/20 dark:text-green-300"><Clock size={14} className="mr-1.5"/>{recipe.totalTime}</Badge>}
          {!recipe.totalTime && recipe.prepTime && <Badge variant="outline" className="border-green-400/50 bg-green-50/50 text-green-800 dark:border-green-600/40 dark:bg-green-900/20 dark:text-green-300"><Clock size={14} className="mr-1.5"/>Prep: {recipe.prepTime}</Badge>}
          {!recipe.totalTime && recipe.cookTime && <Badge variant="outline" className="border-green-400/50 bg-green-50/50 text-green-800 dark:border-green-600/40 dark:bg-green-900/20 dark:text-green-300"><Clock size={14} className="mr-1.5"/>Cook: {recipe.cookTime}</Badge>}
        </div>
      </CardHeader>

      {/* Main Content Area */}
      <CardContent className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-x-8 gap-y-6">
        {/* Ingredients Section (Left Column on Larger Screens) */}
        <div className="lg:col-span-1 space-y-4 lg:border-r lg:pr-8 border-gray-200 dark:border-gray-700/50">
          <div className="flex justify-between items-center sticky top-0 bg-white dark:bg-gray-900 py-2 z-10 -mt-2 -mx-1 px-1"> {/* Sticky header for ingredients */}
            <h3 className="text-xl font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-200">
              <Soup size={20} className="text-recipe-secondary dark:text-recipe-accent"/> Ingredients
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleShoppingList}
              className="text-xs h-7 px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title={showShoppingList ? 'Switch to Recipe View' : 'Switch to Shopping List View'}
            >
              <ShoppingCart size={14} className="mr-1" />
              {showShoppingList ? 'Recipe View' : 'Shopping List'}
            </Button>
          </div>

          {recipe.ingredients && recipe.ingredients.length > 0 ? (
            <ul className="list-none space-y-2 text-sm text-gray-700 dark:text-gray-300">
              {recipe.ingredients.map((ingredient, idx) => (
                <li
                  key={idx}
                  className="flex items-start group cursor-pointer" // Make entire item clickable
                  onClick={() => toggleIngredientCheck(idx)}
                >
                  <div
                    className={cn(
                      "flex-shrink-0 w-5 h-5 rounded border mr-2.5 mt-0.5 flex items-center justify-center transition-all duration-150",
                      checkedIngredients.has(idx)
                        ? "bg-green-500 border-green-500 group-hover:bg-green-600"
                        : "bg-transparent border-gray-300 dark:border-gray-600 group-hover:border-gray-400 dark:group-hover:border-gray-500"
                    )}
                    aria-hidden="true"
                  >
                    {checkedIngredients.has(idx) && (
                      <Check className="h-3.5 w-3.5 text-white" />
                    )}
                  </div>
                  <span className={cn(
                    "flex-1 transition-colors duration-150", // Smooth color transition
                    checkedIngredients.has(idx)
                      ? "line-through text-gray-400 dark:text-gray-500" // Consistent line-through for both modes
                      : "text-gray-700 dark:text-gray-300"
                  )}>
                    {ingredient}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 italic">No ingredients listed.</p>
          )}

          {/* Macros Section (Below Ingredients) */}
          {recipe.macros && !showShoppingList && (
            <div className="pt-5 mt-5 border-t dark:border-gray-700/50">
              <h3 className="text-base font-semibold flex items-center gap-2 mb-2 text-gray-800 dark:text-gray-200">
                <BarChart3 size={18} className="text-recipe-secondary dark:text-recipe-accent"/> Estimated Macros <span className="text-xs font-normal text-gray-500">(per serving)</span>
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {recipe.macros.calories && <p><span className="font-medium text-gray-600 dark:text-gray-400">Calories:</span> {recipe.macros.calories}</p>}
                {recipe.macros.protein && <p><span className="font-medium text-gray-600 dark:text-gray-400">Protein:</span> {recipe.macros.protein}</p>}
                {recipe.macros.carbs && <p><span className="font-medium text-gray-600 dark:text-gray-400">Carbs:</span> {recipe.macros.carbs}</p>}
                {recipe.macros.fat && <p><span className="font-medium text-gray-600 dark:text-gray-400">Fat:</span> {recipe.macros.fat}</p>}
                {Object.keys(recipe.macros).length === 0 && <p className="text-gray-500 italic col-span-2">Estimation unavailable.</p>}
              </div>
            </div>
          )}
        </div>

        {/* Instructions & Other Info (Right Column on Larger Screens) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Instructions Section */}
          {!showShoppingList && ( // Hide instructions in shopping list mode
            <div>
              <h3 className="text-xl font-semibold flex items-center gap-2 mb-4 text-gray-800 dark:text-gray-200">
                <ListOrdered size={20} className="text-recipe-secondary dark:text-recipe-accent"/> Instructions
              </h3>
              {formattedInstructions.length > 0 ? (
                <div className="space-y-4">
                  {formattedInstructions.map((step, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg transition-all duration-150 cursor-pointer", // Added padding and cursor
                        completedSteps.has(idx)
                          ? "bg-green-50 dark:bg-green-900/20 opacity-70" // More subtle completed state
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/40"
                      )}
                      onClick={() => toggleStepComplete(idx)}
                    >
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center mt-0.5 transition-colors duration-150">
                        {completedSteps.has(idx) ? (
                          <Check className="h-4 w-4 text-green-600 dark:text-green-500" />
                        ) : (
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{idx + 1}</span>
                        )}
                      </div>
                      <p className={cn(
                        "flex-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300 transition-colors duration-150", // Added flex-1
                        completedSteps.has(idx) && "text-gray-500 dark:text-gray-400" // Slightly lighter text when completed
                      )}>
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No instructions available.</p>
              )}
            </div>
          )}

          {/* Tips Section */}
          {formattedTips.length > 0 && !showShoppingList && ( // Hide tips in shopping list mode
            <div className="pt-5 mt-5 border-t border-gray-200 dark:border-gray-700/50">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-3 text-gray-800 dark:text-gray-200">
                <Lightbulb size={18} className="text-recipe-secondary dark:text-recipe-accent"/> Tips & Variations
              </h3>
              <div className="space-y-3">
                {formattedTips.map((tip, idx) => (
                  <div key={idx} className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md border-l-4 border-amber-400 dark:border-amber-600/60">
                    <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chef's Notes / Reasoning */}
          {recipe.reasoning && !showShoppingList && ( // Hide reasoning in shopping list mode
            <div className="pt-5 mt-5 border-t border-gray-200 dark:border-gray-700/50">
              <h3 className="text-base font-semibold flex items-center gap-2 mb-2 text-gray-800 dark:text-gray-200">
                <Info size={18} className="text-recipe-secondary dark:text-recipe-accent"/> Chef's Notes
              </h3>
              <blockquote className="border-l-4 border-blue-300 dark:border-blue-600/60 pl-4 italic text-sm text-gray-600 dark:text-gray-400 leading-relaxed bg-blue-50 dark:bg-blue-950/30 p-3 rounded-r-md">
                {recipe.reasoning}
              </blockquote>
            </div>
          )}

          {/* Placeholder for Shopping List View */}
          {showShoppingList && (
             <div className="pt-5 mt-5 border-t dark:border-gray-700/50 text-center text-gray-500 italic">
                <p>Shopping list mode active. Uncheck items you have.</p>
                <p className="text-xs mt-1">(Instructions, tips, and macros are hidden in this view)</p>
             </div>
          )}

        </div>
      </CardContent>

      {/* Footer with Actions */}
      <CardFooter className="p-4 flex flex-wrap justify-end items-center gap-3 border-t border-gray-200 dark:border-gray-700/50 bg-gray-50/80 dark:bg-gray-800/20">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrint}
          className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300"
          title="Print Recipe"
        >
          <Printer className="h-4 w-4" />
          Print
        </Button>

        {currentUser && (
          <Button
            className="bg-recipe-primary hover:bg-recipe-secondary text-white dark:bg-recipe-accent dark:hover:bg-recipe-primary dark:text-black flex items-center gap-1.5 shadow"
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            title="Save this recipe to your collection"
          >
            <BookmarkPlus className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Recipe'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default RecipeDisplay;