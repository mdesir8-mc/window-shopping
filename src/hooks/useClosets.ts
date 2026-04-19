import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCloset,
  createSection,
  deleteCloset,
  deleteSection,
  getCloset,
  listClosets,
  patchCloset,
  patchSection
} from "../api/closets";
import type { ClosetPayload, SectionPayload } from "../types";

export function useClosets() {
  return useQuery({
    queryKey: ["closets"],
    queryFn: listClosets
  });
}

export function useCloset(id?: string) {
  return useQuery({
    queryKey: ["closets", id],
    queryFn: () => getCloset(id as string),
    enabled: Boolean(id)
  });
}

export function useCreateCloset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ClosetPayload) => createCloset(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["closets"] });
    }
  });
}

export function usePatchCloset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ClosetPayload> }) =>
      patchCloset(id, payload),
    onSuccess: (closet) => {
      queryClient.invalidateQueries({ queryKey: ["closets"] });
      queryClient.setQueryData(["closets", closet.id], closet);
    }
  });
}

export function useDeleteCloset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCloset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["closets"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    }
  });
}

export function useSections(closetId?: string) {
  const closetQuery = useCloset(closetId);

  return {
    ...closetQuery,
    data: closetQuery.data?.sections ?? []
  };
}

export function useCreateSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ closetId, payload }: { closetId: string; payload: SectionPayload }) =>
      createSection(closetId, payload),
    onSuccess: (_section, variables) => {
      queryClient.invalidateQueries({ queryKey: ["closets"] });
      queryClient.invalidateQueries({ queryKey: ["closets", variables.closetId] });
    }
  });
}

export function usePatchSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      closetId,
      sectionId,
      payload
    }: {
      closetId: string;
      sectionId: string;
      payload: Partial<SectionPayload>;
    }) => patchSection(closetId, sectionId, payload),
    onSuccess: (_section, variables) => {
      queryClient.invalidateQueries({ queryKey: ["closets"] });
      queryClient.invalidateQueries({ queryKey: ["closets", variables.closetId] });
    }
  });
}

export function useDeleteSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      closetId,
      sectionId,
      deleteItems
    }: {
      closetId: string;
      sectionId: string;
      deleteItems?: boolean;
    }) => deleteSection(closetId, sectionId, deleteItems),
    onSuccess: (_section, variables) => {
      queryClient.invalidateQueries({ queryKey: ["closets"] });
      queryClient.invalidateQueries({ queryKey: ["closets", variables.closetId] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    }
  });
}
