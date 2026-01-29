import enum
from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    DateTime,
    ForeignKey,
    Enum,
    JSON,
    Index,
)
from sqlalchemy.orm import relationship
from app.db.base import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"


class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    DISABLED = "disabled"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    display_name = Column(String(100), nullable=True)
    role = Column(
        Enum(UserRole, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
    )
    password_hash = Column(String(255), nullable=False)
    must_change_password = Column(Boolean, default=True, nullable=False)
    status = Column(
        Enum(UserStatus, values_callable=lambda obj: [e.value for e in obj]),
        default=UserStatus.ACTIVE,
        nullable=False,
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_login_at = Column(DateTime, nullable=True)

    # 教师授课班级
    teaching_classes = relationship(
        "Class", secondary="class_teachers", back_populates="teachers"
    )
    # 学生所属班级
    enrolled_classes = relationship(
        "Class", secondary="class_students", back_populates="students"
    )
    # 创建的提示词
    created_prompts = relationship("PromptScope", back_populates="creator")
    # 学生的会话
    conversations = relationship("Conversation", back_populates="student")


class Class(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    grade = Column(String(50), nullable=True)  # 如 "七年级", "八年级"
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    teachers = relationship(
        "User", secondary="class_teachers", back_populates="teaching_classes"
    )
    students = relationship(
        "User", secondary="class_students", back_populates="enrolled_classes"
    )
    prompts = relationship("PromptScope", back_populates="class_")
    conversations = relationship("Conversation", back_populates="class_")


class ClassTeacher(Base):
    """班级-教师关联表"""

    __tablename__ = "class_teachers"

    class_id = Column(
        Integer, ForeignKey("classes.id", ondelete="CASCADE"), primary_key=True
    )
    teacher_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ClassStudent(Base):
    """班级-学生关联表"""

    __tablename__ = "class_students"

    class_id = Column(
        Integer, ForeignKey("classes.id", ondelete="CASCADE"), primary_key=True
    )
    student_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ScopeType(str, enum.Enum):
    GLOBAL = "global"
    CLASS = "class"
    ASSIGNMENT = "assignment"


class PromptScope(Base):
    """提示词配置（版本化）"""

    __tablename__ = "prompt_scopes"

    id = Column(Integer, primary_key=True, index=True)
    scope_type = Column(
        Enum(ScopeType, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=ScopeType.GLOBAL,
    )
    class_id = Column(
        Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=True
    )
    assignment_id = Column(Integer, nullable=True)  # 预留字段，后续扩展作业模块
    content = Column(Text, nullable=False)
    version = Column(Integer, nullable=False, default=1)
    is_active = Column(Boolean, default=True, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    creator = relationship("User", back_populates="created_prompts")
    class_ = relationship("Class", back_populates="prompts")

    __table_args__ = (
        Index("ix_prompt_scope_lookup", "scope_type", "class_id", "is_active"),
    )


class Conversation(Base):
    """对话会话"""

    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(
        Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False
    )
    student_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title = Column(String(200), nullable=True)  # 可选标题
    prompt_version = Column(Integer, nullable=True)  # 创建时的提示词版本
    model_provider = Column(String(50), nullable=True)
    model_name = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_message_at = Column(DateTime, nullable=True)

    student = relationship("User", back_populates="conversations")
    class_ = relationship("Class", back_populates="conversations")
    messages = relationship(
        "Message", back_populates="conversation", order_by="Message.created_at"
    )

    __table_args__ = (
        Index("ix_conversation_student", "student_id", "last_message_at"),
        Index("ix_conversation_class", "class_id", "last_message_at"),
    )


class MessageRole(str, enum.Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"


class Message(Base):
    """对话消息"""

    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(
        Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False
    )
    role = Column(
        Enum(MessageRole, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
    )
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    token_in = Column(Integer, nullable=True)
    token_out = Column(Integer, nullable=True)
    policy_flags = Column(
        JSON, nullable=True
    )  # 记录审计信息: rewrite_count, block_reason, latency_ms 等

    conversation = relationship("Conversation", back_populates="messages")

    __table_args__ = (
        Index("ix_message_conversation", "conversation_id", "created_at"),
    )


class ExportStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ExportJob(Base):
    """导出任务"""

    __tablename__ = "export_jobs"

    id = Column(Integer, primary_key=True, index=True)
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    scope = Column(
        JSON, nullable=False
    )  # {class_id?, student_id?, start_date?, end_date?}
    status = Column(
        Enum(ExportStatus, values_callable=lambda obj: [e.value for e in obj]),
        default=ExportStatus.PENDING,
        nullable=False,
    )
    file_key = Column(String(255), nullable=True)  # 导出文件路径或对象存储 key
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    finished_at = Column(DateTime, nullable=True)

    requester = relationship("User")


class SystemConfig(Base):
    """系统配置（键值对存储，持久化保存）"""

    __tablename__ = "system_configs"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class AuditLog(Base):
    """审计日志"""

    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(
        Integer, ForeignKey("users.id"), nullable=True
    )  # 可为空（系统操作）
    action = Column(
        String(100), nullable=False
    )  # login, bulk_import, export, prompt_update, etc.
    target_type = Column(String(50), nullable=True)  # user, class, conversation, etc.
    target_id = Column(Integer, nullable=True)
    meta = Column(JSON, nullable=True)  # 附加信息
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    actor = relationship("User")

    __table_args__ = (
        Index("ix_audit_actor", "actor_id", "created_at"),
        Index("ix_audit_action", "action", "created_at"),
    )
