from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, String, Text

from src.infrastructure.database.models.product_model import Base


class PkceVerifierModel(Base):
    __tablename__ = "pkce_verifiers"

    state = Column(String(255), primary_key=True)
    code_verifier = Column(Text, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
