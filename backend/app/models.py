from pydantic import BaseModel
from typing import List

class PowerProfileData(BaseModel):
    time: List[str]
    power: List[float]