"""Pydantic models used by the public analysis API."""
from typing import Dict, List

from pydantic import BaseModel, Field


class TextAnalysisRequest(BaseModel):
    """Request body for pasted question text."""

    questions_text: str = Field(
        ...,
        min_length=5,
        max_length=500_000,
        description="Placement questions, preferably one question per line.",
    )


class TopicResult(BaseModel):
    subject: str
    topic: str
    questionCount: int = Field(ge=1)
    difficulty: str
    priorityScore: int = Field(ge=0, le=100)
    priority: str
    confidence: float = Field(ge=0, le=1)
    subtopics: List[str] = []
    source: str = "ml"


class AnalysisResponse(BaseModel):
    totalQuestions: int = Field(ge=0)
    extractionMethod: str = "TEXT"
    pagesProcessed: int = Field(default=0, ge=0)
    topics: List[TopicResult]
    subjectDistribution: Dict[str, int]
    difficultyDistribution: Dict[str, int]
    recommendedStudyOrder: List[str]
    mlQuestions: int = Field(default=0, ge=0)
    geminiQuestions: int = Field(default=0, ge=0)
    geminiUsed: bool = False
