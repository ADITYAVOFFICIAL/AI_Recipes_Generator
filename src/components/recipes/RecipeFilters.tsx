
import React, { useState } from 'react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Filter, X } from 'lucide-react';

export type RecipeFilterOptions = {
  difficulty?: string;
  sortBy?: string;
};

interface RecipeFiltersProps {
  onApplyFilters: (filters: RecipeFilterOptions) => void;
}

const RecipeFilters = ({ onApplyFilters }: RecipeFiltersProps) => {
  const [filters, setFilters] = useState<RecipeFilterOptions>({});
  const [isExpanded, setIsExpanded] = useState(false);
  
  const handleFilterChange = (key: keyof RecipeFilterOptions, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const handleApply = () => {
    onApplyFilters(filters);
  };
  
  const handleReset = () => {
    setFilters({});
    onApplyFilters({});
  };

  const activeFiltersCount = Object.keys(filters).filter(key => 
    filters[key as keyof RecipeFilterOptions] !== undefined
  ).length;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <Button 
          variant="outline" 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2">{activeFiltersCount}</Badge>
          )}
        </Button>
        
        {activeFiltersCount > 0 && (
          <Button 
            variant="ghost" 
            onClick={handleReset} 
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            <X className="h-4 w-4 mr-1" />
            Clear all
          </Button>
        )}
      </div>
      
      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg mb-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Difficulty</label>
            <Select
              value={filters.difficulty}
              onValueChange={value => handleFilterChange('difficulty', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any difficulty</SelectItem>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Sort By</label>
            <Select
              value={filters.sortBy}
              onValueChange={value => handleFilterChange('sortBy', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Newest first" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="alphabetical">Alphabetical (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-end">
            <Button onClick={handleApply} className="w-full">Apply Filters</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeFilters;
