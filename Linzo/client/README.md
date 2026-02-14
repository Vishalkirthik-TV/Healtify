# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## ISL BERT Realtime Integration

This client can stream 27-point pose keypoints to a Python backend over WebSocket and receive word predictions.

Environment:
```
VITE_ISL_WS_URL=ws://localhost:8000/ws
```

Backend server (FastAPI): start from repo root:
```bash
cd INCLUDE-ISL
python3 backend.py
```

Notes:
- The backend expects a BERT checkpoint at `include_bert/include/bert/epoch=328-step=18094.ckpt` and label map at `INCLUDE-ISL/label_maps/label_map_include.json`.
- Client component `src/components/VideoWithPoseDetection.jsx` builds a 27x3 pose subset each frame and sends the last 16-frame window.
- Predictions will show as overlay text and use Web Speech API for TTS.
