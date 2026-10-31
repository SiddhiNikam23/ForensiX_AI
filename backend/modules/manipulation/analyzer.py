import cv2
import numpy as np
import base64


def analyze_manipulation(image_bytes):
    """
    Basic copy-move manipulation detection using ORB
    feature matching with visualization.
    """

    try:
        # Convert image bytes to OpenCV image
        image_array = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

        if image is None:
            return {
                "status": "failed",
                "error": "Unable to decode image."
            }

        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # ORB feature detector
        orb = cv2.ORB_create(nfeatures=2000)

        keypoints, descriptors = orb.detectAndCompute(
            gray,
            None
        )

        # Create basic keypoint visualization
        keypoint_image = cv2.drawKeypoints(
            image,
            keypoints if keypoints else [],
            None,
            color=(0, 255, 0),
            flags=cv2.DRAW_MATCHES_FLAGS_DRAW_RICH_KEYPOINTS
        )

        # Encode visualization
        _, buffer = cv2.imencode(
            ".jpg",
            keypoint_image
        )

        visualization = base64.b64encode(
            buffer
        ).decode("utf-8")

        # Not enough features
        if descriptors is None or len(keypoints) < 10:
            return {
                "status": "completed",
                "manipulation_detected": False,
                "suspicious_matches": 0,
                "suspicious_regions": [],
                "keypoints_detected": len(keypoints),
                "visualization": f"data:image/jpeg;base64,{visualization}",
                "message": "Not enough features for copy-move analysis."
            }

        # BFMatcher
        matcher = cv2.BFMatcher(
            cv2.NORM_HAMMING,
            crossCheck=False
        )

        matches = matcher.knnMatch(
            descriptors,
            descriptors,
            k=2
        )

        good_matches = []

        for pair in matches:

            if len(pair) < 2:
                continue

            m, n = pair

            # Ignore matching a feature with itself
            if m.queryIdx == m.trainIdx:
                continue

            # Lowe ratio test
            if m.distance < 0.75 * n.distance:
                good_matches.append(m)

        suspicious_regions = []

        for match in good_matches[:50]:

            point1 = keypoints[match.queryIdx].pt
            point2 = keypoints[match.trainIdx].pt

            x1, y1 = point1
            x2, y2 = point2

            distance = np.sqrt(
                (x2 - x1) ** 2 +
                (y2 - y1) ** 2
            )

            # Ignore very close points
            if distance < 20:
                continue

            suspicious_regions.append({
                "x1": round(float(x1), 2),
                "y1": round(float(y1), 2),
                "x2": round(float(x2), 2),
                "y2": round(float(y2), 2),
                "distance": round(float(distance), 2)
            })

        manipulation_detected = (
            len(suspicious_regions) >= 5
        )

        # Draw suspicious matches
        visualization_image = image.copy()

        for region in suspicious_regions:

            point1 = (
                int(region["x1"]),
                int(region["y1"])
            )

            point2 = (
                int(region["x2"]),
                int(region["y2"])
            )

            cv2.circle(
                visualization_image,
                point1,
                6,
                (0, 0, 255),
                -1
            )

            cv2.circle(
                visualization_image,
                point2,
                6,
                (0, 0, 255),
                -1
            )

            cv2.line(
                visualization_image,
                point1,
                point2,
                (0, 0, 255),
                2
            )

        # Encode final visualization
        _, final_buffer = cv2.imencode(
            ".jpg",
            visualization_image
        )

        final_visualization = base64.b64encode(
            final_buffer
        ).decode("utf-8")

        return {
    "status": "completed",
    "manipulation_detected": manipulation_detected,
    "suspicious_matches": len(suspicious_regions),
    "suspicious_regions": suspicious_regions,
    "keypoints_detected": len(keypoints),
    "message": "Copy-move analysis completed successfully."
}

    except Exception as e:

        return {
            "status": "failed",
            "error": str(e)
        }