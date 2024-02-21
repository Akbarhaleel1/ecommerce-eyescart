const mongoose = require("../Database/db.connect")

const productSchema = mongoose.Schema({
    productname: { type: String },
    description: { type: String },
    brand: { type: String },
    size: { type: String },
    rating: { type: Number },
    price: { type: Number },
    imageUrl: [String],
    stock: { type: Number },
    Category: { type: mongoose.Schema.Types.ObjectId },
    isListed: {
        type: Boolean,
        default: false
    }
})


const Product = mongoose.model("Product", productSchema);

module.exports = Product;