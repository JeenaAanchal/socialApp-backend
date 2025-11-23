const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    if (!process.env.DBURL) {
      throw new Error("DBURL not defined in .env");
    }

    await mongoose.connect(process.env.DBURL); // no options needed
    console.log("✅ Database connected");
  } catch (err) {
    console.error("❌ Database connection failed", err.message);
    process.exit(1);
  }
};

mongoose.connection.on("disconnected", () =>
  console.warn("⚠️ MongoDB disconnected")
);
mongoose.connection.on("reconnected", () =>
  console.log("🔄 MongoDB reconnected")
);

module.exports = connectDB;
