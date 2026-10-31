import cv2
import numpy as np
from io import BytesIO


def analyze_noise(image_bytes):
    """
    Perform basic image noise analysis.
    """

    try:
        # Convert uploaded bytes into an image
        image_array = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_GRAYSCALE)

        if image is None:
            return {
                "status": "failed",
                "error": "Unable to decode image."
            }

        # Estimate noise using a high-pass filter
        blurred = cv2.GaussianBlur(image, (5, 5), 0)

        noise = cv2.absdiff(image, blurred)

        # Calculate global noise statistics
        mean_noise = float(np.mean(noise))
        noise_variance = float(np.var(noise))

        # Calculate local noise statistics
        height, width = noise.shape

        block_size = 64
        block_values = []

        for y in range(0, height, block_size):
            for x in range(0, width, block_size):

                block = noise[
                    y:min(y + block_size, height),
                    x:min(x + block_size, width)
                ]

                if block.size > 0:
                    block_values.append(float(np.mean(block)))

        if block_values:
            local_mean = float(np.mean(block_values))
            local_std = float(np.std(block_values))
        else:
            local_mean = 0.0
            local_std = 0.0

        return {
            "status": "completed",
            "mean_noise": round(mean_noise, 4),
            "noise_variance": round(noise_variance, 4),
            "local_noise_mean": round(local_mean, 4),
            "local_noise_std": round(local_std, 4),
            "blocks_analyzed": len(block_values),
            "message": "Noise analysis completed successfully."
        }

    except Exception as e:

        return {
            "status": "failed",
            "error": str(e)
        }