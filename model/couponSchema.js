const mongoose = require('../Database/db.connect')

const couponsSchema = new mongoose.Schema({
  userId: {

  },
  couponCode: {
    type: String,
  },
  discount: {
    type: Number,
  },
  expireDate: {
    type: Date,
  },
  purcheseAmount: {
    type: String,
  }
});


const couponsCollection = mongoose.model('coupons', couponsSchema)
module.exports = couponsCollection