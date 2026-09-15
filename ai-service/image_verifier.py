from transformers import pipeline
from PIL import Image


print("Loading AI model...")

classifier = pipeline(
    "image-classification",
    model="google/vit-base-patch16-224"
)

print("AI model loaded successfully!")


# Labels that can indicate civic-related scenes
CIVIC_KEYWORDS = {
    "pothole": "road_damage",
    "streetcar": "road_damage",
    "road": "road_damage",
    "traffic": "road_damage",
    "street": "road_damage",
    "garbage": "garbage",
    "trash": "garbage",
    "litter": "garbage",
    "bin": "garbage",
    "water": "water_leakage",
    "pipe": "water_leakage",
    "sewer": "drainage",
    "drain": "drainage",
    "streetlight": "streetlight",
    "lamp": "streetlight",
    "electric": "electricity",
}


def verify_civic_image(image: Image.Image):

    results = classifier(image, top_k=5)

    for result in results:

        label = result["label"].lower()
        confidence = float(result["score"])

        for keyword, category in CIVIC_KEYWORDS.items():

            if keyword in label:

                return {
                    "is_civic": True,
                    "confidence": round(confidence, 4),
                    "suggested_category": category,
                    "matched_label": result["label"]
                }

    return {
        "is_civic": False,
        "confidence": round(float(results[0]["score"]), 4),
        "suggested_category": None,
        "matched_label": results[0]["label"]
    }