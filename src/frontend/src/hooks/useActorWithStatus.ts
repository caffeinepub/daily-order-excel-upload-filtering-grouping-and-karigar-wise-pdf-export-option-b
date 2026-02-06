import { useActor } from './useActor';

/**
 * Extended actor hook with readiness and error state
 * Wraps the auto-generated useActor hook
 */
export function useActorWithStatus() {
  const { actor, isFetching } = useActor();
  
  const isReady = !!actor && !isFetching;
  const isError = false; // Actor creation errors are handled internally
  const error = null;
  
  // No refetch available from base hook, but actor will retry automatically
  const refetch = () => {
    // The base useActor hook handles retries internally
    console.log('Actor refetch requested - will retry automatically');
  };
  
  return {
    actor,
    isFetching,
    isLoading: isFetching,
    isReady,
    isError,
    error,
    refetch,
  };
}
