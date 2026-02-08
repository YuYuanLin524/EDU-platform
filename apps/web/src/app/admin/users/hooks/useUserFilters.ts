"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { UserRole, AdminUserListItem } from "../types";

interface UseUserFiltersReturn {
  roleFilter: UserRole | "all";
  setRoleFilter: (role: UserRole | "all") => void;
  searchText: string;
  setSearchText: (text: string) => void;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  usersQuery: ReturnType<typeof useQuery>;
  filteredUsers: AdminUserListItem[];
  totalUsers: number;
  totalPages: number;
  queryClient: QueryClient;
}

export function useUserFilters(): UseUserFiltersReturn {
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const usersQuery = useQuery({
    queryKey: ["adminUsers", roleFilter, page, pageSize],
    queryFn: () => api.listUsers(roleFilter === "all" ? undefined : roleFilter, page, pageSize),
  });

  const users = useMemo(() => (usersQuery.data?.items ?? []) as AdminUserListItem[], [usersQuery.data]);
  const totalUsers = usersQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));

  // Memoize filtered users to prevent unnecessary recalculations
  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    if (!normalizedSearch) return users;
    
    return users.filter((u) => {
      const displayName = (u.display_name ?? "").toLowerCase();
      const username = u.username.toLowerCase();
      return username.includes(normalizedSearch) || displayName.includes(normalizedSearch);
    });
  }, [users, searchText]);

  return {
    roleFilter,
    setRoleFilter,
    searchText,
    setSearchText,
    page,
    setPage,
    pageSize,
    setPageSize,
    usersQuery,
    filteredUsers,
    totalUsers,
    totalPages,
    queryClient,
  };
}
