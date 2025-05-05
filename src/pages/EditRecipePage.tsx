// src/pages/EditRecipePage.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
// Removed Checkbox import as it's not used for editing existing preferences in this version
// import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Save, XCircle, AlertCircle, ArrowLeft, Info, Soup, ListOrdered, Zap, Clock, Users, BarChart3, Lightbulb } from 'lucide-react';
import { getRecipeById, updateRecipe, convertDocumentToRecipe } from '@/lib/appwrite';
import type { Recipe } from '@/lib/gemini'; // Use the enhanced Recipe type
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Separator } from "@/components/ui/separator";
import { cn } from '@/lib/utils'; // Import cn utility

// --- Constants for Form Options (reuse or import from a shared file) ---
// Removed dietaryOptions as they aren't directly editable in this simplified edit form
// interface DietPreference { id: string; label: string; }
// const dietaryOptions: DietPreference[] = [ ... ];
const mealTypes = ['Any', 'Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack', 'Appetizer', 'Soup', 'Salad', 'Main Course', 'Side Dish', 'Beverage'];
const cuisines = ['Any', 'Italian', 'Mexican', 'Chinese', 'Indian', 'Japanese', 'Thai', 'French', 'Mediterranean', 'American', 'Middle Eastern', 'Korean', 'Vietnamese', 'Greek', 'Spanish', 'African', 'Caribbean'];
const cookingTimes = ['Any', 'Under 15 mins', 'Under 30 mins', 'Under 1 hour', '1 hour+', 'Slow Cooker'];
const skillLevels = ['Any', 'Beginner', 'Intermediate', 'Advanced', 'Easy', 'Medium', 'Hard']; // Added Easy/Medium/Hard
// Removed equipmentOptions as it's not part of the Recipe type or edit form
// const equipmentOptions = [ ... ];

// --- Edit Recipe Page Component ---
const EditRecipePage: React.FC = () => {
    const { recipeId } = useParams<{ recipeId: string }>(); // Get ID from URL
    const navigate = useNavigate();
    const { toast } = useToast();

    // State
    const [recipeData, setRecipeData] = useState<Recipe | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch recipe data on mount
    useEffect(() => {
        if (!recipeId) {
            setError("No recipe ID provided.");
            setIsLoading(false);
            return;
        }

        const fetchRecipe = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const doc = await getRecipeById(recipeId);
                setRecipeData(convertDocumentToRecipe(doc)); // Convert to Recipe format for form
            } catch (err: unknown) {
                console.error("Error fetching recipe for edit:", err);
                const fetchError = err instanceof Error ? err.message : "Failed to load recipe data.";
                setError(fetchError);
                toast({ title: "Error Loading Recipe", description: fetchError, variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };

        fetchRecipe();
    }, [recipeId, toast]); // Removed error from dependency array to avoid potential loops

    // --- Form Handlers ---
    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> // Removed HTMLSelectElement as it's handled by handleSelectChange
    ) => {
        const { name, value } = e.target;
        setRecipeData(prev => prev ? { ...prev, [name]: value } : null);
    };

    // Specific handler for Select components
    const handleSelectChange = (name: keyof Recipe, value: string) => {
        // Handle 'Any' selection by setting the value to empty string or null if appropriate
        const actualValue = value === 'Any' ? '' : value;
        setRecipeData(prev => prev ? { ...prev, [name]: actualValue } : null);
    };

    // Handle Macro changes
    const handleMacroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target; // name should be "calories", "protein", etc.
        setRecipeData(prev => prev ? {
            ...prev,
            macros: {
                ...(prev.macros || {}), // Keep existing macros
                [name]: value // Update specific macro
            }
        } : null);
    };

    // Handle Tips changes (textarea where each line is a tip)
    const handleTipsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const tipsArray = e.target.value.split('\n').filter(tip => tip.trim() !== '');
        setRecipeData(prev => prev ? { ...prev, tips: tipsArray } : null);
    };

     // Handle Ingredients changes (textarea where each line is an ingredient)
     const handleIngredientsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const ingredientsArray = e.target.value.split('\n').filter(ing => ing.trim() !== '');
        setRecipeData(prev => prev ? { ...prev, ingredients: ingredientsArray } : null);
    };

    // --- Save Handler ---
    const handleSaveChanges = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recipeId || !recipeData) {
            setError("Recipe data is missing.");
            toast({ title: "Save Error", description: "Recipe data is missing.", variant: "destructive" });
            return;
        }
        if (!recipeData.title?.trim()) {
            setError("Recipe title cannot be empty.");
            toast({ title: "Validation Error", description: "Recipe title cannot be empty.", variant: "destructive" });
            return;
        }
        if (!recipeData.ingredients || recipeData.ingredients.length === 0 || recipeData.ingredients.every(ing => !ing.trim())) {
            setError("Recipe must have at least one ingredient.");
            toast({ title: "Validation Error", description: "Please add at least one ingredient.", variant: "destructive" });
            return;
        }
        if (!recipeData.instructions?.trim()) {
            setError("Recipe instructions cannot be empty.");
            toast({ title: "Validation Error", description: "Please provide instructions.", variant: "destructive" });
            return;
        }


        setIsSaving(true);
        setError(null);

        try {
            // The updateRecipe function expects the Recipe object which matches the structure
            await updateRecipe(recipeId, recipeData);
            toast({
                title: "Recipe Updated!",
                description: `"${recipeData.title}" has been saved successfully.`,
                variant: "default",
            });
            navigate('/my-recipes'); // Navigate back to the list after saving
        } catch (err: unknown) {
            console.error("Error updating recipe:", err);
            const errorMessage = err instanceof Error ? err.message : "Could not update recipe.";
            setError(errorMessage);
            toast({ title: "Update Failed", description: errorMessage, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    // --- Render Logic ---

    // Loading State
    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[60vh]">
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Loading Recipe Editor...</p>
            </div>
        );
    }

    // Error State or No Data
    if (error || !recipeData) {
        return (
            <div className="container mx-auto max-w-2xl px-4 py-12">
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-5 w-5" />
                    <AlertTitle className="font-semibold">Error Loading Recipe</AlertTitle>
                    <AlertDescription>{error || "Could not load recipe data. It might have been deleted or there was a network issue."}</AlertDescription>
                </Alert>
                 <Button variant="outline" onClick={() => navigate('/my-recipes')} className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" /> Back to My Recipes
                </Button>
            </div>
        );
    }

    // --- Main Edit Form ---
    return (
        <div className="container mx-auto max-w-5xl px-4 py-8 md:py-12"> {/* Wider max-width */}
            <Card className="shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                <CardHeader className="bg-gray-50 dark:bg-gray-900/50 border-b dark:border-gray-800 p-5 sm:p-6">
                    <CardTitle className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
                        Edit Recipe
                    </CardTitle>
                    <CardDescription className="text-base text-gray-600 dark:text-gray-400 mt-1">
                        Modify the details for "{recipeData.title || 'Untitled Recipe'}" below.
                    </CardDescription>
                </CardHeader>

                <form onSubmit={handleSaveChanges}>
                    <CardContent className="p-5 sm:p-6 space-y-8"> {/* Increased spacing */}

                        {/* Section 1: Basic Info & Description */}
                        <section className="space-y-5">
                            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 border-b pb-2 mb-4">Basic Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <Label htmlFor="title" className="font-medium">Title <span className="text-red-500">*</span></Label>
                                    <Input id="title" name="title" value={recipeData.title} onChange={handleInputChange} required placeholder="e.g., Spicy Chicken Curry" />
                                </div>
                                <div className="space-y-1.5 md:col-span-2"> {/* Description spans full width on medium+ */}
                                    <Label htmlFor="description" className="font-medium">Description</Label>
                                    <Textarea id="description" name="description" value={recipeData.description || ''} onChange={handleInputChange} placeholder="A short summary of the dish..." className="min-h-[80px]" />
                                </div>
                            </div>
                        </section>

                        <Separator />

                        {/* Section 2: Ingredients & Instructions */}
                        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Ingredients */}
                            <div className="space-y-3">
                                <Label htmlFor="ingredients" className="text-lg font-semibold flex items-center gap-2">
                                    <Soup size={18} /> Ingredients <span className="text-red-500">*</span>
                                </Label>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Enter each ingredient on a new line.</p>
                                <Textarea
                                    id="ingredients"
                                    name="ingredients"
                                    value={recipeData.ingredients.join('\n')} // Join array for textarea
                                    onChange={handleIngredientsChange} // Use specific handler
                                    className="min-h-[200px] text-sm"
                                    required
                                    placeholder="e.g., 1 lb Chicken breast&#10;1 tbsp Olive oil&#10;1 Onion, chopped"
                                />
                            </div>

                             {/* Instructions */}
                            <div className="space-y-3">
                                <Label htmlFor="instructions" className="text-lg font-semibold flex items-center gap-2">
                                    <ListOrdered size={18} /> Instructions <span className="text-red-500">*</span>
                                </Label>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Enter steps clearly. You can use new lines for steps.</p>
                                <Textarea
                                    id="instructions"
                                    name="instructions"
                                    value={recipeData.instructions}
                                    onChange={handleInputChange}
                                    className="min-h-[200px] text-sm"
                                    required
                                    placeholder="e.g., 1. Heat olive oil in a pan...&#10;2. Add chopped onions and cook until softened...&#10;3. Add chicken and brown..."
                                />
                            </div>
                        </section>

                        <Separator />

                        {/* Section 3: Details (Time, Servings, Difficulty) */}
                        <section className="space-y-5">
                             <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 border-b pb-2 mb-4">Details</h3>
                             <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                                <div className="space-y-1.5">
                                    <Label htmlFor="prepTime" className="font-medium flex items-center gap-1.5"><Clock size={14}/> Prep Time</Label>
                                    <Input id="prepTime" name="prepTime" value={recipeData.prepTime || ''} onChange={handleInputChange} placeholder="e.g., 15 mins"/>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="cookTime" className="font-medium flex items-center gap-1.5"><Clock size={14}/> Cook Time</Label>
                                    <Input id="cookTime" name="cookTime" value={recipeData.cookTime || ''} onChange={handleInputChange} placeholder="e.g., 30 mins"/>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="totalTime" className="font-medium flex items-center gap-1.5"><Clock size={14}/> Total Time</Label>
                                    <Input id="totalTime" name="totalTime" value={recipeData.totalTime || ''} onChange={handleInputChange} placeholder="e.g., 45 mins"/>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="servings" className="font-medium flex items-center gap-1.5"><Users size={14}/> Servings</Label>
                                    <Input id="servings" name="servings" value={recipeData.servings || ''} onChange={handleInputChange} placeholder="e.g., 4 servings"/>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="difficulty" className="font-medium flex items-center gap-1.5"><Zap size={14}/> Difficulty</Label>
                                    <Select name="difficulty" value={recipeData.difficulty || ''} onValueChange={(value) => handleSelectChange('difficulty', value)}>
                                        <SelectTrigger id="difficulty"><SelectValue placeholder="Select difficulty" /></SelectTrigger>
                                        <SelectContent>
                                            {/* Filter skillLevels to avoid duplicates if 'Any' is present */}
                                            {[...new Set(skillLevels)].map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {/* Add Cuisine, Meal Type selects if needed, similar to Difficulty */}
                            </div>
                        </section>

                        <Separator />

                        {/* Section 4: Macros */}
                        <section className="space-y-5">
                             <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 border-b pb-2 mb-4 flex items-center gap-2">
                                <BarChart3 size={18}/> Estimated Macros <span className="text-sm font-normal text-gray-500">(per serving)</span>
                             </h3>
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                                 <div className="space-y-1.5">
                                     <Label htmlFor="calories" className="font-medium">Calories</Label>
                                     <Input id="calories" name="calories" value={recipeData.macros?.calories || ''} onChange={handleMacroChange} placeholder="e.g., 450 kcal"/>
                                 </div>
                                 <div className="space-y-1.5">
                                     <Label htmlFor="protein" className="font-medium">Protein</Label>
                                     <Input id="protein" name="protein" value={recipeData.macros?.protein || ''} onChange={handleMacroChange} placeholder="e.g., 30g"/>
                                 </div>
                                 <div className="space-y-1.5">
                                     <Label htmlFor="carbs" className="font-medium">Carbs</Label>
                                     <Input id="carbs" name="carbs" value={recipeData.macros?.carbs || ''} onChange={handleMacroChange} placeholder="e.g., 40g"/>
                                 </div>
                                 <div className="space-y-1.5">
                                     <Label htmlFor="fat" className="font-medium">Fat</Label>
                                     <Input id="fat" name="fat" value={recipeData.macros?.fat || ''} onChange={handleMacroChange} placeholder="e.g., 20g"/>
                                 </div>
                             </div>
                        </section>

                        <Separator />

                        {/* Section 5: Tips & Reasoning */}
                        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Tips */}
                             <div className="space-y-3">
                                <Label htmlFor="tips" className="text-lg font-semibold flex items-center gap-2">
                                    <Lightbulb size={18}/> Tips & Variations
                                </Label>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Enter each tip on a new line.</p>
                                <Textarea
                                    id="tips"
                                    name="tips"
                                    value={(recipeData.tips || []).join('\n')} // Join array for textarea
                                    onChange={handleTipsChange} // Use specific handler
                                    className="min-h-[120px] text-sm"
                                    placeholder="e.g., * Add chili flakes for extra heat&#10;* Serve with a dollop of sour cream or yogurt"
                                />
                            </div>

                             {/* Reasoning (Display only) */}
                             {recipeData.reasoning && (
                                 <div className="space-y-3">
                                    <Label className="text-lg font-semibold flex items-center gap-2">
                                        <Info size={18}/> AI Chef's Reasoning <span className="text-xs font-normal text-gray-500">(Read-only)</span>
                                    </Label>
                                    <div className="text-sm text-gray-700 dark:text-gray-300 italic bg-blue-50 dark:bg-blue-950/30 p-4 rounded-md border-l-4 border-blue-400 dark:border-blue-600">
                                        {recipeData.reasoning}
                                    </div>
                                </div>
                             )}
                        </section>

                        {/* Error Display */}
                        {error && (
                            <Alert variant="destructive" className="mt-6">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                    </CardContent>

                    {/* Footer with Actions */}
                    <CardFooter className="p-5 sm:p-6 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3 sticky bottom-0"> {/* Sticky footer */}
                         <Button type="button" variant="outline" onClick={() => navigate('/my-recipes')} className="flex items-center gap-1.5">
                             <XCircle className="h-4 w-4" /> Cancel
                         </Button>
                         <Button
                            type="submit"
                            disabled={isSaving}
                            className={cn(
                                "bg-recipe-primary hover:bg-recipe-secondary text-white dark:bg-recipe-accent dark:hover:bg-recipe-primary dark:text-black",
                                "flex items-center gap-1.5 min-w-[120px]" // Ensure minimum width
                            )}
                         >
                             {isSaving ? (
                                 <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                             ) : (
                                 <><Save className="h-4 w-4" /> Save Changes</>
                             )}
                         </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export default EditRecipePage;
