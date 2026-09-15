from PIL import Image
from zero_shot_verifier import verify_civic_image


image_path = r"C:\photos\pothole.jpg"

image = Image.open(image_path).convert("RGB")

result = verify_civic_image(image)

print("\nAI RESULT:")
print(result)