import { useState, useEffect, useRef } from "react";
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ConversationInfo } from "@/lib/api";
import type { MessageInfo } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth";

export type ChatMessage = MessageInfo & {
  __stream?: boolean;
  __pending?: boolean;
  __hasDelta?: boolean;
};

type StreamEvent =
  | { type: "meta"; user_message: MessageInfo; assistant_message: MessageInfo }
  | { type: "delta"; delta: string }
  | { type: "done"; policy_flags?: Record<string, unknown> | null }
  | { type: "error"; message: string };

function hasVisibleContent(text: string): boolean {
  // Ignore whitespace + common invisible chars
  return text.replace(/[\s\u200b\ufeff]/g, "").length > 0;
}

function getTokenFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
}

export function useChatState() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [selectedConversation, setSelectedConversation] = useState<ConversationInfo | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [streamingMessageId, setStreamingMessageId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const tempIdRef = useRef(-1);

  const nextTempId = () => {
    tempIdRef.current -= 1;
    return tempIdRef.current;
  };

  // Parallel fetching for independent data (classes and conversations)
  const [
    { data: classesData },
    { data: conversationsData, isLoading: conversationsLoading },
  ] = useQueries({
    queries: [
      {
        queryKey: ["classes", user?.role, user?.id],
        queryFn: () => api.getClasses(),
      },
      {
        queryKey: ["conversations", selectedClassId],
        queryFn: () => api.getConversations(selectedClassId ?? undefined),
      },
    ],
  });

  // Fetch messages for selected conversation (dependent on selectedConversation)
  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ["messages", selectedConversation?.id],
    queryFn: () =>
      selectedConversation ? api.getConversationMessages(selectedConversation.id) : null,
    enabled: !!selectedConversation,
  });

  useEffect(() => {
    if (!selectedConversation) {
      setLocalMessages([]);
      return;
    }

    // Skip sync while streaming to avoid overwriting
    if (streamingMessageId) {
      return;
    }

    if (messagesData?.messages) {
      setLocalMessages((prev) => {
        const pending = prev.filter((msg) => msg.__pending);
        const existingIds = new Set(messagesData.messages.map((msg) => msg.id));
        const safePending = pending.filter((msg) => !existingIds.has(msg.id));
        return [...messagesData.messages, ...safePending];
      });
    }
  }, [messagesData?.messages, selectedConversation, streamingMessageId]);

  // Create new conversation
  const createConversationMutation = useMutation({
    mutationFn: (classId: number) => api.createConversation(classId),
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setSelectedConversation(newConversation);
    },
  });

  // Send message (non-stream)
  const sendMessageMutation = useMutation({
    mutationFn: ({
      conversationId,
      content,
    }: {
      conversationId: number;
      content: string;
      tempUserId: number;
      tempAssistantId: number;
    }) => api.sendMessage(conversationId, content),
    onSuccess: (data, variables) => {
      setLocalMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === variables.tempUserId) return data.user_message;
          if (msg.id === variables.tempAssistantId) return data.assistant_message;
          return msg;
        })
      );
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["messages", selectedConversation?.id] });
      setMessageInput("");
    },
    onError: (_error, variables) => {
      setStreamingMessageId(null);
      setLocalMessages((prev) =>
        prev.filter((msg) => msg.id !== variables.tempUserId && msg.id !== variables.tempAssistantId)
      );
    },
  });

  // Stream message via SSE
  const streamMessage = async (
    conversationId: number,
    content: string,
    tempUserId: number,
    tempAssistantId: number
  ) => {
    const token = getTokenFromStorage();
    const urlBase = getApiBaseUrl();
    const res = await fetch(`${urlBase}/conversations/${conversationId}/messages/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ content }),
    });
    if (!res.ok || !res.body) {
      throw new Error(`stream request failed: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let currentAssistantId: number | null = null;

    const readChunk = async (): Promise<void> => {
      const { value, done } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });

      // Split SSE events by blank line
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        // Support: event: <type>\ndata: <payload>
        const lines = part.split("\n");
        let eventType = "message";
        const dataLines: string[] = [];
        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventType = line.slice("event:".length).trim();
          } else if (line.startsWith("data:")) {
            dataLines.push(line.slice("data:".length).trimStart());
          }
        }
        const dataStr = dataLines.join("\n");

        if (!dataStr) continue;
        if (eventType === "meta") {
          const meta = JSON.parse(dataStr) as StreamEvent;
          if (meta.type === "meta") {
            const assistantId = meta.assistant_message.id;
            currentAssistantId = assistantId;
            setStreamingMessageId(assistantId);
            setLocalMessages((prev) =>
              prev.map((m) => {
                if (m.id === tempUserId) return meta.user_message;
                if (m.id === tempAssistantId) {
                  return {
                    ...meta.assistant_message,
                    content: "",
                    __stream: true,
                    __pending: false,
                    __hasDelta: false,
                  };
                }
                return m;
              })
            );
          }
        } else if (eventType === "delta") {
          const evt = JSON.parse(dataStr) as StreamEvent;
          if (evt.type === "delta") {
            setLocalMessages((prev) =>
              prev.map((m) =>
                (currentAssistantId !== null && m.id === currentAssistantId) ||
                (currentAssistantId === null && m.__stream)
                  ? (() => {
                      const nextContent = (m.content ?? "") + evt.delta;
                      const nextHasDelta = hasVisibleContent(nextContent);
                      return {
                        ...m,
                        content: nextContent,
                        __stream: true,
                        __hasDelta: nextHasDelta,
                      };
                    })()
                  : m
              )
            );
          }
        } else if (eventType === "done") {
          const evt = JSON.parse(dataStr) as StreamEvent;
          if (evt.type === "done") {
            setLocalMessages((prev) =>
              prev.map((m) =>
                (currentAssistantId !== null && m.id === currentAssistantId) ||
                (currentAssistantId === null && m.__stream)
                  ? { ...m, __stream: false }
                  : m
              )
            );
            setStreamingMessageId(null);
            currentAssistantId = null;
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
            queryClient.invalidateQueries({ queryKey: ["messages", selectedConversation?.id] });
          }
        } else if (eventType === "error") {
          setStreamingMessageId(null);
          currentAssistantId = null;
        }
      }

      await readChunk();
    };

    await readChunk();
  };

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages.length]);

  // Set default class if only one
  useEffect(() => {
    if (classesData?.items?.length === 1 && !selectedClassId) {
      setSelectedClassId(classesData.items[0].id);
    }
  }, [classesData, selectedClassId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversation) return;
    const content = messageInput.trim();
    const tempUserId = nextTempId();
    const tempAssistantId = nextTempId();

    const optimisticUserMessage: ChatMessage = {
      id: tempUserId,
      role: "user",
      content,
      created_at: new Date().toISOString(),
      token_in: null,
      token_out: null,
    };

    const optimisticAssistantMessage: ChatMessage = {
      id: tempAssistantId,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
      token_in: null,
      token_out: null,
      __stream: true,
      __pending: true,
      __hasDelta: false,
    };

    setLocalMessages((prev) => [...prev, optimisticUserMessage, optimisticAssistantMessage]);
    setMessageInput("");

    // Use streaming endpoint for real-time output
    streamMessage(selectedConversation.id, content, tempUserId, tempAssistantId).catch(() => {
      // Fallback to non-stream if streaming fails
      sendMessageMutation.mutate({
        conversationId: selectedConversation.id,
        content,
        tempUserId,
        tempAssistantId,
      });
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
    messages: localMessages,
    classes: classesData?.items || [],

    // Stream state
    isStreaming: !!streamingMessageId,
    streamingMessageId,

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
