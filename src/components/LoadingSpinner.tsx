
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md',
  className = '',
  text
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };
  
  return (
    <div className={`flex flex-col justify-center items-center ${className}`}>
      <div className={`${sizeClasses[size]} border-4 border-t-4 border-gray-200 dark:border-gray-700 border-t-recipe-primary dark:border-t-recipe-accent rounded-full animate-spin-slow`} />
      {text && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
