const mongoose = require("mongoose");
const {getPreferredTime} = require("../managers/timeManager");

/** User Schema for Primary User Information
 * */
const primaryUserSchema = new mongoose.Schema({
    name: {type: String, required: true, trim: true, maxLength: 30},
    key: {type: String, required: true, trim: true, maxLength: 10, unique: true},
    deviceID: {type: String, trim: true},
    regTime: {type: String, default: getPreferredTime()},
    exp : {type : String},
    status: {type: String, default: "active"}
});


const PrimaryUserModel = new mongoose.model("users", primaryUserSchema);

module.exports = {
    PrimaryUserModel
}