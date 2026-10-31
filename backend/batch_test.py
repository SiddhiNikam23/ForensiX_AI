from pathlib import Path
from PIL import Image
from modules.ai_generated_detector.detector_v2 import predict_ai

for folder in ["test_real", "test_ai"]:
    print(f"\n--- {folder} ---")
    for f in sorted(Path(folder).glob("*")):
        if f.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
            continue
        r = predict_ai(Image.open(f))
        print(f"{f.name[:30]:30s} {r['ai_probability']}  {r['verdict']}")