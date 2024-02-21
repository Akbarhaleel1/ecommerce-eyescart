const mongoose = require('mongoose');
const { Schema, Types } = mongoose
const ObjectId = Types.ObjectId;

const buyNowSchema = new mongoose.Schema({
    userid: {
        type: String
    },
    productid: {
        type: ObjectId
    },
    product: {
        type: String
    },
    price: {
        type: Number
    },
    quantity: {
        type: Number
    },
    address: {
        firstName: String,
        lastName: String,
        state: String,
        address: String,
        city: String,
        zip: String,
    },
    image: {
        type: [String]
    },
    status: {
        type: String,
        default: "Pending"
    },
    totalPrice: {
        type: String
    }

})


const buyNow = mongoose.model('buyNow', buyNowSchema);

module.exports = buyNow