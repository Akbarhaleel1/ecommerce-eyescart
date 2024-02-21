const mongoose = require("../Database/db.connect")

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    isBlocked: {
        type: Boolean,
        default: false // Set a default value (e.g., false for not blocked)
    },
    balance: { type: Number, default: 0 }

});

const collection = mongoose.model("users", userSchema);


module.exports = collection