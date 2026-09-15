const jwt = require("jsonwebtoken");
const User = require("../models/User");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

module.exports.renderRegister = (req, res) => {
  res.render("auth/register");
};

module.exports.register = async (req, res) => {
  try {
    const { username, email, password, phone } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      req.flash("error", "Username or email already registered");
      return res.redirect("/register");
    }

    // role is always "citizen" on public registration - staff/admin created separately
    const user = new User({ username, email, password, phone, role: "citizen" });
    await user.save();

    const token = generateToken(user._id);
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    req.flash("success", "Welcome to Civic Issue System!");
    res.redirect("/issues");
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong during registration");
    res.redirect("/register");
  }
};

module.exports.renderLogin = (req, res) => {
  res.render("auth/login");
};

module.exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      req.flash("error", "Invalid email or password");
      return res.redirect("/login");
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      req.flash("error", "Invalid email or password");
      return res.redirect("/login");
    }

    const token = generateToken(user._id);
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    req.flash("success", `Welcome back, ${user.username}!`);

    // redirect based on role
    if (user.role === "admin" || user.role === "staff") {
      return res.redirect("/admin/dashboard");
    }
    res.redirect("/");
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong during login");
    res.redirect("/login");
  }
};

module.exports.logout = (req, res) => {
  res.clearCookie("token");
  req.flash("success", "Logged out successfully");
  res.redirect("/login");
};
