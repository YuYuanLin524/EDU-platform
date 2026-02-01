import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ScopeType } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

export function usePromptManagement() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPromptContent, setNewPromptContent] = useState("");
  const [newPromptScope, setNewPromptScope] = useState<ScopeType>("global");

  const { data: classesData } = useQuery({
    queryKey: ["classes", user?.role, user?.id],
    queryFn: () => api.getClasses(),
  });

  const { data: promptsData, isLoading } = useQuery({
    queryKey: ["prompts", selectedClassId],
    queryFn: () =>
      api.getPrompts(selectedClassId ? "class" : undefined, selectedClassId ?? undefined),
  });

  const createPromptMutation = useMutation({
    mutationFn: () =>
      api.createPrompt(
        newPromptContent,
        newPromptScope,
        newPromptScope === "class" ? (selectedClassId ?? undefined) : undefined,
        true
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
      setShowCreateForm(false);
      setNewPromptContent("");
    },
  });

  const activatePromptMutation = useMutation({
    mutationFn: (promptId: number) => api.activatePrompt(promptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    },
  });

  const classes = classesData?.items || [];
  const prompts = promptsData?.items || [];

  // Group prompts by scope
  const globalPrompts = prompts.filter((p) => p.scope_type === "global");
  const classPrompts = prompts.filter((p) => p.scope_type === "class");

  const handleCloseForm = () => {
    setShowCreateForm(false);
    setNewPromptContent("");
  };

  return {
    // Data
    classes,
    prompts,
    globalPrompts,
    classPrompts,
    isLoading,

    // Form state
    showCreateForm,
    setShowCreateForm,
    newPromptContent,
    setNewPromptContent,
    newPromptScope,
    setNewPromptScope,

    // Filter state
    selectedClassId,
    setSelectedClassId,

    // Mutations
    createPromptMutation,
    activatePromptMutation,

    // Handlers
    handleCloseForm,
  };
}
