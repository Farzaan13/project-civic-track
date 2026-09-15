const Issue = require("../models/Issue");
const Department = require("../models/Department");
const User = require("../models/User");
const Notification = require("../models/Notification");


const {
  findNearbyDuplicates,
  findNearbyImageDuplicates,
} = require("../utils/duplicateDetection");

const { classifyImage } = require("../utils/imageClassifier");
const { generateImageHash } = require("../utils/imageHash");

// GET all issues (map + list view)
module.exports.index = async (req, res) => {
  const { category, status } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (status) filter.status = status;

  const issues = await Issue.find(filter)
    .populate("reportedBy", "username")
    .sort({ createdAt: -1 });

  res.render("issues/index", { issues, category, status });
};

// GET new issue form
module.exports.renderNewForm = (req, res) => {
  res.render("issues/new");
};

// POST create new issue
module.exports.createIssue = async (req, res) => {
  try {
    const { title, description, category, lat, lng, address } = req.body;

    if (!lat || !lng) {
      req.flash("error", "Please select a location on the map");
      return res.redirect("/issues/new");
    }

    const images = req.files
      ? req.files.map((f) => ({ url: f.path, filename: f.filename }))
      : [];

    const newIssue = new Issue({
      title,
      description,
      category,
      images,
      location: {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)],
      },
      address,
      reportedBy: req.user._id,
      statusHistory: [
        { status: "reported", updatedBy: req.user._id, note: "Issue reported" },
      ],
    });

    // AI: verify uploaded image using Python AI service
    let aiResult = null;

    console.log("New image hash exists:", !!newIssue.imageHash);
    console.log("New image hash length:", newIssue.imageHash?.length);

    if (images.length > 0) {
      try {
        aiResult = await classifyImage(images[0].url);

        if (aiResult) {
          newIssue.aiSuggestedCategory = aiResult.category;
          newIssue.aiConfidence = aiResult.confidence;

          // AI verification result
          newIssue.aiVerification = aiResult.status;
          newIssue.aiIsCivic = aiResult.isCivic;
          newIssue.aiRecommendation = aiResult.recommendation;

          console.log("AI Verification Result:", aiResult);
        }
      } catch (err) {
        console.log("AI verification skipped:", err.message);
      }
    }

    // Generate perceptual image hash
    if (images.length > 0) {
      try {
        const imageHash = await generateImageHash(images[0].url);

        if (imageHash) {
          newIssue.imageHash = imageHash;

          console.log(
            "Image hash generated:",
            imageHash.substring(0, 32) + "..."
          );
        }
      } catch (err) {
        console.log("Image hash generation skipped:", err.message);
      }
    }
    // Check for visually similar duplicate images
    let imageDuplicates = [];

    if (images.length > 0 && newIssue.imageHash) {
      try {
        console.log("New image hash exists:", true);
        console.log(
          "New image hash length:",
          newIssue.imageHash.length
        );

        imageDuplicates = await findNearbyImageDuplicates(
          parseFloat(lng),
          parseFloat(lat),
          category,
          newIssue.imageHash
        );

        console.log(
          "Image duplicate candidates found:",
          imageDuplicates.length
        );

        if (imageDuplicates.length > 0) {
          const duplicate = imageDuplicates[0];

          console.log(
            "Possible duplicate issue:",
            duplicate.issue._id,
            "| Hash distance:",
            duplicate.hashDistance
          );

          // Mark this issue as a duplicate
          newIssue.isDuplicate = true;

          // Link to the original issue
          newIssue.duplicateOf = duplicate.issue._id;

          // Store why it was considered duplicate
          newIssue.duplicateReason = "image";

          console.log(
            "Issue marked as IMAGE DUPLICATE of:",
            duplicate.issue._id
          );
        } else {
          console.log("No visually similar image found nearby.");
        }
      } catch (err) {
        console.log(
          "Image duplicate detection skipped:",
          err.message
        );
      }
    }

    // Reject non-civic images
    if (aiResult && aiResult.recommendation === "REJECT") {
      req.flash(
        "error",
        "This image does not appear to show a civic issue. Please upload a relevant image."
      );

      return res.redirect("/issues/new");
    }



    // Duplicate detection: check nearby issues (within 50m) of same category
    const duplicates = await findNearbyDuplicates(
      parseFloat(lng),
      parseFloat(lat),
      category
    );

    if (duplicates.length > 0) {
      newIssue.isDuplicate = true;
      newIssue.duplicateOf = duplicates[0]._id;
      // auto-upvote the original issue instead of creating noise
      if (!duplicates[0].upvotes.includes(req.user._id)) {
        duplicates[0].upvotes.push(req.user._id);
        duplicates[0].priority = calculatePriority(duplicates[0]);
        await duplicates[0].save();
      }
      req.flash(
        "success",
        "Similar issue already reported nearby! We've added your upvote to it instead."
      );
      await newIssue.save(); // still saved for record-keeping, but marked duplicate
      console.log("========== SAVED ISSUE ==========");
      console.log("Issue ID:", newIssue._id);
      console.log("isDuplicate:", newIssue.isDuplicate);
      console.log("duplicateOf:", newIssue.duplicateOf);
      console.log("duplicateReason:", newIssue.duplicateReason);
      console.log("=================================");
      return res.redirect(`/issues/${duplicates[0]._id}`);
    }

    // Auto-assign department based on category
    const dept = await Department.findOne({ categories: category });
    console.log("========== DEPARTMENT ASSIGNMENT ==========");
console.log("Issue category:", category);

if (dept) {
  console.log("Assigned department:", dept.name);
  console.log("Department ID:", dept._id);
  console.log("SLA hours:", dept.slaHours);
} else {
  console.log("No department found for category:", category);
}
console.log("============================================");
    if (dept) {
      newIssue.assignedDept = dept._id;
      const slaHours = dept.slaHours || 72;
      newIssue.slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);
    }
    newIssue.priority = calculatePriority(newIssue);

    await newIssue.save();

    // Notify department staff about the new issue (non-blocking)
    if (newIssue.assignedDept) {
      try {
        const deptStaff = await User.find({
          role: "staff",
          department: newIssue.assignedDept,
        });
        if (deptStaff.length > 0) {
          await Notification.insertMany(
            deptStaff.map((s) => ({
              user: s._id,
              issue: newIssue._id,
              message: `New issue reported in your department: "${newIssue.title}"`,
            }))
          );
        }
      } catch (err) {
        console.error("Failed to notify department staff:", err.message);
      }
    }

    if (newIssue.isDuplicate && newIssue.duplicateReason === "image") {
      req.flash(
        "success",
        `Your report appears to be a duplicate of an existing issue (${newIssue.duplicateOf}). It has been linked to that issue.`
      );
    } else {
      req.flash(
        "success",
        "Issue reported successfully!"
      );
    }

    res.redirect(`/issues/${newIssue._id}`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong while reporting the issue");
    res.redirect("/issues/new");
  }
};

// GET single issue detail
module.exports.showIssue = async (req, res) => {
  const issue = await Issue.findById(req.params.id)
    .populate("reportedBy", "username email")
    .populate("assignedDept", "name")
    .populate("assignedStaff", "username")
    .populate("statusHistory.updatedBy", "username");

  if (!issue) {
    req.flash("error", "Issue not found");
    return res.redirect("/issues");
  }

  res.render("issues/show", { issue });
};

// POST upvote an issue
module.exports.upvoteIssue = async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) {
    req.flash("error", "Issue not found");
    return res.redirect("/issues");
  }

  const alreadyUpvoted = issue.upvotes.includes(req.user._id);
  if (alreadyUpvoted) {
    issue.upvotes.pull(req.user._id);
  } else {
    issue.upvotes.push(req.user._id);
  }

  issue.priority = calculatePriority(issue);
  await issue.save();

  res.redirect(`/issues/${issue._id}`);
};

// DELETE issue (only by reporter or admin)
module.exports.deleteIssue = async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) {
    req.flash("error", "Issue not found");
    return res.redirect("/issues");
  }

  const isOwner = issue.reportedBy.equals(req.user._id);
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAdmin) {
    req.flash("error", "You don't have permission to delete this issue");
    return res.redirect(`/issues/${issue._id}`);
  }

  await Issue.findByIdAndDelete(req.params.id);
  req.flash("success", "Issue deleted");
  res.redirect("/issues");
};

// Priority scoring: based on upvotes + category severity
function calculatePriority(issue) {
  let score = 0;

  const upvoteCount = issue.upvotes?.length || 0;

  // 1. Category severity
  const highSeverityCategories = [
    "water_leakage",
    "electricity",
    "road_damage",
    "drainage"
  ];

  const mediumSeverityCategories = [
    "pothole",
    "streetlight"
  ];

  if (highSeverityCategories.includes(issue.category)) {
    score += 3;
  } else if (mediumSeverityCategories.includes(issue.category)) {
    score += 2;
  } else {
    score += 1;
  }

  // 2. Public demand based on upvotes
  if (upvoteCount >= 10) {
    score += 3;
  } else if (upvoteCount >= 5) {
    score += 2;
  } else if (upvoteCount >= 2) {
    score += 1;
  }

  // 3. AI verification confidence
  if (issue.aiConfidence != null) {
    if (issue.aiConfidence >= 0.90) {
      score += 1;
    }
  }

  // 4. Duplicate reports indicate multiple citizens
  if (issue.isDuplicate) {
    score += 1;
  }

  // Convert score into priority
  if (score >= 6) {
    return 3; // HIGH
  }

  if (score >= 3) {
    return 2; // MEDIUM
  }

  return 1; // LOW
}

// GET logged-in user's complaints
module.exports.myIssues = async (req, res) => {
  try {
    const issues = await Issue.find({
      reportedBy: req.user._id,
    })
      .populate("assignedDept", "name")
      .populate("assignedStaff", "username")
      .sort({ createdAt: -1 });

    res.render("issues/my", { issues });
  } catch (err) {
    console.error(err);
    req.flash("error", "Unable to load your complaints");
    res.redirect("/issues");
  }
};

// POST feedback for a resolved issue
module.exports.submitFeedback = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      req.flash("error", "Issue not found");
      return res.redirect("/issues");
    }

    // Only the person who reported the issue can give feedback
    if (!issue.reportedBy.equals(req.user._id)) {
      req.flash("error", "You can only give feedback for your own complaint");
      return res.redirect(`/issues/${issue._id}`);
    }

    // Feedback only after resolution
    if (issue.status !== "resolved") {
      req.flash(
        "error",
        "You can give feedback only after the issue is resolved"
      );

      return res.redirect(`/issues/${issue._id}`);
    }

    // Prevent multiple feedback submissions
    if (issue.feedback && issue.feedback.submittedAt) {
      req.flash("error", "Feedback has already been submitted");
      return res.redirect(`/issues/${issue._id}`);
    }

    issue.feedback = {
      rating: Number(rating),
      comment: comment || "",
      submittedAt: new Date(),
    };

    await issue.save();

    req.flash("success", "Thank you for your feedback!");

    res.redirect(`/issues/${issue._id}`);

  } catch (err) {
    console.error(err);

    req.flash("error", "Unable to submit feedback");

    res.redirect(`/issues/${req.params.id}`);
  }
};
// ========================================
// RESOLVE ISSUE WITH PROOF
// Staff/Admin only
// ========================================

module.exports.resolveIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      req.flash("error", "Issue not found.");
      return res.redirect("/issues");
    }

    // Only staff and admin can resolve an issue
    if (
      req.user.role !== "staff" &&
      req.user.role !== "admin"
    ) {
      req.flash(
        "error",
        "You are not authorized to resolve this issue."
      );
      return res.redirect(`/issues/${issue._id}`);
    }

    // Resolution image is required
    if (!req.file) {
      req.flash(
        "error",
        "Please upload a resolution image."
      );
      return res.redirect(`/issues/${issue._id}`);
    }

    // Staff can only resolve issues assigned to them
    if (
      req.user.role === "staff" &&
      issue.assignedStaff &&
      issue.assignedStaff.toString() !== req.user._id.toString()
    ) {
      req.flash(
        "error",
        "This issue is not assigned to you."
      );
      return res.redirect(`/issues/${issue._id}`);
    }

    // Save resolution proof
    issue.resolutionImage = {
      url: req.file.path,
      filename: req.file.filename,
    };

    // Mark issue as resolved
    issue.status = "resolved";
    issue.resolvedAt = new Date();

    // Add status history
    issue.statusHistory.push({
      status: "resolved",
      timestamp: new Date(),
      updatedBy: req.user._id,
      note: "Issue resolved with resolution proof.",
    });

    await issue.save();

    // Notify citizen
    await Notification.create({
      user: issue.reportedBy,
      issue: issue._id,
      message: `Your issue "${issue.title}" has been resolved. Please verify the resolution.`,
      isRead: false,
    });

    req.flash(
      "success",
      "Issue resolved successfully with proof."
    );

    res.redirect(`/issues/${issue._id}`);
  } catch (error) {
    console.error(
      "Resolve issue error:",
      error.message
    );

    req.flash(
      "error",
      "Something went wrong while resolving the issue."
    );

    res.redirect(`/issues/${req.params.id}`);
  }
};



module.exports.calculatePriority = calculatePriority;
