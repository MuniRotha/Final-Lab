const mongoose = require("mongoose");

async function dbConnect() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI is not set");
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log("Update service connected to MongoDB");
}

module.exports = dbConnect;
