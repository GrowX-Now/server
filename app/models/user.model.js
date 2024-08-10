const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  fName: { type: String },
  lName: { type: String },
  username: { type: String },
  email: { type: String },
  password: { type: String },
  phoneNumber: { type: String },
  city: { type: String },
  country: { type: String },
  emailVerificationToken: { type: String },
  resetPasswordToken: { type: String },
  emailVerificationTokenExpiration: { type: Date },
  resetPasswordTokenExpiration: { type: Date },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  roles: [
    {
      type: Schema.Types.ObjectId,
      ref: "Role",
    },
  ],
  profileImage: {
    data: Buffer,
    contentType: String,
  },
  quizzes: [
    {
      quiz: { type: Schema.Types.ObjectId, ref: "Quiz" },
      status: {
        type: String,
        enum: ["accepted", "accepted", "denied"],
        default: "accepted",
      },
    },
  ],
});

const User = mongoose.model("User", userSchema);
module.exports = User;
