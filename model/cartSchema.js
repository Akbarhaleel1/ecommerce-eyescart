const mongoose = require('mongoose');
const { Schema, Types } = mongoose
const ObjectId = Types.ObjectId;

const cartSchema = new mongoose.Schema({
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
    brand: {
        type: String
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


const cartCollection = mongoose.model('cart', cartSchema);

module.exports = cartCollection