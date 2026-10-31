import { useState, useRef, useEffect } from "react";
import { api, errMsg, show, kb, toPct, imgSrc } from "../lib";

function Check({ level, title, summary, rows = [], children }) {
  const label = { ok: "Clear", warn: "Flagged", info: "Details" }[level];
  return (
    <details className={`check ${level}`}>
      <summary>
        <span className="tag">{label}</span>
        <span className="check-main">
          <strong>{title}</strong>
          <span>{summary}</span>
        </span>
        <span className="chev" aria-hidden="true" />
      </summary>
      <div className="check-body">
        {rows.map(([k, v]) => (
          <div className="kv" key={k}>
            <span>{k}</span>
            <strong>{show(v)}</strong>
          </div>
        ))}
        {children}
      </div>
    </details>
  );
}

export default function Analyze() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const reportRef = useRef(null);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const pick = (f) => {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
      setError("Unsupported file. Use a JPG, PNG or WEBP image.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError("");
  };

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await api.post("/api/v1/upload", fd);
      if (data?.success === false) {
        setError(data.error || "Analysis failed. Try another image.");
      } else {
        setResult(data?.result ?? data?.data ?? data);
        setTimeout(() => reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      }
    } catch (e) {
      setError(errMsg(e, "Analysis failed. Try another image."));
    }
    setLoading(false);
  };

  const ai = result?.ai_detection;
  const aiPct = toPct(ai?.ai_probability);
  const isAI = ai?.verdict === "likely_ai" || (!ai?.verdict && aiPct >= 50);
  const manip = result?.manipulation;
  const manipFlag = !!manip?.manipulation_detected;
  const meta = result?.metadata;
  const metaEntries = Object.entries(meta?.metadata && typeof meta.metadata === "object" ? meta.metadata : {});

  let level = "info", headline = "Analysis complete", sub = "Open each check below for details.";
  if (ai) {
    level = isAI ? "warn" : "ok";
    headline = isAI ? "Likely AI-generated" : "Likely a real photo";
    sub = `The model estimates a ${aiPct.toFixed(0)}% chance that this image is AI-generated.`;
  } else if (manipFlag) {
    level = "warn";
    headline = "Possible editing detected";
    sub = "Some regions look copied within the image.";
  }

  return (
    <>
      <section className="app-head">
        <div className="container">
          <h1>Upload an image to analyze</h1>
          <p>We'll run five forensic checks and show you a plain-language report.</p>
        </div>
      </section>

      <section className="section tight analyze-bg">
        <div className="container">
          <div className="analyze-card">
            <label
              className={`dz ${drag ? "drag" : ""} ${preview ? "has" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
            >
              <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => pick(e.target.files[0])} />
              {preview ? (
                <>
                  <img src={preview} alt="Selected" />
                  <span className="dz-change">Change image</span>
                </>
              ) : (
                <span className="dz-empty">
                  <span className="dz-icon" aria-hidden="true">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 16V4" /><path d="M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
                    </svg>
                  </span>
                  <strong>Drop your image here</strong>
                  <span>or <u>browse files</u></span>
                  <small>JPG, PNG or WEBP</small>
                </span>
              )}
            </label>

            <div className="analyze-info">
              <h2>Image analysis</h2>
              <p className="analyze-lead">Upload one image. Every report includes these checks:</p>

              <ul className="includes">
                <li>AI-generated image detection</li>
                <li>Copy-paste editing detection</li>
                <li>Error level analysis</li>
                <li>Noise analysis</li>
                <li>Metadata inspection</li>
              </ul>

              {file && (
                <div className="file-chip">
                  <strong>{file.name}</strong>
                  <span>{kb(file.size)}</span>
                </div>
              )}

              <button className="btn btn-primary btn-block" onClick={analyze} disabled={!file || loading}>
                {loading ? (<><span className="spinner" /> Analyzing…</>) : "Analyze image"}
              </button>
              {error && <div className="error" role="alert">{error}</div>}
            </div>
          </div>
        </div>
      </section>

      {result && (
        <section className="section report tight" ref={reportRef}>
          <div className="container">
            <h2 className="h2">Your report</h2>

            <div className={`verdict ${level}`}>
              <div>
                <p className="verdict-label">Result</p>
                <h3>{headline}</h3>
                <p>{sub}</p>
              </div>
              {ai && (
                <div className="meter" role="img" aria-label={`AI probability ${aiPct.toFixed(0)} percent`}>
                  <div className="meter-labels"><span>Real</span><span>AI</span></div>
                  <div className="meter-track"><i style={{ left: `${aiPct}%` }} /></div>
                  <strong>{aiPct.toFixed(1)}% AI</strong>
                </div>
              )}
            </div>

            <div className="report-grid">
              <div className="panel">
                <h3 className="h3">What each check found</h3>

                {ai && (
                  <Check
                    level={isAI ? "warn" : "ok"}
                    title="AI-generated image check"
                    summary={show(ai.final_result) !== "—" ? show(ai.final_result) : isAI ? "Looks AI-generated" : "Looks like a real photo"}
                    rows={[
                      ["AI probability", `${aiPct.toFixed(1)}%`],
                      ["Real probability", `${(100 - aiPct).toFixed(1)}%`],
                      ["Model confidence", ai.confidence],
                    ]}
                  >
                    {Array.isArray(ai.reasons) && ai.reasons.length > 0 && (
                      <><h4>Why</h4><ul>{ai.reasons.map((r, i) => <li key={i}>{show(r)}</li>)}</ul></>
                    )}
                    {Array.isArray(ai.limitations) && ai.limitations.length > 0 && (
                      <><h4>Limits of this check</h4><ul>{ai.limitations.map((r, i) => <li key={i}>{show(r)}</li>)}</ul></>
                    )}
                  </Check>
                )}

                {manip && (
                  <Check
                    level={manipFlag ? "warn" : "ok"}
                    title="Copy-paste editing check"
                    summary={manipFlag ? "Some regions look duplicated" : "No duplicated regions found"}
                    rows={[["Key points found", manip.keypoints_detected], ["Suspicious matches", manip.suspicious_matches]]}
                  >
                    {manip.message && <p className="muted">{show(manip.message)}</p>}
                  </Check>
                )}

                {result.ela && (
                  <Check
                    level="info"
                    title="Compression check (ELA)"
                    summary="Bright, uneven areas can hint at edits"
                    rows={[["Average error", result.ela.mean_error], ["Highest error", result.ela.max_error]]}
                  >
                    {imgSrc(result.ela.ela_image) && <img className="ela" src={imgSrc(result.ela.ela_image)} alt="Error level map" />}
                  </Check>
                )}

                {result.noise && (
                  <Check
                    level="info"
                    title="Noise check"
                    summary="Real photos have steady grain across the image"
                    rows={[
                      ["Average noise", result.noise.mean_noise],
                      ["Variance", result.noise.noise_variance],
                      ["Local variation", result.noise.local_noise_std],
                      ["Blocks checked", result.noise.blocks_analyzed],
                    ]}
                  />
                )}

                {meta && (
                  <Check
                    level="info"
                    title="Camera data (metadata)"
                    summary={meta.metadata_found ? `${show(meta.metadata_count)} fields found` : "No camera data found"}
                    rows={metaEntries.slice(0, 10)}
                  >
                    {!meta.metadata_found && <p className="muted">Common for AI images and screenshots. It doesn't prove anything on its own.</p>}
                  </Check>
                )}
              </div>

              <aside className="panel">
                <h3 className="h3">Image details</h3>
                {preview && <img className="thumb" src={preview} alt="Analyzed" />}
                <div className="kv"><span>File name</span><strong>{show(result.filename)}</strong></div>
                <div className="kv"><span>Format</span><strong>{show(result.format)}</strong></div>
                <div className="kv"><span>Dimensions</span><strong>{result.width && result.height ? `${result.width} × ${result.height}px` : "—"}</strong></div>
                <div className="kv"><span>File size</span><strong>{kb(result.file_size)}</strong></div>
                <h4>SHA-256 fingerprint</h4>
                <code className="hash">{show(result.sha256)}</code>
              </aside>
            </div>

            <p className="disclaimer">
              Results are technical indicators, not legal proof that an image is authentic, edited or AI-generated.
            </p>
          </div>
        </section>
      )}
    </>
  );
}