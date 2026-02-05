import { useState, useMemo } from 'react';
import type { ParsedOrder } from '../excel/parseDailyOrders';

export function useOrderFilters(orders: ParsedOrder[]) {
  const [searchText, setSearchText] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Search filter
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.orderNo.toLowerCase().includes(search) ||
          order.design.toLowerCase().includes(search) ||
          order.remarks.toLowerCase().includes(search)
      );
    }

    // Sort by design
    filtered = [...filtered].sort((a, b) => {
      const comparison = a.design.localeCompare(b.design);
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [orders, searchText, sortOrder]);

  return {
    filteredOrders,
    searchText,
    setSearchText,
    sortOrder,
    setSortOrder,
  };
}
