import re

def estimate_difficulty(question: str) -> str:
    text = question.lower()
    hard = r"\b(implement|code|design|optimize|solve|algorithm|complexity|efficient|write a program|calculate)\b"
    medium = r"\b(explain|compare|difference|describe|how does|working|example|advantages|disadvantages|why)\b"
    if re.search(hard, text): return "Hard"
    if re.search(medium, text): return "Medium"
    return "Easy"
