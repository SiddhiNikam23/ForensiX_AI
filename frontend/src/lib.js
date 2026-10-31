import axios from "axios";

export const API_ORIGIN = "http://127.0.0.1:8000";
export const TOKEN_KEY = "fx_token";

export const api = axios.create({ baseURL: API_ORIGIN });

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem(TOKEN_KEY);
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

/* Numbers from your training run — edit if you retrain */
export const MODEL = {
  accuracy: 83.5,
  auc: 0.903,
  falseAlarm: 16.2,
  missed: 18.0,
  trainAcc: 99.9,
  epochs: 10,
  device: "GPU (CUDA)",
  m: { rr: 419, ra: 81, ar: 90, aa: 410 },
};

export const EPOCHS = {
  train: [0.759, 0.872, 0.935, 0.97, 0.991, 0.994, 0.998, 0.998, 0.998, 0.999],
  val: [0.813, 0.785, 0.803, 0.825, 0.819, 0.82, 0.835, 0.826, 0.835, 0.823],
};

export const show = (v) =>
  v === null || v === undefined || v === ""
    ? "—"
    : typeof v === "object"
    ? JSON.stringify(v)
    : String(v);

export const kb = (b) => (b ? `${(Number(b) / 1024).toFixed(1)} KB` : "—");

export const toPct = (v) => {
  let n = Number(v);
  if (!Number.isFinite(n)) n = 0;
  if (n <= 1) n *= 100;
  return Math.min(100, Math.max(0, n));
};

export const imgSrc = (s) => {
  if (!s || typeof s !== "string") return null;
  if (/^(data:|https?:|blob:)/.test(s)) return s;
  if (s.startsWith("/")) return API_ORIGIN + s;
  return `data:image/png;base64,${s}`;
};

export const errMsg = (e, fallback) => {
  if (!e?.response) return "Can't reach the server. Make sure the backend is running on port 8000.";
  const d = e.response.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d) && d[0]?.msg) return d[0].msg;
  return e.response.data?.error || fallback;
};