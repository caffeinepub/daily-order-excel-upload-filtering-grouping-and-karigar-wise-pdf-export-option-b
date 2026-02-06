import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { DailyOrder, KarigarAssignment } from '../backend';
import { ExternalBlob } from '../backend';

export function useGetDailyOrders(date: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<DailyOrder[]>({
    queryKey: ['dailyOrders', date],
    queryFn: async () => {
      if (!actor) throw new Error('Backend not ready');
      return actor.getDailyOrders(date);
    },
    enabled: !!actor && !actorFetching && !!date,
  });
}

export function useStoreDailyOrders() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, orders }: { date: string; orders: DailyOrder[] }) => {
      if (!actor) throw new Error('Backend not ready. Please wait and try again.');
      return actor.storeDailyOrders(date, orders);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dailyOrders', variables.date] });
      // Persist the date to session storage for Order List tab sync
      sessionStorage.setItem('lastUploadDate', variables.date);
    },
  });
}

export function useGetKarigarAssignments(date: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<KarigarAssignment[]>({
    queryKey: ['karigarAssignments', date],
    queryFn: async () => {
      if (!actor) throw new Error('Backend not ready');
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
      if (!actor) throw new Error('Backend not ready. Please wait and try again.');
      return actor.assignKarigar(date, orderIds, karigar, factory);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['karigarAssignments', variables.date] });
    },
  });
}

export function useRemoveOrders() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, orderIds }: { date: string; orderIds: string[] }) => {
      if (!actor) throw new Error('Backend not ready. Please wait and try again.');
      
      // Get current orders and assignments
      const currentOrders = await actor.getDailyOrders(date);
      const currentAssignments = await actor.getKarigarAssignments(date);
      
      // Filter out the orders to remove
      const remainingOrders = currentOrders.filter((o) => !orderIds.includes(o.orderNo));
      
      // Store the remaining orders (this replaces the entire list)
      await actor.storeDailyOrders(date, remainingOrders);
      
      // Re-assign karigars for remaining orders only
      const remainingOrderIds = new Set(remainingOrders.map((o) => o.orderNo));
      const assignmentsByKarigar = new Map<string, { orderIds: string[]; factory: string | null }>();
      
      currentAssignments.forEach((assignment) => {
        if (remainingOrderIds.has(assignment.orderId)) {
          const key = `${assignment.karigar}|${assignment.factory || ''}`;
          if (!assignmentsByKarigar.has(key)) {
            assignmentsByKarigar.set(key, { orderIds: [], factory: assignment.factory || null });
          }
          assignmentsByKarigar.get(key)!.orderIds.push(assignment.orderId);
        }
      });
      
      // Clear all assignments first by storing empty orders temporarily
      await actor.storeDailyOrders(date, []);
      await actor.storeDailyOrders(date, remainingOrders);
      
      // Re-apply assignments for remaining orders
      for (const [key, { orderIds: ids, factory }] of assignmentsByKarigar.entries()) {
        const karigar = key.split('|')[0];
        await actor.assignKarigar(date, ids, karigar, factory);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dailyOrders', variables.date] });
      queryClient.invalidateQueries({ queryKey: ['karigarAssignments', variables.date] });
    },
  });
}

export function useGetKarigarMappingWorkbook() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<ExternalBlob | null>({
    queryKey: ['karigarMappingWorkbook'],
    queryFn: async () => {
      if (!actor) throw new Error('Backend not ready');
      return actor.getKarigarMappingWorkbook();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useSaveKarigarMappingWorkbook() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (blob: ExternalBlob) => {
      if (!actor) throw new Error('Backend not ready. Please wait and try again.');
      return actor.saveKarigarMappingWorkbook(blob);
    },
    onSuccess: () => {
      // Invalidate both the stored mapping blob and the derived decoded lookup
      queryClient.invalidateQueries({ queryKey: ['karigarMappingWorkbook'] });
      queryClient.invalidateQueries({ queryKey: ['decodedMappingLookup'] });
    },
  });
}
