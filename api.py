import asyncio
import sqlite3
import json
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional

from dotenv import load_dotenv
load_dotenv()

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from hackathon2026_agent.agent import app as adk_app

DB_FILE = "reports.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            video_url TEXT,
            detected_vehicle TEXT,
            license_plate TEXT,
            location_context TEXT,
            environmental_factors TEXT,
            action_description TEXT,
            infraction_detected BOOLEAN,
            violated_article TEXT,
            legal_text TEXT,
            penalty TEXT,
            ai_reasoning TEXT,
            status TEXT DEFAULT 'PENDING'
        )
    """)
    conn.commit()
    conn.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure directories exist
os.makedirs("real_videos", exist_ok=True)
os.makedirs("ai_videos", exist_ok=True)

# Mount them so frontend can load them via HTTP
app.mount("/real_videos", StaticFiles(directory="real_videos"), name="real_videos")
app.mount("/ai_videos", StaticFiles(directory="ai_videos"), name="ai_videos")


class AnalyzeRequest(BaseModel):
    video_url: str

class ReportSubmission(BaseModel):
    video_url: str
    detected_vehicle: str
    license_plate: str
    location_context: str
    environmental_factors: str
    action_description: str
    infraction_detected: bool
    violated_article: str
    legal_text: str
    penalty: str
    ai_reasoning: str

class ReportStatusUpdate(BaseModel):
    status: str

@app.post("/analyze")
async def analyze_video(req: AnalyzeRequest):
    # Locate actual video file in subdirectories if the user only provided a filename
    target_video_path = req.video_url
    if not os.path.exists(target_video_path):
        import pathlib
        base_dir = pathlib.Path(".")
        found = list(base_dir.rglob(req.video_url))
        if found:
            # Pass the relative path to ADK
            target_video_path = str(found[0])
        else:
            # Fallback for ADK
            target_video_path = req.video_url

    # Run the ADK workflow programmatically
    import uuid
    session_id = f"api_session_{uuid.uuid4().hex}"
    
    session_service = InMemorySessionService()
    await session_service.create_session(
        session_id=session_id, 
        app_name="hackathon2026_agent", 
        user_id="api_user"
    )
    
    runner = Runner(app=adk_app, session_service=session_service)
    
    unique_request_id = uuid.uuid4().hex
    prompt_text = f"Request ID: {unique_request_id}\nPlease explicitly analyze this specific video. Ignore previous conversations or videos. Focus only on the facts of this new video."
    
    import mimetypes
    mime_type, _ = mimetypes.guess_type(target_video_path)
    if not mime_type:
        mime_type = "video/mp4"
        
    with open(target_video_path, "rb") as f:
        video_bytes = f.read()
        
    content = types.Content(role="user", parts=[
        types.Part.from_bytes(data=video_bytes, mime_type=mime_type),
        types.Part.from_text(text=prompt_text)
    ])
    
    events = runner.run_async(
        user_id="api_user",
        session_id=session_id,
        new_message=content
    )
    
    agent_outputs = []
    
    async for event in events:
        msg = getattr(event, "message", None) or getattr(event, "content", None)
        if msg and hasattr(msg, "parts"):
            for part in msg.parts:
                if hasattr(part, "text") and part.text:
                    agent_outputs.append(part.text)
                    
    if not agent_outputs:
        raise HTTPException(status_code=500, detail="No output from ADK workflow")
        
    last_output = agent_outputs[-1]
    
    # It might be in markdown ```json ... ```
    if "```json" in last_output:
        last_output = last_output.split("```json")[-1].split("```")[0].strip()
    elif "```" in last_output:
        last_output = last_output.split("```")[-1].split("```")[0].strip()
        
    try:
        parsed_data = json.loads(last_output)
        
        # Since the first agent's output is not in the final legal analyst JSON,
        # we try to grab the second-to-last output to merge them if possible.
        if len(agent_outputs) > 1:
            first_output = agent_outputs[-2]
            if "```json" in first_output:
                first_output = first_output.split("```json")[-1].split("```")[0].strip()
            try:
                first_data = json.loads(first_output)
                parsed_data.update(first_data)
            except:
                pass
                
        # Fill missing fields gracefully
        defaults = {
            "detected_vehicle": "Unknown",
            "license_plate": "UNKNOWN",
            "location_context": "N/A",
            "environmental_factors": "N/A",
            "action_description": "N/A",
            "infraction_detected": False,
            "violated_article": "N/A",
            "legal_text": "N/A",
            "penalty": "N/A",
            "ai_reasoning": "N/A"
        }
        for k, v in defaults.items():
            if k not in parsed_data:
                parsed_data[k] = v
                
        return parsed_data
    except Exception as e:
        print(f"Error parsing ADK output: {e}\nRaw: {last_output}")
        raise HTTPException(status_code=500, detail="Could not parse ADK response as JSON")

@app.post("/reports")
def submit_report(report: ReportSubmission):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO reports (
            video_url, detected_vehicle, license_plate, location_context, environmental_factors, 
            action_description, infraction_detected, violated_article, legal_text, penalty, ai_reasoning
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        report.video_url, report.detected_vehicle, report.license_plate, report.location_context,
        report.environmental_factors, report.action_description, int(report.infraction_detected),
        report.violated_article, report.legal_text, report.penalty, report.ai_reasoning
    ))
    report_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return {"status": "success", "id": report_id}

@app.get("/reports")
def get_reports():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM reports ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    
    reports = []
    for row in rows:
        r = dict(row)
        r["infraction_detected"] = bool(r["infraction_detected"])
        reports.append(r)
    return reports

@app.post("/reports/{report_id}/status")
def update_status(report_id: int, update: ReportStatusUpdate):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("UPDATE reports SET status = ? WHERE id = ?", (update.status, report_id))
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.get("/videos")
def list_videos():
    real_vids = []
    if os.path.exists("real_videos"):
        for f in os.listdir("real_videos"):
            if f.endswith((".mp4", ".mov", ".avi")):
                real_vids.append({
                    "id": f"real_{f}",
                    "title": f,
                    "url": os.path.join("real_videos", f),
                    "localPath": os.path.join("real_videos", f),
                    "thumb": "https://images.unsplash.com/photo-1510006798030-def05ba0df97?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
                })
                
    ai_vids = []
    if os.path.exists("ai_videos"):
        for f in os.listdir("ai_videos"):
            if f.endswith((".mp4", ".mov", ".avi")):
                ai_vids.append({
                    "id": f"ai_{f}",
                    "title": f,
                    "url": os.path.join("ai_videos", f),
                    "localPath": os.path.join("ai_videos", f),
                    "thumb": "https://images.unsplash.com/photo-1682687982143-264257173b9e?q=80&w=500&auto=format&fit=crop"
                })
                
    return {"real": real_vids, "ai": ai_vids}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

from fastapi.responses import FileResponse
import os
from fastapi.staticfiles import StaticFiles

# Fallback to serve the React SPA
if os.path.exists("frontend/dist"):
    app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        return FileResponse("frontend/dist/index.html")
