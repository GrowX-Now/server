const db = require("../models");
const User = db.user;

const uploadProfileImage = async (req, res) => {
  const userId = req.params.userId;
  const { file } = req;

  try {
    if (!file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.profileImage.data = file.buffer;
    user.profileImage.contentType = file.mimetype;

    await user.save();

    return res
      .status(200)
      .json({ message: "Profile image updated successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getProfileImage = async (req, res) => {
  const userId = req.params.userId;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!user.profileImage.data || !user.profileImage.contentType) {
      return res.json({ message: "Profile image not found for this user." });
    }

    res.set("Content-Type", user.profileImage.contentType);
    res.send(user.profileImage.data);
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { username, fName, lName, number, country, city, email } = req.body;
    const userId = req.params.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (username) {
      user.username = username;
    }

    if (email) {
      user.email = email;
    }

    if (fName) {
      user.fName = fName;
    }

    if (lName) {
      user.lName = lName;
    }

    if (number) {
      user.number = number;
    }

    if (country) {
      user.country = country;
    }

    if (city) {
      user.city = city;
    }

    await user.save();
    res.status(200).json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const findById = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({ message: "User found successfully", user });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAll = async (req, res) => {
  try {
    const users = await User.find();
    res.json({ users });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const allAccess = (req, res) => {
  res.status(200).send("Public Content.");
};

const userBoard = (req, res) => {
  res.status(200).send("User Content.");
};

const adminBoard = (req, res) => {
  res.status(200).send("Admin Content.");
};

const moderatorBoard = (req, res) => {
  res.status(200).send("Moderator Content.");
};

module.exports = {
  uploadProfileImage,
  getProfileImage,
  updateProfile,
  findById,
  getAll,
  allAccess,
  userBoard,
  adminBoard,
  moderatorBoard,
};
