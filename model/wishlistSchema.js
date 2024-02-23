const mongoose = require('mongoose');
const { Schema, Types } = mongoose
const ObjectId = Types.ObjectId;

const wishlistCollection = new mongoose.Schema({
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
    image:{
        type:String
    }

})


const wishlistCollections = mongoose.model('wishlist', wishlistCollection);

module.exports = wishlistCollections