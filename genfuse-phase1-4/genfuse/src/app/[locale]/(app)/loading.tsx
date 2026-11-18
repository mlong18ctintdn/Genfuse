import { Skeleton } from '@/components/ui/skeleton';

/** Suspense fallback for every page in the app shell: the layout is already on screen while the page streams in. */
export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="space-y-5">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-5 w-1/2" />
      <div className="grid gap-4 pt-4 sm:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}
