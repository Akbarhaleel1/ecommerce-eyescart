const mongoose = require("../Database/db.connect")

const profileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
    },
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    }
});

const ProfileSchema = mongoose.model("profile", profileSchema);


module.exports = ProfileSchema