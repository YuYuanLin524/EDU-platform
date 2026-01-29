"use client";

import { create } from "zustand";

interface StudentChatUIState {
  selectedConversationId: number | null;
  selectedClassId: number | null;

  setSelectedConversationId: (conversationId: number | null) => void;
  setSelectedClassId: (classId: number | null) => void;
  startNewDraft: () => void;
}

export const useStudentChatUIStore = create<StudentChatUIState>((set) => ({
  selectedConversationId: null,
  selectedClassId: null,

  setSelectedConversationId: (selectedConversationId) =>
    set({ selectedConversationId }),
  setSelectedClassId: (selectedClassId) => set({ selectedClassId }),
  startNewDraft: () => set({ selectedConversationId: null }),
}));

