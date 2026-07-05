import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser, googleLogin, login, logout as logoutApi, register, updateProfile } from "../api/auth";
import { useAuthStore } from "../store/auth";

function useCurrentUser() {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
    enabled: Boolean(user)
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

  const googleLoginMutation = useMutation({
    mutationFn: googleLogin,
    onSuccess: (data) => {
      setAuth(data);
      queryClient.setQueryData(["current-user"], data.user);
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      setUser(data);
      queryClient.setQueryData(["current-user"], data);
    }
  });

  const logout = async () => {
    await logoutApi().catch(() => {});
    clearAuth();
    setUser(null);
    queryClient.clear();
  };

  return {
    currentUser,
    loginMutation,
    registerMutation,
    googleLoginMutation,
    updateProfileMutation,
    logout
  };
}
