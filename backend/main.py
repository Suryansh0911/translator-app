import os
import uuid
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from deep_translator import GoogleTranslator
from langdetect import detect, DetectorFactory
from gtts import gTTS
from gtts.lang import tts_langs


# ------------------------------------------------------------------
# Config
# ------------------------------------------------------------------
BACKEND_BASE = os.getenv("BACKEND_BASE", "https://translator-app-dsn7.onrender.com")
AUDIO_DIR = os.path.join("static", "audio")
os.makedirs(AUDIO_DIR, exist_ok=True)

DetectorFactory.seed = 0  # deterministic detection
GTTs_SUPPORTED = tts_langs()  # dict: code -> language name

# Indian language codes
INDIAN_LANGUAGES = {
    "hi": "Hindi",
    "bn": "Bengali",
    "ta": "Tamil",
    "te": "Telugu",
    "mr": "Marathi",
    "gu": "Gujarati",
    "kn": "Kannada",
    "ml": "Malayalam",
    "pa": "Punjabi",
    "ur": "Urdu",
    "or": "Odia",
    "as": "Assamese",
    "ne": "Nepali",
}

# ------------------------------------------------------------------
# FastAPI app setup
# ------------------------------------------------------------------
app = FastAPI(title="Translator+TTS")

origins = [
    "https://translator-app-theta-rust.vercel.app",  # Vercel frontend
    "http://localhost:3000",  # local dev
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")


# ------------------------------------------------------------------
# Schemas
# ------------------------------------------------------------------
class TranslateTTSRequest(BaseModel):
    text: str
    target_lang: str   # ISO code


class TranslateTTSResponse(BaseModel):
    translated_text: str
    detected_source_lang: str
    target_lang: str
    tts_supported: bool
    audio_url: Optional[str] = None
    message: Optional[str] = None


# ------------------------------------------------------------------
# Routes
# ------------------------------------------------------------------
@app.get("/")
def root():
    return {"status": "ok"}


@app.get("/languages")
def languages() -> List[Dict[str, Any]]:
    """Return Indian languages with TTS support info."""
    out = []
    for code, name in INDIAN_LANGUAGES.items():
        out.append(
            {
                "code": code,
                "name": name,
                "tts_supported": code in GTTs_SUPPORTED,
            }
        )
    return out


@app.post("/translate_tts", response_model=TranslateTTSResponse)
def translate_tts(req: TranslateTTSRequest):
    text = (req.text or "").strip()
    target = req.target_lang.strip().lower()

    if not text:
        raise HTTPException(status_code=400, detail="Text is empty.")
    if target not in INDIAN_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported target language: {target}")

    # Detect source language
    try:
        detected = detect(text)
    except Exception:
        detected = "auto"

    # Translate
    try:
        translated = GoogleTranslator(source="auto", target=target).translate(text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation failed: {e}")

    # TTS
    audio_url = None
    msg = None
    tts_ok = target in GTTs_SUPPORTED

    if tts_ok:
        try:
            filename = f"{uuid.uuid4().hex}.mp3"
            audio_path = os.path.join(AUDIO_DIR, filename)
            tts = gTTS(text=translated, lang=target)
            tts.save(audio_path)
            audio_url = f"{BACKEND_BASE}/static/audio/{filename}"
        except Exception as e:
            msg = f"TTS failed for '{target}': {e}"
    else:
        msg = f"TTS not available for '{target}'."

    return TranslateTTSResponse(
        translated_text=translated,
        detected_source_lang=detected,
        target_lang=target,
        tts_supported=tts_ok,
        audio_url=audio_url,
        message=msg,
    )
