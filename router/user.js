const express = require("express");
const router = express.Router();
const session = require("express-session");
const collection = require("../model/userSchema");
require('dotenv').config();




const checkSessionAndBlock = async (req, res, next) => {
    console.log("Session is " + req.session.user);
    if (req.session.user) {
        const userDetails = await collection.findOne({ username: req.session.user.username });

        console.log("User details are:", userDetails);

        if (userDetails && !userDetails.isBlocked) {
            next();
        } else {
            req.session.destroy((err) => {
                if (err) {
                    res.redirect("/login");
                } else {
                    res.redirect("/login");
                }
            });
        }
    } else {
        res.redirect("/login");
    }
};



//getController
const { getlogin, getsignup, index, about, contact, product, testimonial, account, wishlist, cart, getOtp, resendotp, getProduct_detail, logout, profile, getAddAddress, getOrder, getEditProfile, getplaceOrder, getpayment, getOrderConfirm, getCartItemRemove, getyourOrder, getChangepassword, getEditAddress, addCart, getOrderDetails, downloadInvoice, applyCoupon, getWallet, getDeposite, getWithdraw } = require('../controllers/userController')

//postController
const { postlogin, postsignup, postOtp, postEditProfile, postAddAddress, postCart, postChangepassword, updateQuantity, postEditAddress, getRazorpayOrder, postOrderConfirm, postCancelOrder, postReturnOrder, postDeposit, postWalletWithdraw } = require("../controllers/userController")

// const usercheck = (req, res, next) => {

//     console.log("session in middleware is ",req.session.userdetails);
//     if(req.session.userdetails){

//      next()
//      }else{
//      res.redirect('/login')
//      }

// };


//login Get Router
router.get("/login", getlogin)
//Login Post Router
router.post("/login", postlogin)

// Signup Get Router
router.get("/signup", getsignup)
// Signup Post Router
router.post("/signup", postsignup)

//OTP get router
router.get("/otp", getOtp)

//OTP post router
router.post("/otp", postOtp)

// resend otp get
router.get('/resendotp', resendotp)


//Prodcut detail page getRouter
router.get("/product_detail/:productid", checkSessionAndBlock, getProduct_detail);

//addToCart page getRouter
// router.get("/cart/:productid",checkSessionAndBlock,cart)
router.get("/cart", checkSessionAndBlock, cart);



router.post("/cart/:productid", checkSessionAndBlock, postCart)

//add product into cart using get Router 
router.get("/addCart/:productid", checkSessionAndBlock, addCart)

router.post('/update-quantity', updateQuantity);





router.get("/cartItemRemove/:deleteId", checkSessionAndBlock, getCartItemRemove)

router.get('/order', checkSessionAndBlock, getOrder)

router.get('/placeOrder/:productId', checkSessionAndBlock, getplaceOrder)

router.get('/payment', checkSessionAndBlock, getpayment)

router.get('/orderConfirm', checkSessionAndBlock, getOrderConfirm)

router.post('/orderConfirm', postOrderConfirm)

router.get("/yourOrder", checkSessionAndBlock, getyourOrder)

router.get('/changePassword', checkSessionAndBlock, getChangepassword)


router.post('/changePassword', postChangepassword);

// router.get('/cancelOrder/:orderId',getCancelOrder)

// router.get('/returnOrder/:orderId',getReturnOrder)

router.post('/create/:orderId', getRazorpayOrder);



// router.get("/orderDetails/:orderId",checkSessionAndBlock ,getOrderDetails)
router.get('/orderDetails/:orderId/:productId', checkSessionAndBlock, getOrderDetails);


router.post('/applyCoupon', applyCoupon);


router.get("/wallet", checkSessionAndBlock, getWallet)

router.get("/walletDeposite", checkSessionAndBlock, getDeposite)

router.post("/deposit", postDeposit)

router.get("/walletWithdraw", checkSessionAndBlock, getWithdraw)

router.post("/walletWithdraw", postWalletWithdraw)



router.get('/logout', logout)

router.get("/profile", checkSessionAndBlock, profile)

router.get("/add_address", checkSessionAndBlock, getAddAddress)

router.post("/add_address", postAddAddress)

router.get("/editAddress/:addressId", checkSessionAndBlock, getEditAddress)

router.post("/edit_address/:editAddressId", postEditAddress)



//Get Router for editProfile
router.get("/editProfile", checkSessionAndBlock, getEditProfile)

//Post Router for editProfile
router.post("/editProfile", postEditProfile)





router.get("/index", checkSessionAndBlock, index)



// router.post('/cancelOrder/:orderId',postCancelOrder)
router.post('/cancelOrder/:orderId/:productId', postCancelOrder);


// router.post('/returnOrder/:orderId',postReturnOrder)
router.post('/returnOrder/:orderId/:productId', postReturnOrder);


router.get("/downloadInvoice/:orderId", downloadInvoice)

router.get("/contact", checkSessionAndBlock, contact)

router.get("/product", checkSessionAndBlock, product)

router.get("/testimonial", checkSessionAndBlock, testimonial)

router.get("/about", checkSessionAndBlock, about)

router.get("/account", checkSessionAndBlock, account)

router.get("/wishlist", checkSessionAndBlock, wishlist)







module.exports = router