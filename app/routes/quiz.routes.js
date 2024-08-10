const controller = require("../controllers/quiz.controller");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  app.post("/api/quiz/create/:userId", controller.createQuiz);
  app.post("/api/quiz/explain/:quizId", controller.explainIncorrectQuestions);
  app.get("/api/quizzes", controller.getAllQuizzes);
  app.get("/api/quizzes/:quizId", controller.getQuizById);
  app.put("/api/quizzes/:quizId", controller.updateQuiz);
  app.put(
    "/api/updateQuestions/:quizId",
    controller.updateQuestionStatusInQuiz
  );
  app.get(
    "/api/quizzes/:quizId/progress/:userId",
    controller.getUserQuizProgress
  );
  app.delete(
    "/api/quizzes/:quizId/progress/:userId",
    controller.resetUserQuizProgress
  );
  app.delete("/api/quizzes/:quizId", controller.deleteQuiz);
  app.post("/api/quizzes/updateScores/:quizId", controller.updateStudies);

  app.post("/api/shareQuiz", controller.shareQuiz);
  app.put("/api/acceptQuiz/:notificationId", controller.acceptQuiz);
  app.put("/api/denyQuiz/:notificationId", controller.denyQuiz);
};
