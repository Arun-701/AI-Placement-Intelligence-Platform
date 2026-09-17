from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def similarity_groups(questions: list[str], threshold: float = 0.28) -> list[list[int]]:
    if not questions: return []
    matrix = TfidfVectorizer(stop_words="english").fit_transform(questions)
    similarities = cosine_similarity(matrix)
    seen, groups = set(), []
    for i in range(len(questions)):
        if i in seen: continue
        group = [j for j in range(i, len(questions)) if similarities[i, j] >= threshold]
        seen.update(group); groups.append(group)
    return groups
