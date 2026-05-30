import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createItem,
  deleteItem,
  favoriteItem,
  getItem,
  listItems,
  moveItem,
  parseUrl,
  patchItem,
  refreshItem,
  refreshStaleItems
} from "../api/items";
import type { Item, ItemFilters, ItemPayload } from "../types";

function itemMatchesFilters(item: Item, filters: ItemFilters) {
  if (filters.closetId && item.closetId !== filters.closetId) {
    return false;
  }

  if (filters.sectionId && item.sectionId !== filters.sectionId) {
    return false;
  }

  if (filters.season && item.season !== filters.season) {
    return false;
  }

  if (filters.search) {
    const haystack = [item.brand, item.name, item.description ?? "", item.tags.join(" ")]
      .join(" ")
      .toLowerCase();

    if (!haystack.includes(filters.search.toLowerCase())) {
      return false;
    }
  }

  return true;
}

function patchItemInLists(queryClient: ReturnType<typeof useQueryClient>, updater: (item: Item) => Item) {
  const cache = queryClient.getQueryCache().findAll({ queryKey: ["items"] });

  for (const entry of cache) {
    queryClient.setQueryData<Item[] | Item | undefined>(entry.queryKey, (current) => {
      if (Array.isArray(current)) {
        return current.map((item) => updater(item));
      }

      if (current && "id" in current) {
        return updater(current);
      }

      return current;
    });
  }
}

export function useItems(filters: ItemFilters = {}) {
  return useQuery({
    queryKey: ["items", filters],
    queryFn: () => listItems(filters)
  });
}

export function useItem(id?: string) {
  return useQuery({
    queryKey: ["items", "detail", id],
    queryFn: () => getItem(id as string),
    enabled: Boolean(id)
  });
}

export function useParseUrl() {
  return useMutation({
    mutationFn: parseUrl
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ItemPayload) => createItem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["closets"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
    }
  });
}

export function usePatchItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ItemPayload> }) => patchItem(id, payload),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.setQueryData(["items", "detail", item.id], item);
      queryClient.invalidateQueries({ queryKey: ["closets"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    }
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["closets"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
    }
  });
}

export function useFavoriteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: favoriteItem,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["items"] });
      await queryClient.cancelQueries({ queryKey: ["items", "detail", id] });

      patchItemInLists(queryClient, (item) =>
        item.id === id ? { ...item, favorited: !item.favorited } : item
      );
    },
    onSuccess: (result, id) => {
      queryClient.setQueryData<Item | undefined>(["items", "detail", id], (current) =>
        current ? { ...current, favorited: result.favorited } : current
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    }
  });
}

export function useRefreshItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: refreshItem,
    onSuccess: (item) => {
      queryClient.setQueryData(["items", "detail", item.id], item);
      patchItemInLists(queryClient, (entry) => entry.id === item.id ? item : entry);
    }
  });
}

export function useRefreshStaleItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: refreshStaleItems,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    }
  });
}

export function useMoveItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, closetId, sectionId }: { id: string; closetId: string; sectionId?: string | null }) =>
      moveItem(id, { closetId, sectionId }),
    onSuccess: (item) => {
      queryClient.setQueryData(["items", "detail", item.id], item);
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["closets"] });
    }
  });
}

export function useOptimisticTagUpdate() {
  const queryClient = useQueryClient();
  const patchMutation = usePatchItem();

  async function updateItemTags(item: Item, nextTags: string[]) {
    await queryClient.cancelQueries({ queryKey: ["items"] });
    await queryClient.cancelQueries({ queryKey: ["items", "detail", item.id] });

    patchItemInLists(queryClient, (entry) =>
      entry.id === item.id ? { ...entry, tags: nextTags } : entry
    );

    queryClient.setQueryData<Item | undefined>(["items", "detail", item.id], (current) =>
      current ? { ...current, tags: nextTags } : current
    );

    await patchMutation.mutateAsync({
      id: item.id,
      payload: { tags: nextTags }
    });
  }

  return { updateItemTags, isPending: patchMutation.isPending };
}

export function filterItems(items: Item[], filters: ItemFilters) {
  return items.filter((item) => itemMatchesFilters(item, filters));
}
