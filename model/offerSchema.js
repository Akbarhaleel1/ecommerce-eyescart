const mongoose = require('mongoose')

const OfferSchema = new mongoose.Schema({
  type: {
    type: String,
    default: 'Discount'
  },
  discount: {
    type: Number,
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  applicableProducts: {
    type: String,
  },
});


const offerCollection = mongoose.model('offer', OfferSchema, "offer")
module.exports = offerCollection