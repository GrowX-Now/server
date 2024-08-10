const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const quizSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  gametype: { type: Schema.Types.ObjectId, ref: "GameType", required: true },
  subject: { type: String, required: true },
  difficulty: { type: String, required: true },
  questions: [
    {
      question: { type: String },
      answer: { type: String },
      options: [String],
      isCorrect: { type: Boolean, default: false },
      userAnswer: { type: String },
    },
  ],
  explanations: [
    {
      question: String,
      explanation: String,
    },
  ],
  gradeLevel: { type: String },
  userProgress: [
    {
      userId: { type: Schema.Types.ObjectId, ref: "User" },
      score: { type: Number, default: 0 },
      timeTaken: { type: Number, default: 0 },
      studies: { type: Number, default: 0 },
      completedAt: { type: Date },
      questions: [
        {
          questionId: { type: Schema.Types.ObjectId },
          question: { type: String },
          correctAnswer: { type: String },
          isCorrect: { type: Boolean, default: false },
          option: { type: String },
        },
      ],
    },
  ],
  image: {
    public_id: { type: String },
    url: { type: String },
  },
  user: { type: String },
  imageUrl: { type: String },
});

const Quiz = mongoose.model("Quiz", quizSchema);
module.exports = Quiz;
