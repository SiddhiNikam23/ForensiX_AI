from PIL import Image, ImageChops, ImageEnhance
from io import BytesIO
import numpy as np


def analyze_ela(image_bytes, quality=90):

    try:
        # Check original format
        source = Image.open(BytesIO(image_bytes))
        original_format = source.format

        if original_format not in ["JPEG", "JPG"]:
            return {
                "status": "not_available",
                "message": "ELA is primarily supported for JPEG images.",
                "format": original_format
            }

        original = source.convert("RGB")

        # Recompress image
        compressed_buffer = BytesIO()

        original.save(
            compressed_buffer,
            format="JPEG",
            quality=quality
        )

        compressed_buffer.seek(0)

        compressed = Image.open(compressed_buffer).convert("RGB")

        # Calculate pixel differences
        difference = ImageChops.difference(
            original,
            compressed
        )

        diff_array = np.asarray(
            difference
        ).astype(np.float32)

        mean_error = float(np.mean(diff_array))
        max_error = float(np.max(diff_array))

        # Enhance ELA visualization
        enhanced = ImageEnhance.Brightness(
            difference
        ).enhance(10)

        # Convert ELA image to Base64
        ela_buffer = BytesIO()

        enhanced.save(
            ela_buffer,
            format="JPEG"
        )

        import base64

        ela_base64 = base64.b64encode(
            ela_buffer.getvalue()
        ).decode("utf-8")

        return {
            "status": "completed",
            "mean_error": round(mean_error, 4),
            "max_error": round(max_error, 4),
            "quality": quality,
            "ela_image": f"data:image/jpeg;base64,{ela_base64}",
            "message": "ELA analysis completed successfully."
        }

    except Exception as e:

        return {
            "status": "failed",
            "error": str(e)
        }