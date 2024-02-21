
const mongoose = require("../Database/db.connect")


const addressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId
    },
    firstName: {
        type: String
    },
    lastName: {
        type: String
    },
    address: {
        type: String
    },
    state: {
        type: String
    },
    city: {
        type: String
    },
    zip: {
        type: Number
    },
    imageUrl: {
        type: String
    }
})


const Address = mongoose.model("address", addressSchema)

module.exports = Address;