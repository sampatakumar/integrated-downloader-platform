# MediaFlow — Universal Media Downloader & Converter

MediaFlow is a modern, privacy-focused, accountless media downloading and conversion platform. Designed with high-performance provider abstractions and a premium dark UI layout, MediaFlow permits users to parse and stream publicly accessible web media directly to their local computers.

## Core Features

- **No Authentication / Quotas**: Completely profile-free. No accounts, emails, premium limits, or download caps.
- **Privacy First**: No server-side logs of user download history or submitted URLs. Downloader history is stored strictly on the user's browser using IndexedDB.
- **Provider Architecture**: Scalable, decoupled platform adapters (YouTube, Vimeo, TikTok, Instagram, Facebook, Reddit, and direct URLs).
- **Real-Time Progress Feed**: Streamed via Server-Sent Events (SSE), calculating actual download speed, percentage completion, and remaining time.
- **Subtle Visual Equalizer**: Staggered ambient equalizer wave that animates during downloads and respects system reduced-motion settings.
- **Bulk Downloader**: Queue multiple links concurrently or upload CSV/TXT files to batch process links.
- **SSRF Defense**: Strict middleware resolving host domains and blocking local or private network routes (e.g., loopback, AWS link-local).
- **Auto-Cleanup**: Automated garbage worker clearing temporary server assets on finished downloads or via clean intervals.

---

## Tech Stack

### Frontend
- **Framework**: React + Vite (ES Modules)
- **Routing**: React Router Dom
- **Icons**: Lucide React
- **Styles**: Custom Modular CSS (Zero Tailwind, high performance)
- **Database**: Native IndexedDB (persisting strictly `id`, `name`, and `url` fields)

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Scraper**: `youtube-dl-exec` (running standalone `yt-dlp` binaries locally)
- **Encoder**: `@ffmpeg-installer/ffmpeg` + `fluent-ffmpeg` (automatic path injection, no global/root installation required)
- **Worker Queues**: In-memory worker pool limiting active concurrent downloads (default limit of 3)

---

## Architecture Design

```
             ┌──────────────────────────────────────────────┐
             │               React Client (Browser)         │
             │  ┌──────────────────┐  ┌──────────────────┐  │
             │  │   Downloader UI  │  │ IndexedDB History│  │
             │  └────────┬─────────┘  └──────────────────┘  │
             └───────────┼──────────────────────────────────┘
                         │
                 HTTP / SSE Requests
                         │
                         ▼
             ┌──────────────────────────────────────────────┐
             │            Express REST Server               │
             │  ┌──────────────────┐  ┌──────────────────┐  │
             │  │ SSRF IP Shield   │  │   Job Queue      │  │
             │  └────────┬─────────┘  └────────┬─────────┘  │
             │           │                     │            │
             │           ▼                     ▼            │
             │  ┌──────────────────┐  ┌──────────────────┐  │
             │  │Provider Registry │  │ FFmpeg & yt-dlp  │  │
             │  └──────────────────┘  └──────────────────┘  │
             └──────────────────────────────────────────────┘
```

---

## Development Environment Setup

### System Prerequisites
- **Node.js**: v18.0.0 or later (Tested on Node v24)
- **NPM**: v9 or later (Tested on NPM v11)

### Installation
Clone the workspace repository, navigate to the root directory, and run the package installer:
```bash
npm run install:all
```
*Note: This automatically triggers dependencies installation inside the root directory, `frontend/`, and `backend/` folders.*

### Environment Variables
Configure a `.env` file at the workspace root directory:
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
TEMP_DIR=./temp
MAX_CONCURRENT_JOBS=3
```

### Running Locally
To launch both client-side and server-side servers concurrently:
```bash
npm run dev
```
- Frontend starts at: `http://localhost:5173`
- Backend server starts at: `http://localhost:5000`

---

## Security Model

1. **Anti-SSRF Protection**: All user URLs are parsed and resolved through DNS lookups. Any destination IP falling under loopback subnets (`127.0.0.0/8`), private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), or link-local endpoints (`169.254.169.254`) is rejected.
2. **Subprocess Isolation**: Subprocesses are spawned using safe argument arrays rather than shell string execution, protecting against shell injection vectors.
3. **Sandbox Path Traversal**: Downloader streams sanitize filenames, stripping directory path symbols (`../`, `/`) to prevent directory traversal attacks.
4. **Temporary File Garbage Collection**: Files are streamed to the browser and deleted immediately upon request finish. An automated cron cleanup worker deletes abandoned folders older than 30 minutes.

---

## Privacy Model
- **Zero Account Registers**: No signups, email entries, or logins.
- **Zero URL Logs**: Backend does not log or permanently store links.
- **Client Side Database**: Local IndexedDB holds history records strictly containing:
  ```json
  {
    "id": 1,
    "name": "Media Title",
    "url": "https://example.com/source-url"
  }
  ```
  Thumbnails, formats, file sizes, or timestamps are never written to the client database.

---

## Legal & Acceptable Use Boundaries
MediaFlow does not bypass access control barriers, paywalls, or circumvent Digital Rights Management (DRM) technologies. The platform only handles publicly accessible streams where downloading is permitted.

---

## Troubleshooting

### FFmpeg / yt-dlp Not Found
MediaFlow uses prebuilt standalone binaries. On initial workspace boot, run:
```bash
npm run install:all
```
This downloads local binaries into the project folder without requiring root permissions.

### SSE Reconnection Loops
If the progress stream keeps reconnecting, check that Reverse Proxies (like Nginx) have buffering disabled:
```nginx
proxy_set_header Connection '';
proxy_http_version 1.1;
chunked_transfer_encoding off;
proxy_buffering off;
```
