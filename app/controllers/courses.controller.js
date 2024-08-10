const db = require("../models");
const Course = db.course;

const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find().exec();
    res.json({ courses });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const getCourseById = async (req, res) => {
  const { courseId } = req.params;

  try {
    const course = await Course.findById(courseId).exec();

    if (!course) {
      return res.json({ error: "Course not found" });
    }

    res.json({ course });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = { getAllCourses, getCourseById };
