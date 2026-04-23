import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional, Dict

from database import models
from services import ocr_service, llm_extractor, rag_service

app = FastAPI(title="Patient Profiler API")

# Allow CORS for the Vite React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
PROFILE_DIR = os.path.join(UPLOAD_DIR, "profiles")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROFILE_DIR, exist_ok=True)

app.mount("/api/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

class PatientCreate(BaseModel):
    name: str
    dob: str = None

class ChatRequest(BaseModel):
    query: str
    language: str = "English"

class HistoryUpdate(BaseModel):
    category: str
    action: str
    old_item: Optional[Dict] = None
    new_item: Optional[Dict] = None

class Prescription(BaseModel):
    medications: List[dict]

@app.get("/api/status")
def get_status():
    status_info = {"database": "ok", "llm": "ok"}
    
    # Check DB
    try:
        conn = models.get_connection()
        conn.execute("SELECT 1")
        conn.close()
    except Exception:
        status_info["database"] = "error"
        
    # Check LLM (LM Studio)
    import urllib.request
    try:
        req = urllib.request.Request("http://localhost:1234/v1/models", method="GET")
        with urllib.request.urlopen(req, timeout=2) as response:
            if response.status != 200:
                status_info["llm"] = "error"
    except Exception:
        status_info["llm"] = "error"
        
    if status_info["database"] == "error":
        return {"status": "yellow", "message": "Database Offline"}
    elif status_info["llm"] == "error":
        return {"status": "red", "message": "LLM Offline"}
    else:
        return {"status": "green", "message": "All Systems Operational"}

@app.get("/api/patients")
def get_patients():
    return models.get_patients()

@app.post("/api/patients")
def create_patient(patient: PatientCreate):
    patient_id = models.add_patient(patient.name, patient.dob)
    return {"message": "Patient created successfully", "patient_id": patient_id}

@app.post("/api/patients/{patient_id}/image")
async def upload_patient_image(patient_id: int, file: UploadFile = File(...)):
    patients = models.get_patients()
    if not any(p['id'] == patient_id for p in patients):
        raise HTTPException(status_code=404, detail="Patient not found")
        
    ext = file.filename.split('.')[-1]
    filename = f"patient_{patient_id}.{ext}"
    file_path = os.path.join(PROFILE_DIR, filename)
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
        
    image_url = f"/api/uploads/profiles/{filename}"
    models.update_patient_image(patient_id, image_url)
    
    return {"message": "Image uploaded successfully", "image_url": image_url}

@app.post("/api/upload/{patient_id}")
async def upload_file(patient_id: int, file: UploadFile = File(...)):
    # Verify patient exists
    patients = models.get_patients()
    if not any(p['id'] == patient_id for p in patients):
        raise HTTPException(status_code=404, detail="Patient not found")

    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
        
    try:
        # 1. Extract raw text via OCR
        raw_text = ocr_service.process_file(file_path)
        
        # Fetch existing summary
        patient = next((p for p in patients if p['id'] == patient_id), None)
        existing_summary = patient.get('summary', '') if patient else ''
        
        # 2. Extract structured history
        history_data = llm_extractor.extract_medical_history(raw_text, existing_summary)
        
        # Save updated summary
        if "summary" in history_data and history_data["summary"]:
            models.update_patient_summary(patient_id, history_data["summary"])
        
        # 3. Save structured history to DB
        models.save_patient_history(patient_id, history_data, file.filename)
        
        # 4. Index text into ChromaDB for Chat/RAG
        rag_service.index_document(patient_id, raw_text, file.filename)
        
        return {
            "message": "File processed successfully", 
            "extracted_data": history_data
        }
    except Exception as e:
        print(f"Error processing upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history/{patient_id}")
def get_history(patient_id: int):
    # Verify patient exists
    patients = models.get_patients()
    if not any(p['id'] == patient_id for p in patients):
        raise HTTPException(status_code=404, detail="Patient not found")
        
    return models.get_patient_history(patient_id)

def sync_rewrite_summary(patient_id: int):
    current_history = models.get_patient_history(patient_id)
    existing_summary = current_history.get("summary", "")
    history_without_summary = {k: v for k, v in current_history.items() if k != "summary"}
    
    new_summary = llm_extractor.rewrite_summary_from_history(existing_summary, history_without_summary)
    if new_summary and new_summary != existing_summary:
        models.update_patient_summary(patient_id, new_summary)

@app.post("/api/history/{patient_id}/update")
def update_history(patient_id: int, update: HistoryUpdate):
    patients = models.get_patients()
    if not any(p['id'] == patient_id for p in patients):
        raise HTTPException(status_code=404, detail="Patient not found")
        
    try:
        models.update_history_item(
            patient_id, 
            update.category, 
            update.action, 
            update.old_item, 
            update.new_item
        )
        sync_rewrite_summary(patient_id)
        return {"message": "History updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/patients/{patient_id}/prescription")
def save_prescription(patient_id: int, prescription: Prescription):
    patients = models.get_patients()
    if not any(p['id'] == patient_id for p in patients):
        raise HTTPException(status_code=404, detail="Patient not found")
        
    try:
        data = {"medications": prescription.medications}
        models.save_patient_history(patient_id, data, "Prescription")
        sync_rewrite_summary(patient_id)
        return {"message": "Prescription saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def background_summary_update(patient_id: int, query: str, response: str, existing_summary: str):
    new_summary = llm_extractor.update_summary_from_chat(existing_summary, query, response)
    if new_summary != existing_summary:
        models.update_patient_summary(patient_id, new_summary)

@app.post("/api/chat/{patient_id}")
def chat_with_records(patient_id: int, request: ChatRequest, background_tasks: BackgroundTasks):
    # Verify patient exists
    patients = models.get_patients()
    patient = next((p for p in patients if p['id'] == patient_id), None)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    current_history = models.get_patient_history(patient_id)
        
    response_text = rag_service.chat_with_records(
        patient_id, 
        request.query, 
        request.language,
        structured_history=current_history
    )
    
    # Trigger background summary update
    existing_summary = patient.get('summary', '')
    background_tasks.add_task(background_summary_update, patient_id, request.query, response_text, existing_summary)
    
    return {"response": response_text}

# Run via: uvicorn main:app --reload
