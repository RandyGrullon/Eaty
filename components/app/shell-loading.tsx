"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function ShellLoading() {
  return (
    <div className="min-h-screen bg-background p-4 pb-20 sm:p-6 lg:p-10 space-y-10">
      {/* Header Skeleton */}
      <div className="mx-auto max-w-6xl flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-10 w-56 sm:w-72 rounded-lg" />
          <Skeleton className="h-4 w-32 rounded-full" />
        </div>
        <div className="flex gap-2 shrink-0">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <Skeleton className="h-11 w-11 rounded-xl" />
          <Skeleton className="h-11 w-11 rounded-xl" />
        </div>
      </div>

      {/* Main Stats Grid Skeleton */}
      <div className="mx-auto max-w-6xl grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Progress Ring Card */}
        <div className="lg:col-span-5">
           <Skeleton className="h-[380px] w-full rounded-[2.5rem]" />
        </div>
        {/* Right Tiles */}
        <div className="grid grid-cols-2 gap-4 lg:col-span-7">
           <Skeleton className="h-40 w-full rounded-[2rem] col-span-2 sm:col-span-1" />
           <Skeleton className="h-40 w-full rounded-[2rem] col-span-2 sm:col-span-1" />
           <Skeleton className="h-48 w-full rounded-[2.5rem] col-span-2" />
        </div>
      </div>

      {/* Bottom Sections Skeleton */}
      <div className="mx-auto max-w-6xl grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16 mt-12">
        <div className="lg:col-span-7 space-y-6">
          <div className="flex justify-between items-end">
            <div className="space-y-2">
              <Skeleton className="h-8 w-40 rounded-lg" />
              <Skeleton className="h-4 w-64 rounded-full" />
            </div>
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full rounded-3xl" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40 rounded-lg" />
            <Skeleton className="h-4 w-64 rounded-full" />
          </div>
          <Skeleton className="h-64 w-full rounded-[2rem]" />
        </div>
      </div>
    </div>
  );
}
