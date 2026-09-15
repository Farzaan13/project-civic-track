from transformers import pipeline
from PIL import Image


print("Loading zero-shot image model...")

classifier = pipeline(
    "zero-shot-image-classification",
    model="openai/clip-vit-base-patch32"
)

print("Zero-shot model loaded successfully!")


# Civic issue categories
CIVIC_CATEGORIES = [
    "a photo of a pothole or large hole in a road",
    "a photo of garbage, litter, or dumped waste",
    "a photo of a broken or damaged streetlight",
    "a photo of water leakage, leaking pipe, or water overflow",
    "a photo of a blocked drain, open drain, or sewage problem",
    "a photo of an electricity problem, electrical pole, or damaged wire",
    "a photo of damaged road, cracked road, or broken pavement",
    "a normal unrelated photo"
]


# Convert AI labels to our database categories
CATEGORY_MAP = {
    "a photo of a pothole or large hole in a road": "pothole",
    "a photo of garbage, litter, or dumped waste": "garbage",
    "a photo of a broken or damaged streetlight": "streetlight",
    "a photo of water leakage, leaking pipe, or water overflow": "water_leakage",
    "a photo of a blocked drain, open drain, or sewage problem": "drainage",
    "a photo of an electricity problem, electrical pole, or damaged wire": "electricity",
    "a photo of damaged road, cracked road, or broken pavement": "road_damage",
    "a normal unrelated photo": "other"
}


def verify_civic_image(image: Image.Image):

    # Run CLIP classification
    results = classifier(
        image,
        candidate_labels=CIVIC_CATEGORIES
    )

    # Store all predictions
    scores = []

    for result in results:
        scores.append({
            "label": result["label"],
            "score": round(float(result["score"]), 4)
        })

    # Highest scoring prediction
    best_result = results[0]

    label = best_result["label"]
    confidence = float(best_result["score"])

    category = CATEGORY_MAP[label]

    # --------------------------------------------------
    # AI VERIFICATION
    # --------------------------------------------------

    if category == "other" and confidence >= 0.60:

        status = "REJECTED"
        is_civic = False
        suggested_category = None

    elif category != "other" and confidence >= 0.60:

        status = "VALID"
        is_civic = True
        suggested_category = category

    else:

        status = "NEEDS_REVIEW"
        is_civic = None
        suggested_category = (
            category if category != "other" else None
        )

    # --------------------------------------------------
    # RETURN RESULT
    # --------------------------------------------------

    return {
        "is_civic": is_civic,
        "confidence": round(confidence, 4),
        "suggested_category": suggested_category,
        "matched_label": label,
        "status": status,
        "all_predictions": scores
    }

