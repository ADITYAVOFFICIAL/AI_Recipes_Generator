import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, ChefHat, Scale, Repeat } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateChatResponse, scaleRecipe, generateIngredientSubstitutions } from '@/lib/gemini';
import { Recipe } from '@/lib/gemini';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface ChatBotProps {
  onRecipeGenerated?: (recipe: Recipe) => void;
  initialRecipe?: Recipe | null;
}

interface Message {
  content: string;
  isUser: boolean;
}

const ChatBot: React.FC<ChatBotProps> = ({ onRecipeGenerated, initialRecipe }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isScalingOpen, setIsScalingOpen] = useState(false);
  const [servingsCount, setServingsCount] = useState(4);
  const [isSubstitutionOpen, setIsSubstitutionOpen] = useState(false);
  const [ingredientToSubstitute, setIngredientToSubstitute] = useState('');
  const [substitutions, setSubstitutions] = useState<{substitution: string, notes: string}[]>([]);
  const [isLoadingSubstitutions, setIsLoadingSubstitutions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Add welcome message when the chat first opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          content: "Hello! I'm your AI Chef assistant. How can I help you with your recipe today? You can ask me to modify ingredients, adjust portions, or suggest alternatives.",
          isUser: false
        }
      ]);
    }
  }, [isOpen, messages.length]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update servings count when initialRecipe changes
  useEffect(() => {
    if (initialRecipe?.servings) {
      const match = initialRecipe.servings.match(/(\d+)/);
      if (match) {
        setServingsCount(parseInt(match[1], 10));
      }
    }
  }, [initialRecipe]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setMessages(prev => [...prev, { content: userMessage, isUser: true }]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await generateChatResponse(userMessage, initialRecipe);
      
      if (response.recipe) {
        setMessages(prev => [...prev, { 
          content: `I've created a new recipe for you: "${response.recipe.title}"`, 
          isUser: false 
        }]);
        
        if (onRecipeGenerated) {
          onRecipeGenerated(response.recipe);
        }
      } else {
        setMessages(prev => [...prev, { content: response.message, isUser: false }]);
      }
    } catch (error) {
      console.error('Error generating chat response:', error);
      setMessages(prev => [...prev, { 
        content: "Sorry, I encountered an error while processing your request. Please try again.", 
        isUser: false 
      }]);
      toast({
        title: 'Error',
        description: 'Failed to generate a response',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChat = () => {
    setIsOpen(prev => !prev);
  };

  const handleScaleRecipe = async () => {
    if (!initialRecipe) {
      toast({
        title: 'No Recipe',
        description: 'There is no recipe to scale',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const scaledRecipe = await scaleRecipe(initialRecipe, servingsCount);
      if (onRecipeGenerated) {
        onRecipeGenerated(scaledRecipe);
        setMessages(prev => [...prev, { 
          content: `I've scaled the recipe to ${servingsCount} servings.`, 
          isUser: false 
        }]);
      }
      setIsScalingOpen(false);
    } catch (error) {
      console.error('Error scaling recipe:', error);
      toast({
        title: 'Error',
        description: 'Failed to scale the recipe',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFindSubstitutions = async () => {
    if (!ingredientToSubstitute.trim()) {
      toast({
        title: 'No Ingredient',
        description: 'Please enter an ingredient to find substitutions',
        variant: 'destructive',
      });
      return;
    }

    setIsLoadingSubstitutions(true);
    try {
      const subs = await generateIngredientSubstitutions(ingredientToSubstitute, initialRecipe);
      setSubstitutions(subs);
      
      // Add as message
      const subsMessage = `Here are some substitutions for ${ingredientToSubstitute}:\n\n` +
        subs.map(sub => `• ${sub.substitution}: ${sub.notes}`).join('\n\n');
      
      setMessages(prev => [...prev, { 
        content: subsMessage, 
        isUser: false 
      }]);
      
      setIsSubstitutionOpen(false);
    } catch (error) {
      console.error('Error finding substitutions:', error);
      toast({
        title: 'Error',
        description: 'Failed to find ingredient substitutions',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingSubstitutions(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <Card className="w-80 sm:w-96 shadow-lg border-recipe-primary/20">
          <CardHeader className="p-3 border-b">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <CardTitle className="text-sm font-medium flex items-center">
                  <ChefHat className="h-5 w-5 mr-2 text-recipe-primary" />
                  AI Chef Assistant
                </CardTitle>
              </div>
              <div className="flex items-center gap-1">
                {initialRecipe && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 rounded-full"
                      >
                        <span className="sr-only">Recipe Tools</span>
                        <span className="text-lg">⋮</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DialogTrigger asChild onClick={() => setIsScalingOpen(true)}>
                        <DropdownMenuItem>
                          <Scale className="h-4 w-4 mr-2" />
                          Scale Recipe
                        </DropdownMenuItem>
                      </DialogTrigger>
                      <DialogTrigger asChild onClick={() => setIsSubstitutionOpen(true)}>
                        <DropdownMenuItem>
                          <Repeat className="h-4 w-4 mr-2" />
                          Find Substitutions
                        </DropdownMenuItem>
                      </DialogTrigger>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 w-7 p-0 rounded-full"
                  onClick={toggleChat}
                >
                  <span className="sr-only">Close</span>
                  <span className="text-lg">×</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[300px] p-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`mb-3 ${
                    msg.isUser ? 'text-right' : 'text-left'
                  }`}
                >
                  <div
                    className={`inline-block rounded-lg px-3 py-2 max-w-[80%] ${
                      msg.isUser
                        ? 'bg-recipe-primary text-white'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                    }`}
                  >
                    {msg.content.split('\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        {i < msg.content.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </ScrollArea>
          </CardContent>
          <CardFooter className="p-3 pt-2 border-t">
            <form onSubmit={handleSubmit} className="flex w-full gap-2">
              <Input
                placeholder="Type your message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
                className="flex-1"
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={isLoading || !inputValue.trim()}
                className="bg-recipe-primary hover:bg-recipe-secondary"
              >
                <Send className="h-4 w-4" />
                <span className="sr-only">Send</span>
              </Button>
            </form>
          </CardFooter>
        </Card>
      ) : (
        <Button 
          onClick={toggleChat}
          className="h-12 w-12 rounded-full bg-recipe-primary hover:bg-recipe-secondary shadow-lg"
        >
          <MessageSquare className="h-5 w-5" />
          <span className="sr-only">Open Chat</span>
        </Button>
      )}
      
      <Dialog open={isScalingOpen} onOpenChange={setIsScalingOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Scale Recipe</DialogTitle>
            <DialogDescription>
              Adjust the number of servings to scale this recipe.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="servings">Servings</Label>
              <Input
                id="servings"
                type="number"
                min="1"
                max="20"
                value={servingsCount}
                onChange={(e) => setServingsCount(parseInt(e.target.value, 10))}
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScalingOpen(false)}>Cancel</Button>
            <Button onClick={handleScaleRecipe} disabled={isLoading}>
              {isLoading ? 'Scaling...' : 'Scale Recipe'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isSubstitutionOpen} onOpenChange={setIsSubstitutionOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Find Ingredient Substitutions</DialogTitle>
            <DialogDescription>
              Enter an ingredient you'd like to substitute.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ingredient">Ingredient</Label>
              <Input
                id="ingredient"
                value={ingredientToSubstitute}
                onChange={(e) => setIngredientToSubstitute(e.target.value)}
                placeholder="e.g., butter, eggs, milk"
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubstitutionOpen(false)}>Cancel</Button>
            <Button onClick={handleFindSubstitutions} disabled={isLoadingSubstitutions}>
              {isLoadingSubstitutions ? 'Finding...' : 'Find Substitutions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatBot;
