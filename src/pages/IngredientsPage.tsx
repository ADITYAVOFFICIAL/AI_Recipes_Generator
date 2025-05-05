import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  X,
  Mic,
  MicOff,
  ArrowRight,
  Plus,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  getUserProfile,
  updateUserProfile,
} from '@/lib/appwrite';

// --- Web Speech API Type Definitions ---
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognition;
}
// --- End Type Definitions ---


const IngredientsPage: React.FC = () => {
  const [ingredients, setIngredients] = useState<string>('');
  const [parsedIngredients, setParsedIngredients] = useState<string[]>([]);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [hasListeningSupport, setHasListeningSupport] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const baseIngredientsRef = useRef<string>('');
  const currentSessionFinalTranscriptRef = useRef<string>('');
  // Ref to track existing ingredients (lowercase) for duplicate checking during speech
  const existingIngredientsLowerRef = useRef<Set<string>>(new Set());

  // Check for browser support
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setHasListeningSupport(!!SR);
    if (!SR) {
        console.warn("Web Speech API not supported in this browser.");
    }
  }, []);

  // Load saved ingredients on initial mount
  useEffect(() => {
    let isMounted = true;
    if (currentUser) {
      setIsLoading(true);
      getUserProfile()
        .then(profileDoc => {
          if (isMounted && profileDoc?.savedIngredients && profileDoc.savedIngredients.length > 0) {
            const saved = profileDoc.savedIngredients;
            setIngredients(saved.join(', '));
            console.log("Loaded saved ingredients:", saved);
          }
        })
        .catch(error => {
          console.error("Failed to load saved ingredients:", error);
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });
    } else {
      setIsLoading(false);
    }
    return () => { isMounted = false; };
  }, [currentUser]);

  // Parse ingredients whenever the textarea changes
  useEffect(() => {
    if (!isLoading) {
        const cleanedIngredients = ingredients.trim().replace(/,\s*$/, '');
        if (cleanedIngredients) {
          const items = cleanedIngredients
            .split(/[,\n]+/)
            .map((item) => item.trim())
            .filter((item) => item.length > 0);
          // This map method inherently handles uniqueness based on lowercase keys
          const uniqueItems = Array.from(new Map(items.map(item => [item.toLowerCase(), item])).values());
          setParsedIngredients(uniqueItems);
        } else {
          setParsedIngredients([]);
        }
    }
  }, [ingredients, isLoading]);

  // --- Speech Recognition Logic ---

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      console.log("Requested speech recognition stop.");
    }
  }, [isListening]);

  const startListening = useCallback(() => {
    const SRConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SRConstructor) return;

    // --- Initialize for new session ---
    const currentText = ingredients.trim();
    baseIngredientsRef.current = currentText ? currentText.replace(/,\s*$/, '') + ', ' : '';
    currentSessionFinalTranscriptRef.current = ''; // Reset session transcript

    // Populate the set with existing ingredients (lowercase)
    existingIngredientsLowerRef.current = new Set(
      currentText
        .split(/[,\n]+/)
        .map(item => item.trim().toLowerCase())
        .filter(Boolean)
    );
    // --- End Initialization ---

    const SRConstructorTyped = SRConstructor as SpeechRecognitionConstructor;
    recognitionRef.current = new SRConstructorTyped();

    const recognition = recognitionRef.current;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      toast({
        title: 'Listening...',
        description: "Speak your ingredients. Say 'stop listening' or 'done' to finish.",
      });
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let sessionFinalTranscriptUpdate = '';
      let stopCommandDetected = false;

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptPart = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          let finalizedChunk = transcriptPart.trim();
          const finalizedChunkLower = finalizedChunk.toLowerCase();

          // Check for stop commands first
          const stopCommands = /stop listening|done/gi;
          if (stopCommands.test(finalizedChunkLower)) {
              finalizedChunk = finalizedChunk.replace(stopCommands, '').trim(); // Remove command
              // Recalculate lowercase after removing command
              const cleanedLower = finalizedChunk.toLowerCase();
              stopCommandDetected = true;
              // Process the remaining part if any, checking for duplicates
              if (finalizedChunk && !existingIngredientsLowerRef.current.has(cleanedLower)) {
                  existingIngredientsLowerRef.current.add(cleanedLower);
                  sessionFinalTranscriptUpdate += finalizedChunk + ', ';
              }
          }
          // If not a stop command, check for duplicates before adding
          else if (finalizedChunk && !existingIngredientsLowerRef.current.has(finalizedChunkLower)) {
              existingIngredientsLowerRef.current.add(finalizedChunkLower); // Add to set
              sessionFinalTranscriptUpdate += finalizedChunk + ', '; // Add original case + comma to transcript
          } else if (finalizedChunk) {
              console.log(`Duplicate skipped: ${finalizedChunk}`); // Log skipped duplicate
          }
        } else {
          interimTranscript += transcriptPart;
        }
      }

      // Append the newly finalized *unique* parts (with commas) to the ref
      if (sessionFinalTranscriptUpdate) {
          currentSessionFinalTranscriptRef.current += sessionFinalTranscriptUpdate;
      }

      // --- Real-time Update ---
      const realTimeText = baseIngredientsRef.current + currentSessionFinalTranscriptRef.current + interimTranscript;
      setIngredients(realTimeText);

      if (stopCommandDetected) {
          stopListening();
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error', event.error, event.message);
      let description = `Error: ${event.error}. Please try again.`;
      if (event.error === 'no-speech') description = "No speech detected. Mic working?";
      else if (event.error === 'audio-capture') description = "Microphone error. Check connection/permissions.";
      else if (event.error === 'not-allowed') description = "Microphone access denied. Please allow in browser settings.";
      toast({ title: 'Recognition Error', description, variant: 'destructive' });
    };

    recognition.onend = () => {
      setIsListening(false);
      let finalText = (baseIngredientsRef.current + currentSessionFinalTranscriptRef.current).trim();
      finalText = finalText.replace(/,\s*$/, ''); // Remove trailing comma/space
      setIngredients(finalText);

      baseIngredientsRef.current = '';
      currentSessionFinalTranscriptRef.current = '';
      // Keep existingIngredientsLowerRef as is, it reflects the final state
      console.log("Speech recognition ended.");
    };

    recognition.start();
  }, [ingredients, toast, stopListening]);

  const toggleListening = useCallback(() => {
    if (!hasListeningSupport) {
      toast({ title: "Not Supported", description: "Speech recognition isn't available in your browser.", variant: "destructive" });
      return;
    }
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, hasListeningSupport, startListening, stopListening, toast]);
  // --- End Speech Recognition Logic ---

  const handleRemoveIngredient = (ingredientToRemove: string) => {
    const filtered = parsedIngredients.filter(
      (i) => i.toLowerCase() !== ingredientToRemove.toLowerCase()
    );
    setParsedIngredients(filtered);
    setIngredients(filtered.join(', '));
  };

  const handleClearAll = () => {
    setIngredients('');
    setParsedIngredients([]);
    existingIngredientsLowerRef.current.clear(); // Clear the tracking set as well
  };

  const handleProceedToGenerate = async () => {
    if (parsedIngredients.length === 0) {
      toast({ title: 'No Ingredients', description: 'Please add at least one ingredient.', variant: 'destructive' });
      return;
    }
    if (!currentUser) {
      toast({ title: 'Login Required', description: 'Please log in to save ingredients and generate recipes.', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    try {
      await updateUserProfile({ savedIngredients: parsedIngredients });
      toast({ title: "Ingredients Saved", description: "Your ingredients list has been updated." });
      navigate('/create');
    } catch (error) {
      console.error('Error saving ingredients to profile:', error);
      toast({ title: 'Save Error', description: 'Could not save your ingredients list.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Loading State UI ---
  if (isLoading) {
    return (
      <div className="container max-w-3xl mx-auto py-12 px-4">
        <Skeleton className="h-8 w-1/2 mx-auto mb-2" />
        <Skeleton className="h-4 w-3/4 mx-auto mb-8" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3 mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
          <CardFooter>
             <Skeleton className="h-10 w-32 ml-auto" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  // --- Main Render ---
  return (
    <div className="container max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-2 text-center">
        Ingredient Entry
      </h1>
      <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
        Tell us what ingredients you have. Your list is saved to your profile.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-recipe-primary dark:text-recipe-accent" />
            Enter Your Ingredients
          </CardTitle>
          <CardDescription>
            Type or speak the ingredients you have available. Separate with commas or new lines.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <Label htmlFor="ingredients" className="text-lg font-semibold">
                Your Ingredients
              </Label>

              {hasListeningSupport && (
                <Button
                  variant={isListening ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={toggleListening}
                  disabled={!hasListeningSupport}
                  aria-live="polite"
                  aria-label={isListening ? 'Stop listening for ingredients' : 'Start listening for ingredients'}
                >
                  {isListening ? (
                    <>
                      <MicOff className="h-4 w-4 mr-2 animate-pulse" />
                      Stop Listening
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 mr-2" />
                      Add by Voice
                    </>
                  )}
                </Button>
              )}
            </div>

            <Textarea
              id="ingredients"
              ref={textareaRef}
              placeholder="Example: Chicken breast, rice, onions, garlic, olive oil..."
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              className="min-h-[120px] text-base focus:ring-recipe-primary dark:focus:ring-recipe-accent"
              disabled={isListening}
              rows={5}
            />

            {parsedIngredients.length > 0 && (
              <div className="border-t pt-4 mt-4">
                 <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {parsedIngredients.length} ingredient{parsedIngredients.length !== 1 && 's'} added:
                    </h4>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearAll}
                        className="text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                        disabled={isProcessing || isListening}
                    >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Clear All
                    </Button>
                 </div>
                <div className="flex flex-wrap gap-2">
                    {parsedIngredients.map((ingredient, idx) => (
                    <Badge
                        key={`${ingredient.toLowerCase()}-${idx}`}
                        variant="secondary"
                        className="pl-3 py-1 flex items-center gap-1 text-sm bg-recipe-light dark:bg-gray-700"
                    >
                        {ingredient}
                        <button
                        onClick={() => handleRemoveIngredient(ingredient)}
                        className="ml-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 p-0.5 focus:outline-none focus:ring-1 focus:ring-red-500"
                        aria-label={`Remove ${ingredient}`}
                        disabled={isProcessing || isListening}
                        >
                        <X className="h-3 w-3" />
                        </button>
                    </Badge>
                    ))}
                </div>
              </div>
            )}
          </div>

          {isListening && (
            <div className="text-center p-3 mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-md">
              <span className="flex items-center justify-center text-red-600 dark:text-red-400 gap-2 font-medium">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                Listening... Say "done" or "stop listening" when finished.
              </span>
            </div>
          )}

          <div className="text-sm text-gray-500 dark:text-gray-400 pt-2">
            <p>
              <strong>Tip:</strong> Be specific! "1 lb ground beef" is better than just "beef".
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-3 justify-end border-t pt-6">
          <Button
            variant="default"
            size="lg"
            onClick={handleProceedToGenerate}
            disabled={parsedIngredients.length === 0 || isProcessing || isListening}
            className="w-full sm:w-auto bg-recipe-primary hover:bg-recipe-secondary dark:bg-recipe-accent dark:hover:bg-recipe-primary text-white dark:text-black"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving & Proceeding...
              </>
            ) : (
              <>
                Find Recipes With These Ingredients
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default IngredientsPage;