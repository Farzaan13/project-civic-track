from fastapi import FastAPI, UploadFile, File
from PIL import Image
import io

from zero_shot_verifier import verify_civic_image


app = FastAPI(title="CivicTrack AI Service")


@app.get("/")
def home():
    return {
        "message": "CivicTrack AI Service is running"
    }


@app.post("/verify-image")
async def verify_image(file: UploadFile = File(...)):

    image_bytes = await file.read()

    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        result = verify_civic_image(image)

        recommendation = {
            "VALID": "ACCEPT",
            "NEEDS_REVIEW": "MANUAL_REVIEW",
            "REJECTED": "REJECT"
        }.get(result["status"], "MANUAL_REVIEW")

        return {
            "filename": file.filename,
            "is_valid_image": True,
            "ai_result": result,
            "recommendation": recommendation
        }

    except Exception as e:

        return {
            "filename": file.filename,
            "is_valid_image": False,
            "message": "Invalid image file",
            "error": str(e)
        }