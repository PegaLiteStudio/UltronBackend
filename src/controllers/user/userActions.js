const {respondSuccess} = require("../../managers/responseManager");
const ApkGenerator = require("../../managers/apkManager");
const generateApp = async (req, res) => {
    if (!req.files || !req.files.app || !req.files.icon) {
        return res.status(400).send({status: false, message: "Both APK and icon are required"});
    }

    console.log("Files uploaded:", req.body.apkFilename, req.body.iconFilename);

    respondSuccess(res);

    const apkGen = new ApkGenerator(req.body["appName"].replaceAll("\"", ""), req.user.key);

    console.log(apkGen.getRandomPackage());

    apkGen.apkGenerator()
        .then(() => console.log("APK generation process finished."))
        .catch(err => console.error("Error:", err));
}

module.exports = {
    generateApp
}