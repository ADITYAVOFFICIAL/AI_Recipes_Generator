
import { useAuth } from '@/hooks/useAuth';
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { User, LogOut, PlusCircle, BookMarked, Home, ChefHat, CircleUser, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useMediaQuery } from "@/hooks/use-mobile";
import ThemeToggle from "./ThemeToggle";

const Header = () => {
  const { currentUser, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const location = useLocation();
  
  // Close mobile menu when changing routes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);
  
  // Close mobile menu when window resizes from mobile to desktop
  useEffect(() => {
    if (!isMobile) {
      setMobileMenuOpen(false);
    }
  }, [isMobile]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navItems = [
    {
      name: "Home",
      path: "/",
      icon: <Home className="h-4 w-4" />,
      showAlways: true
    },
    {
      name: "Create Recipe",
      path: "/create",
      icon: <PlusCircle className="h-4 w-4" />,
      requiresAuth: true
    },
    {
      name: "My Ingredients",
      path: "/ingredients",
      icon: <ChefHat className="h-4 w-4" />,
      requiresAuth: true
    },
    {
      name: "My Recipes",
      path: "/my-recipes",
      icon: <BookMarked className="h-4 w-4" />,
      requiresAuth: true
    },
    {
      name: "Profile",
      path: "/profile",
      icon: <CircleUser className="h-4 w-4" />,
      requiresAuth: true
    }
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-1">
          <Link to="/" className="flex items-center gap-2">
            <ChefHat className="h-8 w-8 text-recipe-primary dark:text-recipe-accent" />
            <span className="text-xl font-bold text-gray-900 dark:text-gray-100">AI Recipe Generator</span>
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1">
          {navItems
            .filter(item => item.showAlways || (item.requiresAuth ? currentUser : true))
            .map(item => (
              <Button
                key={item.path}
                variant={isActive(item.path) ? "default" : "ghost"}
                size="sm"
                asChild
                className="flex items-center gap-2"
              >
                <Link to={item.path}>
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              </Button>
            ))}
          
          {/* Theme toggle */}
          <ThemeToggle />
          
          {/* Auth buttons */}
          {currentUser ? (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="flex items-center gap-2"
              >
                <Link to="/login">
                  <User className="h-4 w-4" />
                  <span>Login</span>
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </nav>
        
        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? 
              <X className="h-5 w-5" /> : 
              <Menu className="h-5 w-5" />
            }
          </Button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          <nav className="flex flex-col p-4 space-y-3">
            {navItems
              .filter(item => item.showAlways || (item.requiresAuth ? currentUser : true))
              .map(item => (
                <Link 
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-2 rounded-md ${
                    isActive(item.path)
                      ? "bg-recipe-primary/10 text-recipe-primary dark:bg-recipe-accent/10 dark:text-recipe-accent"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              ))}
            
            {/* Auth links */}
            {currentUser ? (
              <button 
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            ) : (
              <>
                <Link 
                  to="/login"
                  className="flex items-center gap-3 px-4 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <User className="h-4 w-4" />
                  <span>Login</span>
                </Link>
                <Link 
                  to="/signup"
                  className="flex items-center gap-3 px-4 py-2 rounded-md bg-recipe-primary text-white dark:bg-recipe-accent"
                >
                  <span>Sign Up</span>
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
