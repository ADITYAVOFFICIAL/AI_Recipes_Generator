
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface RecipeSkeletonProps {
  type?: 'card' | 'detail';
}

export const RecipeSkeleton: React.FC<RecipeSkeletonProps> = ({ type = 'card' }) => {
  if (type === 'card') {
    return (
      <Card className="overflow-hidden">
        <div className="relative aspect-video w-full">
          <Skeleton className="h-full w-full" />
        </div>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-3/4 mb-1" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="pb-2">
          <div className="flex gap-2 mb-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
        <CardFooter className="pt-0">
          <div className="w-full flex justify-between">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </CardFooter>
      </Card>
    );
  }
  
  // Detail/full recipe skeleton
  return (
    <Card className="w-full max-w-3xl mx-auto overflow-hidden">
      <CardHeader>
        <Skeleton className="h-8 w-3/4 mb-2" />
        <Skeleton className="h-5 w-2/3" />
        <div className="flex flex-wrap gap-2 mt-4">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-16" />
        </div>
      </CardHeader>
      
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Skeleton className="h-6 w-24 mb-3" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-5/6" />
            <Skeleton className="h-5 w-4/6" />
            <Skeleton className="h-5 w-5/6" />
            <Skeleton className="h-5 w-3/6" />
          </div>
        </div>
        
        <div className="md:col-span-2">
          <Skeleton className="h-6 w-28 mb-3" />
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
              <Skeleton className="h-5 w-full" />
            </div>
            <div className="flex items-start gap-3">
              <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
              <Skeleton className="h-5 w-full" />
            </div>
            <div className="flex items-start gap-3">
              <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
              <Skeleton className="h-5 w-full" />
            </div>
          </div>
          
          <Skeleton className="h-6 w-32 mt-6 mb-2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6 mt-1" />
        </div>
      </CardContent>
      
      <CardFooter className="justify-end gap-3">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-40" />
      </CardFooter>
    </Card>
  );
};

export default RecipeSkeleton;
