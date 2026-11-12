require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const dbConnect = require("./dbConnect");
const { Student, nextStudentId } = require("./models/Student");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4001;

app.get("/health", (_req, res) => {
  res.json({ service: "registration-service", status: "UP" });
});

// POST /api/register - store a new student
app.post("/api/register", async (req, res) => {
  try {
    const { Student_name, student_mobile, student_email, student_password } = req.body;

    if (!Student_name || !student_mobile || !student_email || !student_password) {
      return res.status(400).json({
        message: "Student_name, student_mobile, student_email and student_password are required",
      });
    }

    const exists = await Student.findOne({ student_email: student_email.toLowerCase() });
    if (exists) {
      return res.status(409).json({ message: "A student with this email already exists" });
    }

    const hashed = await bcrypt.hash(student_password, 10);
    const student = await Student.create({
      Student_id: await nextStudentId(),
      Student_name,
      student_mobile,
      student_email,
      student_password: hashed,
    });

    res.status(201).json({ message: "Student registered successfully", student });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
});

// GET /api/students - retrieve all students
app.get("/api/students", async (_req, res) => {
  try {
    const students = await Student.find().sort({ Student_id: 1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: "Could not fetch students", error: err.message });
  }
});

// GET /api/students/:id - retrieve one student by Student_id
app.get("/api/students/:id", async (req, res) => {
  try {
    const student = await Student.findOne({ Student_id: Number(req.params.id) });
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: "Could not fetch student", error: err.message });
  }
});

dbConnect().then(() => {
  app.listen(PORT, () => console.log(`Registration service running on port ${PORT}`));
});
