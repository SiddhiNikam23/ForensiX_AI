# import numpy as np
# import onnxruntime as ort
# from io import BytesIO
# from pathlib import Path
# from PIL import Image

# session = ort.InferenceSession(
#     str(Path(__file__).parent / "detector.onnx"),
#     providers=["CPUExecutionProvider"],
# )

# MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
# STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)
# SIZE = 192
# SHORT = 200


# def _prep(crop):
#     x = (crop.astype(np.float32) / 255.0 - MEAN) / STD
#     return x.transpose(2, 0, 1)


# def predict_ai(img: Image.Image) -> dict:
#     img = img.convert("RGB")

#     # shrink so the short side is 200 px (same as training)
#     w, h = img.size
#     k = SHORT / min(w, h)
#     img = img.resize((max(SHORT, round(w * k)), max(SHORT, round(h * k))), Image.LANCZOS)
#     a = np.array(img)
#     h, w = a.shape[:2]

#     # 5 crops + their mirror images
#     ys = [0, 0, h - SIZE, h - SIZE, (h - SIZE) // 2]
#     xs = [0, w - SIZE, 0, w - SIZE, (w - SIZE) // 2]
#     crops = [a[y:y + SIZE, x:x + SIZE] for y, x in zip(ys, xs)]
#     crops += [c[:, ::-1] for c in crops]
#     batch = np.stack([_prep(np.ascontiguousarray(c)) for c in crops])

#     # run model and average
#     logits = session.run(None, {"input": batch})[0]
#     e = np.exp(logits - logits.max(1, keepdims=True))
#     p_ai = float((e / e.sum(1, keepdims=True))[:, 1].mean())

#     if p_ai < 0.35:
#         verdict = "likely_real"
#     elif p_ai > 0.65:
#         verdict = "likely_ai"
#     else:
#         verdict = "inconclusive"

#     return {"ai_probability": round(p_ai, 3), "verdict": verdict}


# def predict_image(image_bytes: bytes) -> dict:
#     """Used by main.py: takes raw image bytes."""
#     img = Image.open(BytesIO(image_bytes))
#     return predict_ai(img)












#-------------------------------------------------------------------------------------------




import numpy as np
import onnxruntime as ort
from io import BytesIO
from pathlib import Path
from PIL import Image

session = ort.InferenceSession(
    str(Path(__file__).parent / "detector.onnx"),
    providers=["CPUExecutionProvider"],
)

MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)
SIZE = 192
SHORT = 200
MIN_SIDE = 128


def _prep(crop):
    x = (crop.astype(np.float32) / 255.0 - MEAN) / STD
    return x.transpose(2, 0, 1)


def predict_ai(img: Image.Image) -> dict:
    img = img.convert("RGB")
    w, h = img.size

    if min(w, h) < MIN_SIDE:
        return {
            "ai_probability": None,
            "verdict": "image_too_small",
            "note": f"Image is {w}x{h}px, too small for reliable AI detection.",
        }

    k = SHORT / min(w, h)
    img = img.resize((max(SHORT, round(w * k)), max(SHORT, round(h * k))), Image.LANCZOS)
    a = np.array(img)
    h, w = a.shape[:2]

    ys = [0, 0, h - SIZE, h - SIZE, (h - SIZE) // 2]
    xs = [0, w - SIZE, 0, w - SIZE, (w - SIZE) // 2]
    crops = [a[y:y + SIZE, x:x + SIZE] for y, x in zip(ys, xs)]
    crops += [c[:, ::-1] for c in crops]
    batch = np.stack([_prep(np.ascontiguousarray(c)) for c in crops])

    logits = session.run(None, {"input": batch})[0]
    e = np.exp(logits - logits.max(1, keepdims=True))
    p_ai = float((e / e.sum(1, keepdims=True))[:, 1].mean())

    if p_ai < 0.35:
        verdict = "likely_real"
    elif p_ai > 0.65:
        verdict = "likely_ai"
    else:
        verdict = "inconclusive"

    return {"ai_probability": round(p_ai, 3), "verdict": verdict}


def predict_image(image_bytes: bytes) -> dict:
    img = Image.open(BytesIO(image_bytes))
    return predict_ai(img)