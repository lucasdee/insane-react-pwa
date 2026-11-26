import { useQuery } from '@tanstack/react-query';
import { searchUsers } from '../api/users';
import { useDebouncedValue } from './useDebouncedValue';

export const USER_SEARCH_DEBOUNCE_MS = 300;
export const USER_SEARCH_LIMIT = 10;

/**
 * Other users matching `text` (username or display name), searched once typing
 * pauses. Nothing is searched for empty text.
 */
export const useUserSearch = (text: string) => {
  const search = useDebouncedValue(text.trim().slice(0, 64), USER_SEARCH_DEBOUNCE_MS);
  const query = useQuery({
    queryKey: ['users', search],
    queryFn: ({ signal }) => searchUsers({ search, limit: USER_SEARCH_LIMIT }, signal),
    enabled: search.length > 0,
    staleTime: 60_000,
  });
  return { ...query, search };
};
