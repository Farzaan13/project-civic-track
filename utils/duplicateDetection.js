const Issue = require("../models/Issue");
const {
  calculateHashDistance,
} = require("./imageHash");

/**
 * Finds existing issues near the given location
 * with the same category and compares image hashes.
 *
 * Lower hash distance = more visually similar.
 */
async function findNearbyImageDuplicates(
  lng,
  lat,
  category,
  imageHash,
  radiusMeters = 50
) {
  if (!imageHash) {
    return [];
  }

  const nearbyIssues = await Issue.find({
    category,
    isDuplicate: false,
    status: { $nin: ["resolved", "rejected"] },
    imageHash: { $ne: null },
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [lng, lat],
        },
        $maxDistance: radiusMeters,
      },
    },
  }).limit(10);

  const duplicates = [];

  for (const issue of nearbyIssues) {
    const distance = calculateHashDistance(
      imageHash,
      issue.imageHash
    );

    if (distance <= 150) {
      duplicates.push({
        issue,
        hashDistance: distance,
      });
    }
  }

  return duplicates;
}

/**
 * Existing GPS + category duplicate detection.
 */
async function findNearbyDuplicates(
  lng,
  lat,
  category,
  radiusMeters = 50
) {
  const nearbyIssues = await Issue.find({
    category,
    isDuplicate: false,
    status: { $nin: ["resolved", "rejected"] },
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [lng, lat],
        },
        $maxDistance: radiusMeters,
      },
    },
  }).limit(5);

  return nearbyIssues;
}

module.exports = {
  findNearbyDuplicates,
  findNearbyImageDuplicates,
};