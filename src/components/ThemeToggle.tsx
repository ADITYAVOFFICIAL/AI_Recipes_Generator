// src/components/ThemeToggle.tsx
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button"; // Assuming Shadcn/ui Button
import { useTheme } from "@/hooks/useTheme"; // Assuming ThemeContext path
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Assuming Shadcn/ui Tooltip

export function ThemeToggle() {
  // Use your theme context hook
  const { theme, toggleTheme } = useTheme();

  // Determine the label for the next theme state
  const nextThemeLabel = theme === "light" ? "dark" : "light";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon" // Use standard icon size from your UI lib
            onClick={toggleTheme}
            aria-label={`Switch to ${nextThemeLabel} mode`} // Dynamic aria-label
          >
            {/* Sun icon: Visible in dark mode, transitions out */}
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            {/* Moon icon: Visible in light mode, transitions out */}
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {/* Tooltip reflects the action */}
          <p>Switch to {nextThemeLabel} mode</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ThemeToggle; // Default export if preferred