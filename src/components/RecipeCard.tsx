// src/components/RecipeCard.tsx

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge'; // Import Badge
import { Trash2, UtensilsCrossed, Eye, Clock, Users } from 'lucide-react'; // Added more icons
import { SavedRecipeDocument, parseIngredients } from '@/lib/appwrite';
import { cn } from "@/lib/utils";

interface RecipeCardProps {
  recipeDoc: SavedRecipeDocument;
  onDelete: (id: string) => Promise<void>;
  onViewDetails: (recipe: SavedRecipeDocument) => void;
  isDeleting: boolean;
}

const RecipeCard: React.FC<RecipeCardProps> = ({
  recipeDoc,
  onDelete,
  onViewDetails,
  isDeleting
}) => {
  const ingredientsList = parseIngredients(recipeDoc);

  // --- Event Handlers ---
  const handleDeleteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onDelete(recipeDoc.$id);
  };

  const handleViewClick = (e: React.MouseEvent<HTMLButtonElement | HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>) => {
     e.stopPropagation();
     onViewDetails(recipeDoc);
  }

  // --- Render Logic ---
  return (
    <Card
      className={cn(
        "h-full flex flex-col overflow-hidden", // Prevent content overflow
        "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg",
        "hover:shadow-xl hover:border-recipe-primary/40 dark:hover:border-recipe-accent/40",
        "focus-within:ring-2 focus-within:ring-recipe-primary/50 focus-within:ring-offset-2 dark:focus-within:ring-offset-gray-900", // Ring for focus
        "transition-all duration-300 ease-in-out cursor-pointer group"
      )}
      onClick={handleViewClick} // Card click triggers view
      tabIndex={0} // Make card focusable
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleViewClick(e)} // Keyboard activation
    >
      {/* Optional: Add a subtle top border accent */}
      <div className="h-1.5 bg-gradient-to-r from-recipe-light via-recipe-primary to-recipe-secondary dark:from-gray-800 dark:via-recipe-accent dark:to-recipe-primary transition-opacity duration-300 opacity-0 group-hover:opacity-100"></div>

      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 group-hover:text-recipe-primary dark:group-hover:text-recipe-accent line-clamp-2 leading-tight transition-colors">
            {recipeDoc.title || "Untitled Recipe"}
          </CardTitle>
          {/* Subtle icon */}
          <UtensilsCrossed className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-1" />
        </div>
        {/* Optional: Add Badges for quick info if data exists */}
        {/* Example - Replace with actual data if available in recipeDoc */}
        {/* <div className="flex flex-wrap gap-1 mt-2">
           <Badge variant="outline" className="text-xs"><Clock size={12} className="mr-1"/> {recipeDoc.cookingTime || 'N/A'}</Badge>
           <Badge variant="outline" className="text-xs"><Users size={12} className="mr-1"/> {recipeDoc.servings || 'N/A'}</Badge>
        </div> */}
      </CardHeader>

      <CardContent className="flex-grow px-4 pb-3 space-y-2 text-sm">
        {/* Ingredient Preview */}
        {ingredientsList.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Ingredients</h4>
            <p className="text-gray-600 dark:text-gray-300 line-clamp-2 text-xs">
              {ingredientsList.slice(0, 5).join(', ')}{ingredientsList.length > 5 ? '...' : ''}
            </p>
          </div>
        )}
         {/* Instructions Preview */}
         {recipeDoc.instructions && (
             <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Instructions Preview</h4>
                <p className="text-gray-600 dark:text-gray-300 line-clamp-2 text-xs italic">
                    {recipeDoc.instructions.split('\n')[0]}... {/* Show first line */}
                </p>
             </div>
         )}
      </CardContent>

      <CardFooter className="pt-3 pb-3 px-4 border-t border-gray-100 dark:border-gray-800/50 flex justify-end gap-2 bg-gray-50/50 dark:bg-gray-900/30">
         {/* Delete Button - More prominent destructive action */}
         <Button
            variant="ghost" // Use ghost for less emphasis than primary action
            size="sm"
            className="text-red-600 hover:bg-red-100 dark:text-red-500 dark:hover:bg-red-950/50 dark:hover:text-red-400"
            onClick={handleDeleteClick}
            disabled={isDeleting}
            aria-label={`Delete ${recipeDoc.title}`}
         >
            <Trash2 className="mr-1.5 h-4 w-4" />
            {isDeleting ? 'Removing...' : 'Remove'}
         </Button>
         {/* View Details Button - Primary action for the footer */}
         <Button
            variant="default" // Make view the default action here
            size="sm"
            className="bg-recipe-primary hover:bg-recipe-secondary text-white dark:bg-recipe-accent dark:hover:bg-recipe-primary"
            onClick={handleViewClick}
            aria-label={`View details for ${recipeDoc.title}`}
         >
            <Eye className="mr-1.5 h-4 w-4" />
            View Details
         </Button>
      </CardFooter>
    </Card>
  );
};

export default RecipeCard;