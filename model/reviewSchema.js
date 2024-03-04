const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  userName:String,
  userEmail:String,
  productName:String,
  productImage:[String],
  title: String,
  body: String,
  rating: Number,
  date: { type: Date, default: Date.now },
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
