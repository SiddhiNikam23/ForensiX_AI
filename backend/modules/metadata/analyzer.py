import exifread


def analyze_metadata(image_bytes):
    """
    Extract available EXIF metadata from an image.
    """

    try:
        from io import BytesIO

        image_stream = BytesIO(image_bytes)

        tags = exifread.process_file(
            image_stream,
            details=False
        )

        metadata = {}

        for tag, value in tags.items():
            metadata[tag] = str(value)

        return {
            "status": "completed",
            "metadata_found": len(metadata) > 0,
            "metadata_count": len(metadata),
            "metadata": metadata
        }

    except Exception as e:
        return {
            "status": "failed",
            "metadata_found": False,
            "metadata_count": 0,
            "metadata": {},
            "error": str(e)
        }