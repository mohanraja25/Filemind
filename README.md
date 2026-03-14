# 🗂️ File Mind — AI Document Assistant

A PWA (installable mobile app) powered by Claude AI that helps you search, understand and manage your files.

---

## ⚡ Quick Setup (5 minutes)

### Step 1 — Get an API Key
1. Go to https://console.anthropic.com
2. Sign up / log in
3. Click **API Keys** → **Create Key**
4. Copy the key (starts with `sk-ant-...`)

### Step 2 — Install Node.js
Download from https://nodejs.org (pick the LTS version)

### Step 3 — Run the App
Open Terminal (Mac/Linux) or Command Prompt (Windows):

```bash
# Go into the project folder
cd file-mind

# Install dependencies
npm install

# Build the app
npm run build

# Start the server
npm run preview
```

You'll see: `Local: http://localhost:4173`

### Step 4 — Add Your API Key in the App
- Open http://localhost:4173 in your browser
- Tap the **🔑 Key** button at the top
- Paste your API key → tap **Save**

---

## 📱 Install on Your Phone

### Android
1. Open **Chrome** on your phone
2. Go to your computer's IP + port, e.g. `http://192.168.1.5:4173`
   - Find your IP: run `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
3. Tap the **3-dot menu** (⋮) in Chrome
4. Tap **"Add to Home Screen"**
5. Tap **"Install"** — done! ✅

### iPhone (iOS)
1. Open **Safari** on your iPhone (must be Safari, not Chrome)
2. Go to `http://YOUR_PC_IP:4173`
3. Tap the **Share button** (box with arrow pointing up)
4. Scroll down → tap **"Add to Home Screen"**
5. Tap **"Add"** — done! ✅

---

## 🗃️ Load Your Real Files

Run this on your computer to scan your folders:

```python
import os, json, mimetypes
from datetime import datetime

def scan_folder(root):
    files = []
    for r, _, fs in os.walk(root):
        for f in fs:
            path = os.path.join(r, f)
            mime, _ = mimetypes.guess_type(f)
            try:
                stat = os.stat(path)
                files.append({
                    "name": f,
                    "type": mime or "unknown",
                    "path": path,
                    "date_modified": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d"),
                    "tags": f.lower().replace(".", " ").split(),
                })
            except: pass
    return files

output = scan_folder("/Users/yourname/Documents")  # change this path
with open("my_files.json", "w") as fp:
    json.dump(output, fp, indent=2)
print(f"Saved {len(output)} files to my_files.json")
```

Then in the app tap **+ Index**, paste the JSON, tap **Apply Index**.

---

## 💬 Example Questions to Ask

- "Where is my resume?"
- "Show all PDF files"
- "What's in my freelance contract?"
- "Find all photos from 2024"
- "Open my reading list"
- "List all finance documents"
