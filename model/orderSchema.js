const mongoose = require("mongoose");

const orderSchema = mongoose.Schema({
  userId: { type: String },
  products: [{
    productid: { type: mongoose.Schema.Types.ObjectId },
    productName: { type: String },
    brand: { type: String },
    quantity: { type: Number },
    price: { type: Number },
    status: { type: String },
    discountPrice: { type: Number }
  }],
  totalQuantity: { type: Number },
  totalPrice: { type: Number },
  address: {
    firstName: String,
    lastName: String,
    state: String,
    address: String,
    city: String,
    zip: String,
  },
  paymentMethod: {
    type: String
  },
  orderDate: {
    type: Date
  }
})


const orderCollection = mongoose.model("Order", orderSchema);

module.exports = orderCollection