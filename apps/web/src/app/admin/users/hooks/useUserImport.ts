"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { UserToImport, ImportResponse, UserRole, ClassInfo } from "../types";

interface UseUserImportReturn {
  // Import method state
  importMethod: "form" | "json";
  setImportMethod: (method: "form" | "json") => void;
  
  // Form state
  formUsers: UserToImport[];
  setFormUsers: React.Dispatch<React.SetStateAction<UserToImport[]>>;
  formValidUsers: UserToImport[];
  formHasStudentWithoutClass: boolean;
  formCannotCreateStudentsNoClass: boolean;
  showNoClassWarning: boolean;
  hasStudents: boolean;
  
  // JSON state
  jsonInput: string;
  setJsonInput: (input: string) => void;
  
  // Results
  importResults: ImportResponse | null;
  setImportResults: (results: ImportResponse | null) => void;
  
  // Classes for validation
  classes: ClassInfo[];
  
  // Handlers
  handleAddFormUser: () => void;
  handleRemoveFormUser: (index: number) => void;
  handleFormUserChange: (index: number, field: keyof UserToImport, value: string) => void;
  handleFormSubmit: () => void;
  handleJsonSubmit: () => void;
  handleDownloadTemplate: () => void;
  handleDownloadResults: () => void;
  
  // Mutation
  importMutation: ReturnType<typeof useMutation>;
}

export function useUserImport(): UseUserImportReturn {
  const queryClient = useQueryClient();
  
  const [importMethod, setImportMethod] = useState<"form" | "json">("form");
  const [jsonInput, setJsonInput] = useState("");
  const [formUsers, setFormUsers] = useState<UserToImport[]>([
    { username: "", display_name: "", role: "student", class_name: "" },
  ]);
  const [importResults, setImportResults] = useState<ImportResponse | null>(null);

  // Fetch classes for validation
  const { data: classesData } = useQuery({
    queryKey: ["classes", "admin"],
    queryFn: () => api.getClasses(0, 100),
  });

  const classes = (classesData?.items || []) as ClassInfo[];

  // Computed values - memoized to prevent unnecessary recalculations
  const hasStudents = useMemo(
    () => formUsers.some((u) => u.role === "student"),
    [formUsers]
  );
  const showNoClassWarning = useMemo(
    () => hasStudents && classes.length === 0,
    [hasStudents, classes.length]
  );
  const formValidUsers = useMemo(
    () => formUsers.filter((u) => u.username.trim()),
    [formUsers]
  );
  const formHasStudentWithoutClass = useMemo(
    () => formValidUsers.some((u) => u.role === "student" && !String(u.class_name || "").trim()),
    [formValidUsers]
  );
  const formCannotCreateStudentsNoClass = useMemo(
    () => classes.length === 0 && formValidUsers.some((u) => u.role === "student"),
    [classes.length, formValidUsers]
  );

  const importMutation = useMutation({
    mutationFn: (users: UserToImport[]) => api.bulkImportUsers(users) as Promise<ImportResponse>,
    onSuccess: (data) => {
      setImportResults(data);
      setFormUsers([{ username: "", display_name: "", role: "student", class_name: "" }]);
      setJsonInput("");
    },
    onError: (error) => {
      alert("导入失败: " + (error as Error).message);
    },
  });

  const handleAddFormUser = () => {
    setFormUsers((prev) => [
      ...prev,
      { username: "", display_name: "", role: "student", class_name: "" },
    ]);
  };

  const handleRemoveFormUser = (index: number) => {
    setFormUsers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFormUserChange = (index: number, field: keyof UserToImport, value: string) => {
    setFormUsers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "role" && value === "teacher") {
        updated[index].class_name = "";
      }
      return updated;
    });
  };

  const handleFormSubmit = () => {
    const validUsers = formUsers.filter((u) => u.username.trim());
    if (validUsers.length === 0) {
      alert("请至少添加一个有效用户");
      return;
    }

    if (classes.length === 0 && validUsers.some((u) => u.role === "student")) {
      alert("尚未创建班级，无法创建学生账户。请先创建班级。");
      return;
    }

    const studentsWithoutClass = validUsers.filter(
      (u) => u.role === "student" && !String(u.class_name || "").trim()
    );
    if (studentsWithoutClass.length > 0) {
      alert("学生账户必须选择班级后才能创建");
      return;
    }

    const usersToImport = validUsers.map((u) => ({
      ...u,
      class_name: String(u.class_name || "").trim() || undefined,
    }));

    importMutation.mutate(usersToImport);
  };

  const handleJsonSubmit = () => {
    try {
      const users = JSON.parse(jsonInput);
      if (!Array.isArray(users)) {
        alert("JSON格式错误：需要一个数组");
        return;
      }
      const normalizedUsers: UserToImport[] = users
        .filter((u: unknown) => typeof u === "object" && u !== null)
        .map((u: unknown) => {
          const obj = u as Record<string, unknown>;
          return {
            username: String(obj.username || "").trim(),
            display_name: typeof obj.display_name === "string" ? obj.display_name : undefined,
            role: obj.role as UserRole,
            class_name: typeof obj.class_name === "string" ? obj.class_name.trim() : undefined,
          };
        })
        .filter((u) => u.username);

      if (normalizedUsers.length === 0) {
        alert("请至少提供一个有效用户");
        return;
      }

      const invalidRole = normalizedUsers.find((u) => u.role !== "student" && u.role !== "teacher");
      if (invalidRole) {
        alert("JSON 中存在无效角色（仅支持 student/teacher）");
        return;
      }

      if (classes.length === 0 && normalizedUsers.some((u) => u.role === "student")) {
        alert("尚未创建班级，无法导入学生账户。请先创建班级。");
        return;
      }

      const missingClass = normalizedUsers.filter((u) => u.role === "student" && !u.class_name);
      if (missingClass.length > 0) {
        alert("JSON 导入：学生账户必须提供 class_name");
        return;
      }

      importMutation.mutate(normalizedUsers);
    } catch {
      alert("JSON解析失败，请检查格式");
    }
  };

  const handleDownloadTemplate = () => {
    const template = [
      { username: "20240001", display_name: "张三", role: "student", class_name: "初一(1)班" },
      { username: "20240002", display_name: "李四", role: "student", class_name: "初一(1)班" },
      { username: "T20240001", display_name: "王老师", role: "teacher" },
    ];
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users_template.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadResults = () => {
    if (!importResults) return;
    const successContent = importResults.users
      .map(
        (r) =>
          `${r.username},${r.display_name || ""},${r.initial_password},${r.class_name || ""},成功`
      )
      .join("\n");
    const errorContent = importResults.errors.map((err) => `,,,,${err}`).join("\n");
    const content = [successContent, errorContent].filter(Boolean).join("\n");
    const blob = new Blob([`学号/工号,姓名,初始密码,班级,状态\n${content}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "import_results.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    importMethod,
    setImportMethod,
    formUsers,
    setFormUsers,
    formValidUsers,
    formHasStudentWithoutClass,
    formCannotCreateStudentsNoClass,
    showNoClassWarning,
    hasStudents,
    jsonInput,
    setJsonInput,
    importResults,
    setImportResults,
    classes,
    handleAddFormUser,
    handleRemoveFormUser,
    handleFormUserChange,
    handleFormSubmit,
    handleJsonSubmit,
    handleDownloadTemplate,
    handleDownloadResults,
    importMutation,
  };
}
