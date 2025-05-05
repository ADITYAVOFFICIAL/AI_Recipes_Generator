
import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="text-center max-w-md">
        <ChefHat className="h-16 w-16 mx-auto text-recipe-primary mb-4" />
        <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-white">404</h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
          Oops! This page seems to be missing from our recipe book
        </p>
        <Button asChild className="bg-recipe-primary hover:bg-recipe-secondary">
          <Link to="/">
            Return to Kitchen
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
