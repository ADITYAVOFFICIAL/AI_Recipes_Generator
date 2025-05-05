
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface RecipeSearchProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
  className?: string;
  placeholder?: string;
}

const RecipeSearch = ({ 
  onSearch, 
  initialQuery = '', 
  className = '',
  placeholder = 'Search recipes...'
}: RecipeSearchProps) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  
  // Update local state when initialQuery changes (e.g. from URL parameters)
  useEffect(() => {
    setSearchQuery(initialQuery);
  }, [initialQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery.trim());
  };

  const clearSearch = () => {
    setSearchQuery('');
    onSearch('');
  };

  return (
    <form onSubmit={handleSearch} className={`flex gap-2 w-full ${className}`}>
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 w-full"
        />
        {searchQuery && (
          <button 
            type="button"
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <Button type="submit" variant="default">Search</Button>
    </form>
  );
};

export default RecipeSearch;
