AI_TOOLS = ["stable diffusion", "midjourney", "dall-e", "dall·e", "firefly",
            "dreamstudio", "novelai", "comfyui", "flux", "imagen", "gemini"]
EDIT_TOOLS = ["photoshop", "gimp", "lightroom", "snapseed", "pixlr", "canva"]


def add_explanation(ai, metadata, manipulation, width, height):
    ai = dict(ai or {})
    p = ai.get("ai_probability")

    # image too small -> no answer
    if p is None:
        ai.update({
            "real_probability": None,
            "final_result": "Cannot determine",
            "confidence": "none",
            "reasons": [ai.get("note", "The image is too small for reliable AI detection.")],
            "limitations": [],
        })
        return ai

    ai_pct = round(p * 100)
    real_pct = 100 - ai_pct
    verdict = ai.get("verdict")
    reasons, limits = [], []

    # 1. the score
    reasons.append(f"The AI detector estimates a {ai_pct}% chance that this image is AI-generated "
                   f"and a {real_pct}% chance that it is a real photo.")
    if verdict == "likely_ai":
        reasons.append("The AI score is above 65%, which we treat as 'likely AI-generated'.")
    elif verdict == "likely_real":
        reasons.append("The AI score is below 35%, which we treat as 'likely a real photo'.")
    else:
        reasons.append("The AI score is between 35% and 65%, so the detector is not sure.")

    # 2. metadata
    meta = (metadata or {}).get("metadata") or {}
    text = " ".join(f"{k} {v}" for k, v in meta.items()).lower()
    if any(t in text for t in AI_TOOLS):
        reasons.append("The file metadata mentions an AI image tool.")
    elif any(t in text for t in EDIT_TOOLS):
        reasons.append("The file metadata mentions an image editing program.")
    elif meta:
        reasons.append("The file contains metadata, and it does not mention any AI tool.")
    else:
        reasons.append("No metadata was found. This is common for images shared through apps like "
                       "WhatsApp or downloaded from websites, so it is not evidence either way.")

    # 3. copy-move
    manip = manipulation or {}
    if manip.get("manipulation_detected"):
        reasons.append(f"Copy-move analysis found {manip.get('suspicious_matches', 0)} "
                       "suspicious duplicated areas.")
    else:
        reasons.append("Copy-move analysis found no duplicated areas. (This checks for copied "
                       "regions only. It cannot detect AI generation.)")

    # 4. image size
    if min(width, height) < 300:
        limits.append("The image is small, which makes any AI judgement less reliable.")

    limits.append("The AI score comes from a neural network trained on older generators "
                  "(such as Stable Diffusion and GANs). It cannot point to specific artifacts "
                  "and may miss images from newer tools like Gemini or Midjourney.")

    # final result + confidence
    labels = {"likely_ai": "Likely AI-generated",
              "likely_real": "Likely a real photo",
              "inconclusive": "Inconclusive"}
    strength = abs(p - 0.5) * 2
    confidence = "high" if strength > 0.7 else "medium" if strength > 0.4 else "low"
    if verdict == "likely_real" and confidence == "high":
        confidence = "medium"   # a modern AI image can still look "real" to this model

    ai.update({
        "real_probability": round(1 - p, 3),
        "final_result": labels.get(verdict, "Inconclusive"),
        "confidence": confidence,
        "reasons": reasons,
        "limitations": limits,
    })
    return ai