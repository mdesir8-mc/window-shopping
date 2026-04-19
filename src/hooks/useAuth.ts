import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser, login, register } from "../api/auth";
import { useAuthStore } from "../store/auth";

export function useCurrentUser() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
    enabled: Boolean(token)
  });
}

export function useAuth() {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const setUser = useAuthStore((state) => state.setUser);
  const currentUser = useCurrentUser();

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setAuth(data);
      queryClient.setQueryData(["current-user"], data.user);
    }
  });

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: (data) => {
      setAuth(data);
      queryClient.setQueryData(["current-user"], data.user);
    }
  });

  const logout = () => {
    clearAuth();
    setUser(null);
    queryClient.clear();
  };

  return {
    currentUser,
    loginMutation,
    registerMutation,
    logout
  };
}
