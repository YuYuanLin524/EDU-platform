import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ClassInfo } from "@/lib/api";

export function useClassManagement() {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassGrade, setNewClassGrade] = useState("");
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);

  const { data: classesData, isLoading } = useQuery({
    queryKey: ["classes", "admin"],
    queryFn: () => api.getClasses(),
  });

  const createClassMutation = useMutation({
    mutationFn: () => api.createClass(newClassName, newClassGrade || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setShowCreateForm(false);
      setNewClassName("");
      setNewClassGrade("");
    },
  });

  const { data: classDetail } = useQuery({
    queryKey: ["class-detail", selectedClass?.id],
    queryFn: () => (selectedClass ? api.getClass(selectedClass.id) : null),
    enabled: !!selectedClass,
  });

  const classes = classesData?.items || [];

  const handleCloseCreateForm = () => {
    setShowCreateForm(false);
    setNewClassName("");
    setNewClassGrade("");
  };

  return {
    // Data
    classes,
    classDetail,
    isLoading,

    // Create form state
    showCreateForm,
    setShowCreateForm,
    newClassName,
    setNewClassName,
    newClassGrade,
    setNewClassGrade,

    // Selected class
    selectedClass,
    setSelectedClass,

    // Mutations
    createClassMutation,

    // Handlers
    handleCloseCreateForm,
  };
}
