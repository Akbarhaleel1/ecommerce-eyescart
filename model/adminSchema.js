const mongoose = require("../Database/db.connect")

const adminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
})


const adminCollection = mongoose.model("admin", adminSchema)

module.exports = adminCollection;