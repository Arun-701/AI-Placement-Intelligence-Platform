from pathlib import Path
from dotenv import load_dotenv

# Load backend/.env before routes/services access environment-based settings.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.analysis import router

app = FastAPI(title='AI Question Analysis API', version='1.0.0')
app.add_middleware(CORSMiddleware, allow_origins=['http://localhost:5173'], allow_credentials=True, allow_methods=['*'], allow_headers=['*'])
app.include_router(router)
@app.get('/api/health')
def health(): return {'status': 'healthy'}
@app.get('/api/topics')
def get_topics():
    return {"mode": "automatic-discovery", "message": "Topics are discovered from the uploaded questions; no fixed subject catalogue is used."}
