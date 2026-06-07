import { useEffect, useState } from 'react';

export function useSearch({ debounceMs = 300 } = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), debounceMs);
    return () => clearTimeout(timer);
  }, [searchQuery, debounceMs]);

  return {
    searchQuery,
    setSearchQuery,
    debouncedQuery,
  };
}
