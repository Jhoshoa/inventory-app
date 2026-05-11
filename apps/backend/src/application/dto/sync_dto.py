from pydantic import BaseModel
from datetime import datetime


class SyncPushDTO(BaseModel):
    changes: list[dict]


class SyncPullDTO(BaseModel):
    since: datetime


class SyncResponseDTO(BaseModel):
    updates: list[dict]
    server_time: datetime
