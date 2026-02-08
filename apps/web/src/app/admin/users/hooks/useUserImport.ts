"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery, type UseMutationResult } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { UserToImport, ImportResponse, ClassInfo } from "../types";
import {
  normalizeImportUsers,
  parseJsonImportUsers,
  validateUserImports,
} from "../validation";

type ImportMutation = UseMutationResult<ImportResponse, Error, UserToImport[], unknown>;

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
  importMutation: ImportMutation;
}

export function useUserImport(): UseUserImportReturn {
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
      toast.error("导入失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
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
    const normalizedUsers = normalizeImportUsers(validUsers);
    const validationError = validateUserImports(normalizedUsers);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (classes.length === 0 && normalizedUsers.some((u) => u.role === "student")) {
      toast.error("尚未创建班级，无法创建学生账户。请先创建班级。");
      return;
    }

    importMutation.mutate(normalizedUsers);
  };

  const handleJsonSubmit = () => {
    const parsed = parseJsonImportUsers(jsonInput);
    if ("error" in parsed) {
      toast.error(parsed.error);
      return;
    }

    const normalizedUsers = normalizeImportUsers(parsed.users);
    const validationError = validateUserImports(normalizedUsers);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (classes.length === 0 && normalizedUsers.some((u) => u.role === "student")) {
      toast.error("尚未创建班级，无法导入学生账户。请先创建班级。");
      return;
    }

    importMutation.mutate(normalizedUsers);
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
