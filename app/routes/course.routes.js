const controller = require("../controllers/course.controller");
const genericController = require("../controllers/courses.controller");
const takeController = require("../controllers/takeCourse.controller");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  //creating a course
  app.get(
    "/api/course/generationStatus/:courseId",
    controller.checkGenerationStatus
  );
  app.post("/api/course/create/:userId", controller.createCourse);
  app.get("/api/course/generateTopics/:courseId", controller.generateTopics);

  //taking a course
  app.get("/api/course/:courseId", takeController.getCourse);
  app.post("/api/course/:courseId/enroll", takeController.enrollUser);
  app.post(
    "/api/course/:courseId/complete/:chapterIndex/:topicIndex",
    takeController.updateUserProgress
  );
  app.post(
    "/api/course/:courseId/progress/:chapterIndex/:topicIndex",
    takeController.updateVideoProgress
  );
  app.get(
    "/api/course/:courseId/progress/:userId",
    takeController.getUserProgress
  );
  app.post("/api/course/:courseId/finish/:userId", takeController.finishCourse);

  //generic course routes
  app.get("/api/course/:courseId", genericController.getCourseById);
  app.get("/api/courses", genericController.getAllCourses);
};
