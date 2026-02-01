"use client";

import { useState } from "react";
import { ClassList, StudentList, ConversationList, MessageView } from "./components";
import type { ViewState } from "./types";

export default function TeacherClassesPage() {
  const [viewState, setViewState] = useState<ViewState>({ type: "classes" });

  const renderContent = () => {
    switch (viewState.type) {
      case "classes":
        return (
          <ClassList
            onSelectClass={(classId, className) =>
              setViewState({ type: "students", classId, className })
            }
          />
        );
      case "students":
        return (
          <StudentList
            classId={viewState.classId}
            className={viewState.className}
            onBack={() => setViewState({ type: "classes" })}
            onSelectStudent={(studentId, studentName) =>
              setViewState({
                type: "conversations",
                classId: viewState.classId,
                studentId,
                studentName,
              })
            }
          />
        );
      case "conversations":
        return (
          <ConversationList
            classId={viewState.classId}
            studentId={viewState.studentId}
            studentName={viewState.studentName}
            onBack={() =>
              setViewState({
                type: "students",
                classId: viewState.classId,
                className: "",
              })
            }
            onSelectConversation={(conversationId, title) =>
              setViewState({
                type: "messages",
                conversationId,
                conversationTitle: title,
              })
            }
          />
        );
      case "messages":
        return (
          <MessageView
            conversationId={viewState.conversationId}
            title={viewState.conversationTitle}
            onBack={() => setViewState({ type: "classes" })}
          />
        );
    }
  };

  return <div className="p-6">{renderContent()}</div>;
}
