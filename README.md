# iTelemetry

A modern, minimal overlay for iRacing that displays a real-time input graph for brake and throttle, as well as the current gear. Designed for clarity and ease of use, this overlay helps you visualize your driving inputs while racing.

---

## ✨ Features

-   **Input Graph:** Visualizes brake and throttle application in real time.
-   **Current Gear Display:** Always see which gear you're in.
-   **Movable & Resizable:** Easily reposition and resize the overlay to fit your setup.

---

## ⌨️ Keyboard Shortcuts

-   `Alt + Q` — Close the application
-   `Alt + D` — Enter movable mode (move & resize the overlay)

---

## 🚀 Getting Started

### Prerequisites

-   **Node.js** (v21+ recommended)
-   **node-gyp** (required for `iracing-sdk`)
    -   Install globally if not present: `npm install -g node-gyp`
    -   [node-gyp installation guide](https://github.com/nodejs/node-gyp#installation)

### Development Setup

1. **Install dependencies:**
    ```bash
    npm install
    ```
2. **Compile TypeScript frontend:**
    ```bash
    npx tsc frontend/app.ts
    ```

---

## 🖥️ Usage

### Start the Frontend

```bash
npm start
```

### Start the Backend

```bash
npm run backend
```

---

## 📁 Project Structure

```
frontend/    # Overlay UI (TypeScript, HTML, CSS)
src/         # Main process, backend, preload scripts
```

---

## 🛠️ Troubleshooting

-   If you encounter issues with `iracing-sdk`, ensure `node-gyp` and its build tools are installed correctly.
-   For Windows users, you may need to install [windows-build-tools](https://github.com/felixrieseberg/windows-build-tools) for node-gyp compatibility.

---

## 📃 License

MIT
