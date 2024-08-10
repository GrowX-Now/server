const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  title: { type: String },
  description: { type: String },
  subject: { type: String },
  user: { type: String },
  time: 0,
  chapters: [
    {
      title: { type: String },
      topics: [
        {
          title: { type: String },
          videoUrl: { type: String },
          summary: { type: String },
          conceptChecks: [
            {
              question: { type: String },
              answer: { type: String },
              options: [String],
            },
          ],
        },
      ],
    },
  ],
  imageUrl: { type: String },
  generationProgress: {
    isGenerating: Boolean,
    currentChapter: Number,
    currentTopic: Number,
    totalTopics: Number,
    completedTopics: Number,
  },
  enrolledUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  userProgress: [
    {
      userId: { type: String },
      chapters: [
        {
          topics: [
            {
              score: { type: Number },
              completed: { type: Boolean, default: false },
              completedAt: { type: Date },
              videoProgress: { type: Number, default: 0 },
            },
          ],
        },
      ],
    },
  ],
  createdBy: { type: String, enum: ["user", "ai"], default: "ai" },
  createdAt: { type: Date, default: Date.now },
  courseCompleted: { type: Boolean, default: false },
  completedAt: { type: Date },
});

const Course = mongoose.model("Course", courseSchema);

module.exports = Course;
