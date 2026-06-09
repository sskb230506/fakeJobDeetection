# VeriWork: AI Fake Job Detector (Chrome Extension)

A production-grade Chrome Extension built using **Manifest V3**, **React**, **TypeScript**, **Tailwind CSS v4**, and **Vite**.

## Features
- **Real-Time scanning**: Actively scans job board pages (LinkedIn, Indeed, Glassdoor) for scam indicators using mutation observers.
- **Isolated scorecard badges**: Injects warning and trust rating components scoped securely inside the host page's DOM via **Shadow DOM** boundaries.
- **Rules-Based evaluation engine**: Evaluates text descriptions, contact email domains (flagging public address providers), job salary metrics, and recruiter metadata to compute a credibility score.
- **Dashboard interface**: An extension popup showing detailed active scans, scan history logger, and switchable user options.

---

## File Structure

```
FakeJobDetection/
├── dist/                   # Built production extension files (Unpacked folder)
├── src/                    # Source files
│   ├── background/         # Service worker files
│   ├── content/            # Injected content scripts & styles
│   ├── popup/              # React Popup App source
│   ├── utils/              # Typings and helpers
│   └── icons/              # Base icons
├── build.js                # Programmatic build runner
├── package.json            # Node scripts
└── tsconfig.json           # TS configuration
```

---

## Development & Build Pipeline

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Build the Extension**:
   ```bash
   npm run build
   ```
   *Note: This runs the custom `build.js` pipeline which compiles each entrypoint (popup, background, content script) in isolation using Vite to prevent bundle splitting conflicts.*

3. **Development Mode**:
   ```bash
   npm run dev
   ```
   *Runs the Vite development server specifically for standard popup UI rendering and adjustments.*

---

## Loading the Extension into Chrome

1. Open Chrome and navigate to `chrome://extensions`.
2. Toggle on **Developer mode** in the upper-right corner.
3. Click the **Load unpacked** button in the upper-left corner.
4. Select the **`dist`** directory inside this repository.
5. The extension is now loaded and ready for use.
