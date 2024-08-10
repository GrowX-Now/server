const { authJwt } = require("../middlewares");
const controller = require("../controllers/user.controller");

const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  app.get("/api/user/:userId", controller.findById);
  app.get("/api/users", controller.getAll);
  app.put(
    "/api/user/:userId/profile-image",
    upload.single("profileImage"),
    controller.uploadProfileImage
  );

  app.put("/api/user/:userId", controller.updateProfile);

  app.get("/api/user/:userId/profile-image", controller.getProfileImage);

  app.get("/api/test/all", controller.allAccess);

  app.get("/api/test/user", [authJwt.verifyToken], controller.userBoard);

  app.get(
    "/api/test/mod",
    [authJwt.verifyToken, authJwt.isModerator],
    controller.moderatorBoard
  );

  app.get(
    "/api/test/admin",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.adminBoard
  );
};
