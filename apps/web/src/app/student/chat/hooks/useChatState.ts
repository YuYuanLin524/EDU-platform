import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ConversationInfo } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

export function useChatState() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [selectedConversation, setSelectedConversation] = useState<ConversationInfo | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch classes for the dropdown
  const { data: classesData } = useQuery({
    queryKey: ["classes", user?.role, user?.id],
    queryFn: () => api.getClasses(),
  });

  // Fetch conversations
  const { data: conversationsData, isLoading: conversationsLoading } = useQuery({
    queryKey: ["conversations", selectedClassId],
    queryFn: () => api.getConversations(selectedClassId ?? undefined),
  });

  // Fetch messages for selected conversation
  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ["messages", selectedConversation?.id],
    queryFn: () =>
      selectedConversation ? api.getConversationMessages(selectedConversation.id) : null,
    enabled: !!selectedConversation,
  });

  // Create new conversation
  const createConversationMutation = useMutation({
    mutationFn: (classId: number) => api.createConversation(classId),
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setSelectedConversation(newConversation);
    },
  });

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: number; content: string }) =>
      api.sendMessage(conversationId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["messages", selectedConversation?.id],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setMessageInput("");
    },
  });

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesData?.messages]);

  // Set default class if only one
  useEffect(() => {
    if (classesData?.items?.length === 1 && !selectedClassId) {
      setSelectedClassId(classesData.items[0].id);
    }
  }, [classesData, selectedClassId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversation) return;
    sendMessageMutation.mutate({
      conversationId: selectedConversation.id,
      content: messageInput.trim(),
    });
  };

  const handleNewConversation = () => {
    if (!selectedClassId && classesData?.items?.[0]) {
      setSelectedClassId(classesData.items[0].id);
      createConversationMutation.mutate(classesData.items[0].id);
    } else if (selectedClassId) {
      createConversationMutation.mutate(selectedClassId);
    }
  };

  return {
    // Data
    conversations: conversationsData?.items || [],
    messages: messagesData?.messages || [],
    classes: classesData?.items || [],

    // Loading states
    conversationsLoading,
    messagesLoading,

    // Selected state
    selectedConversation,
    setSelectedConversation,
    selectedClassId,
    setSelectedClassId,

    // Input state
    messageInput,
    setMessageInput,

    // Refs
    messagesEndRef,

    // Mutations
    sendMessageMutation,

    // Handlers
    handleSendMessage,
    handleNewConversation,
  };
}
