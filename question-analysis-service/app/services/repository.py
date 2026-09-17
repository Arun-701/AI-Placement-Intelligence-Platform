"""Optional MongoDB persistence. Analysis continues if MongoDB is unavailable."""
import os
from datetime import datetime, timezone

def save_analysis(result: dict) -> None:
    url = os.getenv('MONGODB_URL')
    if not url:
        return
    try:
        from pymongo import MongoClient
        client = MongoClient(url, serverSelectionTimeoutMS=1200)
        client[os.getenv('MONGODB_DB', 'question_analysis')]['analysis_runs'].insert_one(
            {**result, 'createdAt': datetime.now(timezone.utc)}
        )
        client.close()
    except Exception:
        # Database storage is deliberately non-blocking for this standalone analyzer.
        pass
