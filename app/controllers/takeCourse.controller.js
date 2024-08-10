const db = require("../models");
const Course = db.course;

const getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).send({ message: "Course not found" });
    }
    res.status(200).send(course);
  } catch (error) {
    res.status(500).send({ message: "Error retrieving course" });
  }
};

const enrollUser = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { userId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).send({ message: "Course not found" });
    }

    const existingProgress = course.userProgress.find(
      (progress) => progress.userId.toString() === userId
    );
    if (existingProgress) {
      return res
        .status(400)
        .json({ error: "User already enrolled in this course" });
    }

    const userProgress = {
      userId: userId,
      chapters: course.chapters.map((chapter) => ({
        topics: chapter.topics.map(() => ({
          completed: false,
          score: 0,
          completedAt: null,
        })),
      })),
    };

    course.userProgress.push(userProgress);
    course.enrolledUsers.push(userId);

    await course.save();

    res.status(200).send({ message: "User enrolled successfully" });
  } catch (error) {
    res.status(500).send({ message: "Error enrolling user" });
  }
};

const getUserProgress = async (req, res) => {
  const { courseId, userId } = req.params;

  try {
    const course = await Course.findById(courseId).exec();

    if (!course) {
      return res.json({ error: "Course not found" });
    }

    const userProgress = course.userProgress.find(
      (progress) => progress.userId.toString() === userId
    );

    if (!userProgress) {
      return res.json({ error: "User progress not found" });
    }

    res.json({ userProgress });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const updateUserProgress = async (req, res) => {
  const { courseId, chapterIndex, topicIndex } = req.params;
  const { completed, score, userId } = req.body;

  try {
    const course = await Course.findById(courseId).exec();

    if (!course) {
      return res.json({ error: "Course not found" });
    }

    let userProgress = course.userProgress.find(
      (progress) => progress.userId.toString() === userId
    );
    if (!userProgress) {
      return res.json({ error: "User progress not found" });
    }

    const topic = userProgress.chapters[chapterIndex].topics[topicIndex];
    topic.completed = completed;
    topic.score = score;
    topic.completedAt = new Date();

    await course.save();

    res.json({ message: "Topic progress updated successfully", userProgress });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const updateVideoProgress = async (req, res) => {
  const { courseId, chapterIndex, topicIndex } = req.params;
  const { userId, progress } = req.body;

  try {
    const course = await Course.findById(courseId).exec();

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    let userProgress = course.userProgress.find(
      (progress) => progress.userId.toString() === userId
    );
    if (!userProgress) {
      return res.status(404).json({ error: "User progress not found" });
    }

    const topic = userProgress.chapters[chapterIndex].topics[topicIndex];
    topic.videoProgress = progress;

    await course.save();

    res.json({ message: "Video progress updated successfully", progress });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const finishCourse = async (req, res) => {
  const { courseId, userId } = req.params;

  try {
    const course = await Course.findById(courseId).exec();

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    let userProgress = course.userProgress.find(
      (progress) => progress.userId.toString() === userId
    );

    if (!userProgress) {
      return res.status(404).json({ error: "User progress not found" });
    }

    userProgress.courseCompleted = true;
    userProgress.completedAt = new Date();

    await course.save();

    res.json({ message: "Course completed successfully", userProgress });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  getCourse,
  enrollUser,
  updateUserProgress,
  getUserProgress,
  updateVideoProgress,
  finishCourse,
};
