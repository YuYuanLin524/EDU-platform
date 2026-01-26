"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-01-26

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # users 表
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(100), unique=True, nullable=False, index=True),
        sa.Column("display_name", sa.String(100), nullable=True),
        sa.Column(
            "role",
            sa.Enum("admin", "teacher", "student", name="userrole"),
            nullable=False,
        ),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("must_change_password", sa.Boolean(), default=True, nullable=False),
        sa.Column(
            "status",
            sa.Enum("active", "disabled", name="userstatus"),
            default="active",
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("last_login_at", sa.DateTime(), nullable=True),
    )

    # classes 表
    op.create_table(
        "classes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("grade", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    # class_teachers 关联表
    op.create_table(
        "class_teachers",
        sa.Column(
            "class_id",
            sa.Integer(),
            sa.ForeignKey("classes.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "teacher_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    # class_students 关联表
    op.create_table(
        "class_students",
        sa.Column(
            "class_id",
            sa.Integer(),
            sa.ForeignKey("classes.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "student_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    # prompt_scopes 表
    op.create_table(
        "prompt_scopes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "scope_type",
            sa.Enum("global", "class", "assignment", name="scopetype"),
            nullable=False,
        ),
        sa.Column(
            "class_id",
            sa.Integer(),
            sa.ForeignKey("classes.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("assignment_id", sa.Integer(), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, default=1),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column(
            "created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index(
        "ix_prompt_scope_lookup",
        "prompt_scopes",
        ["scope_type", "class_id", "is_active"],
    )

    # conversations 表
    op.create_table(
        "conversations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "class_id",
            sa.Integer(),
            sa.ForeignKey("classes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "student_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(200), nullable=True),
        sa.Column("prompt_version", sa.Integer(), nullable=True),
        sa.Column("model_provider", sa.String(50), nullable=True),
        sa.Column("model_name", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("last_message_at", sa.DateTime(), nullable=True),
    )
    op.create_index(
        "ix_conversation_student", "conversations", ["student_id", "last_message_at"]
    )
    op.create_index(
        "ix_conversation_class", "conversations", ["class_id", "last_message_at"]
    )

    # messages 表
    op.create_table(
        "messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "conversation_id",
            sa.Integer(),
            sa.ForeignKey("conversations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "role",
            sa.Enum("system", "user", "assistant", name="messagerole"),
            nullable=False,
        ),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("token_in", sa.Integer(), nullable=True),
        sa.Column("token_out", sa.Integer(), nullable=True),
        sa.Column("policy_flags", sa.JSON(), nullable=True),
    )
    op.create_index(
        "ix_message_conversation", "messages", ["conversation_id", "created_at"]
    )

    # export_jobs 表
    op.create_table(
        "export_jobs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "requested_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False
        ),
        sa.Column("scope", sa.JSON(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "pending", "processing", "completed", "failed", name="exportstatus"
            ),
            default="pending",
            nullable=False,
        ),
        sa.Column("file_key", sa.String(255), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
    )

    # audit_logs 表
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("actor_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("target_type", sa.String(50), nullable=True),
        sa.Column("target_id", sa.Integer(), nullable=True),
        sa.Column("meta", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_audit_actor", "audit_logs", ["actor_id", "created_at"])
    op.create_index("ix_audit_action", "audit_logs", ["action", "created_at"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("export_jobs")
    op.drop_table("messages")
    op.drop_table("conversations")
    op.drop_table("prompt_scopes")
    op.drop_table("class_students")
    op.drop_table("class_teachers")
    op.drop_table("classes")
    op.drop_table("users")

    # 删除枚举类型
    op.execute("DROP TYPE IF EXISTS userrole")
    op.execute("DROP TYPE IF EXISTS userstatus")
    op.execute("DROP TYPE IF EXISTS scopetype")
    op.execute("DROP TYPE IF EXISTS messagerole")
    op.execute("DROP TYPE IF EXISTS exportstatus")
