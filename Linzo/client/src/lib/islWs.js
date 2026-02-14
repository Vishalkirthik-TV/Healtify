// Minimal WebSocket client for streaming 27*3 frames to a backend (BERT phrases)
export class ISLBertWSClient {
	constructor({ url, onOpen, onClose, onError, onPrediction }) {
		this.url = url;
		this.onOpen = onOpen;
		this.onClose = onClose;
		this.onError = onError;
		this.onPrediction = onPrediction;
		this.ws = null;
		this.isConnected = false;
	}
	connect() {
		if (this.ws) return;
		this.ws = new WebSocket(this.url);
		this.ws.binaryType = 'arraybuffer';
		this.ws.onopen = () => { this.isConnected = true; this.onOpen && this.onOpen(); };
		this.ws.onclose = () => { this.isConnected = false; this.ws = null; this.onClose && this.onClose(); };
		this.ws.onerror = (e) => { this.onError && this.onError(e); };
		this.ws.onmessage = (e) => {
			try { this.onPrediction && this.onPrediction(JSON.parse(e.data)); } catch {}
		};
	}
	disconnect() { if (this.ws) try { this.ws.close(); } catch {} }
	sendKeypointsFloatArray(floatArray) {
		if (!this.ws || !this.isConnected) return;
		const arr = floatArray instanceof Float32Array ? floatArray : new Float32Array(floatArray);
		this.ws.send(arr.buffer);
	}
}

export function flattenFrames(frames) {
	if (!Array.isArray(frames) || frames.length === 0) return new Float32Array(0);
	const frameSize = frames[0].length;
	const out = new Float32Array(frames.length * frameSize);
	for (let i = 0; i < frames.length; i++) {
		out.set(frames[i], i * frameSize);
	}
	return out;
}

// (Deduplicated implementation kept above)
