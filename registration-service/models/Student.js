const mongoose = require("mongoose");

// Counter collection so Student_id is a simple auto-increment number (1, 2, 3...)
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
const Counter = mongoose.models.Counter || mongoose.model("Counter", counterSchema);

const studentSchema = new mongoose.Schema(
  {
    Student_id: { type: Number, unique: true },
    Student_name: { type: String, required: true, trim: true },
    student_mobile: { type: String, required: true, trim: true },
    student_email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    student_password: { type: String, required: true },
  },
  { timestamps: true, versionKey: false }
);

// Never send the password hash back in API responses
studentSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.student_password;
    return ret;
  },
});

async function nextStudentId() {
  const counter = await Counter.findOneAndUpdate(
    { _id: "Student_id" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

const Student = mongoose.models.Student || mongoose.model("Student", studentSchema, "students");

module.exports = { Student, nextStudentId };
