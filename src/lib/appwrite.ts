import {
  Client,
  Account,
  Databases,
  ID,
  Query as AppwriteQuery,
  Models,
  AppwriteException,
  Permission, // <-- Import Permission
  Role        // <-- Import Role
} from 'appwrite';
import type { Recipe } from './gemini';

// Re-export Recipe type
export type { Recipe };

// Export Appwrite Query
export const Query = AppwriteQuery;

// --- Configuration ---
const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
export const COLLECTION_SAVED_RECIPES = import.meta.env.VITE_APPWRITE_COLLECTION_RECIPES;
// --- NEW: User Profiles Collection ID ---
export const COLLECTION_USER_PROFILES = import.meta.env.VITE_APPWRITE_COLLECTION_USER_PROFILES; // Make sure this is in your .env

// --- Initialize Appwrite Client and Services ---
export const client = new Client();

if (APPWRITE_ENDPOINT) {
  client.setEndpoint(APPWRITE_ENDPOINT);
}
if (APPWRITE_PROJECT_ID) {
  client.setProject(APPWRITE_PROJECT_ID);
}

export const account = new Account(client);
export const databases = new Databases(client);

// --- Types ---

// Basic Appwrite User type (remains the same)
export type User = Models.User<Models.Preferences>;

// Extended Recipe type (remains the same)
export interface ExtendedRecipe extends Recipe {
  tags?: string[];
  userRating?: number;
  userNotes?: string;
}

// Saved Recipe Document structure (remains the same)
export interface SavedRecipeDocument extends Models.Document {
  userId: string;
  title: string;
  description?: string;
  ingredients: string[];
  instructions: string;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  servings?: string;
  difficulty?: string;
  macrosJson?: string[];
  reasoning?: string;
  tipsJson?: string[];
  tags?: string[];
  userRating?: number;
  userNotes?: string;
}

// --- NEW: User Profile Types ---

// Structure of the data stored within the userProfiles collection document
export interface UserProfileData {
  userId: string; // Link to the Auth user ID
  displayName?: string;
  avatarUrl?: string;
  dietaryPreferences?: string[];
  cuisinePreferences?: string[];
  skillLevel?: string;
  darkMode?: boolean;
  savedIngredients?: string[];
  defaultServings?: number;
}

// Appwrite Document structure for User Profiles (includes system fields)
export interface UserProfileDocument extends UserProfileData, Models.Document {}

// --- Authentication Functions ---

// Helper function to create/ensure user profile document exists
// Sets document-level permissions so only the user can manage their profile
const ensureUserProfileExists = async (userId: string, name?: string): Promise<UserProfileDocument | null> => {
  if (!COLLECTION_USER_PROFILES || !DATABASE_ID) {
      console.error("User Profile Collection ID or Database ID is not configured.");
      return null;
  }
  try {
      // Check if profile already exists
      const existing = await databases.listDocuments<UserProfileDocument>(
          DATABASE_ID,
          COLLECTION_USER_PROFILES,
          [Query.equal('userId', userId), Query.limit(1)]
      );

      if (existing.documents.length > 0) {
          return existing.documents[0]; // Profile already exists
      }

      // Create initial profile document if it doesn't exist
      console.log(`Creating initial profile document for user ${userId}`);
      const initialProfileData: UserProfileData = {
          userId: userId,
          displayName: name || '', // Use provided name or empty string
          // Set other defaults if needed
          dietaryPreferences: [],
          cuisinePreferences: [],
          skillLevel: 'Any',
          darkMode: false, // Default to light mode
          savedIngredients: [],
          defaultServings: 2,
      };

      const profileDoc = await databases.createDocument<UserProfileDocument>(
          DATABASE_ID,
          COLLECTION_USER_PROFILES,
          ID.unique(), // Let Appwrite generate the document ID
          initialProfileData,
          [
              Permission.read(Role.user(userId)),   // User can read their own profile
              Permission.update(Role.user(userId)), // User can update their own profile
              Permission.delete(Role.user(userId)), // User can delete their own profile
              // Add team/admin read/write permissions if necessary
          ]
      );
      console.log(`Initial profile document created: ${profileDoc.$id}`);
      return profileDoc;

  } catch (error) {
      console.error(`Error ensuring user profile exists for ${userId}:`, error);
      if (error instanceof AppwriteException) {
          console.error('AppwriteException Details:', error.message, error.code, error.type, error.response);
      }
      // Don't block login/signup if profile creation fails, but log it.
      return null;
  }
};

export const createUserAccount = async (email: string, password: string, name?: string): Promise<User> => {
  if (!COLLECTION_USER_PROFILES) {
      throw new Error("User Profile Collection ID is not configured. Cannot create user.");
  }
  try {
      const userAccount = await account.create(ID.unique(), email, password, name);
      console.log('User account created:', userAccount.$id);
      // Log in the new user
      await loginUser(email, password);
      console.log('User logged in after creation.');
      // Create the corresponding profile document
      await ensureUserProfileExists(userAccount.$id, name);
      return userAccount;
  } catch (error) {
      console.error('Error creating user account or profile:', error);
      // Attempt to clean up if account creation succeeded but profile failed? (Complex)
      // For now, just re-throw.
      throw error;
  }
};

export const loginUser = async (email: string, password: string): Promise<Models.Session> => {
  try {
      const session = await account.createSession(email, password);
      // Optional: Could call ensureUserProfileExists here too, as a fallback
      // if it somehow didn't get created during signup.
      // const user = await account.get();
      // await ensureUserProfileExists(user.$id, user.name);
      return session;
  } catch (error) {
      console.error('Error logging in user:', error);
      throw error;
  }
};

export const logoutUser = async (): Promise<void> => {
  try {
      await account.deleteSession('current');
  } catch (error) {
      console.error('Error logging out user:', error);
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
      const user = await account.get();
      return user; // Return the basic Appwrite User object
  } catch (error) {
      if (error instanceof AppwriteException && (error.code === 401 || error.type === 'user_unauthorized')) {
          return null; // Not logged in
      }
      console.error('Error fetching current user:', error);
      return null;
  }
};


// --- NEW: User Profile Functions (using Database Collection) ---

/**
* Fetches the user's profile document from the 'userProfiles' collection.
* Returns the full document including Appwrite system fields.
*/
export const getUserProfile = async (): Promise<UserProfileDocument | null> => {
  const user = await getCurrentUser();
  if (!user) return null; // Not authenticated

  if (!COLLECTION_USER_PROFILES || !DATABASE_ID) {
      console.error("User Profile Collection ID or Database ID is not configured.");
      return null;
  }

  try {
      const response = await databases.listDocuments<UserProfileDocument>(
          DATABASE_ID,
          COLLECTION_USER_PROFILES,
          [
              Query.equal('userId', user.$id), // Find profile by user ID
              Query.limit(1)                   // Expect only one profile per user
          ]
      );

      if (response.documents.length > 0) {
          return response.documents[0];
      } else {
          console.warn(`No profile document found for user ${user.$id}. Attempting to create one.`);
          // Attempt to create it now if it's missing (e.g., for users created before this logic)
          return await ensureUserProfileExists(user.$id, user.name);
      }
  } catch (error) {
      console.error(`Error fetching user profile for ${user.$id}:`, error);
       if (error instanceof AppwriteException) {
          console.error('AppwriteException Details:', error.message, error.code, error.type, error.response);
      }
      return null;
  }
};

/**
* Updates data within the user's profile document.
* Creates the profile document if it doesn't exist.
* @param profileUpdateData - An object containing the fields to update.
*/
export const updateUserProfile = async (profileUpdateData: Partial<UserProfileData>): Promise<UserProfileDocument | null> => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated. Cannot update profile.');

  if (!COLLECTION_USER_PROFILES || !DATABASE_ID) {
      console.error("User Profile Collection ID or Database ID is not configured.");
      throw new Error("Profile collection not configured.");
  }

  // Remove userId from update data if present, it should not be changed
  const { userId, ...updateData } = profileUpdateData;
  if (Object.keys(updateData).length === 0) {
      console.warn("updateUserProfile called with no data to update.");
      return getUserProfile(); // Return current profile if no changes
  }

  try {
      const profileDoc = await getUserProfile(); // Check if profile exists (this also attempts creation if missing)

      if (!profileDoc) {
           // If getUserProfile failed to create it (e.g., config error caught there), throw.
           throw new Error(`Failed to find or create profile document for user ${user.$id}.`);
      }

      // Profile exists, update it
      console.log(`Updating profile document ${profileDoc.$id} for user ${user.$id}`);
      const updatedDoc = await databases.updateDocument<UserProfileDocument>(
          DATABASE_ID,
          COLLECTION_USER_PROFILES,
          profileDoc.$id, // Use the existing document ID
          updateData      // Send only the fields to be updated
      );
      console.log(`Profile document ${updatedDoc.$id} updated successfully.`);
      return updatedDoc;

  } catch (error) {
      console.error(`Error updating user profile for ${user.$id}:`, error);
       if (error instanceof AppwriteException) {
          console.error('AppwriteException Details:', error.message, error.code, error.type, error.response);
      }
      throw error; // Re-throw for handling in UI
  }
};

/**
* Clears the saved ingredients list in the user's profile document.
*/
export const clearSavedIngredients = async (): Promise<void> => {
  try {
      // Update the profile with an empty array for savedIngredients
      await updateUserProfile({ savedIngredients: [] });
      console.log("Cleared saved ingredients in user profile.");
  } catch (error) {
      console.error("Error clearing saved ingredients in profile:", error);
      // Optionally re-throw or handle if needed in UI
      throw error; // Re-throwing might be better to inform the user
  }
};


// --- DEPRECATED User Preferences Functions (using account.prefs) ---
// You can now remove these or keep them commented out for reference

// export const updateUserPreferences = async (preferences: UserPreferences): Promise<Models.User<Models.Preferences>> => {
//     try {
//         const updatedUser = await account.updatePrefs(preferences);
//         return updatedUser as User;
//     } catch (error) {
//         console.error('Error updating user preferences:', error);
//         throw error;
//     }
// };

// export const getUserPreferences = async (): Promise<UserPreferences | null> => {
//     try {
//         const user = await getCurrentUser();
//         // Assuming UserPreferences structure matches Models.Preferences
//         return user?.prefs as UserPreferences || null;
//     } catch (error) {
//         console.error('Error getting user preferences:', error);
//         return null;
//     }
// };


// --- Database Functions (Recipe CRUD) ---
// (Keep the existing Recipe CRUD functions: formatMacrosForAppwrite, prepareRecipePayload, saveRecipe, updateRecipe, fetchUserRecipes, deleteRecipe, parseIngredients, parseTips, parseMacros, convertDocumentToRecipe, getRecipeById)
// ... (paste your existing recipe functions here) ...
/**
* Converts the Recipe['macros'] object into a string array suitable for Appwrite.
* @param macros - The macros object { calories?: string, ... }
* @returns A string array like ["Calories: 450 kcal", "Protein: 30g", ...] or undefined.
*/
const formatMacrosForAppwrite = (macros: Recipe['macros'] | undefined): string[] | undefined => {
  if (!macros || Object.keys(macros).length === 0) {
      return undefined; // Return undefined if no macros data
  }
  const formatted: string[] = [];
  if (macros.calories) formatted.push(`Calories: ${macros.calories}`);
  if (macros.protein) formatted.push(`Protein: ${macros.protein}`);
  if (macros.carbs) formatted.push(`Carbs: ${macros.carbs}`);
  if (macros.fat) formatted.push(`Fat: ${macros.fat}`);
  return formatted.length > 0 ? formatted : undefined;
};

// Type representing the DATA PAYLOAD sent to Appwrite (excluding system fields)
type RecipeDataForAppwrite = {
userId: string;
title: string;
description?: string;
ingredients: string[]; // Native array
instructions: string;
prepTime?: string;
cookTime?: string;
totalTime?: string;
servings?: string;
difficulty?: string;
macrosJson?: string[]; // Native array
reasoning?: string;
tipsJson?: string[]; // Native array
tags?: string[]; // Added tags field
userRating?: number; // Added user rating field
userNotes?: string; // Added user notes field
};


/**
* Prepares the Recipe data for saving/updating in Appwrite.
* Sends arrays directly for Appwrite Array attributes. Converts macros object.
*/
const prepareRecipePayload = (recipe: Partial<ExtendedRecipe>, userId?: string): Partial<RecipeDataForAppwrite> => {
  const payload: Partial<RecipeDataForAppwrite> = {};
  if (userId) payload.userId = userId;

  // Map Recipe fields to RecipeDataForAppwrite fields
  if (recipe.title !== undefined) payload.title = recipe.title;
  if (recipe.instructions !== undefined) payload.instructions = recipe.instructions;

  // --- Handle Arrays Directly ---
  if (recipe.ingredients !== undefined) payload.ingredients = recipe.ingredients || []; // Send array
  if (recipe.tips !== undefined) payload.tipsJson = recipe.tips || []; // Send array to tipsJson attribute

  // --- Handle Macros Object -> String Array ---
  if (recipe.macros !== undefined) {
      payload.macrosJson = formatMacrosForAppwrite(recipe.macros); // Convert object to string array
      // If formatMacros returns undefined (because object was empty), don't add the key
      if (payload.macrosJson === undefined) {
          delete payload.macrosJson;
      }
  }

  // Optional simple strings
  if (recipe.description !== undefined) payload.description = recipe.description;
  if (recipe.prepTime !== undefined) payload.prepTime = recipe.prepTime;
  if (recipe.cookTime !== undefined) payload.cookTime = recipe.cookTime;
  if (recipe.totalTime !== undefined) payload.totalTime = recipe.totalTime;
  if (recipe.servings !== undefined) payload.servings = recipe.servings;
  if (recipe.difficulty !== undefined) payload.difficulty = recipe.difficulty;
  if (recipe.reasoning !== undefined) payload.reasoning = recipe.reasoning;

  // New fields from ExtendedRecipe
  if (recipe.tags !== undefined) payload.tags = recipe.tags;
  if (recipe.userRating !== undefined) payload.userRating = recipe.userRating;
  if (recipe.userNotes !== undefined) payload.userNotes = recipe.userNotes;

  // console.log("Prepared Payload (Native Arrays):", payload); // Keep for debugging if needed
  return payload;
};

/**
* Saves a new recipe document to the Appwrite database.
*/
export const saveRecipe = async (recipe: ExtendedRecipe): Promise<Models.Document> => {
const user = await getCurrentUser();
if (!user) throw new Error('Not authenticated. Cannot save recipe.');

const payload = prepareRecipePayload(recipe, user.$id);

// Validate required fields for creation
const createPayload = payload as RecipeDataForAppwrite; // Assert type for validation
if (!createPayload.userId || !createPayload.title || !createPayload.ingredients || !createPayload.instructions) {
    console.error("Missing required fields in payload for saveRecipe:", createPayload);
    throw new Error("Cannot save recipe: Missing required fields (userId, title, ingredients, instructions).");
}

console.log('Attempting to save recipe with payload:', createPayload);
try {
  const doc = await databases.createDocument(
    DATABASE_ID,
    COLLECTION_SAVED_RECIPES,
    ID.unique(),
    createPayload
  );
  console.log('Recipe saved successfully:', doc.$id);
  return doc;
} catch (error) {
  console.error('Error saving recipe:', error);
  if (error instanceof AppwriteException) {
    console.error('AppwriteException Details:', error.message, error.code, error.type, error.response);
  }
  throw new Error(`Failed to save recipe: ${error instanceof Error ? error.message : 'Unknown database error'}`);
}
};

/**
* Updates an existing saved recipe document in Appwrite.
*/
export const updateRecipe = async (documentId: string, updatedRecipeData: Partial<ExtendedRecipe>): Promise<Models.Document> => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated. Cannot update recipe.');

  const payload = prepareRecipePayload(updatedRecipeData); // Prepare payload without userId

  if (Object.keys(payload).length === 0) {
      console.warn("Update request for recipe", documentId, "received no data to update.");
      // Fetch and return the unmodified document if needed, or just return void/null
      return databases.getDocument(DATABASE_ID, COLLECTION_SAVED_RECIPES, documentId);
  }

  console.log(`Attempting to update recipe ${documentId} with payload:`, payload);
  try {
      const updatedDoc = await databases.updateDocument(
          DATABASE_ID,
          COLLECTION_SAVED_RECIPES,
          documentId,
          payload
      );
      console.log('Recipe updated successfully:', updatedDoc.$id);
      return updatedDoc;
  } catch (error) {
      console.error(`Error updating recipe ${documentId}:`, error);
      if (error instanceof AppwriteException) {
          console.error('AppwriteException Details:', error.message, error.code, error.type, error.response);
      }
      throw new Error(`Failed to update recipe: ${error instanceof Error ? error.message : 'Unknown database error'}`);
  }
};

// Define a type for the filters used in fetchUserRecipes
interface FetchRecipeFilters {
difficulty?: string;
sortBy?: 'newest' | 'oldest' | 'alphabetical';
// Add other potential filter properties here if needed
}

/**
* Fetches all recipes saved by the currently logged-in user.
*/
export const fetchUserRecipes = async (options?: { query?: string, filters?: FetchRecipeFilters }): Promise<SavedRecipeDocument[]> => {
const user = await getCurrentUser();
if (!user) return [];

try {
  const queries: string[] = [AppwriteQuery.equal('userId', user.$id)]; // Ensure queries is explicitly string[]

  // Add text search if provided
  if (options?.query && options.query.trim()) {
    // Use search method for full-text search if enabled on 'title' attribute
    // queries.push(AppwriteQuery.search('title', options.query.trim()));
    // Or use contains for partial matching if search isn't set up/needed
     queries.push(AppwriteQuery.search('title', options.query.trim())); // Assuming 'title' is indexed for search
  }

  // Add filters if provided
  if (options?.filters) {
    if (options.filters.difficulty) {
      queries.push(AppwriteQuery.equal('difficulty', options.filters.difficulty));
    }
    // Add more filters as needed
  }

  // Add sorting
  if (options?.filters?.sortBy) {
    switch (options.filters.sortBy) {
      case 'newest':
        queries.push(AppwriteQuery.orderDesc('$createdAt'));
        break;
      case 'oldest':
        queries.push(AppwriteQuery.orderAsc('$createdAt'));
        break;
      case 'alphabetical':
        queries.push(AppwriteQuery.orderAsc('title'));
        break;
      default:
        queries.push(AppwriteQuery.orderDesc('$createdAt')); // Default sort
        break;
    }
  } else {
    // Default sort by newest if no specific sort order is provided
    queries.push(AppwriteQuery.orderDesc('$createdAt'));
  }

  // Fetch documents
  const res = await databases.listDocuments<SavedRecipeDocument>(
    DATABASE_ID,
    COLLECTION_SAVED_RECIPES,
    queries // Pass the array of query strings
  );
  console.log(`Fetched ${res.documents.length} recipes for user ${user.$id}`);
  return res.documents;
} catch (error) {
  console.error('Error fetching recipes:', error);
  if (error instanceof AppwriteException) {
    console.error('AppwriteException Details:', error.message, error.code, error.type, error.response);
  }
  return []; // Return empty array on error
}
};


/**
* Deletes a specific recipe document by its ID.
*/
export const deleteRecipe = async (recipeId: string): Promise<void> => {
   const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated.');

    // Optional: Verify the user owns the recipe before deleting
    // try {
    //   const recipeDoc = await databases.getDocument(DATABASE_ID, COLLECTION_SAVED_RECIPES, recipeId);
    //   if (recipeDoc.userId !== user.$id) {
    //       throw new Error('User does not have permission to delete this recipe.');
    //   }
    // } catch (error) {
    //    console.error('Error verifying recipe ownership before delete:', error);
    //    throw error; // Rethrow if verification fails (e.g., recipe not found)
    // }


    try {
      await databases.deleteDocument(
        DATABASE_ID,
        COLLECTION_SAVED_RECIPES,
        recipeId
      );
      console.log('Recipe deleted successfully:', recipeId);
    } catch (error) {
      console.error('Error deleting recipe:', error);
      if (error instanceof AppwriteException) {
        console.error('AppwriteException Details:', error.message, error.code, error.type, error.response);
      }
      throw new Error(`Failed to delete recipe: ${error instanceof Error ? error.message : 'Unknown database error'}`);
    }
};

// --- Utility Parsing Functions ---

/**
* Utility to handle ingredients array (no parsing needed if fetched as array).
*/
export const parseIngredients = (doc: SavedRecipeDocument): string[] => {
// Appwrite SDK should return native arrays for string[] attributes
if (Array.isArray(doc.ingredients)) {
  return doc.ingredients;
}
// Add a fallback/warning if it's somehow not an array
console.warn(`Ingredients for doc ${doc.$id} was not an array:`, doc.ingredients);
return []; // Return empty array if data is invalid
};

/**
* Utility to handle tips array (no parsing needed if fetched as array).
* Assumes 'tipsJson' attribute in Appwrite is String Array.
*/
export const parseTips = (doc: SavedRecipeDocument): string[] => {
if (Array.isArray(doc.tipsJson)) { // Check the correct attribute name
  return doc.tipsJson;
}
console.warn(`Tips (tipsJson) for doc ${doc.$id} was not an array:`, doc.tipsJson);
return [];
};


/**
* Utility to parse the macros string array from Appwrite back into an object.
* Assumes 'macrosJson' attribute holds strings like "Key: Value".
*/
export const parseMacros = (doc: SavedRecipeDocument): Recipe['macros'] | undefined => {
if (!Array.isArray(doc.macrosJson) || doc.macrosJson.length === 0) {
  return undefined; // Return undefined if no array or empty
}
const macrosObj: Recipe['macros'] = {};
try {
  doc.macrosJson.forEach(item => {
      if (typeof item !== 'string') return; // Skip non-string items
    const parts = item.split(/:\s*/); // Split "Key: Value"
    if (parts.length === 2) {
      const key = parts[0].trim().toLowerCase();
      const value = parts[1].trim();
      // Map known keys (adjust keys if your format differs)
      if (key === 'calories' || key === 'energy') macrosObj.calories = value;
      else if (key === 'protein') macrosObj.protein = value;
      else if (key === 'carbs' || key === 'carbohydrates') macrosObj.carbs = value;
      else if (key === 'fat') macrosObj.fat = value;
      // Add other potential keys if needed
    } else {
        console.warn(`Could not parse macro item: "${item}" in doc ${doc.$id}`);
    }
  });
  // Return the object only if it has actual data
  return Object.keys(macrosObj).length > 0 ? macrosObj : undefined;
} catch (e) {
  console.error(`Failed to parse macros array for doc ${doc.$id}:`, doc.macrosJson, e);
  return undefined; // Return undefined on error
}
};

/**
* Converts a SavedRecipeDocument (Appwrite format with native arrays)
* into a Recipe object (App state format with object for macros).
*/
export const convertDocumentToRecipe = (doc: SavedRecipeDocument): ExtendedRecipe => {
  return {
      // Required fields from Recipe interface
      title: doc.title || "Untitled Recipe", // Provide default
      ingredients: parseIngredients(doc), // Use parsed array
      instructions: doc.instructions || "No instructions provided.", // Provide default

      // Optional fields from Recipe interface
      description: doc.description,
      prepTime: doc.prepTime,
      cookTime: doc.cookTime,
      totalTime: doc.totalTime,
      servings: doc.servings,
      difficulty: doc.difficulty,
      macros: parseMacros(doc), // Use parsed object
      reasoning: doc.reasoning,
      tips: parseTips(doc), // Use parsed array

      // Fields from ExtendedRecipe interface
      tags: Array.isArray(doc.tags) ? doc.tags : [], // Ensure tags is an array
      userRating: doc.userRating,
      userNotes: doc.userNotes,

      // Include Appwrite document ID if needed downstream
      // $id: doc.$id
  };
};


/**
* Fetches a single recipe document by its ID.
* @param documentId - The $id of the recipe document to fetch.
* @returns The fetched SavedRecipeDocument or throws an error if not found/accessible.
*/
export const getRecipeById = async (documentId: string): Promise<SavedRecipeDocument> => {
console.log(`Attempting to fetch recipe with ID: ${documentId}`);
if (!DATABASE_ID || !COLLECTION_SAVED_RECIPES) {
    throw new Error("Database or Recipe Collection ID not configured.");
}
try {
    const doc = await databases.getDocument<SavedRecipeDocument>(
        DATABASE_ID,
        COLLECTION_SAVED_RECIPES,
        documentId
    );
    console.log(`Recipe ${documentId} fetched successfully.`);
    return doc;
} catch (error) {
    console.error(`Error fetching recipe ${documentId}:`, error);
    if (error instanceof AppwriteException) {
        console.error('AppwriteException Details:', error.message, error.code, error.type, error.response);
        if (error.code === 404) {
            throw new Error(`Recipe not found (ID: ${documentId}).`);
        } else if (error.code === 401) {
             throw new Error(`You do not have permission to view this recipe (ID: ${documentId}).`);
        }
    }
    // Throw a generic error for other cases
    throw new Error(`Failed to fetch recipe: ${error instanceof Error ? error.message : 'Unknown database error'}`);
}
};