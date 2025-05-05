// src/pages/LandingPage.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button"; // ShadCN Button
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // ShadCN Card
import { useAuth } from '@/hooks/useAuth'; // Auth context
import {
  ChefHat,
  Sparkles, // For AI/Magic
  Settings,
  ListChecks, // More descriptive than List
  Save,
  HeartHandshake, // For Dietary Needs
  BrainCircuit, // For Smart AI
  Clock, // For Time Saving
  Recycle, // For Reducing Waste
  MessageSquareQuote, // For Testimonials
  ArrowRight, // For CTAs
} from 'lucide-react';
import { Separator } from '@/components/ui/separator'; // ShadCN Separator

const LandingPage: React.FC = () => {
  const { currentUser } = useAuth(); // Check if user is logged in

  return (
    <div className="bg-gradient-to-b from-white via-recipe-light/20 to-white dark:from-gray-950 dark:via-gray-900/50 dark:to-gray-950">
      <div className="container mx-auto px-4 pt-12 pb-16 md:pt-20 md:pb-24">

        {/* --- Hero Section --- */}
        <section className="text-center mb-20 md:mb-28">
          <div className="max-w-4xl mx-auto">
            {/* Optional: Small badge above title */}
            <span className="inline-block bg-recipe-light text-recipe-primary dark:bg-gray-800 dark:text-recipe-accent px-3 py-1 rounded-full text-sm font-medium mb-4">
              Powered by AI
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 text-gray-900 dark:text-white tracking-tight">
              Unlock Your Inner Chef with <span className="block md:inline bg-clip-text text-transparent bg-gradient-to-r from-recipe-primary to-recipe-secondary">AI Recipes</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto">
              Stop staring at your fridge! Turn leftover ingredients into delicious, personalized meals.
              Our AI chef adapts to your tastes, dietary needs, and pantry stock in seconds.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <Button asChild size="lg" className="bg-recipe-primary hover:bg-recipe-secondary text-white shadow-lg transition-transform duration-200 hover:scale-105 w-full sm:w-auto">
                {/* Link to the generator page directly */}
                <Link to="/create">
                  Generate Recipe Now <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 w-full sm:w-auto transition-colors">
                <a href="#how-it-works">Learn How It Works</a>
              </Button>
            </div>
          </div>
        </section>

        <Separator className="my-16 md:my-24" />

        {/* --- How It Works Section --- */}
        <section id="how-it-works" className="mb-20 md:mb-28">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-900 dark:text-white">
              Simple Steps to Delicious Meals
            </h2>
            <p className="text-center text-lg mb-12 md:mb-16 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Follow our easy process to get custom recipes perfectly suited for you.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {/* Step Cards */}
              {[
                { icon: BrainCircuit, title: "List Ingredients", description: "Tell our AI what you have available in your kitchen – leftovers welcome!" },
                { icon: Settings, title: "Set Preferences", description: "Specify dietary needs, cuisine style, cooking time, skill level, and more." },
                { icon: Sparkles, title: "AI Generates", description: "Our intelligent chef analyzes your input and crafts a unique, creative recipe." },
                { icon: Save, title: "Cook & Save", description: "Get clear instructions. Logged-in users can save favorites to their collection." }
              ].map((step, index) => (
                <Card key={index} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col">
                  <CardHeader className="items-center text-center pb-3">
                     <div className="mb-3 inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-recipe-light to-white border border-recipe-primary/20 dark:from-gray-800 dark:to-gray-900 dark:border-recipe-accent/20">
                       <step.icon className="h-6 w-6 text-recipe-primary dark:text-recipe-accent" />
                     </div>
                     <CardTitle className="text-lg font-semibold">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center text-sm text-gray-600 dark:text-gray-400 flex-grow">
                    <p>{step.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

             <div className="flex justify-center mt-12">
                <Button asChild size="lg" variant="link" className="text-recipe-primary dark:text-recipe-accent hover:underline">
                    <Link to="/create">
                        Start Generating <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </div>
          </div>
        </section>

        <Separator className="my-16 md:my-24" />

        {/* --- Features / Benefits Section --- */}
        <section className="mb-20 md:mb-28">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-900 dark:text-white">
              Your Smart Cooking Companion
            </h2>
             <p className="text-center text-lg mb-12 md:mb-16 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Discover the advantages of cooking with AI by your side.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
              {[
                { icon: Recycle, title: "Reduce Food Waste", description: "Cleverly use up ingredients you already have, minimizing spoilage and saving money." },
                { icon: HeartHandshake, title: "Personalized Nutrition", description: "Easily cater to dietary restrictions like vegan, gluten-free, keto, allergies, and more." },
                { icon: ChefHat, title: "Explore New Cuisines", description: "Break out of your routine! Discover exciting recipes from various global cuisines based on your ingredients." },
                { icon: Clock, title: "Save Time & Effort", description: "Get recipe ideas instantly without endless searching. Clear instructions make cooking faster." },
                { icon: BrainCircuit, title: "AI-Powered Creativity", description: "Leverages advanced AI (like Google's Gemini) to suggest innovative ingredient pairings and techniques." },
                { icon: ListChecks, title: "Step-by-Step Guidance", description: "Receive clear, easy-to-follow instructions suitable for your chosen skill level." }
              ].map((feature, index) => (
                 <div key={index} className="flex flex-col items-center text-center p-4">
                    <div className="mb-4 inline-flex items-center justify-center w-14 h-14 rounded-full bg-recipe-light dark:bg-gray-800">
                       <feature.icon className="h-7 w-7 text-recipe-primary dark:text-recipe-accent" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{feature.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{feature.description}</p>
                 </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- Final Call to Action --- */}
        <section className="text-center mt-16">
           <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900 dark:text-white">Ready to Innovate Your Meals?</h2>
           <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-xl mx-auto">
             Join thousands of home cooks discovering the joy of effortless, personalized cooking.
           </p>
           <Button asChild size="lg" className="bg-recipe-primary hover:bg-recipe-secondary text-white shadow-lg transition-transform duration-200 hover:scale-105">
             {currentUser ? (
               <Link to="/create">Generate a Recipe</Link> // Link to generator if logged in
             ) : (
               <Link to="/signup">Sign Up For Free</Link> // Link to signup if logged out
             )}
           </Button>
           {!currentUser && (
             <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
               Already have an account? <Link to="/login" className="text-recipe-primary hover:underline font-medium">Log In</Link>
             </p>
           )}
        </section>

      </div>
    </div>
  );
};

export default LandingPage;