async function classifyImage(imageUrl) {
  try {
    console.log("\n========== AI VERIFICATION ==========");
    console.log("1. Image URL received:");
    console.log(imageUrl);

    // Download image from Cloudinary
    console.log("2. Downloading image from Cloudinary...");

    const imageResponse = await fetch(imageUrl);

    console.log(
      "3. Cloudinary response:",
      imageResponse.status,
      imageResponse.statusText
    );

    if (!imageResponse.ok) {
      throw new Error(
        `Could not download image: ${imageResponse.status}`
      );
    }

    const imageBuffer = await imageResponse.arrayBuffer();

    console.log(
      "4. Image downloaded successfully:",
      imageBuffer.byteLength,
      "bytes"
    );

    // Create multipart form data
    const formData = new FormData();

    const imageBlob = new Blob([imageBuffer], {
      type:
        imageResponse.headers.get("content-type") ||
        "image/jpeg",
    });

    formData.append(
      "file",
      imageBlob,
      "issue-image.jpg"
    );

    console.log("5. Sending image to Python AI service...");

    const aiServiceUrl =
      process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

    const aiResponse = await fetch(
      `${aiServiceUrl}/verify-image`,
      {
        method: "POST",
        body: formData,
      }
    );

    console.log(
      "6. Python response:",
      aiResponse.status,
      aiResponse.statusText
    );

    if (!aiResponse.ok) {
      throw new Error(
        `AI service error: ${aiResponse.status}`
      );
    }

    const data = await aiResponse.json();

    console.log("7. Python AI result:");
    console.log(data);

    if (!data.ai_result) {
      console.log("8. No AI result received.");
      return null;
    }

    const result = {
      category: data.ai_result.suggested_category,
      confidence: data.ai_result.confidence,
      status: data.ai_result.status,
      isCivic: data.ai_result.is_civic,
      recommendation: data.recommendation,
    };

    console.log("8. Final AI result:");
    console.log(result);

    console.log("========== AI VERIFICATION END ==========\n");

    return result;

  } catch (error) {
    console.error("\nAI service error:", error);
    return null;
  }
}

module.exports = {
  classifyImage,
};