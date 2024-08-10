const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
  // type: { type: String, required: true },
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: Schema.Types.ObjectId, ref: "User", required: true },
  quiz: { type: Schema.Types.ObjectId, ref: "Quiz", required: true },
  status: {
    type: String,
    enum: ["pending", "accepted", "denied"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
});

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;
