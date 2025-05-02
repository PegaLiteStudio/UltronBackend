const {PrimaryUserModel} = require("../../models/userModels");
const {
    respondSuccessWithData,
    respondFailed,
    RESPONSE_MESSAGES,
    respondSuccess
} = require("../../managers/responseManager");
const getUsers = async (req, res) => {
    let users = await PrimaryUserModel.find().lean();
    let adminList = [];

    for (let i = 0; i < users.length; i++) {
        let user = users[i];
        adminList.push({
            name: user.name,
            key: user.key,
            status: user.status,
            exp: user.exp,
        })
    }

    respondSuccessWithData(res, adminList)
}


const addUser = async (req, res) => {
    let {name, key, exp} = req.body;

    if (!name || !key || !exp) {
        return respondFailed(res, RESPONSE_MESSAGES.MISSING_PARAMETERS);
    }

    let checkUser = await PrimaryUserModel.findOne({key});

    if (checkUser) {
        return respondFailed(res, RESPONSE_MESSAGES.ACCOUNT_EXISTS)
    }

    let newUser = new PrimaryUserModel({name, key, exp});
    await newUser.save();
    return respondSuccess(res);
}

const getUserDetails = async (req, res) => {
    let key = req.params["userKey"];
    if (!key) {
        return respondFailed(res, RESPONSE_MESSAGES.MISSING_PARAMETERS);
    }
    let user = await PrimaryUserModel.findOne({key});
    if (!user) {
        return respondSuccess(res);
    }
    respondSuccessWithData(res, user);

}
const editUser = async (req, res) => {
    let changes = req.body;
    let key = req.params["userKey"];
    if (!changes || !key) {
        return respondFailed(res, RESPONSE_MESSAGES.MISSING_PARAMETERS);
    }
    await PrimaryUserModel.updateOne({key}, {$set: changes})
    respondSuccess(res)
}
const deleteUser = async (req, res) => {
    let key = req.params["userKey"];
    if (!key) {
        return respondFailed(res, RESPONSE_MESSAGES.MISSING_PARAMETERS);
    }
    await PrimaryUserModel.deleteOne({key});
    respondSuccess(res)
}

module.exports = {
    getUsers, addUser, getUserDetails, editUser, deleteUser
}