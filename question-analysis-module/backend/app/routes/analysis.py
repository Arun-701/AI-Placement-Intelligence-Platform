from fastapi import APIRouter, File, HTTPException, UploadFile
from app.models.schemas import TextAnalysisRequest, AnalysisResponse
from app.services.analysis_service import analyze_text
from app.utils.file_reader import read_upload
from app.services.repository import save_analysis

router = APIRouter(prefix='/api', tags=['Analysis'])
@router.post('/analyze', response_model=AnalysisResponse)
def analyze(payload: TextAnalysisRequest):
    try:
        result = analyze_text(payload.questions_text)
        result.update({"extractionMethod": "TEXT", "pagesProcessed": 0})
        save_analysis(result)
        return result
    except ValueError as e: raise HTTPException(422, str(e))

@router.post('/analyze/file', response_model=AnalysisResponse)
async def analyze_file(file: UploadFile = File(...)):
    try:
        if not file.filename: raise ValueError('A file name is required.')
        content = await file.read()
        if len(content) > 10 * 1024 * 1024: raise ValueError('File must be smaller than 10 MB.')
        extracted = read_upload(file.filename, content)
        result = analyze_text(extracted.text)
        result.update({"extractionMethod": extracted.extraction_method, "pagesProcessed": extracted.pages_processed})
        save_analysis(result)
        return result
    except ValueError as e: raise HTTPException(422, str(e))
    except Exception as e: raise HTTPException(400, f'Unable to read file: {e}')
