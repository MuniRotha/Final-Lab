require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const dbConnect = require("./dbConnect");
const { Student } = require("./models/Student");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4002;

app.get("/health", (_req, res) => {
  res.json({ service: "update-service", status: "UP" });
});

// PUT /api/students/:id/mobile - update a student's mobile number
// Body: { "student_mobile": "0123456789" }
app.put("/api/students/:id/mobile", async (req, res) => {
  try {
    const { student_mobile } = req.body;
    if (!student_mobile) {
      return res.status(400).json({ message: "student_mobile is required" });
    }
    if (!/^[0-9+\-\s]{8,15}$/.test(student_mobile)) {
      return res.status(400).json({ message: "student_mobile must be 8-15 digits" });
    }

    const student = await Student.findOneAndUpdate(
      { Student_id: Number(req.params.id) },
      { student_mobile },
      { new: true }
    );
    if (!student) return res.status(404).json({ message: "Student not found" });

    res.json({ message: "Mobile number updated successfully", student });
  } catch (err) {
    res.status(500).json({ message: "Update failed", error: err.message });
  }
});

// PUT /api/students/:id/password - update a student's password
// Body: { "old_password": "current", "new_password": "newpass123" }
app.put("/api/students/:id/password", async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    if (!old_password || !new_password) {
      return res.status(400).json({ message: "old_password and new_password are required" });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ message: "new_password must be at least 6 characters" });
    }

    const student = await Student.findOne({ Student_id: Number(req.params.id) });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const matches = await bcrypt.compare(old_password, student.student_password);
    if (!matches) return res.status(401).json({ message: "old_password is incorrect" });

    student.student_password = await bcrypt.hash(new_password, 10);
    await student.save();

    res.json({ message: "Password updated successfully", student });
  } catch (err) {
    res.status(500).json({ message: "Update failed", error: err.message });
  }
});

dbConnect().then(() => {
  app.listen(PORT, () => console.log(`Update service running on port ${PORT}`));
});
