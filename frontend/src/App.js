import React, { useEffect, useState, useRef } from "react";

const BACKEND = "https://translator-app-dsn7.onrender.com";

export default function App() {
  const [text, setText] = useState("");
  const [targetLang, setTargetLang] = useState("hi");
  const [languages, setLanguages] = useState([]);
  const [translated, setTranslated] = useState("");
  const [detected, setDetected] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const audioRef = useRef(null);

  useEffect(() => {
    
    fetch(`${BACKEND}/languages`)
      .then((r) => r.json())
      .then((data) => {
        setLanguages(data);
        
        if (!data.find((x) => x.code === targetLang) && data.length > 0) {
          setTargetLang(data[0].code);
        }
      })
      .catch(() => setErr("Could not load languages from backend."));
  }, []);

  const handleTranslate = async () => {
    setErr("");
    setTranslated("");
    setDetected("");
    setAudioUrl("");
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/translate_tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, target_lang: targetLang }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Request failed");
      }
      const data = await res.json();
      setTranslated(data.translated_text || "");
      setDetected(data.detected_source_lang || "");
      setAudioUrl(data.audio_url || "");
      if (data.message) {
        
        setErr(data.message);
      }
      
      if (data.audio_url && audioRef.current) {
        
        audioRef.current.load();
        
        setTimeout(() => audioRef.current.play().catch(() => {}), 200);
      }
    } catch (e) {
      setErr(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const box = {
    maxWidth: 900,
    margin: "40px auto",
    padding: 24,
    borderRadius: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
    background: "white",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  };

  const label = { display: "block", fontWeight: 600, marginBottom: 8 };
  const btn = {
    padding: "10px 16px",
    borderRadius: 10,
    border: "1px solid #ddd",
    background: "#0f62fe",
    color: "white",
    fontWeight: 600,
    cursor: "pointer",
  };
  const btnDisabled = { ...btn, background: "#9aa7b2", cursor: "not-allowed" };

  return (
    <div style={{ background: "#f6f7f9", minHeight: "100vh", padding: "24px" }}>
      <div style={box}>
        <h1 style={{ margin: 0, marginBottom: 16 }}>Translator + TTS</h1>
        <p style={{ marginTop: 0, color: "#5c6b7a" }}>
          Auto-detect source language → translate to your target language.
        </p>

        <div style={{ marginTop: 16 }}>
          <label style={label}>Text</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "1px solid #ddd",
              outline: "none",
              resize: "vertical",
              fontSize: 16,
            }}
            placeholder="Type or paste text…"
          />
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={label}>Target language</label>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                border: "1px solid #ddd",
                fontSize: 16,
              }}
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name} ({l.code}) {l.tts_supported ? "• TTS" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <button
            onClick={handleTranslate}
            style={loading ? btnDisabled : btn}
            disabled={loading || !text.trim()}
          >
            {loading ? "Translating…" : "Translate & Speak"}
          </button>
        </div>

        {err && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: "#fff6f6",
              color: "#a40000",
              border: "1px solid #ffd9d9",
              borderRadius: 10,
            }}
          >
            {err}
          </div>
        )}

        {detected && (
          <div style={{ marginTop: 16, color: "#5c6b7a" }}>
            Detected language: <b>{detected}</b>
          </div>
        )}

        {translated && (
          <div style={{ marginTop: 16 }}>
            <label style={label}>Translated text</label>
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid #eee",
                background: "#fafafa",
                whiteSpace: "pre-wrap",
                fontSize: 18,
              }}
            >
              {translated}
            </div>
          </div>
        )}

        {audioUrl && (
          <div style={{ marginTop: 16 }}>
            <label style={label}>Audio</label>
            <audio ref={audioRef} controls src={audioUrl} />
            <div style={{ fontSize: 12, color: "#6b7785", marginTop: 6 }}>
              If audio doesn’t play, check your browser’s autoplay policy or click play.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
