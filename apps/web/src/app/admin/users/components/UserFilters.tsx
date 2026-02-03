"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw } from "lucide-react";
import { UserRole } from "@/lib/api";
import { QueryClient } from "@tanstack/react-query";

interface UserFiltersProps {
  roleFilter: UserRole | "all";
  setRoleFilter: (value: UserRole | "all") => void;
  searchText: string;
  setSearchText: (value: string) => void;
  pageSize: number;
  setPageSize: (value: number) => void;
  setPage: (value: number) => void;
  queryClient: QueryClient;
}

export function UserFilters({
  roleFilter,
  setRoleFilter,
  searchText,
  setSearchText,
  pageSize,
  setPageSize,
  setPage,
  queryClient,
}: UserFiltersProps) {
  return (
    <div className="flex items-end gap-3 flex-wrap mb-4">
      <div className="w-40">
        <Label className="mb-1 block">角色筛选</Label>
        <Select
          value={roleFilter}
          onValueChange={(value) => {
            setRoleFilter(value as UserRole | "all");
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="student">学生</SelectItem>
            <SelectItem value="teacher">教师</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1 min-w-[220px]">
        <Label className="mb-1 block">搜索</Label>
        <Input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="按学号/工号或姓名搜索（当前页）"
        />
      </div>
      <div className="w-36">
        <Label className="mb-1 block">每页数量</Label>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => {
            setPageSize(parseInt(value, 10));
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => queryClient.invalidateQueries({ queryKey: ["adminUsers"] })}
      >
        <RefreshCw size={14} className="mr-1" />
        刷新
      </Button>
    </div>
  );
}
