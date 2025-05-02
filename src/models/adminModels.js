const mongoose = require("mongoose");


const adminSchema = new mongoose.Schema({
    name: {type: String},
    key: {type: String, required: true},
    isActive: {type: Boolean, default: true},
    deviceID: {type: String},
});


const AdminModel = new mongoose.model("admins", adminSchema);

module.exports = {
    AdminModel
}