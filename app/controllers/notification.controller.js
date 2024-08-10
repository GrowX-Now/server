const db = require("../models");
const Notification = db.notification;
const User = db.user;

const getNotificationsByUser = async (req, res) => {
  try {
    const notifications = await Notification.find({
      user: req.params.userId,
    })
      .populate("user")
      .exec();
    res.json({ notifications });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  getNotificationsByUser,
};
