// const { verifySignUp } = require("../middlewares");
const controller = require("../controllers/auth.controller");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  app.post(
    "/api/auth/signup",
    // [
    //   verifySignUp.checkDuplicateUsernameOrEmail,
    //   verifySignUp.checkRolesExisted,
    // ],
    controller.signup
  );

  app.get("/api/auth/verify-email/:token", controller.verifyEmail);
  app.post("/api/auth/reset-password-request", controller.resetPasswordRequest);
  app.post("/api/auth/reset-password", controller.resetPassword);
  app.get("/api/auth/validate-token/:token", controller.validateToken);

  app.post("/api/auth/signin", controller.signin);
};
