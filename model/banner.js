const mongoose = require('../Database/db.connect')

const bannerSchama = new mongoose.Schema({
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


const bannerCollection = mongoose.model('banner', bannerSchama)
module.exports = bannerCollection