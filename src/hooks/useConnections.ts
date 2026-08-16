import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listConnections, revokeConnection } from "../api/connections";

export function useConnections(enabled = true) {
  return useQuery({
    queryKey: ["connections"],
    queryFn: listConnections,
    enabled
  });
}

export function useRevokeConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revokeConnection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] });
    }
  });
}
