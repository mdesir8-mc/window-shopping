import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTag, deleteTag, listTags, patchTag } from "../api/tags";

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: listTags
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    }
  });
}

export function usePatchTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, color }: { name: string; color?: string | null }) => patchTag(name, { color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    }
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["closets"] });
    }
  });
}
