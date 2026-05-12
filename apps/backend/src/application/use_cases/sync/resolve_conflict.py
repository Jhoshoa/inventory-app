from dataclasses import dataclass


@dataclass
class ConflictInput:
    local_version: int
    remote_version: int
    local_data: dict
    remote_data: dict


class ResolveConflictUseCase:
    def execute(self, input: ConflictInput) -> dict:
        if input.remote_version >= input.local_version:
            return input.remote_data
        return input.local_data
