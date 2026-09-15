const sharp = require("sharp");

/**
 * Generate a perceptual hash (pHash-like) for an image.
 * Similar-looking images will produce similar hashes.
 */
async function generateImageHash(imageUrl) {
  try {
    // Download image
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Convert image to small grayscale image
    const { data } = await sharp(buffer)
      .resize(32, 32, {
        fit: "fill",
      })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Calculate average pixel value
    let total = 0;

    for (const pixel of data) {
      total += pixel;
    }

    const average = total / data.length;

    // Generate binary hash
    let hash = "";

    for (const pixel of data) {
      hash += pixel >= average ? "1" : "0";
    }

    return hash;
  } catch (error) {
    console.error("Image hash generation error:", error.message);
    return null;
  }
}

/**
 * Calculate Hamming distance between two hashes.
 * Lower distance = more visually similar.
 */
function calculateHashDistance(hash1, hash2) {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) {
    return Infinity;
  }

  let distance = 0;

  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      distance++;
    }
  }

  return distance;
}

module.exports = {
  generateImageHash,
  calculateHashDistance,
};