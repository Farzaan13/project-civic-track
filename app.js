if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const path = require("path");
const ejsMate = require("ejs-mate");
const methodOverride = require("method-override");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const flash = require("connect-flash");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const issueRoutes = require("./routes/issueRoutes");
const citizenRoutes = require("./routes/citizenRoutes");
const staffRoutes = require("./routes/staffRoutes");
const adminRoutes = require("./routes/adminRoutes");
const infoRoutes = require("./routes/info");
const { attachUserIfLoggedIn } = require("./middleware/auth");

const { checkSLAAndEscalate } = require("./utils/slaChecker");
// ===============================
// SLA AUTO ESCALATION SCHEDULER
// ===============================

setInterval(async () => {
  console.log("\nRunning SLA checker...");

  await checkSLAAndEscalate();
}, 5 * 60 * 1000);

const app = express();

// DB connection
connectDB();

// View engine setup
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "civicissuesecret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
  })
);
app.use(flash());

// Attach logged-in user (if any) to every request for navbar etc.
app.use(attachUserIfLoggedIn);

// Flash messages + currUser available in all views
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

// Routes
app.get("/", (req, res) => res.render("home"));
app.use("/", authRoutes);
app.use("/", citizenRoutes);
app.use("/", infoRoutes);

app.use("/staff", staffRoutes);
app.use("/issues", issueRoutes);
app.use("/admin", adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).render("error", {
    message: "Page not found",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render("error", {
    message: err.message || "Something went wrong",
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
