const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const dbUrl = process.env.DBURL;
    if (!dbUrl) {
      throw new Error("DBURL not defined in .env");
    }

    // Connect to MongoDB
    await mongoose.connect(dbUrl); // no need for options in Mongoose v6+

    console.log("✅ Database connected");
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1);
  }
};

// Listen to connection events
mongoose.connection.on("disconnected", () =>
  console.warn("⚠️ MongoDB disconnected")
);
mongoose.connection.on("reconnected", () =>
  console.log("🔄 MongoDB reconnected")
);

module.exports = connectDB;
