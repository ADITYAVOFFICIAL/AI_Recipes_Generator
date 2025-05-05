import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
// --- Updated Imports ---
import {
    getUserProfile,
    updateUserProfile,
    UserProfileData // Import the data type for updates
} from '@/lib/appwrite';
// --- End Updated Imports ---
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { CircleUser, Settings, Moon, Sun, Save, ChefHat, ClipboardCheck, Pizza } from 'lucide-react';

// Cuisine options (remains the same)
const cuisineOptions = [
  'Italian', 'Mexican', 'Chinese', 'Indian', 'Japanese', 'Thai', 'French',
  'Mediterranean', 'American', 'Middle Eastern', 'Korean', 'Vietnamese', 'Greek', 'Spanish',
];

// Dietary preference options (remains the same)
const dietaryOptions = [
  { id: 'vegan', label: 'Vegan' }, { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'gluten-free', label: 'Gluten-Free' }, { id: 'dairy-free', label: 'Dairy-Free' },
  { id: 'keto', label: 'Keto' }, { id: 'paleo', label: 'Paleo' }, { id: 'low-carb', label: 'Low-Carb' },
];

// Skill level options (remains the same)
const skillLevelOptions = [
  'Beginner', 'Intermediate', 'Advanced', 'Any',
];

const ProfilePage = () => {
  const { currentUser } = useAuth(); // updateCurrentUser might not be needed if name isn't editable here
  const { theme, toggleTheme } = useTheme(); // Assuming toggleTheme is sufficient, or add setTheme if available
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);

  // Form state
  const [name, setName] = useState(''); // This will hold displayName from profile or fallback
  const [email, setEmail] = useState(''); // Email comes from auth user
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [selectedCuisine, setSelectedCuisine] = useState<string>('');
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<string>('');
  const [activeTab, setActiveTab] = useState('profile');

  // --- Updated useEffect to use getUserProfile ---
  useEffect(() => {
    let isMounted = true; // Prevent state updates on unmounted component

    if (currentUser) {
      // Set email immediately from auth context
      setEmail(currentUser.email || '');

      // Fetch the profile document from the database
      getUserProfile().then(profileDoc => {
        if (isMounted && profileDoc) {
          // Set name from profileDoc.displayName or fallback to currentUser.name
          setName(profileDoc.displayName || currentUser.name || 'User'); // Added fallback

          // Set preferences from the profile document
          setSelectedDietary(profileDoc.dietaryPreferences || []);
          setSelectedCuisine(profileDoc.cuisinePreferences?.[0] || ''); // Still takes the first if it's an array
          setSelectedSkillLevel(profileDoc.skillLevel || 'Any'); // Use default if not set

          // Set theme based on profileDoc.darkMode
          const profileDarkMode = profileDoc.darkMode === true; // Explicitly check boolean
          if (theme !== (profileDarkMode ? 'dark' : 'light')) {
             // Only toggle if the current theme doesn't match the saved preference
             if ((profileDarkMode && theme === 'light') || (!profileDarkMode && theme === 'dark')) {
                 // Consider using a setTheme function if your context provides one
                 // to avoid potential double-toggles if the initial theme was wrong.
                 toggleTheme();
                 console.log(`Theme toggled based on profile setting (darkMode: ${profileDarkMode})`);
             }
          }

          setIsLoading(false);
        } else if (isMounted) {
          // Handle case where profileDoc is null (error fetching/creating, or user just signed up)
          // Set defaults or fallbacks
          setName(currentUser.name || 'User'); // Fallback name
          // Keep default preferences
          setSelectedDietary([]);
          setSelectedCuisine('');
          setSelectedSkillLevel('Any');
          console.warn("Profile document not found or error fetching. Using defaults.");
          setIsLoading(false); // Still finish loading
        }
      }).catch(error => {
        console.error('Error loading user profile:', error);
        if (isMounted) {
          toast({
            title: "Failed to load profile",
            description: "There was a problem loading your profile data.",
            variant: "destructive",
          });
          // Set fallbacks even on error
          setName(currentUser.name || 'User');
          setEmail(currentUser.email || '');
          setIsLoading(false);
        }
      });
    } else {
      // Not logged in
      setIsLoading(false);
    }

    return () => {
      isMounted = false; // Cleanup function
    };
    // Dependencies: currentUser drives the fetch, toast for errors, theme/toggleTheme for theme sync
  }, [currentUser, toast, theme, toggleTheme]);
  // --- End Updated useEffect ---

  // Handle dietary preference changes (remains the same)
  const handleDietaryChange = (value: string) => {
    setSelectedDietary(prev => {
      if (prev.includes(value)) {
        return prev.filter(item => item !== value);
      } else {
        return [...prev, value];
      }
    });
  };

  // --- Updated handleSavePreferences to use updateUserProfile ---
  const handleSavePreferences = async () => {
    if (!currentUser) return; // Should not happen if UI is correct, but good check

    setIsSaving(true);
    setSaveProgress(25); // Start progress

    try {
      setSaveProgress(50); // Progress update

      // Construct the data payload for the profile update
      // Only include fields being managed in this 'preferences' tab
      const profileUpdateData: Partial<UserProfileData> = {
        dietaryPreferences: selectedDietary,
        cuisinePreferences: selectedCuisine ? [selectedCuisine] : [], // Ensure it's an array or empty array
        skillLevel: selectedSkillLevel,
        darkMode: theme === 'dark',
        // Note: We are NOT updating displayName or avatarUrl here.
        // If the 'Profile' tab allowed editing name, you'd handle that separately
        // or include 'displayName: name' in this payload if saved together.
      };

      setSaveProgress(75); // Progress update

      // Call the updated Appwrite function
      await updateUserProfile(profileUpdateData);

      setSaveProgress(100); // Finish progress

      toast({
        title: "Preferences saved",
        description: "Your cooking preferences have been updated successfully.",
      });

    } catch (error) {
      console.error('Error saving profile preferences:', error);
      toast({
        title: "Save failed",
        description: "There was a problem saving your preferences.",
        variant: "destructive",
      });
      setSaveProgress(0); // Reset progress on error
    } finally {
      // Use setTimeout to allow the progress bar to show 100% briefly
      setTimeout(() => {
        setIsSaving(false);
        setSaveProgress(0);
      }, 500);
    }
  };
  // --- End Updated handleSavePreferences ---


  // Skeleton loading state (remains the same)
  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-10 px-4">
        {/* ... Skeleton structure ... */}
         <div className="space-y-6">
          <Skeleton className="h-12 w-[200px] mb-6" />
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-[150px]" />
                <Skeleton className="h-4 w-[250px]" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Unauthorized state (remains the same)
  if (!currentUser) {
    return (
      <div className="container max-w-4xl mx-auto py-10 px-4">
        {/* ... Unauthorized card ... */}
         <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>You need to be logged in to view your profile.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild>
              <a href="/login">Login</a>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Main profile page content (structure remains the same, data sources updated via state)
  return (
    <div className="container max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <CircleUser className="h-8 w-8 text-recipe-primary dark:text-recipe-accent" />
        User Profile
      </h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <CircleUser className="h-4 w-4" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>Cooking Preferences</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab Content */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Your personal information and account details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                <Avatar className="h-24 w-24 border-2 border-gray-200 dark:border-gray-700">
                  {/* Add avatarUrl from profileDoc if you implement avatar uploads */}
                  <AvatarImage src="" />
                  <AvatarFallback className="text-2xl bg-recipe-primary text-white dark:bg-recipe-accent">
                    {/* Use the name state which is populated from profileDoc or fallback */}
                    {name ? name.charAt(0).toUpperCase() : '?'}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-1 flex-1">
                  {/* Display name from state */}
                  <h3 className="font-medium text-xl">{name}</h3>
                  {/* Display email from state (comes from currentUser) */}
                  <p className="text-gray-500 dark:text-gray-400">{email}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Member since: {new Date(currentUser.$createdAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Theme toggle button remains the same */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleTheme}
                  aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                >
                  {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                </Button>
              </div>

              <Separator />

              {/* Display Name and Email - Note: Name input is disabled */}
              {/* If you want to allow editing name, enable the input and add */}
              {/* 'displayName: name' to the updateUserProfile payload in handleSavePreferences */}
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)} // Allow changing state if you enable editing
                    disabled // Keep disabled unless you implement name saving
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email} // Email from auth, not editable here
                    disabled
                  />
                </div>
              </div>

              <div className="text-sm text-gray-500 dark:text-gray-400">
                <p>To update your email or password, please contact support.</p>
                 {/* Add info about editing name if you enable it */}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab Content */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-recipe-primary dark:text-recipe-accent" />
                Cooking Preferences
              </CardTitle>
              <CardDescription>
                Set your cooking preferences to personalize your recipe recommendations.
                These settings will be auto-filled when you generate new recipes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Dietary Preferences Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-base mb-2 flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-recipe-secondary dark:text-recipe-accent" />
                    Dietary Preferences
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {dietaryOptions.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`dietary-${option.id}`}
                          checked={selectedDietary.includes(option.id)}
                          onCheckedChange={() => handleDietaryChange(option.id)}
                        />
                        <Label htmlFor={`dietary-${option.id}`} className="text-sm">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cuisine and Skill Level Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="cuisine" className="font-medium">
                      Favorite Cuisine
                    </Label>
                    <Select value={selectedCuisine} onValueChange={setSelectedCuisine}>
                      <SelectTrigger id="cuisine">
                        <SelectValue placeholder="No preference / Select cuisine" />
                      </SelectTrigger>
                      <SelectContent>
                         {/* Add an explicit "No Preference" option if desired */}
                         {/* <SelectItem value="">No Preference</SelectItem> */}
                        {cuisineOptions.map((cuisine) => (
                          <SelectItem key={cuisine} value={cuisine}>
                            {cuisine}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="skill-level" className="font-medium">
                      Cooking Skill Level
                    </Label>
                    <Select value={selectedSkillLevel} onValueChange={setSelectedSkillLevel}>
                      <SelectTrigger id="skill-level">
                        <SelectValue placeholder="Select skill level" />
                      </SelectTrigger>
                      <SelectContent>
                        {skillLevelOptions.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
            {/* Save Button and Progress Footer */}
            <CardFooter className="flex flex-col items-end"> {/* Adjusted alignment */}
              {isSaving && (
                <div className="w-full mb-4">
                  <Progress value={saveProgress} className="h-2" />
                  <p className="text-xs text-center text-gray-500 mt-1">Saving...</p>
                </div>
              )}
              <Button
                onClick={handleSavePreferences}
                disabled={isSaving}
                className="w-full sm:w-auto" // Button width adjustment
              >
                {isSaving ? (
                  'Saving...'
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Preferences
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfilePage;