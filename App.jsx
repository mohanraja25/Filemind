import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `You are a highly intelligent Personal File & Document Assistant called "File Mind". Your job is to help the user manage, search, understand, and open their personal files — including documents, photos, PDFs, spreadsheets, and more.

## YOUR CAPABILITIES
You will be given a list of the user's files with metadata (file name, file type, file path, date created/modified, tags, and optionally a brief description or extracted content). Use this information to answer all user queries accurately and helpfully.

## WHAT YOU MUST DO

### 1. ANSWER QUESTIONS ABOUT FILES
When the user asks about files, search through the file metadata and give a clear, direct answer including the exact file name, the full file path/location, and helpful context (date modified, file type).

### 2. OPEN FILES ON COMMAND
When the user says "open [file]", respond with the exact file path and include this JSON action at the END of your response on its own line:
ACTION:{"action":"open_file","path":"/exact/path/to/file.ext"}

### 3. SUMMARIZE & EXPLAIN FILE CONTENTS
When the user asks what's in a file, use the extracted content or description of the file to answer concisely but thoroughly.

### 4. FIND RELATED OR SIMILAR FILES
Group and list matching files clearly with their paths.

### 5. HANDLE AMBIGUITY INTELLIGENTLY
If multiple files match a query, list all possible matches and ask the user to confirm which one they mean before opening.

## TONE & STYLE
Be concise, clear, and confident. Always tell the user WHERE a file is. If you cannot find a matching file, say so honestly. Never guess or hallucinate file paths. Only work with what is provided.

## RULES
- Never fabricate file paths or names
- Never open a file without confirming if match is ambiguous  
- Always include the full file path in answers
- If no files are provided, inform the user and ask them to add their file list`;

const SAMPLE_FILES = [
  { name: "Resume_John_2025.pdf", type: "application/pdf", path: "/Users/john/Documents/Resume_John_2025.pdf", date_modified: "2025-02-10", tags: ["resume", "career", "job"], description: "Professional resume with work experience at Google, skills in React and Python, education from MIT." },
  { name: "Vacation_Goa_2024.jpg", type: "image/jpeg", path: "/Users/john/Photos/Goa2024/Vacation_Goa_2024.jpg", date_modified: "2024-03-15", tags: ["vacation", "goa", "2024", "beach", "photos"] },
  { name: "Budget_Q1_2025.xlsx", type: "spreadsheet", path: "/Users/john/Documents/Finance/Budget_Q1_2025.xlsx", date_modified: "2025-01-10", tags: ["budget", "finance", "2025", "Q1"], description: "Q1 2025 budget breakdown: income $85,000, expenses $52,000, savings goal $33,000." },
  { name: "Project_Apollo_Notes.docx", type: "application/docx", path: "/Users/john/Work/Apollo/Project_Apollo_Notes.docx", date_modified: "2025-03-01", tags: ["work", "project", "notes", "apollo"], description: "Meeting notes for Project Apollo. Key decisions: launch Q2, team of 8 engineers." },
  { name: "Tax_Return_2024.pdf", type: "application/pdf", path: "/Users/john/Documents/Finance/Tax_Return_2024.pdf", date_modified: "2024-04-05", tags: ["tax", "finance", "2024"], description: "2024 federal tax return. Refund: $2,340. Filed April 5, 2024." },
  { name: "Family_Christmas_2024.jpg", type: "image/jpeg", path: "/Users/john/Photos/Christmas2024/Family_Christmas_2024.jpg", date_modified: "2024-12-25", tags: ["family", "christmas", "2024", "photos"] },
  { name: "Contract_Freelance_March2025.pdf", type: "application/pdf", path: "/Users/john/Documents/Legal/Contract_Freelance_March2025.pdf", date_modified: "2025-03-05", tags: ["contract", "legal", "freelance"], description: "Freelance contract with Acme Corp. Payment: $8,000 for 3 months. Deliverables: web app MVP." },
  { name: "Reading_List_2025.txt", type: "text/plain", path: "/Users/john/Documents/Personal/Reading_List_2025.txt", date_modified: "2025-01-20", tags: ["books", "reading", "personal"], description: "Books to read in 2025: Atomic Habits, Deep Work, The Pragmatic Programmer, Project Hail Mary." },
  { name: "Passport_Scan.pdf", type: "application/pdf", path: "/Users/john/Documents/IDs/Passport_Scan.pdf", date_modified: "2023-08-10", tags: ["passport", "id", "travel", "important"] },
  { name: "Workout_Plan_Q1.xlsx", type: "spreadsheet", path: "/Users/john/Documents/Health/Workout_Plan_Q1.xlsx", date_modified: "2025-01-05", tags: ["workout", "fitness", "health", "2025"] },
];

const FILE_TYPE_META = {
  "application/pdf":  { icon: "📄", color: "#ff5a5a", label: "PDF" },
  "image/jpeg":       { icon: "🖼️", color: "#38bdf8", label: "Image" },
  "image/png":        { icon: "🖼️", color: "#38bdf8", label: "Image" },
  "spreadsheet":      { icon: "📊", color: "#34d399", label: "Sheet" },
  "application/docx": { icon: "📝", color: "#818cf8", label: "Doc" },
  "text/plain":       { icon: "📃", color: "#94a3b8", label: "Text" },
  "default":          { icon: "📁", color: "#f59e0b", label: "File" },
};

const getMeta = (type) => FILE_TYPE_META[type] || FILE_TYPE_META["default"];

const parseAction = (text) => {
  const match = text.match(/ACTION:(\{.*?\})/);
  if (match) { try { return JSON.parse(match[1]); } catch { return null; } }
  return null;
};

const cleanMsg = (text) => text.replace(/ACTION:\{.*?\}/g, "").trim();

const renderMd = (text) =>
  text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code style='background:#1e1e35;padding:1px 5px;border-radius:4px;font-size:0.9em'>$1</code>")
    .split("\n")
    .map((l) => `<div style="min-height:0.25rem">${l || "&nbsp;"}</div>`)
    .join("");

const QUICK_PROMPTS = [
  "Where is my resume?",
  "Show all finance files",
  "Find my photos",
  "What's in my contract?",
  "Open reading list",
  "List all PDFs",
];

export default function App() {
  const [messages, setMessages] = useState([{
    role: "assistant",
    content: "Hey! I'm **File Mind** 🗂️ — your AI file assistant.\n\nI have **10 sample files** loaded. Try asking:\n\n• *\"Where is my resume?\"*\n• *\"Open my reading list\"*\n• *\"Show all finance files\"*\n\nTap **Index** to load your real files!",
    isIntro: true,
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState(SAMPLE_FILES);
  const [toast, setToast] = useState(null);
  const [sheet, setSheet] = useState(false); // bottom sheet
  const [jsonInput, setJsonInput] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("fm_api_key") || "");
  const [showKeyInput, setShowKeyInput] = useState(false);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const textareaRef = useRef(null);

  // Capture PWA install prompt
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); setShowInstallBanner(true); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") showToast("✅ File Mind installed!");
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const saveApiKey = () => {
    localStorage.setItem("fm_api_key", apiKey);
    setShowKeyInput(false);
    showToast("🔑 API key saved!");
  };

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setLoading(true);

    try {
      const fileContext = files.length > 0
        ? `\n\nFILE INDEX:\n${JSON.stringify(files, null, 2)}`
        : "\n\nNo files loaded. Ask user to add their file index.";

      const history = messages
        .filter(m => !m.isIntro)
        .map(m => ({ role: m.role, content: cleanMsg(m.content) }));

      const key = apiKey || import.meta.env.VITE_ANTHROPIC_API_KEY || "";

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT + fileContext,
          messages: [...history, { role: "user", content: msg }],
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      const raw = data.content?.[0]?.text || "Sorry, I couldn't process that.";
      const action = parseAction(raw);
      const clean = cleanMsg(raw);

      if (action?.action === "open_file") {
        showToast(`📂 Opening: ${action.path.split("/").pop()}`);
      }

      setMessages(prev => [...prev, { role: "assistant", content: clean, action }]);
    } catch (err) {
      const errMsg = err.message?.includes("401")
        ? "⚠️ Invalid API key. Tap 🔑 to update it."
        : err.message?.includes("API key")
        ? "⚠️ No API key set. Tap 🔑 Key to add yours."
        : "⚠️ Error connecting. Check your API key and network.";
      setMessages(prev => [...prev, { role: "assistant", content: errMsg }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) throw new Error();
      setFiles(parsed);
      setJsonError("");
      setSheet(false);
      setJsonInput("");
      showToast(`✅ ${parsed.length} files loaded!`);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `✅ File index updated! I now have **${parsed.length} files** loaded. Ask me anything!`
      }]);
    } catch { setJsonError("Invalid JSON — must be an array of file objects."); }
  };

  return (
    <div style={{
      fontFamily: "'DM Mono', 'Courier New', monospace",
      background: "#08080f",
      height: "100dvh",
      display: "flex",
      flexDirection: "column",
      color: "#e2e2f0",
      overflow: "hidden",
      position: "relative",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        body { overscroll-behavior: none; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #2a2a4a; border-radius: 2px; }
        .msg { animation: rise 0.25s ease forwards; }
        @keyframes rise { from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)} }
        .dot { animation: blink 1.2s infinite; }
        .dot:nth-child(2){animation-delay:.2s}
        .dot:nth-child(3){animation-delay:.4s}
        @keyframes blink{0%,100%{opacity:.2;transform:scale(1)}50%{opacity:1;transform:scale(1.4)}}
        .chip:active { background: #1e1e3a !important; }
        .send:active { transform: scale(0.95); }
        .overlay { animation: fadeIn 0.2s ease; }
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .sheet { animation: slideUp 0.3s cubic-bezier(0.32,0.72,0,1) forwards; }
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        textarea { -webkit-appearance: none; }
        input { -webkit-appearance: none; }
      `}</style>

      {/* ── INSTALL BANNER ── */}
      {showInstallBanner && (
        <div style={{
          background: "linear-gradient(90deg,#6c63ff,#a855f7)",
          padding: "0.6rem 1rem",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          fontSize: "0.75rem", color: "#fff", flexShrink: 0,
        }}>
          <span>📲 Add File Mind to your home screen!</span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={handleInstall} style={{
              background: "#fff", color: "#6c63ff", border: "none",
              borderRadius: "6px", padding: "0.3rem 0.7rem",
              fontWeight: 700, cursor: "pointer", fontSize: "0.72rem",
            }}>Install</button>
            <button onClick={() => setShowInstallBanner(false)} style={{
              background: "transparent", color: "#fff", border: "1px solid #ffffff55",
              borderRadius: "6px", padding: "0.3rem 0.6rem", cursor: "pointer", fontSize: "0.72rem",
            }}>✕</button>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{
        padding: "0.75rem 1rem",
        borderBottom: "1px solid #14142a",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(8,8,15,0.98)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{
            width: 34, height: 34, borderRadius: "10px",
            background: "linear-gradient(135deg,#6c63ff,#a855f7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1rem", boxShadow: "0 0 14px #6c63ff55", flexShrink: 0,
          }}>🗂️</div>
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "0.95rem", color: "#fff", letterSpacing: "-0.02em" }}>FILE MIND</div>
            <div style={{ fontSize: "0.6rem", color: "#44446a", letterSpacing: "0.08em", textTransform: "uppercase" }}>{files.length} files · AI Assistant</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button onClick={() => setShowKeyInput(v => !v)} style={{
            background: "#12122a", border: "1px solid #22224a",
            color: "#888", borderRadius: "8px", padding: "0.4rem 0.6rem",
            cursor: "pointer", fontSize: "0.72rem",
          }}>🔑 Key</button>
          <button onClick={() => setSheet(true)} style={{
            background: "linear-gradient(135deg,#6c63ff22,#a855f722)",
            border: "1px solid #6c63ff44", color: "#a89fff",
            borderRadius: "8px", padding: "0.4rem 0.65rem",
            cursor: "pointer", fontSize: "0.72rem",
          }}>+ Index</button>
        </div>
      </div>

      {/* ── API KEY INPUT ── */}
      {showKeyInput && (
        <div style={{
          background: "#0d0d20", borderBottom: "1px solid #1a1a35",
          padding: "0.75rem 1rem", display: "flex", gap: "0.5rem", flexShrink: 0,
        }}>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-ant-api03-..."
            style={{
              flex: 1, background: "#0a0a18", border: "1px solid #22224a",
              borderRadius: "8px", padding: "0.5rem 0.75rem",
              color: "#e2e2f0", fontSize: "0.75rem", fontFamily: "'DM Mono',monospace",
            }}
          />
          <button onClick={saveApiKey} style={{
            background: "linear-gradient(135deg,#6c63ff,#a855f7)",
            border: "none", borderRadius: "8px", color: "#fff",
            padding: "0.5rem 0.85rem", cursor: "pointer", fontSize: "0.75rem",
          }}>Save</button>
        </div>
      )}

      {/* ── FILE CHIPS ── */}
      <div style={{
        display: "flex", gap: "0.4rem", padding: "0.5rem 1rem",
        overflowX: "auto", borderBottom: "1px solid #0f0f20",
        flexShrink: 0, WebkitOverflowScrolling: "touch",
      }}>
        {files.slice(0, 8).map((f, i) => {
          const m = getMeta(f.type);
          return (
            <div key={i} className="chip" onClick={() => setInput(`Tell me about ${f.name}`)} style={{
              display: "flex", alignItems: "center", gap: "0.3rem",
              background: "#0f0f1e", border: "1px solid #1a1a30",
              borderRadius: "6px", padding: "0.28rem 0.55rem",
              fontSize: "0.68rem", color: "#666", whiteSpace: "nowrap",
              cursor: "pointer", flexShrink: 0,
            }}>
              <span style={{ fontSize: "0.85rem" }}>{m.icon}</span>
              <span style={{ maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</span>
            </div>
          );
        })}
        {files.length > 8 && (
          <div style={{
            background: "#0f0f1e", border: "1px solid #1a1a30",
            borderRadius: "6px", padding: "0.28rem 0.55rem",
            fontSize: "0.68rem", color: "#444", flexShrink: 0,
          }}>+{files.length - 8}</div>
        )}
      </div>

      {/* ── CHAT ── */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "1rem",
        display: "flex", flexDirection: "column", gap: "0.85rem",
        WebkitOverflowScrolling: "touch",
      }}>
        {messages.map((m, i) => (
          <div key={i} className="msg" style={{
            display: "flex",
            flexDirection: m.role === "user" ? "row-reverse" : "row",
            gap: "0.6rem", alignItems: "flex-end",
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "8px", flexShrink: 0,
              background: m.role === "user"
                ? "linear-gradient(135deg,#1a1a40,#2a2a60)"
                : "linear-gradient(135deg,#6c63ff,#a855f7)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.8rem",
              boxShadow: m.role === "assistant" ? "0 0 10px #6c63ff44" : "none",
            }}>
              {m.role === "user" ? "👤" : "🤖"}
            </div>
            <div style={{
              maxWidth: "78%",
              background: m.role === "user" ? "#0e0e28" : "#0b0b1e",
              border: `1px solid ${m.role === "user" ? "#20205a" : "#18183a"}`,
              borderRadius: m.role === "user" ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
              padding: "0.7rem 0.85rem",
              fontSize: "0.8rem", lineHeight: 1.7,
            }}>
              {m.action && (
                <div style={{
                  background: "#0a1a0a", border: "1px solid #1a3a1a",
                  borderRadius: "6px", padding: "0.4rem 0.65rem",
                  marginBottom: "0.5rem", fontSize: "0.68rem",
                  color: "#22cc66", fontFamily: "monospace",
                  wordBreak: "break-all",
                }}>
                  ⚡ {m.action.path}
                </div>
              )}
              <div dangerouslySetInnerHTML={{ __html: renderMd(m.content) }} />
            </div>
          </div>
        ))}

        {loading && (
          <div className="msg" style={{ display: "flex", gap: "0.6rem", alignItems: "flex-end" }}>
            <div style={{
              width: 28, height: 28, borderRadius: "8px", flexShrink: 0,
              background: "linear-gradient(135deg,#6c63ff,#a855f7)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem",
              boxShadow: "0 0 10px #6c63ff44",
            }}>🤖</div>
            <div style={{
              background: "#0b0b1e", border: "1px solid #18183a",
              borderRadius: "4px 12px 12px 12px", padding: "0.7rem 0.85rem",
              display: "flex", gap: "5px", alignItems: "center",
            }}>
              {[0,1,2].map(j => (
                <div key={j} className="dot" style={{
                  width: 5, height: 5, borderRadius: "50%", background: "#6c63ff",
                  animationDelay: `${j*0.2}s`,
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* ── QUICK PROMPTS ── */}
      <div style={{
        display: "flex", gap: "0.4rem", padding: "0.4rem 1rem",
        overflowX: "auto", flexShrink: 0, WebkitOverflowScrolling: "touch",
      }}>
        {QUICK_PROMPTS.map((q, i) => (
          <button key={i} onClick={() => setInput(q)} style={{
            background: "#0b0b1e", border: "1px solid #18183a",
            color: "#555", borderRadius: "16px", padding: "0.28rem 0.7rem",
            cursor: "pointer", fontSize: "0.68rem", whiteSpace: "nowrap", flexShrink: 0,
            fontFamily: "'DM Mono',monospace",
          }}>{q}</button>
        ))}
      </div>

      {/* ── INPUT ── */}
      <div style={{
        padding: "0.6rem 1rem calc(0.6rem + env(safe-area-inset-bottom))",
        borderTop: "1px solid #0f0f20",
        background: "rgba(8,8,15,0.98)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about your files…"
            rows={1}
            style={{
              flex: 1, background: "#0f0f22", border: "1px solid #1e1e3a",
              borderRadius: "12px", padding: "0.65rem 0.9rem",
              color: "#e2e2f0", fontSize: "0.82rem", resize: "none",
              fontFamily: "'DM Mono',monospace", lineHeight: 1.5,
              maxHeight: 100, WebkitAppearance: "none",
            }}
          />
          <button className="send" onClick={handleSend} disabled={loading || !input.trim()} style={{
            background: "linear-gradient(135deg,#6c63ff,#a855f7)",
            border: "none", borderRadius: "12px",
            width: 44, height: 44, cursor: loading ? "not-allowed" : "pointer",
            opacity: loading || !input.trim() ? 0.4 : 1,
            fontSize: "1.1rem", transition: "all 0.15s ease",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 14px #6c63ff44", flexShrink: 0,
          }}>➤</button>
        </div>
      </div>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "calc(5rem + env(safe-area-inset-bottom))",
          left: "50%", transform: "translateX(-50%)",
          background: "#0d1a0d", border: "1px solid #1a3a1a",
          color: "#22cc66", padding: "0.55rem 1.1rem",
          borderRadius: "20px", fontSize: "0.75rem", zIndex: 200,
          animation: "rise 0.3s ease", whiteSpace: "nowrap",
          boxShadow: "0 4px 20px #22cc6622",
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── BOTTOM SHEET (File Index) ── */}
      {sheet && (
        <div className="overlay" onClick={() => setSheet(false)} style={{
          position: "fixed", inset: 0, background: "#000000bb", zIndex: 100,
          display: "flex", alignItems: "flex-end",
        }}>
          <div className="sheet" onClick={e => e.stopPropagation()} style={{
            width: "100%", background: "#0d0d1e",
            borderTop: "1px solid #22224a",
            borderRadius: "20px 20px 0 0",
            padding: "1rem 1rem calc(1rem + env(safe-area-inset-bottom))",
            maxHeight: "80vh", display: "flex", flexDirection: "column", gap: "0.75rem",
            overflow: "hidden",
          }}>
            {/* Handle */}
            <div style={{ width: 40, height: 4, background: "#2a2a4a", borderRadius: 2, margin: "0 auto" }} />
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "0.95rem", color: "#fff" }}>
              Load Your File Index
            </div>
            <div style={{ fontSize: "0.72rem", color: "#44446a", lineHeight: 1.7 }}>
              Paste your file list as JSON. Run the Python scanner on your PC and paste the output here.
            </div>
            <div style={{
              background: "#08081a", borderRadius: "8px",
              padding: "0.65rem", fontSize: "0.65rem", color: "#33335a",
              fontFamily: "monospace", lineHeight: 1.6, border: "1px solid #14142a",
            }}>
              {`[{"name":"file.pdf","type":"application/pdf",\n  "path":"/your/path/file.pdf",\n  "date_modified":"2025-01-01",\n  "tags":["tag1"],"description":"..."}]`}
            </div>
            <textarea
              value={jsonInput}
              onChange={e => { setJsonInput(e.target.value); setJsonError(""); }}
              placeholder="Paste JSON here…"
              style={{
                flex: 1, minHeight: 140, background: "#09091a",
                border: `1px solid ${jsonError ? "#ff5a5a" : "#1a1a35"}`,
                borderRadius: "10px", padding: "0.75rem",
                color: "#e2e2f0", fontSize: "0.75rem", resize: "none",
                fontFamily: "monospace",
              }}
            />
            {jsonError && <div style={{ color: "#ff5a5a", fontSize: "0.72rem" }}>{jsonError}</div>}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={applyJson} style={{
                flex: 1, background: "linear-gradient(135deg,#6c63ff,#a855f7)",
                border: "none", borderRadius: "10px", color: "#fff",
                padding: "0.7rem", cursor: "pointer", fontSize: "0.8rem",
                fontFamily: "'DM Mono',monospace",
              }}>Apply Index</button>
              <button onClick={() => setSheet(false)} style={{
                background: "#1a1a35", border: "1px solid #25254a",
                borderRadius: "10px", color: "#777", padding: "0.7rem 1rem",
                cursor: "pointer", fontSize: "0.8rem",
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
