import { useEffect, useRef } from 'react';

export function useInfiniteScroll({
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: {
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ fetchNextPage, isFetchingNextPage });
  stateRef.current = { fetchNextPage, isFetchingNextPage };

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !stateRef.current.isFetchingNextPage) {
          stateRef.current.fetchNextPage();
        }
      },
      { rootMargin: '300px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage]);

  return sentinelRef;
}
