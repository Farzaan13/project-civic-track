import logging
from dataclasses import dataclass
from typing import Optional, Union
from PIL import Image, UnidentifiedImageError
from transformers import pipeline

# Configure basic logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class CivicDetectionResult:
    """Structured data class for strict type safety on API returns."""
    is_civic: bool
    confidence: float
    suggested_category: Optional[str]
    matched_label: Optional[str]
    error: Optional[str] = None


class CivicIssueDetector:
    """
    A robust detector for civic issues using Zero-Shot Image Classification.
    Loads the model once into memory upon initialization.
    """
    def __init__(self, model_id: str = "openai/clip-vit-base-patch32", threshold: float = 0.30):
        self.threshold = threshold
        self.model_id = model_id
        
        # 1. Map highly descriptive natural language prompts to your backend categories
        self.category_map = {
            "a photo of a deep pothole, cracked road, or damaged pavement": "road_damage",
            "a photo of garbage, trash bags, or litter on the street": "garbage",
            "a photo of a water leak, flooding, or burst pipe": "water_leakage",
            "a photo of an open sewer, missing manhole cover, or clogged drain": "drainage",
            "a photo of a broken streetlight, downed power line, or electrical hazard": "electricity",
            
            # 2. Negative prompts: Catch regular photos to prevent false positives
            "a normal street photo with no damage or hazards": "none",
            "a regular photo of a person, animal, vehicle, or indoors": "none"
        }
        
        logger.info(f"Loading AI model '{self.model_id}'... (This may take a moment)")
        try:
            self.classifier = pipeline("zero-shot-image-classification", model=self.model_id)
            logger.info("AI model loaded successfully!")
        except Exception as e:
            logger.error(f"Failed to load the model: {e}")
            raise

    def verify_image(self, image_input: Union[str, Image.Image]) -> CivicDetectionResult:
        """
        Evaluates an image and returns a structured CivicDetectionResult.
        Accepts either a file path (str) or a PIL Image object.
        """
        # 1. Safe Image Loading & Conversion
        try:
            if isinstance(image_input, str):
                image = Image.open(image_input)
            else:
                image = image_input

            # Ensure RGB to prevent errors with PNG alpha channels or greyscale
            if image.mode != "RGB":
                image = image.convert("RGB")
                
        except (UnidentifiedImageError, FileNotFoundError) as e:
            logger.error(f"Image loading error: {e}")
            return CivicDetectionResult(False, 0.0, None, None, error="Invalid or unreadable image file.")

        # 2. Inference
        try:
            labels = list(self.category_map.keys())
            results = self.classifier(image, candidate_labels=labels)
            
            if not results:
                return CivicDetectionResult(False, 0.0, None, None, error="Model returned no results.")

            # The pipeline sorts results by highest score automatically
            top_match = results[0]
            top_label = top_match["label"]
            top_score = float(top_match["score"])
            
            mapped_category = self.category_map.get(top_label, "none")

            # 3. Threshold and Category Validation
            if mapped_category != "none" and top_score >= self.threshold:
                return CivicDetectionResult(
                    is_civic=True,
                    confidence=round(top_score, 4),
                    suggested_category=mapped_category,
                    matched_label=top_label
                )

            # Fallback if it matches a "none" category or falls below threshold
            return CivicDetectionResult(
                is_civic=False,
                confidence=round(top_score, 4),
                suggested_category=None,
                matched_label=top_label
            )

        except Exception as e:
            logger.error(f"Inference error: {e}")
            return CivicDetectionResult(False, 0.0, None, None, error=str(e))


if __name__ == "__main__":
    # --- Example Usage ---
    
    # 1. Initialize the detector once (e.g., at server startup)
    detector = CivicIssueDetector()

    # 2. Test with a local image file path
    # result = detector.verify_image("path_to_user_upload.jpg")
    
    # print(f"Is Civic Issue: {result.is_civic}")
    # print(f"Category: {result.suggested_category}")
    # print(f"Confidence: {result.confidence * 100:.1f}%")
    # if result.error:
    #     print(f"Error: {result.error}")
