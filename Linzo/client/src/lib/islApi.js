export async function predictKeypointsHTTP(frames, { url } = {}) {
  // Flexible endpoint: if `url` includes 'http' and a path, use it as-is;
  // otherwise treat it as base and append /predictions.
  const base = url || (import.meta?.env?.VITE_ISL_HTTP_URL || 'http://localhost:8000');
  const endpoint = /^https?:\/\//i.test(base) && /\/[^/]/.test(base.replace(/^https?:\/\/[^/]+/, ''))
    ? base
    : `${base.replace(/\/$/, '')}/predictions`;
  const expected = frames.length * 27 * 3;
  const flat = new Float32Array(expected);
  let k = 0;
  for (const f of frames) {
    for (let i = 0; i < 27 * 3; i++) flat[k++] = f[i] ?? 0;
  }
  const body = { keypoints: Array.from(flat), num_frames: frames.length };
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Alphabet HTTP prediction using ViT server
export async function predictAlphabetImageBase64(imageBase64, { url } = {}) {
  const base = url || import.meta?.env?.VITE_ISL_ALPHA_HTTP_URL;
  if (!base) {
    throw new Error('Alphabet server not configured (VITE_ISL_ALPHA_HTTP_URL missing)');
  }
  const endpoint = `${base.replace(/\/$/, '')}/predict`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64: imageBase64, top_k: 3 })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function predictAlphabetFromKeypoints(keypoints, { url } = {}) {
  const base = url || import.meta?.env?.VITE_ISL_ALPHA_HTTP_URL;
  if (!base) {
    throw new Error('Alphabet server not configured (VITE_ISL_ALPHA_HTTP_URL missing)');
  }
  const endpoint = `${base.replace(/\/$/, '')}/predict_keypoints`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keypoints })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function predictAlphabetImageM3(imageBase64, { url } = {}) {
  const base = url || import.meta?.env?.VITE_ISL_ALPHA_HTTP_URL;
  if (!base) {
    throw new Error('Alphabet server not configured (VITE_ISL_ALPHA_HTTP_URL missing)');
  }
  const endpoint = `${base.replace(/\/$/, '')}/predict`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64: imageBase64 })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}


