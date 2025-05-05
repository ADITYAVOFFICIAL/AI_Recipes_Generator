import {
  Client,
  Account,
  Databases,
  ID,
  Query as AppwriteQuery,
  Models,
  AppwriteException,
  Permission,
  Role
} from 'appwrite';
import type { Recipe } from './gemini'; // Assuming './gemini' defines the base Recipe type

// Re-export Recipe type
export type { Recipe };

// Export Appwrite Query
export const Query = AppwriteQuery;

// --- Configuration ---
// Ensure these are correctly set in your .env file and accessible via import.meta.env
const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
export const COLLECTION_SAVED_RECIPES = import.meta.env.VITE_APPWRITE_COLLECTION_RECIPES;
export const COLLECTION_USER_PROFILES = import.meta.env.VITE_APPWRITE_COLLECTION_USER_PROFILES;

// --- Initialize Appwrite Client and Services ---
export const client = new Client();

if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID) {
  console.error("Appwrite endpoint or project ID is missing. Check your environment variables.");
  // Optionally throw an error or handle this case as needed
} else {
  client
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);
}

export const account = new Account(client);
export const databases = new Databases(client);

// --- Types ---

// Basic Appwrite User type
export type User = Models.User<Models.Preferences>;

// Extended Recipe type (includes optional fields)
export interface ExtendedRecipe extends Recipe {
  tags?: string[];
  userRating?: number;
  userNotes?: string;
}

// Saved Recipe Document structure (matches Appwrite collection attributes)
export interface SavedRecipeDocument extends Models.Document {
  userId: string;
  title: string;
  description?: string;
  ingredients: string[]; // Assumes native string array attribute in Appwrite
  instructions: string;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  servings?: string;
  difficulty?: string;
  macrosJson?: string[]; // Assumes native string array attribute for storing formatted macros
  reasoning?: string;
  tipsJson?: string[]; // Assumes native string array attribute for tips
  tags?: string[]; // Assumes native string array attribute for tags
  userRating?: number;
  userNotes?: string;
}

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

/**
 * Ensures a user profile document exists for the given user ID.
 * Creates one with default values if it doesn't exist.
 * Sets document-level permissions so only the user can manage their profile.
 * @param userId - The Appwrite Authentication user ID ($id).
 * @param name - Optional user name to pre-fill the displayName.
 * @returns The existing or newly created UserProfileDocument, or null on configuration error.
 */
const ensureUserProfileExists = async (userId: string, name?: string): Promise<UserProfileDocument | null> => {
  if (!DATABASE_ID || !COLLECTION_USER_PROFILES) {
    console.error("Database ID or User Profile Collection ID is not configured in environment variables.");
    return null;
  }

  try {
    // Check if profile already exists using the userId field
    const existingProfiles = await databases.listDocuments<UserProfileDocument>(
      DATABASE_ID,
      COLLECTION_USER_PROFILES,
      [Query.equal('userId', userId), Query.limit(1)]
    );

    if (existingProfiles.documents.length > 0) {
      // console.log(`Profile document found for user ${userId}: ${existingProfiles.documents[0].$id}`);
      return existingProfiles.documents[0]; // Profile already exists
    }

    // Create initial profile document if it doesn't exist
    console.log(`Creating initial profile document for user ${userId}`);
    const initialProfileData: UserProfileData = {
      userId: userId,
      displayName: name || '', // Use provided name or fallback
      dietaryPreferences: [],
      cuisinePreferences: [],
      skillLevel: 'Any', // Default skill level
      darkMode: false, // Default theme preference
      savedIngredients: [],
      defaultServings: 2, // Default servings
    };

    // Define permissions: Only the user themselves can read, update, delete
    const userPermissions = [
      Permission.read(Role.user(userId)),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId)),
      // Add other permissions if needed (e.g., team/admin access)
      // Permission.read(Role.team('admins')),
      // Permission.update(Role.team('admins')),
    ];

    const profileDoc = await databases.createDocument<UserProfileDocument>(
      DATABASE_ID,
      COLLECTION_USER_PROFILES,
      ID.unique(), // Let Appwrite generate the document ID
      initialProfileData,
      userPermissions // Apply permissions during creation
    );
    console.log(`Initial profile document created: ${profileDoc.$id} for user ${userId}`);
    return profileDoc;

  } catch (error) {
    console.error(`Error ensuring user profile exists for ${userId}:`, error);
    if (error instanceof AppwriteException) {
      console.error('AppwriteException Details:', error.message, error.code, error.type, error.response);
    }
    // Don't block login/signup if profile creation fails, but log it.
    // Depending on the error, you might want to throw or handle differently.
    return null;
  }
};

/**
 * Creates a new user account using email and password.
 * Logs the user in and creates their profile document afterwards.
 * @param email - User's email address.
 * @param password - User's chosen password.
 * @param name - Optional user's name.
 * @returns The created Appwrite User object.
 */
export const createUserAccount = async (email: string, password: string, name?: string): Promise<User> => {
  if (!DATABASE_ID || !COLLECTION_USER_PROFILES) {
    throw new Error("Configuration error: Database or User Profile Collection ID is missing.");
  }
  try {
    // Create the authentication account [3]
    const userAccount = await account.create(ID.unique(), email, password, name);
    console.log('User account created:', userAccount.$id);

    // Log in the new user immediately to establish a session
    await loginUser(email, password); // Use the corrected login function
    console.log('User logged in after creation.');

    // Create the corresponding profile document in the database collection
    const profile = await ensureUserProfileExists(userAccount.$id, name);
    if (!profile) {
        // Handle the case where profile creation failed but account exists
        console.warn(`User account ${userAccount.$id} created, but profile document creation failed.`);
        // Depending on requirements, you might want to attempt cleanup or just proceed
    }

    return userAccount; // Return the auth user object
  } catch (error) {
    console.error('Error creating user account or profile:', error);
    if (error instanceof AppwriteException) {
        console.error('AppwriteException Details:', error.message, error.code, error.type, error.response);
    }
    // Consider more specific error handling or cleanup if needed
    throw error; // Re-throw the error for the caller to handle
  }
};

/**
 * Logs in a user using their email and password.
 * @param email - User's email address.
 * @param password - User's password.
 * @returns The created Appwrite Session object.
 */
export const loginUser = async (email: string, password: string): Promise<Models.Session> => {
  try {
      // FIX: Use createEmailPasswordSession for email/password login [3, 7, 14]
      const session = await account.createEmailPasswordSession(email, password);
      console.log('User logged in successfully:', session.$id); // Log session ID on success

      // Optional: Ensure profile exists on login as a fallback.
      // This might slightly delay login response but ensures profile consistency.
      // const user = await account.get();
      // await ensureUserProfileExists(user.$id, user.name);

      return session;
  } catch (error) {
      console.error('Error logging in user:', error);
      if (error instanceof AppwriteException) {
          // Log more details for debugging
          console.error('AppwriteException Details:', error.message, error.code, error.type, error.response);
      }
      throw error; // Re-throw the error to be handled by the caller (e.g., AuthContext, LoginPage)
  }
};


/**
 * Logs out the current user by deleting the current session.
 */
export const logoutUser = async (): Promise<void> => {
  try {
    await account.deleteSession('current');
    console.log('User logged out successfully.');
  } catch (error) {
    console.error('Error logging out user:', error);
    // Usually, we don't need to throw here, just log the error.
    // If the session was already invalid, this might fail, which is often acceptable.
  }
};

/**
 * Fetches the currently authenticated user's account details.
 * @returns The Appwrite User object if logged in, otherwise null.
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const user = await account.get();
    return user; // Return the basic Appwrite User object
  } catch (error) {
    // Specifically check for 401 Unauthorized or similar errors indicating not logged in
    if (error instanceof AppwriteException && (error.code === 401 || error.type === 'user_unauthorized')) {
      // console.log('No active session found.'); // Optional log
      return null; // Not logged in, return null gracefully
    }
    // Log other unexpected errors
    console.error('Error fetching current user:', error);
    if (error instanceof AppwriteException) {
        console.error('AppwriteException Details:', error.message, error.code, error.type, error.response);
    }
    return null; // Return null on other errors as well, or re-throw if needed
  }
};


// --- User Profile Functions (using Database Collection) ---

/**
 * Fetches the user's profile document from the 'userProfiles' collection.
 * Attempts to create the profile if it's missing (e.g., for older users).
 * @returns The UserProfileDocument or null if not authenticated or on error.
 */
export const getUserProfile = async (): Promise<UserProfileDocument | null> => {
  const user = await getCurrentUser();
  if (!user) {
    // console.log("Cannot get user profile: User not authenticated.");
    return null;
  }

  if (!DATABASE_ID || !COLLECTION_USER_PROFILES) {
    console.error("User Profile Collection ID or Database ID is not configured.");
    return null;
  }

  try {
    const response = await databases.listDocuments<UserProfileDocument>(
      DATABASE_ID,
      COLLECTION_USER_PROFILES,
      [
        Query.equal('userId', user.$id), // Find profile by the authenticated user's ID
        Query.limit(1)                   // Expect only one profile per user
      ]
    );

    if (response.documents.length > 0) {
      return response.documents[0]; // Return the found profile
    } else {
      // Profile doesn't exist, attempt to create it now
      console.warn(`No profile document found for user ${user.$id}. Attempting to create one.`);
      return await ensureUserProfileExists(user.$id, user.name); // Use the helper function
    }
  } catch (error) {
    console.error(`Error fetching user profile for ${user.$id}:`, error);
    if (error instanceof AppwriteException) {
      console.error('AppwriteException Details:', error.message, error.code, error.type, error.response);
    }
    return null; // Return null on error
  }
};

/**
 * Updates data within the user's profile document.
 * Ensures the profile document exists before attempting update.
 * @param profileUpdateData - An object containing the fields to update (Partial<UserProfileData>).
 * @returns The updated UserProfileDocument or null on error/not authenticated.
 * @throws Error if not authenticated or if profile cannot be found/created.
 */
export const updateUserProfile = async (profileUpdateData: Partial<UserProfileData>): Promise<UserProfileDocument | null> => {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Not authenticated. Cannot update profile.');
  }

  if (!DATABASE_ID || !COLLECTION_USER_PROFILES) {
    console.error("User Profile Collection ID or Database ID is not configured.");
    throw new Error("Profile collection not configured.");
  }

  // Prevent accidental update of userId; remove it from the update payload
  const { userId, ...updateData } = profileUpdateData;
  if (Object.keys(updateData).length === 0) {
    console.warn("updateUserProfile called with no data to update.");
    return getUserProfile(); // Return current profile if no changes are requested
  }

  try {
    // First, ensure the profile exists (this also handles creation if missing)
    const profileDoc = await getUserProfile();

    if (!profileDoc) {
      // If getUserProfile (and ensureUserProfileExists within it) failed, throw.
      throw new Error(`Failed to find or create profile document for user ${user.$id}. Cannot update.`);
    }

    // Profile exists, proceed with the update
    console.log(`Updating profile document ${profileDoc.$id} for user ${user.$id} with data:`, updateData);
    const updatedDoc = await databases.updateDocument<UserProfileDocument>(
      DATABASE_ID,
      COLLECTION_USER_PROFILES,
      profileDoc.$id, // Use the $id of the existing profile document
      updateData      // Send only the fields to be updated
    );
    console.log(`Profile document ${updatedDoc.$id} updated successfully.`);
    return updatedDoc;

  } catch (error) {
    console.error(`Error updating user profile for ${user.$id}:`, error);
    if (error instanceof AppwriteException) {
      console.error('AppwriteException Details:', error.message, error.code, error.type, error.response);
    }
    throw error; // Re-throw for handling in the UI layer
  }
};

/**
 * Clears the saved ingredients list in the user's profile document.
 * @throws Error if update fails or user is not authenticated.
 */
export const clearSavedIngredients = async (): Promise<void> => {
  try {
    // Update the profile with an empty array for savedIngredients
    const updatedProfile = await updateUserProfile({ savedIngredients: [] });
    if (updatedProfile) {
        console.log("Cleared saved ingredients in user profile.");
    } else {
        // This case might occur if updateUserProfile itself returns null due to an issue handled internally
        console.warn("Attempted to clear ingredients, but profile update returned null.");
    }
  } catch (error) {
    console.error("Error clearing saved ingredients in profile:", error);
    // Re-throw to inform the caller (e.g., UI) that the operation failed
    throw error;
  }
};


// --- Database Functions (Recipe CRUD) ---

/**
 * Converts the Recipe['macros'] object into a string array suitable for Appwrite.
 * Example: { calories: "450 kcal", protein: "30g" } -> ["Calories: 450 kcal", "Protein: 30g"]
 * @param macros - The macros object.
 * @returns A string array or undefined if macros is empty/undefined.
 */
const formatMacrosForAppwrite = (macros: Recipe['macros'] | undefined): string[] | undefined => {
  if (!macros || Object.keys(macros).length === 0) {
    return undefined;
  }
  const formatted: string[] = [];
  // Use consistent casing for keys when pushing
  if (macros.calories) formatted.push(`Calories: ${macros.calories}`);
  if (macros.protein) formatted.push(`Protein: ${macros.protein}`);
  if (macros.carbs) formatted.push(`Carbs: ${macros.carbs}`); // Or Carbohydrates
  if (macros.fat) formatted.push(`Fat: ${macros.fat}`);
  // Add other potential macros if they exist in your Recipe type
  return formatted.length > 0 ? formatted : undefined;
};

// Type representing the DATA PAYLOAD sent to Appwrite (excluding system fields like $id, $permissions etc.)
// This should match the attributes defined in your Appwrite collection schema.
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
  macrosJson?: string[]; // Native array for formatted macros
  reasoning?: string;
  tipsJson?: string[]; // Native array for tips
  tags?: string[]; // Native array for tags
  userRating?: number;
  userNotes?: string;
};

/**
 * Prepares the Recipe data (from application state) into the format
 * required for saving or updating in the Appwrite collection.
 * Handles conversion of macros object to string array.
 * Ensures arrays are sent correctly.
 * @param recipe - The partial or full recipe data (ExtendedRecipe).
 * @param userId - Required for creating new recipes, associates the recipe with the user.
 * @returns A partial object matching the structure of RecipeDataForAppwrite.
 */
const prepareRecipePayload = (recipe: Partial<ExtendedRecipe>, userId?: string): Partial<RecipeDataForAppwrite> => {
  const payload: Partial<RecipeDataForAppwrite> = {};

  // Assign userId if provided (essential for creation and filtering)
  if (userId) payload.userId = userId;

  // Map required fields if present
  if (recipe.title !== undefined) payload.title = recipe.title;
  if (recipe.instructions !== undefined) payload.instructions = recipe.instructions;

  // Handle arrays directly - ensure they are arrays, even if empty
  if (recipe.ingredients !== undefined) payload.ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  if (recipe.tips !== undefined) payload.tipsJson = Array.isArray(recipe.tips) ? recipe.tips : []; // Map to tipsJson
  if (recipe.tags !== undefined) payload.tags = Array.isArray(recipe.tags) ? recipe.tags : [];

  // Handle macros object -> string array conversion
  if (recipe.macros !== undefined) {
    const formattedMacros = formatMacrosForAppwrite(recipe.macros);
    // Only include macrosJson if formatting resulted in a non-empty array
    if (formattedMacros && formattedMacros.length > 0) {
      payload.macrosJson = formattedMacros;
    } else {
       // Ensure we don't send an empty array or null if macros were present but empty/invalid
       // Depending on schema, you might want payload.macrosJson = [] or delete payload.macrosJson
       // If the attribute allows null, setting to undefined might clear it on update.
       // If it requires an array, send empty: payload.macrosJson = [];
       // Let's assume sending undefined/omitting clears or leaves it unchanged on update,
       // and for create, it defaults based on the collection setting.
       // If you *always* want an empty array stored if macros are empty, use:
       // payload.macrosJson = [];
    }
  }

  // Map optional simple string/number fields
  if (recipe.description !== undefined) payload.description = recipe.description;
  if (recipe.prepTime !== undefined) payload.prepTime = recipe.prepTime;
  if (recipe.cookTime !== undefined) payload.cookTime = recipe.cookTime;
  if (recipe.totalTime !== undefined) payload.totalTime = recipe.totalTime;
  if (recipe.servings !== undefined) payload.servings = recipe.servings;
  if (recipe.difficulty !== undefined) payload.difficulty = recipe.difficulty;
  if (recipe.reasoning !== undefined) payload.reasoning = recipe.reasoning;
  if (recipe.userRating !== undefined) payload.userRating = recipe.userRating;
  if (recipe.userNotes !== undefined) payload.userNotes = recipe.userNotes;

  // console.log("Prepared Payload for Appwrite:", payload); // Debugging
  return payload;
};

/**
 * Saves a new recipe document to the Appwrite database.
 * Associates the recipe with the currently logged-in user.
 * Sets document permissions so only the owner can manage it.
 * @param recipe - The full recipe data (ExtendedRecipe) to save.
 * @returns The created Appwrite Document object.
 * @throws Error if not authenticated, config missing, or save fails.
 */
export const saveRecipe = async (recipe: ExtendedRecipe): Promise<Models.Document> => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated. Cannot save recipe.');

  if (!DATABASE_ID || !COLLECTION_SAVED_RECIPES) {
    throw new Error("Database or Recipe Collection ID not configured.");
  }

  // Prepare the data payload, including the userId
  const payload = prepareRecipePayload(recipe, user.$id);

  // Basic validation for essential fields before sending to Appwrite
  const createPayload = payload as RecipeDataForAppwrite; // Assert type for validation check
  if (!createPayload.userId || !createPayload.title || !createPayload.ingredients || !createPayload.instructions) {
    console.error("Missing required fields in payload for saveRecipe:", createPayload);
    throw new Error("Cannot save recipe: Missing required fields (userId, title, ingredients, instructions).");
  }

  console.log('Attempting to save recipe with payload:', createPayload);
  try {
    // Define permissions for the new document: only the creator can manage it
    const docPermissions = [
        Permission.read(Role.user(user.$id)),
        Permission.update(Role.user(user.$id)),
        Permission.delete(Role.user(user.$id)),
    ];

    const doc = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_SAVED_RECIPES,
      ID.unique(), // Let Appwrite generate the document ID
      createPayload,
      docPermissions // Apply permissions on creation
    );
    console.log('Recipe saved successfully:', doc.$id);
    return doc;
  } catch (error) {
    console.error('Error saving recipe:', error);
    if (error instanceof AppwriteException) {
      console.error('AppwriteException Details:', error.message, error.code, error.type, error.response);
    }
    // Provide a more user-friendly error message
    throw new Error(`Failed to save recipe: ${error instanceof Error ? error.message : 'Unknown database error'}`);
  }
};

/**
 * Updates an existing saved recipe document in Appwrite.
 * Only allows updates if the user is authenticated. Permissions are handled by Appwrite based on document settings.
 * @param documentId - The $id of the recipe document to update.
 * @param updatedRecipeData - A partial object containing the fields to update (Partial<ExtendedRecipe>).
 * @returns The updated Appwrite Document object.
 * @throws Error if not authenticated, config missing, or update fails.
 */
export const updateRecipe = async (documentId: string, updatedRecipeData: Partial<ExtendedRecipe>): Promise<Models.Document> => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated. Cannot update recipe.');

  if (!DATABASE_ID || !COLLECTION_SAVED_RECIPES) {
    throw new Error("Database or Recipe Collection ID not configured.");
  }

  // Prepare the payload *without* the userId (it shouldn't be changed)
  const payload = prepareRecipePayload(updatedRecipeData);

  // Prevent sending an empty update request
  if (Object.keys(payload).length === 0) {
    console.warn("Update request for recipe", documentId, "received no data to update.");
    // Optionally fetch and return the current document, or throw an error, or return null/void
    // Returning the existing document might be useful
    return databases.getDocument(DATABASE_ID, COLLECTION_SAVED_RECIPES, documentId);
  }

  console.log(`Attempting to update recipe ${documentId} with payload:`, payload);
  try {
    // Appwrite will enforce permissions based on the document's $permissions
    const updatedDoc = await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_SAVED_RECIPES,
      documentId,
      payload // Send only the fields to be updated
    );
    console.log('Recipe updated successfully:', updatedDoc.$id);
    return updatedDoc;
  } catch (error) {
    console.error(`Error updating recipe ${documentId}:`, error);
    if (error instanceof AppwriteException) {
      console.error('AppwriteException Details:', error.message, error.code, error.type, error.response);
      // Handle specific errors like 404 Not Found or 401 Unauthorized
      if (error.code === 404) {
        throw new Error(`Recipe with ID ${documentId} not found.`);
      } else if (error.code === 401) {
        throw new Error(`You do not have permission to update recipe ${documentId}.`);
      }
    }
    throw new Error(`Failed to update recipe: ${error instanceof Error ? error.message : 'Unknown database error'}`);
  }
};

// Define a type for the filters used in fetchUserRecipes for better type safety
interface FetchRecipeFilters {
  difficulty?: string;
  // Add other potential filter properties here (e.g., tags, prepTime range)
}

// Define a type for sorting options
type SortByOption = 'newest' | 'oldest' | 'alphabetical';

// Define options for fetching recipes, including search, filters, and sorting
interface FetchRecipeOptions {
  query?: string; // Text search query
  filters?: FetchRecipeFilters;
  sortBy?: SortByOption;
}

/**
 * Fetches recipes saved by the currently logged-in user.
 * Allows filtering by text query, difficulty, and sorting.
 * @param options - Optional object containing query, filters, and sortBy parameters.
 * @returns An array of SavedRecipeDocument objects. Returns empty array if not authenticated or on error.
 */
export const fetchUserRecipes = async (options?: FetchRecipeOptions): Promise<SavedRecipeDocument[]> => {
  const user = await getCurrentUser();
  if (!user) return []; // Return empty array if not logged in

  if (!DATABASE_ID || !COLLECTION_SAVED_RECIPES) {
    console.error("Database or Recipe Collection ID not configured.");
    return [];
  }

  try {
    const queries: string[] = [
        AppwriteQuery.equal('userId', user.$id) // Core query: filter by logged-in user
    ];

    // Add text search query if provided and not empty
    // Assumes 'title' and potentially 'description'/'ingredients' are indexed for search in Appwrite
    if (options?.query && options.query.trim()) {
      queries.push(AppwriteQuery.search('title', options.query.trim()));
      // You could add more search queries for other fields if needed:
      // queries.push(AppwriteQuery.search('description', options.query.trim()));
    }

    // Add filters if provided
    if (options?.filters) {
      if (options.filters.difficulty) {
        queries.push(AppwriteQuery.equal('difficulty', options.filters.difficulty));
      }
      // Add more filters here based on FetchRecipeFilters interface
      // Example: if (options.filters.tags && options.filters.tags.length > 0) {
      //   queries.push(AppwriteQuery.contains('tags', options.filters.tags)); // Check if Appwrite supports contains for arrays
      // }
    }

    // Add sorting - Default to newest first
    const sortBy = options?.sortBy ?? 'newest';
    switch (sortBy) {
      case 'oldest':
        queries.push(AppwriteQuery.orderAsc('$createdAt'));
        break;
      case 'alphabetical':
        queries.push(AppwriteQuery.orderAsc('title')); // Ensure 'title' attribute is indexed for sorting
        break;
      case 'newest':
      default:
        queries.push(AppwriteQuery.orderDesc('$createdAt')); // Default sort
        break;
    }

    // Add a limit for pagination (optional but recommended for large datasets)
    // queries.push(AppwriteQuery.limit(25)); // Example limit

    console.log("Executing fetchUserRecipes with queries:", queries);

    // Fetch documents using the constructed queries
    const response = await databases.listDocuments<SavedRecipeDocument>(
      DATABASE_ID,
      COLLECTION_SAVED_RECIPES,
      queries // Pass the array of query strings
    );

    console.log(`Fetched ${response.documents.length} recipes for user ${user.$id}`);
    return response.documents;

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
 * Appwrite handles permission checking based on document permissions.
 * @param recipeId - The $id of the recipe document to delete.
 * @throws Error if not authenticated, config missing, or delete fails.
 */
export const deleteRecipe = async (recipeId: string): Promise<void> => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated. Cannot delete recipe.');

  if (!DATABASE_ID || !COLLECTION_SAVED_RECIPES) {
    throw new Error("Database or Recipe Collection ID not configured.");
  }

  console.log(`Attempting to delete recipe ${recipeId}`);
  try {
    // Appwrite will check if the user has delete permission on this document
    await databases.deleteDocument(
      DATABASE_ID,
      COLLECTION_SAVED_RECIPES,
      recipeId
    );
    console.log('Recipe deleted successfully:', recipeId);
  } catch (error) {
    console.error(`Error deleting recipe ${recipeId}:`, error);
    if (error instanceof AppwriteException) {
      console.error('AppwriteException Details:', error.message, error.code, error.type, error.response);
      if (error.code === 404) {
        throw new Error(`Recipe with ID ${recipeId} not found.`);
      } else if (error.code === 401) {
        throw new Error(`You do not have permission to delete recipe ${recipeId}.`);
      }
    }
    throw new Error(`Failed to delete recipe: ${error instanceof Error ? error.message : 'Unknown database error'}`);
  }
};

// --- Utility Parsing Functions ---
// These functions help convert data between the Appwrite document format
// and the format used within your application state (e.g., ExtendedRecipe).

/**
 * Utility to safely retrieve the ingredients array from a document.
 * Assumes 'ingredients' attribute in Appwrite is a String Array.
 * @param doc - The SavedRecipeDocument fetched from Appwrite.
 * @returns The ingredients array, or an empty array if invalid/missing.
 */
export const parseIngredients = (doc: SavedRecipeDocument): string[] => {
  // Appwrite SDK should return native arrays for string[] attributes
  if (Array.isArray(doc.ingredients)) {
    return doc.ingredients;
  }
  // Add a fallback/warning if it's somehow not an array
  console.warn(`Ingredients for doc ${doc.$id} was not an array:`, doc.ingredients);
  return []; // Return empty array if data is invalid or missing
};

/**
 * Utility to safely retrieve the tips array from a document.
 * Assumes 'tipsJson' attribute in Appwrite is a String Array.
 * @param doc - The SavedRecipeDocument fetched from Appwrite.
 * @returns The tips array, or an empty array if invalid/missing.
 */
export const parseTips = (doc: SavedRecipeDocument): string[] => {
  // Check the correct attribute name as defined in your collection ('tipsJson')
  if (Array.isArray(doc.tipsJson)) {
    return doc.tipsJson;
  }
  // Log if the data is not in the expected format
  // console.warn(`Tips (tipsJson) for doc ${doc.$id} was not an array or missing:`, doc.tipsJson);
  return []; // Return empty array if data is invalid or missing
};


/**
 * Utility to parse the macros string array (macrosJson) from Appwrite
 * back into a Recipe['macros'] object.
 * Assumes strings are in "Key: Value" format (e.g., "Calories: 500 kcal").
 * @param doc - The SavedRecipeDocument fetched from Appwrite.
 * @returns A Recipe['macros'] object or undefined if no valid macros data found.
 */
export const parseMacros = (doc: SavedRecipeDocument): Recipe['macros'] | undefined => {
  // Check the correct attribute name ('macrosJson') and if it's a non-empty array
  if (!Array.isArray(doc.macrosJson) || doc.macrosJson.length === 0) {
    return undefined; // No macros data stored
  }

  const macrosObj: Recipe['macros'] = {};
  try {
    doc.macrosJson.forEach(item => {
      if (typeof item !== 'string') {
          console.warn(`Skipping non-string item in macrosJson for doc ${doc.$id}:`, item);
          return; // Skip non-string items defensively
      }
      const parts = item.split(/:\s*/); // Split "Key: Value" by the first colon and optional whitespace
      if (parts.length >= 2) {
        const key = parts[0].trim().toLowerCase(); // Normalize key to lowercase
        const value = parts.slice(1).join(':').trim(); // Join the rest back in case value had colons

        // Map known keys (adjust if your keys in the string format differ)
        if (key === 'calories') macrosObj.calories = value;
        else if (key === 'protein') macrosObj.protein = value;
        else if (key === 'carbs' || key === 'carbohydrates') macrosObj.carbs = value;
        else if (key === 'fat') macrosObj.fat = value;
        // Add other potential keys if needed (e.g., fiber, sugar)
        // else { console.warn(`Unknown macro key "${key}" found in doc ${doc.$id}`); }

      } else {
        console.warn(`Could not parse macro item format: "${item}" in doc ${doc.$id}`);
      }
    });

    // Return the object only if it has actual data parsed
    return Object.keys(macrosObj).length > 0 ? macrosObj : undefined;

  } catch (e) {
    console.error(`Failed to parse macros array (macrosJson) for doc ${doc.$id}:`, doc.macrosJson, e);
    return undefined; // Return undefined on unexpected parsing error
  }
};

/**
 * Converts a SavedRecipeDocument (Appwrite format) into an ExtendedRecipe
 * object (application state format), handling array parsing and macro object creation.
 * @param doc - The SavedRecipeDocument fetched from Appwrite.
 * @returns An ExtendedRecipe object suitable for use in the application.
 */
export const convertDocumentToRecipe = (doc: SavedRecipeDocument): ExtendedRecipe => {
  // Basic validation for the input document
  if (!doc || !doc.$id || !doc.title) {
      console.error("Invalid document passed to convertDocumentToRecipe:", doc);
      // Return a default/empty recipe or throw an error, depending on requirements
      return { title: "Invalid Recipe Data", ingredients: [], instructions: "" };
  }

  return {
    // Required fields from Recipe interface
    title: doc.title, // Assume title is always present based on earlier checks/schema
    ingredients: parseIngredients(doc), // Use parser for safety
    instructions: doc.instructions || "No instructions provided.", // Provide default if missing

    // Optional fields from Recipe interface
    description: doc.description,
    prepTime: doc.prepTime,
    cookTime: doc.cookTime,
    totalTime: doc.totalTime,
    servings: doc.servings,
    difficulty: doc.difficulty,
    macros: parseMacros(doc), // Use parser to get object or undefined
    reasoning: doc.reasoning,
    tips: parseTips(doc), // Use parser for safety (checks tipsJson)

    // Fields from ExtendedRecipe interface
    tags: Array.isArray(doc.tags) ? doc.tags : [], // Ensure tags is an array, default to empty
    userRating: doc.userRating,
    userNotes: doc.userNotes,

    // Optionally include Appwrite document ID if needed downstream (e.g., for updates/deletes)
    // $id: doc.$id // Uncomment if you need the ID directly on the recipe object in your app state
  };
};


/**
 * Fetches a single recipe document by its Appwrite Document ID ($id).
 * @param documentId - The $id of the recipe document to fetch.
 * @returns The fetched SavedRecipeDocument.
 * @throws Error if not found, not accessible, config missing, or other fetch error.
 */
export const getRecipeById = async (documentId: string): Promise<SavedRecipeDocument> => {
  console.log(`Attempting to fetch recipe with ID: ${documentId}`);
  if (!DATABASE_ID || !COLLECTION_SAVED_RECIPES) {
    throw new Error("Database or Recipe Collection ID not configured.");
  }
  if (!documentId || typeof documentId !== 'string') {
      throw new Error("Invalid document ID provided.");
  }

  try {
    // Appwrite SDK handles permission checks based on the logged-in user's session
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
      } else {
        // Throw a more specific error based on the Appwrite exception
         throw new Error(`Failed to fetch recipe (Appwrite Error ${error.code}): ${error.message}`);
      }
    }
    // Throw a generic error for non-Appwrite errors
    throw new Error(`Failed to fetch recipe: ${error instanceof Error ? error.message : 'Unknown database error'}`);
  }
};

// --- End of appwrite.ts ---