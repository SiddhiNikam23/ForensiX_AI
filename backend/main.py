from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from io import BytesIO
import hashlib
from modules.metadata.analyzer import analyze_metadata
from modules.ela.analyzer import analyze_ela
from modules.noise_analysis.analyzer import analyze_noise
from modules.manipulation.analyzer import analyze_manipulation
from modules.ai_generated_detector.detector_v2 import predict_image  # CHANGED: new detector
from modules.ai_generated_detector.explain import add_explanation


app = FastAPI(
    title="ForensiX AI",
    description="AI-Powered Digital Image Forensics Platform",
    version="1.0.0"
)


# Allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "ForensiX AI Backend is Running",
        "version": "1.0.0"
    }


@app.post("/api/v1/upload")
async def upload_image(file: UploadFile = File(...)):

    # Allowed file types
    allowed_types = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/jpeg"
    ]

    if file.content_type not in allowed_types:
        return {
            "success": False,
            "error": "Only JPG, PNG and WEBP images are allowed."
        }

    # Read image
    image_bytes = await file.read()

    # Check empty file
    if not image_bytes:
        return {
            "success": False,
            "error": "Uploaded file is empty."
        }

    # Validate image
    try:
        image = Image.open(BytesIO(image_bytes))
        image.load()
    except Exception:
        return {
            "success": False,
            "error": "Invalid or corrupted image."
        }

    # Generate SHA-256 hash
    image_hash = hashlib.sha256(image_bytes).hexdigest()
    metadata_result = analyze_metadata(image_bytes)
    ela_result = analyze_ela(image_bytes)
    noise_result = analyze_noise(image_bytes)
    manipulation_result = analyze_manipulation(image_bytes)
    ai_result = predict_image(image_bytes)
    ai_result = add_explanation(ai_result, metadata_result, manipulation_result,
                                image.width, image.height)

    return {
        "success": True,
        "message": "Image uploaded and validated successfully.",
        "filename": file.filename,
        "format": image.format,
        "width": image.width,
        "height": image.height,
        "file_size": len(image_bytes),
        "metadata": metadata_result,
        "ela": ela_result,
        "noise": noise_result,
        "manipulation": manipulation_result,
        "ai_detection": ai_result,
        "sha256": image_hash
    }