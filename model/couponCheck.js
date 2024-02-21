const mongoose = require('../Database/db.connect')

const couponsCheck = new mongoose.Schema({
  userId: { type: String },
  couponsId: { type: String }
});


const checkingCoupons = mongoose.model('checkingCoupons', couponsCheck)
module.exports = checkingCoupons