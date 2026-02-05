import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { UserProfile, Order, KarigarAssignment } from '../backend';

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

export function useGetDailyOrders(date: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Order[]>({
    queryKey: ['dailyOrders', date],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getDailyOrders(date);
    },
    enabled: !!actor && !actorFetching && !!date,
  });
}

export function useStoreDailyOrders() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, orders }: { date: string; orders: Order[] }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.storeDailyOrders(date, orders);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dailyOrders', variables.date] });
    },
  });
}

export function useGetKarigarAssignments(date: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<KarigarAssignment[]>({
    queryKey: ['karigarAssignments', date],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getKarigarAssignments(date);
    },
    enabled: !!actor && !actorFetching && !!date,
  });
}

export function useAssignKarigar() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      date,
      orderIds,
      karigar,
      factory,
    }: {
      date: string;
      orderIds: string[];
      karigar: string;
      factory: string | null;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.assignKarigar(date, orderIds, karigar, factory);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['karigarAssignments', variables.date] });
    },
  });
}
