from pathlib import Path
from dotenv import load_dotenv

# Load backend/.env before routes/services access environment-based settings.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.analysis import router
from app.services.topic_classifier_service import TopicClassifierService

app = FastAPI(title='AI Question Analysis API', version='1.0.0')
app.add_middleware(CORSMiddleware, allow_origins=['http://localhost:5173'], allow_credentials=True, allow_methods=['*'], allow_headers=['*'])
app.include_router(router)
@app.get('/api/health')
def health(): return {'status': 'healthy'}
@app.get('/api/topics')
def get_topics():
    return {"mode": "automatic-discovery", "message": "Topics are discovered from the uploaded questions; no fixed subject catalogue is used."}
@app.post('/api/classify')
async def classify_question(question: str):
    classifier_service = TopicClassifierService()
    predicted_domain = classifier_service.predict_domain(question)
    predicted_topic = classifier_service.predict_topic(question, predicted_domain)
    confidence = classifier_service.calculate_confidence(predicted_topic)
    return {
        'domain': predicted_domain,
        'topic': predicted_topic,
        'domainConfidence': confidence,
        'classificationSource': 'ml'
    }
