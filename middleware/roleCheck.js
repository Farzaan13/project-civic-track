// Usage: roleCheck("admin") or roleCheck("admin", "staff")
const roleCheck = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      req.flash("error", "Please login first");
      return res.redirect("/login");
    }

    if (!allowedRoles.includes(req.user.role)) {
      req.flash("error", "You don't have permission to access this page");
      return res.redirect("/issues");
    }

    next();
  };
};

module.exports = roleCheck;
