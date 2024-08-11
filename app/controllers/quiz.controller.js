const db = require("../models");
const Notification = db.notification;
const GameType = db.gameType;
const Quiz = db.quiz;
const User = db.user;

const { OpenAI } = require("openai");
const { v2 } = require("cloudinary");
const axios = require("axios");
const cloudinary = v2;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const getAllQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find()
      .populate("questions")
      .populate("gametype")
      .exec();
    res.json({ quizzes });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const createQuiz = async (req, res) => {
  const {
    subject,
    num,
    difficulty,
    grade_level,
    game_type,
    title,
    description,
  } = req.body;
  let retryCount = 3;

  const format = [
    {
      question: "question",
      answer: "answer with max length of 15 words",
      options: [
        "option1 with max length of 15 words",
        "option2 with max length of 15 words",
        "option3 with max length of 15 words",
        "option4 with max length of 15 words",
      ],
    },
  ];

  while (retryCount > 0) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-1106-preview",
        messages: [
          {
            role: "system",
            content: `You are a helpful AI that is able to generate mcq questions and answers, the length of each answer should not be more than 15 words, store all answers and questions and options in a JSON array. \nYou are to output the following in json format: ${JSON.stringify(
              format
            )} \nDo not put quotation marks or escape character \\ in the output fields.`,
          },
          {
            role: "user",
            content: `You are to generate a random ${num} question ${difficulty} mcq quiz about ${subject} for a ${grade_level}`,
          },
        ],
        temperature: 0,
        max_tokens: 300,
        frequency_penalty: 0.0,
        presence_penalty: 0.6,
        stop: [" Human:", " AI:"],
      });

      // const imageResponse = await openai.images.generate({
      //   model: "dall-e-3",
      //   prompt: subject,
      //   n: 1,
      //   size: "1024x1024",
      // });
      const message = response.choices[0].message.content;
      const startIndex = message.indexOf("[");
      const endIndex = message.lastIndexOf("]") + 1;

      const jsonArrayString = message.slice(startIndex, endIndex);
      const questionsArray = JSON.parse(jsonArrayString);

      const gameType = await GameType.findOne({ name: game_type }).exec();
      if (!gameType) {
        return res.status(500).send("Game type not found");
      }

      // const photoUrl = await cloudinary.uploader.upload(image, {
      //   public_id: `${Date.now()}`,
      //   resource_type: "auto",
      // });
      let checkTitle = "";
      let checkDescription = "";
      if (description == "") {
        checkDescription = `Studyset for ${subject} at ${difficulty} difficulty level for grade ${grade_level}`;
      } else {
        checkDescription = description;
      }

      if (title == "") {
        checkTitle = `${subject} Studyset`;
      } else {
        checkTitle = description;
      }

      let imageUrl = "";

      // console.log(index);
      // console.log(unsplashResponse.data.results);
      while (imageUrl == "") {
        const unsplashResponse = await axios.get(
          "https://api.unsplash.com/search/photos",
          {
            params: { query: subject, per_page: 10 },
            headers: {
              Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
            },
          }
        );

        min = Math.ceil(0);
        max = Math.floor(9);

        index = Math.floor(Math.random() * (max - min)) + min;
        imageUrl = unsplashResponse.data.results[index]?.urls?.small || "";
      }

      // console.log("IMAGE URL", imageUrl);
      const quiz = new Quiz({
        subject: subject,
        title: checkTitle,
        description: checkDescription,
        gametype: gameType._id,
        gradeLevel: grade_level,
        difficulty: difficulty,
        imageUrl: imageUrl,
        // image: {
        //   public_id: photoUrl.public_id,
        //   url: photoUrl.secure_url,
        // },
        questions: questionsArray,
        user: req.params.userId,
      });

      await quiz.save();
      res.send({ message: quiz._id });

      return;
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
      return;
    }
  }

  res.status(500).send("Failed to generate quiz with the expected format");
};

const explainIncorrectQuestions = async (req, res) => {
  const { quizId } = req.params;
  const { incorrectQuestions } = req.body;

  try {
    const quiz = await Quiz.findById(quizId).exec();

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const explanations = await generateExplanation(
      quizId,
      incorrectQuestions,
      quiz.gradeLevel
    );

    res.json({ explanations });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const generateExplanation = async (quizId, questions, grade_level) => {
  try {
    const getExplanations = async () => {
      const prompt = questions.map(
        (question) =>
          `Explain why '${question.option}' is wrong for the question: '${question.question}', and instead, describe why '${question.correctAnswer}' is the right answer, using words that a ${grade_level} student can easily understand.`
      );

      const format = [
        {
          explanation: "explanation with max length of 120 words",
        },
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a helpful AI that is able to generate in depth explanations for incorrect answers, the length of each explanation should not be more than 120 words, store all explanations in a JSON array.  \nYou are to output the following in json format: ${JSON.stringify(
              format
            )} \nDo not include quotation marks or escape character \\ in the output fields.`,
          },
          {
            role: "user",
            content: `${prompt}`,
          },
        ],
        temperature: 0.9,
        max_tokens: 700,
        frequency_penalty: 0.0,
        presence_penalty: 0.6,
        stop: [" Human:", " AI:"],
      });

      const message = response.choices[0].message.content;
      return message;
    };

    const response = await getExplanations();
    const startIndex = response.indexOf("[");
    const endIndex = response.lastIndexOf("]") + 1;

    const rawExplanations = response.slice(startIndex, endIndex);
    const explanations = JSON.parse(rawExplanations);

    const explanationObject = questions.map((question, index) => ({
      question: question.question,
      explanation:
        explanations[index].explanation || "No explanation available",
    }));

    const quiz = await Quiz.findByIdAndUpdate(
      quizId,
      { $set: { explanations: explanationObject } },
      { new: true }
    );

    if (!quiz) {
      throw new Error("Quiz not found");
    }

    return explanationObject;
  } catch (error) {
    console.error(error);
    return ["Failed to generate explanations"];
  }
};

const getQuizById = async (req, res) => {
  const { quizId } = req.params;

  try {
    const quiz = await Quiz.findById(quizId).populate("questions").exec();

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    res.json({ quiz });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const updateQuiz = async (req, res) => {
  const { quizId } = req.params;
  const { title, description, gametype } = req.body;

  try {
    const quiz = await Quiz.findByIdAndUpdate(
      quizId,
      { title, description, gametype },
      { new: true }
    ).exec();

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    res.json({ quiz });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const deleteQuiz = async (req, res) => {
  const { quizId } = req.params;

  try {
    const quiz = await Quiz.findByIdAndDelete(quizId).exec();

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    res.json({ message: "Quiz deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const updateQuestionStatusInQuiz = async (req, res) => {
  const { quizId } = req.params;
  const { score, timeTaken, questions, userId } = req.body;

  try {
    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }
    // let userProgress = null;
    // userProgress = quiz.userProgress.find(
    //   (progress) => progress.userId.toString() === userId
    // );

    // if (!userProgress) {
    let userProgress = {
      userId: userId,
      score: score,
      timeTaken: timeTaken,
      completedAt: new Date(),
      questions: questions,
    };
    // quiz.userProgress.push(userProgress);
    // } else {
    // userProgress.score = score;
    // userProgress.timeTaken = timeTaken;
    // userProgress.completedAt = new Date();
    // }

    // userProgress.questions = questions;
    quiz.userProgress.push(userProgress);

    await quiz.save();

    res
      .status(200)
      .json({ message: "Quiz progress updated successfully", userProgress });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getUserQuizProgress = async (req, res) => {
  const { quizId, userId } = req.params;

  try {
    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.json({ error: "Quiz not found" });
    }

    const userProgress = quiz.userProgress.filter(
      (progress) => progress.userId.toString() === userId
    );

    console.log(userProgress);

    res.json({ userProgress });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

// const resetUserQuizProgress = async (req, res) => {
//   const { quizId, userId } = req.params;

//   try {
//     const quiz = await Quiz.findById(quizId);

//     if (!quiz) {
//       return res.status(404).json({ error: "Quiz not found" });
//     }

//     const progressIndex = quiz.userProgress.findIndex(
//       (progress) => progress.userId.toString() === userId
//     );

//     if (progressIndex === -1) {
//       return res.status(404).json({ error: "User progress not found" });
//     }

//     quiz.userProgress.splice(progressIndex, 1);

//     await quiz.save();

//     res.json({ message: "User quiz progress reset successfully" });
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Internal Server Error");
//   }
// };

const shareQuiz = async (req, res) => {
  try {
    const { senderId, receiverId, quizId } = req.body;

    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);
    const quiz = await Quiz.findById(quizId);

    if (!sender || !receiver || !quiz) {
      return res
        .status(404)
        .json({ error: "Sender, receiver, or quiz not found" });
    }

    const notification = new Notification({
      sender: senderId,
      receiver: receiverId,
      quiz: quizId,
    });

    await notification.save();

    res.json({ message: "Quiz shared successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const acceptQuiz = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { status: "accepted" },
      { new: true }
    ).exec();

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    const receiver = await User.findByIdAndUpdate(
      notification.receiver,
      {
        $push: {
          quizzes: { quiz: notification.quiz, status: "accepted" },
        },
      },
      { new: true }
    ).exec();

    res.json({ message: "Quiz accepted successfully", receiver });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const denyQuiz = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { status: "denied" },
      { new: true }
    ).exec();

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({ message: "Quiz denied successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const updateStudies = async (req, res) => {
  const { user } = req.body;
  const { quizId } = req.params;
  try {
    const quiz = await Quiz.findById(quizId).exec();

    quiz.studies += 1;

    quiz.save();

    res.json({ studies: quiz });
  } catch (err) {
    res.status(404).json({ error: "Studies were not updated" });
  }
};

module.exports = {
  updateStudies,
  getAllQuizzes,
  createQuiz,
  explainIncorrectQuestions,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  updateQuestionStatusInQuiz,
  getUserQuizProgress,
  // resetUserQuizProgress,
  shareQuiz,
  acceptQuiz,
  denyQuiz,
};
