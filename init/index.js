if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const mongoose = require("mongoose");
const Department = require("../models/Department");
const User = require("../models/User");

const departments = [
  {
    name: "Roads & Infrastructure",
    categories: ["pothole", "road_damage"],
    slaHours: 72,
  },
  {
    name: "Sanitation",
    categories: ["garbage"],
    slaHours: 24,
  },
  {
    name: "Water Supply",
    categories: ["water_leakage"],
    slaHours: 48,
  },
  {
    name: "Electricity Board",
    categories: ["electricity", "streetlight"],
    slaHours: 48,
  },
  {
    name: "Drainage & Sewage",
    categories: ["drainage"],
    slaHours: 48,
  },
  {
    name: "General Municipal",
    categories: ["other"],
    slaHours: 96,
  },
];

const seedDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB for seeding...");

  await Department.deleteMany({});
  const createdDepts = await Department.insertMany(departments);
  console.log(`Seeded ${createdDepts.length} departments`);

  // Only create demo users if they don't already exist
  const adminExists = await User.findOne({ email: "admin@civictrack.com" });
  if (!adminExists) {
    await User.create({
      username: "admin",
      email: "admin@civictrack.com",
      password: "admin123", // will be hashed by pre-save hook
      role: "admin",
    });
    console.log("Created demo admin -> email: admin@civictrack.com / password: admin123");
  }

  const staffExists = await User.findOne({ email: "staff@civictrack.com" });
  if (!staffExists) {
    const roadsDept = createdDepts.find((d) => d.name === "Roads & Infrastructure");
    await User.create({
      username: "staff_roads",
      email: "staff@civictrack.com",
      password: "staff123",
      role: "staff",
      department: roadsDept._id,
    });
    console.log("Created demo staff -> email: staff@civictrack.com / password: staff123");
  }

  console.log("Seeding complete!");
  mongoose.connection.close();
};

seedDB();
