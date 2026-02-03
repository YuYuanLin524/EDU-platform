"use client";

import * as React from "react";
import { useChatState } from "./hooks/useChatState";

type ChatContextValue = ReturnType<typeof useChatState>;

const ChatContext = React.createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const chatState = useChatState();

  return <ChatContext.Provider value={chatState}>{children}</ChatContext.Provider>;
}

export function useChatContext(): ChatContextValue | null {
  return React.useContext(ChatContext);
}
