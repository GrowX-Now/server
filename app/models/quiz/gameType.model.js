const mongoose = require("mongoose");

const gameTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
});

const GameType = mongoose.model("GameType", gameTypeSchema);
module.exports = GameType;
