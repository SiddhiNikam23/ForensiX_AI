import { useState, useEffect } from "react";
import { api, errMsg, kb } from "../lib";
import { setReport } from "../store";

const toDataUrl = (f) =>
  new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => res(null);
    r.readAsDataURL(f);
  });

export default function Analyze() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const pick = (f) => {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { setError("Unsupported file. Use a JPG, PNG or WEBP image."); return; }
    setFile(f); setPreview(URL.createObjectURL(f)); setError("");
  };

  const analyze = async () => {
    if (!file) return;
    setLoading(true); setError("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await api.post("/api/v1/upload", fd);
      if (data?.success === false) {
        setError(data.error || "Analysis failed. Try another image.");
      } else {
        const dataUrl = await toDataUrl(file);
        setReport({
          result: data?.result ?? data?.data ?? data,
          preview: dataUrl,
          when: new Date().toLocaleString(),
        });
        window.location.hash = "/report";
        return;
      }
    } catch (e) { setError(errMsg(e, "Analysis failed. Try another image.")); }
    setLoading(false);
  };

  return (
    <div className="fx">
      <style>{CSS}</style>

      <section className="fx-hero">
        <h1>Upload an image to analyze</h1>
        <p>We'll run three forensic checks and show you a plain-language report.</p>
      </section>

      <section className="fx-upload">
        <label
          className={`fx-dz ${drag ? "drag" : ""} ${preview ? "has" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
        >
          <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => pick(e.target.files[0])} hidden />
          {preview ? (
            <>
              <img src={preview} alt="Selected" />
              <span className="fx-chg">Change image</span>
            </>
          ) : (
            <div className="fx-empty">
              <div className="fx-dzicon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4" /><path d="M7 9l5-5 5 5" /><path d="M5 20h14" /></svg>
              </div>
              <strong>Drop your image here</strong>
              <span>or <u>browse files</u></span>
              <small>JPG, PNG or WEBP</small>
            </div>
          )}
        </label>

        <div className="fx-info">
          <h2>Image analysis</h2>
          <p className="fx-lead">Upload one image. Every report includes these checks:</p>
          <ul className="fx-includes">
            <li>AI-generated image detection</li>
            <li>Copy-paste editing detection</li>
            <li>Error level and noise analysis</li>
            <li>Metadata inspection</li>
          </ul>
          {file && <div className="fx-file"><strong>{file.name}</strong><span>{kb(file.size)}</span></div>}
          <button className="fx-btn primary" onClick={analyze} disabled={!file || loading}>
            {loading ? "Analyzing…" : "Analyze image"}
          </button>
          {error && <div className="fx-err" role="alert">{error}</div>}
        </div>
      </section>
    </div>
  );
}

const CSS = `
.fx{--line:#e1e6ee;--text:#0f1b2d;--muted:#5a6a80;--bad:#b3261e;--acc:#2563eb;--acc-d:#1d4ed8;--alt:#f4f6fa;
  width:100%;box-sizing:border-box;padding:0 0 70px;color:var(--text);background:var(--alt);min-height:calc(100vh - 68px)}
.fx *{box-sizing:border-box}
.fx h1{font-size:30px;margin:0 0 6px;letter-spacing:-.6px}
.fx-hero{background:linear-gradient(180deg,#0a1a33,#12294d);color:#fff;padding:44px max(24px,calc((100% - 1112px)/2))}
.fx-hero h1{color:#fff;font-size:clamp(26px,3.4vw,36px)}
.fx-hero p{color:#c3cee2;margin:0}
.fx-upload{display:grid;grid-template-columns:minmax(320px,440px) 1fr;gap:48px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:24px;padding:40px;margin:40px auto;max-width:1112px;box-shadow:0 1px 2px rgba(15,27,45,.04),0 18px 48px rgba(15,27,45,.08)}
.fx-dz{position:relative;display:block;width:100%;aspect-ratio:1/1;border-radius:20px;border:2px dashed #b9c8e4;background:linear-gradient(180deg,#f8faff,#eef3fc);cursor:pointer;overflow:hidden;transition:border-color .15s,background .15s}
.fx-dz:hover,.fx-dz.drag{border-color:var(--acc);background:#eaf1ff}
.fx-dz.has{border:1px solid var(--line);background:#0b1220}
.fx-dz img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
.fx-chg{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);background:rgba(255,255,255,.95);color:var(--text);padding:8px 16px;border-radius:99px;font-size:13px;font-weight:700;box-shadow:0 4px 12px rgba(0,0,0,.25)}
.fx-empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:24px;text-align:center;color:var(--muted);font-size:15px}
.fx-empty strong{color:var(--text);font-size:18px}
.fx-empty u{color:var(--acc);font-weight:600;text-decoration:none}
.fx-empty small{margin-top:10px;padding:4px 12px;border-radius:99px;background:#fff;border:1px solid var(--line);font-size:12px;font-weight:600;color:var(--muted)}
.fx-dzicon{width:64px;height:64px;border-radius:18px;background:#fff;border:1px solid #d3def2;color:var(--acc);display:grid;place-items:center;margin-bottom:14px;box-shadow:0 6px 16px rgba(37,99,235,.12)}
.fx-info{display:flex;flex-direction:column;gap:16px;min-width:0}
.fx-info h2{font-size:26px;letter-spacing:-.5px;margin:0}
.fx-lead{margin:-6px 0 0;color:var(--muted)}
.fx-includes{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.fx-includes li{position:relative;padding-left:30px;font-weight:500}
.fx-includes li::before{content:"";position:absolute;left:0;top:3px;width:18px;height:18px;border-radius:50%;background:#e9eff9}
.fx-includes li::after{content:"";position:absolute;left:6px;top:7px;width:4px;height:8px;border:solid var(--acc);border-width:0 2px 2px 0;transform:rotate(45deg)}
.fx-file{display:flex;justify-content:space-between;gap:12px;background:var(--alt);border:1px solid var(--line);padding:12px 14px;border-radius:12px;font-size:14px}
.fx-file strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fx-file span{color:var(--muted);flex-shrink:0}
.fx-btn{border-radius:12px;height:52px;font-weight:600;font-family:inherit;font-size:16px;cursor:pointer;border:1px solid var(--acc);background:var(--acc);color:#fff;transition:background .15s}
.fx-btn:hover:not(:disabled){background:var(--acc-d)}
.fx-btn:disabled{background:#b8c4d8;border-color:#b8c4d8;cursor:not-allowed}
.fx-err{background:#fdecea;border:1px solid #f3b8b3;color:var(--bad);border-radius:10px;padding:10px 14px;font-size:14px;font-weight:500}
@media(max-width:860px){.fx-upload{grid-template-columns:1fr;padding:24px;gap:28px;margin:24px 16px}.fx-dz{max-width:440px;margin:0 auto}}
`;