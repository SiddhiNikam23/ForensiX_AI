import { MODEL, EPOCHS } from "../lib";

const SAMPLES = [
  { file: "image_real.jpg", size: "45.6 KB", verdict: "Real & authentic", cls: "real", icon: "✓" },
  { file: "image_edit.jpg", size: "45.6 KB", verdict: "Edited & manipulated", cls: "edit", icon: "?" },
  { file: "image_ai.jpg", size: "45.6 KB", verdict: "AI-generated", cls: "ai", icon: "✦" },
];

const STEPS = [
  { t: "Upload an image", d: "Choose a JPG, PNG or WEBP file from your device." },
  { t: "We run five checks", d: "Metadata, compression, noise, copy-paste editing and an AI-image classifier." },
  { t: "Read the report", d: "Get a plain-language verdict with the evidence behind it." },
];

const FEATURES = [
  { t: "AI-image detection", d: "A neural network estimates how likely the image is AI-generated." },
  { t: "Manipulation detection", d: "Finds regions that were copied and pasted within the same image." },
  { t: "Error level analysis", d: "Highlights areas saved at a different compression level." },
  { t: "Noise analysis", d: "Checks whether the sensor-style grain is consistent across the image." },
  { t: "Metadata inspection", d: "Reads camera and software details embedded in the file." },
  { t: "Digital fingerprint", d: "A SHA-256 hash that identifies this exact file." },
];

const FAQ = [
  ["Is the result proof?", "No. Results are technical indicators. Use them together with other evidence."],
  ["Why can a real photo be flagged as AI?", `The model wrongly flags about ${MODEL.falseAlarm}% of real photos. Heavy editing and compression can also confuse it.`],
  ["Why is there no camera data in my image?", "Screenshots, social-media downloads and AI images usually have no metadata. Missing data alone proves nothing."],
];

function Ring({ value, size = 150 }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  return (
    <svg className="ring" width={size} height={size} viewBox="0 0 140 140" role="img" aria-label={`${value}% accuracy`}>
      <circle cx="70" cy="70" r={r} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="12" />
      <circle
        cx="70" cy="70" r={r} fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} transform="rotate(-90 70 70)"
      />
      <text x="70" y="76" textAnchor="middle" className="ring-num">{value}%</text>
    </svg>
  );
}

function EpochChart() {
  const W = 520, H = 270, L = 46, R = 16, T = 16, B = 40;
  const lo = 0.7, hi = 1.0;
  const x = (i) => L + (i * (W - L - R)) / (EPOCHS.train.length - 1);
  const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const line = (arr) => arr.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Training and validation accuracy over 10 epochs">
      {[0.7, 0.8, 0.9, 1.0].map((g) => (
        <g key={g}>
          <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="#e1e6ee" />
          <text x={L - 8} y={y(g) + 4} textAnchor="end" className="ax">{Math.round(g * 100)}%</text>
        </g>
      ))}
      {EPOCHS.train.map((_, i) => (
        <text key={i} x={x(i)} y={H - 16} textAnchor="middle" className="ax">{i + 1}</text>
      ))}
      <text x={(L + W - R) / 2} y={H - 1} textAnchor="middle" className="ax">Epoch</text>
      <polyline points={line(EPOCHS.train)} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinejoin="round" />
      <polyline points={line(EPOCHS.val)} fill="none" stroke="#e0793a" strokeWidth="3" strokeLinejoin="round" />
      {EPOCHS.train.map((v, i) => <circle key={`t${i}`} cx={x(i)} cy={y(v)} r="3.5" fill="#2563eb" />)}
      {EPOCHS.val.map((v, i) => <circle key={`v${i}`} cx={x(i)} cy={y(v)} r="3.5" fill="#e0793a" />)}
    </svg>
  );
}

export default function Home({ go }) {
  const m = MODEL.m;
  const cta = () => go("/analyze");

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="container hero-in">
          <div className="hero-copy">
            <h1>Know if an image is real, edited or&nbsp;AI&#8209;made.</h1>
            <p>
              ForensiX AI runs five forensic checks on your image and explains the result in plain
              language.
            </p>
            <ul className="hero-points">
              <li>Detects AI-generated images</li>
              <li>Finds copy-paste editing</li>
              <li>Shows the evidence, not just a score</li>
            </ul>
          </div>

          <div className="uploader sample-card">
            <h2>Analyze an image</h2>
            <div className="samples">
              {SAMPLES.map((s) => (
                <figure key={s.file}>
                  <div className="thumb-box">
                    <img
                      src={`/samples/${s.file}`}
                      alt={s.verdict}
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  </div>
                  <figcaption>
                    <strong>{s.file}</strong>
                    <span>{s.size}</span>
                  </figcaption>
                  <span className={`badge ${s.cls}`}>
                    <i aria-hidden="true">{s.icon}</i>
                    {s.verdict}
                  </span>
                </figure>
              ))}
            </div>
            <button className="btn btn-primary btn-block" onClick={cta}>
              Start analyzing
            </button>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="strip">
        <div className="container strip-in">
          <div><strong>5</strong><span>forensic checks</span></div>
          <div><strong>{MODEL.accuracy}%</strong><span>model accuracy</span></div>
          <div><strong>{MODEL.auc}</strong><span>AUC score</span></div>
          <div><strong>SHA-256</strong><span>file fingerprint</span></div>
        </div>
      </section>

      {/* MODEL PERFORMANCE */}
      <section className="section" id="model">
        <div className="container">
          <h2 className="h2">How does the AI model perform?</h2>
          <p className="section-sub">
            Results from our test set of 1,000 images: 500 real and 500 AI-generated.
          </p>

          <div className="acc-banner">
            <Ring value={MODEL.accuracy} size={170} />
            <div>
              <h3>{MODEL.accuracy}% of new images classified correctly</h3>
              <p>
                On 1,000 images the model had never seen, it got {m.rr + m.aa} right. It wrongly
                flagged {MODEL.falseAlarm}% of real photos and missed {MODEL.missed}% of AI images,
                so every report pairs it with four other forensic checks.
              </p>
            </div>
          </div>

          <div className="model-stats">
            <div><strong>{MODEL.accuracy}%</strong><span>Overall accuracy</span><small>About 8 in 10 correct</small></div>
            <div><strong>{MODEL.auc}</strong><span>AUC score</span><small>1.0 is perfect, 0.5 is guessing</small></div>
            <div><strong>{MODEL.falseAlarm}%</strong><span>Real photos flagged as AI</span><small>False alarms</small></div>
            <div><strong>{MODEL.missed}%</strong><span>AI images missed</span><small>Passed as real</small></div>
          </div>

          <div className="model-grid">
            <div className="panel">
              <h3 className="h3">Accuracy over training</h3>
              <div className="legend">
                <span><i style={{ background: "#2563eb" }} />Training images</span>
                <span><i style={{ background: "#e0793a" }} />New images</span>
              </div>
              <EpochChart />
              <p className="muted">
                Training accuracy reaches {MODEL.trainAcc}% but new-image accuracy levels off near
                83%. That gap means the model can miss newer AI generators.
              </p>
            </div>

            <div className="panel">
              <h3 className="h3">Correct and wrong calls</h3>
              <div className="matrix">
                <span />
                <span className="mh">Said real</span>
                <span className="mh">Said AI</span>
                <span className="mh left">Was real</span>
                <div className="cell good">{m.rr}<small>correct</small></div>
                <div className="cell bad">{m.ra}<small>wrong</small></div>
                <span className="mh left">Was AI</span>
                <div className="cell bad">{m.ar}<small>wrong</small></div>
                <div className="cell good">{m.aa}<small>correct</small></div>
              </div>
              <div className="kv"><span>Training rounds</span><strong>{MODEL.epochs} epochs</strong></div>
              <div className="kv"><span>Trained on</span><strong>{MODEL.device}</strong></div>
              <p className="note">
                Treat the AI verdict as a strong hint, not a final answer. It is combined with four
                other forensic checks in every report.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section alt" id="how">
        <div className="container">
          <h2 className="h2">How it works</h2>
          <p className="section-sub">From upload to report in a few seconds.</p>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.t}>
                <span className="step-n">{i + 1}</span>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CHECKS */}
      <section className="section" id="checks">
        <div className="container">
          <h2 className="h2">What we check</h2>
          <p className="section-sub">Several signals together are more reliable than any single test.</p>
          <div className="features">
            {FEATURES.map((f) => (
              <div className="feature" key={f.t}>
                <h3>{f.t}</h3>
                <p>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section alt" id="faq">
        <div className="container narrow">
          <h2 className="h2">Frequently asked questions</h2>
          <div className="faq">
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>{q}<span className="chev" aria-hidden="true" /></summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-band">
        <div className="container cta-in">
          <h2>Ready to check an image?</h2>
          <button className="btn btn-light btn-lg" onClick={cta}>
            Analyze an image
          </button>
        </div>
      </section>
    </>
  );
}