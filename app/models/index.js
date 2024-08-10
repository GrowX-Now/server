const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const db = {};

db.mongoose = mongoose;

db.user = require("./user.model");
db.role = require("./role.model");
db.course = require("./course.model");
db.quiz = require("./quiz/quiz.model");
db.gameType = require("./quiz/gameType.model");
db.notification = require("./notification.model");

db.ROLES = ["user", "admin", "moderator"];

module.exports = db;
