const express = require("express");
const app = express()
const userCollection = require("../model/userSchema");
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const speakeasy = require('speakeasy');
const multer = require("multer");
const Product = require("../model/productSchema")
const Address = require("../model/addressSchema")
const cartCollection = require("../model/cartSchema")
const orderCollection = require("../model/orderSchema")
const profileSchema = require('../model/profileSchema')
const buyNow = require("../model/buyNowSchema")
const offerCollection = require("../model/offerSchema")
const checkingCoupons = require("../model/couponCheck")
const Transaction = require("../model/transactionSchema ")
const PDFDocument = require("pdfkit");
const Razorpay = require('razorpay');
const session = require('express-session');
const couponsCollection = require("../model/couponSchema");
const wishlistCollections = require("../model/wishlistSchema")
const flash = require('connect-flash');
// require('dotenv').config()
require('dotenv').config();


// Configure Razorpay with your credentials
// const razorpayInstance = new Razorpay({
//   key_id: 'rzp_test_j6Z5wtQQMu2gyk',
//   key_secret: 'TYLjBiMyaOYRTUJDt5NzVxH2'
// });


app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));

let otpmail;


// Create a Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.email,
    pass: process.env.password
  }
});

// Generate a new secret for TOTP
const secret = speakeasy.generateSecret({ length: 10, name: 'MyApp' });

// Function to generate an OTP token
const generateOTPToken = () => {

  return speakeasy.totp({
    secret: secret.base32,
    encoding: 'base32'
  });
};

// Function to send OTP via email
const sendOTPEmail = (email, otp) => {
  const mailOptions = {
    from: 'akbarhaleel508@gmail.com',
    to: email,
    subject: 'One-Time Password (OTP)',
    text: `Your OTP for MyApp: ${otp}`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
};


// getLogin
exports.getlogin = (req, res) => {

  if (req.session.user) {
    res.redirect('/index')
  } else {
    res.render('login', { errorMessage: "" });
  }
}



// postLogin
exports.postlogin = async (req, res) => {
  try {

    const data = {
      username: req.body.username,
      password: req.body.password
    };

    if (!data.username || !data.password) {
      res.render("login", { message: "Username and password are required." });
    } else {

      const user = await userCollection.findOne({ username: data.username });

      if (!user) {
        console.log("Account doesn't exist");
        res.render("login", { message: "Account doesn't exist. Use different credentials." });
      } else {
        // Use bcrypt.compare correctly as it returns a promise
        const passwordMatch = await bcrypt.compare(data.password, user.password);

        if (!passwordMatch) {
          console.log("Incorrect password");
          res.render("login", { message: "Incorrect password. Use different credentials." });
        } else if (user.isBlocked) {
          console.log("Account is blocked");
          res.render("login", { message: "This account is blocked." });
        } else {
          // Assuming you want to store the username in the session
          req.session.user = {
            userId: user._id,
            username: user.username
          }

          const userData = await userCollection.findOne({ username: data.username });

          const userdata = {
            userId: req.session.user.userId,
            username: userData.username,
            email: userData.email
          }
          const check = await profileSchema.findOne(userdata)
          if (!check) {
            await profileSchema.create(userdata);
          } else {
            await profileSchema.updateOne(userdata);

          }

          console.log("Session in login post", req.session.user);
          res.redirect("/index");

        }
      }
    }
  } catch (error) {
    console.error("Error in profile route:", error);
    res.status(500).send("Internal Server Error");
  }
};



//getSignup
exports.getsignup = (req, res) => {
  res.render("signup")
}



//postSignup
exports.postsignup = async (req, res) => {
 
  try {
    console.log("signup Post is working");
    const data = {
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
    };
  
  
    req.session.userdetails = data
    
    const userExist = await userCollection.findOne({ email: data.email });
    if (!userExist) {
      // Example usage
      const userEmailAddress = data.email;
      req.session.otpToken = generateOTPToken();
      console.log(req.session.otpToken);
      otpmail = userEmailAddress
      // Send OTP via email
      sendOTPEmail(userEmailAddress, req.session.otpToken);

      res.redirect("/otp");
    } else {
      res.render("signup", { message: "User is already Exisis" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};



//OTP get Router
exports.getOtp = (req, res) => {
  res.render("otp")
}
// resend otp get
exports.resendotp = (req, res) => {
  try {
    console.log("RESEND  OTP GET");
    let userEmailAddress = otpmail;
    console.log("mail is", userEmailAddress);
    console.log(req.session.otpToken);
    req.session.otpToken = generateOTPToken();
    console.log(req.session.otpToken);

    // Send OTP via email
    sendOTPEmail(userEmailAddress, req.session.otpToken);
    res.redirect("/otp");
  } catch (error) {
    console.log(error);
  }

}



// OTP post Router
exports.postOtp = async (req, res) => {
  try {
    console.log(req.session.userdetails);

    const enteredotp = req.body.digits;
    console.log("User entered OTP:", enteredotp);

    if (enteredotp === req.session.otpToken) {
      // Validate user input
      // if (!req.session.userdetails.username || !req.session.userdetails.email || !req.session.userdetails.password) {
      //   return res.status(400).send("Invalid input. Please provide all required fields.");
      // }

      // Hash and salt the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(req.session.userdetails.password, saltRounds);

      // Replace plain password with hashed password
      req.session.userdetails.password = hashedPassword;

      // Create a user in the database
      await userCollection.create(req.session.userdetails);

      // Redirect to login page upon successful registration
      res.redirect('/login');
      console.log("OTP verified successfully!");
    } else {
      // Render an error message if OTP is invalid
      res.render("otp", { message: "Invalid OTP. Please try again." });
      console.log("Invalid OTP. Please try again.");
    }
  } catch (error) {
    // Log and handle errors appropriately
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
};




exports.getProduct_detail = async (req, res) => {
  try {
    const productId = req.params.productid;
    console.log(productId);
    const product = await Product.findById(productId);
    const message = req.query.message;

    res.render("productDetail", { product, message });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};




exports.profile = async (req, res) => {
  try {
    //show name and email into userSchema
    const userid = req.session.user.userId
    const userData = await userCollection.findOne();

    const profile = await profileSchema.findOne({ userId: userid })

    const address = await Address.find({ userId: userid })

    const coupons = await couponsCollection.find()

    console.log("Coupons is",coupons);
    res.render("profile", { userData, address, profile,coupons })
  } catch (error) {
    console.error("Error in profile route:", error);
    res.status(500).send("Internal Server Error");
  }

}


//get Router for AddAddress
exports.getAddAddress = (req, res) => {
  // console.log(session.user);
  res.render("add_address")
}


//post Router for AddAddress 
exports.postAddAddress = async (req, res) => {
  try {

    const addressdata = {
      userId: req.session.user.userId,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      address: req.body.address,
      state: req.body.state,
      city: req.body.city,
      zip: req.body.zip,

    };
    console.log("eeeeeeeeeeee", addressdata);
    const addAddress = await Address.create(addressdata)
    if (addAddress) {
      res.redirect('/profile')
    } else {
      res.render('add_address')
    }


  } catch (error) {
    console.error("Error in profile route:", error);
    res.status(500).send("Internal Server Error");
  }
}





exports.product = async (req, res) => {
  let { page, limit } = req.query;
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 9; // Display 10 products per page by default
  const skip = (page - 1) * limit;

  try {
    // Fetch a page of products that are not listed
    const products = await Product.find({ isListed: false })
      .skip(skip)
      .limit(limit);

    // Calculate total number of products to determine total pages
    const totalProducts = await Product.countDocuments({ isListed: false });
    const totalPages = Math.ceil(totalProducts / limit);

    res.render('product', { products, totalPages, currentPage: page });
  } catch (error) {
    console.error("Error in product route:", error);
    res.status(500).send("Internal Server Error");
  }
}





exports.cart = async (req, res) => {
  try {
    const userId = req.session.user.userId;
    const cart = await cartCollection.find({ userid: userId });

    if (cart.length === 0) {
      if (req.session.appliedCoupon) {
        delete req.session.appliedCoupon;
        const checkCoupons = await checkingCoupons.deleteOne({ userId: userId })
        console.log("coupon deleted sucessfully", checkCoupons);
      }
    } else {
      console.log("Cart has data:", cart);
    }

    let total = 0;
    let totalPrice = 0;
    let totalDiscount = 0; // Variable to track total discount
    let allItemsInStock = true;

    for (const item of cart) {
      const product = await Product.findById(item.productid);
      if (product && product.stock >= item.quantity) {
        let itemTotalPrice = product.price * item.quantity;
        totalPrice += itemTotalPrice; // Update total price before any discounts

        // Check if there are applicable offers for the product
        const offers = await offerCollection.findOne({ applicableProducts: product.productname });
        if (offers) {
          // Calculate the discount for this item
          let itemDiscount = itemTotalPrice * (offers.discount / 100);
          totalDiscount += itemDiscount; // Accumulate total discount
        }
      } else {
        allItemsInStock = false;
      }
    }

    let discountPrice = totalDiscount; // Use the accumulated totalDiscount
    let totalPriceAfterDiscount = totalPrice - totalDiscount; // Calculate the total price after applying the discount

    // Pass the calculated values to your template
    res.render('cart', { cart, totalPrice, totalPriceAfterDiscount, total, discountPrice });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};







exports.postCart = async (req, res) => {

  try {
    const productId = req.params.productid;
    const userId = req.session.user.userId;

    const product = await Product.findById(productId);
    const userAddress = await Address.findOne({ userId: userId });
    const cartData = {
      userid: userId,
      productid: productId,
      product: product.productname,
      price: product.price,
      brand: product.productname,
      quantity: 1,
      address: {
        firstName: userAddress.firstName,
        lastName: userAddress.lastName,
        state: userAddress.state,
        address: userAddress.address,
        city: userAddress.city,
        zip: userAddress.zip
      },
      image: product.imageUrl[0],
      status: "Pending"
    };

    const cartProduct = await cartCollection.findOne({ productid: productId, userid: userId });

    if (cartProduct) {
      const newQuantity = cartProduct.quantity + 1;
      await cartCollection.updateOne({ _id: cartProduct._id }, { $set: { quantity: newQuantity } });
      console.log("Cart updated successfully");

    } else {
      await cartCollection.create(cartData);

      console.log("Cart added successfully");
    }

    res.redirect("/cart");
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};





//get Router for order page
exports.getOrder = async (req, res) => {
 try {
  const product = await Product.find()
  const user = await userCollection.find()

  res.render("order", { product, user })
 } catch (error) {
  res.status(500).send('Internal Server Error');
 }
}



exports.getplaceOrder = async (req, res) => {

try { 
  const userid = req.session.user.userId

  const productId = req.params.productId;
  const product = await Product.findById({ _id: productId })
  const address = await Address.find({ userId: userid })
  const user = await userCollection.findOne({ _id: userid })
  console.log("Address is", address);
  console.log("Product is ", product);
  console.log("User is ", user);
  res.render('placeOrder', { product, address, user })
} catch (error) {
  res.status(500).send('Internal Server Error');
}
}




exports.getpayment = async (req, res) => {
try {
  const userId = req.session.user.userId;

  // Ensure we're fetching cart items and address for the current user only
  const cartItems = await cartCollection.find({ userid: userId });
  const address = await Address.find({ userId });

  let finalPrice = 0;
  let totalDiscount = 0; // Total discount across all items

  for (let item of cartItems) {
    const product = await Product.findById(item.productid);
    if (!product) continue; // Skip if product not found (ideally handle this case better)

    const itemPrice = product.price * item.quantity;
    finalPrice += itemPrice; // Add item price to final price

    const offers = await offerCollection.findOne({ applicableProducts: product.productname });
    if (offers) {
      let itemDiscount = itemPrice * (offers.discount / 100);
      totalDiscount += itemDiscount; // Accumulate total discount
    }
  }

  let discountPrice = totalDiscount;
  let totalPayable = finalPrice - discountPrice; // Calculate total payable after discounts

  if (req.session.appliedCoupon) {
    const { discount, purchaseAmount } = req.session.appliedCoupon;
    // You might want to validate the coupon again here, to ensure it's still valid

    // Apply discount if applicable
    if (totalPayable >= purchaseAmount) {
      // Calculate the discount amount as a percentage of totalPayable
      const discountAmount = totalPayable * (discount / 100);
      // Subtract the discount amount from totalPayable
      totalPayable -= discountAmount;
      console.log("Coupon discount applied as a percentage");
    }
  }

  const errorMessage = req.flash('error');

  console.log("Final Price:", finalPrice, "Discount:", discountPrice, "Total Payable:", totalPayable);

  res.render('payment', { orderProducts: cartItems, address, finalPrice: totalPayable, discountPrice, errorMessage: errorMessage.length > 0 ? errorMessage[0] : null });
} catch (error) {
  res.status(500).send('Internal Server Error');
}
};








exports.postEditProfile = async (req, res) => {

  try {

    let imageUrl;
    if (req.file) {
  
      imageUrl = req.file.path;
    }
    const userid = req.session.user.userId
    const firstName = req.body.firstName;
  
  
    const profile = await profileSchema.findOne({ userId: userid })
    if (profile) {

      const check = await profileSchema.findOneAndUpdate(
        { userId: userid },
        { $set: { username: firstName } },
        { new: true }
      );

      if (check) {
        console.log('Profile updated successfully:', check);
        res.redirect('/profile');
      } else {

        // This block will be executed if the address is found, but the update fails
        res.status(500).send('Error updating profile');
      }
    } else {
      // Create a new document if the address is not found
      await Address.create(data);
      console.log('Profile created successfully:', data);
      res.redirect('/profile');
    }
  } catch (error) {
    console.error('Error updating/creating profile:', error);
    res.status(500).send('Internal Server Error');
  }
};





exports.getEditProfile = async (req, res) => {
  try {
    const userid = req.session.user.userId

  const profile = await profileSchema.findOne({ userId: userid })

  res.render('editProfile', { profile })
  } catch (error) {
    console.error('Error updating/creating profile:', error);
    res.status(500).send('Internal Server Error');
  }
}


exports.getOrderConfirm = (req, res) => {
  res.render('orderConfirm')
};






exports.postOrderConfirm = async (req, res) => {
  try {
    const userId = req.session.user.userId;
    const selectedAddressId = req.body.address;
    const paymentMethods = req.body.paymentMethod;

    const selectedAddress = await Address.findById({ _id: selectedAddressId });
    const cartItems = await cartCollection.find().populate('address');

    let finalPrice = 0;
    let totalDiscountPrice = 0; // To keep track of total discount

    const products = await Promise.all(cartItems.map(async (item) => {
      let discountPrice = 0;
      const offers = await offerCollection.findOne({ applicableProducts: item.product }); // Adjust query as needed
      if (offers) {
        discountPrice = item.price * (offers.discount / 100) * item.quantity;
        totalDiscountPrice += discountPrice; // Accumulate total discount
      }
      finalPrice += item.price * item.quantity;

      if (req.session.appliedCoupon) {
        const { discount, purchaseAmount } = req.session.appliedCoupon;
        if (finalPrice >= purchaseAmount) {

          const discountAmount = finalPrice * (discount / 100);
          // Subtract the discount amount from totalPayable
          finalPrice -= discountAmount;
        }
      }

      return {
        productid: item.productid,
        productName: item.product,
        quantity: item.quantity,
        brand: item.brand,
        price: item.price,
        discountPrice: discountPrice / item.quantity, // Store discount price per product
        status: "Pending",
      };
    }));

    if (req.session.appliedCoupon) {
      const { discount, purchaseAmount } = req.session.appliedCoupon;
      // Apply discount if applicable
      if (finalPrice >= purchaseAmount) {
        // Calculate the discount amount as a percentage of totalPayable
        const discountAmount = finalPrice * (discount / 100);
        // Subtract the discount amount from totalPayable
        finalPrice -= discountAmount;
      }
    }

    const totalPrice = finalPrice - totalDiscountPrice; // Final price after all discounts
    const totalQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);

    if (paymentMethods === "wallet") {

      const user = await userCollection.findById({ _id: userId })
      const transaction = new Transaction({
        user: userId,
        type: "purchease",
        amount: totalPrice
      })

      if (user.balance > totalPrice) {
        await transaction.save()

        const walletBalence = user.balance - totalPrice;
        user.balance = walletBalence;
        await user.save()
        console.log("Wallet balence is ", walletBalence);

        console.log("Product purcheased", transaction);

      } else {
        console.log("Wallet Have insuffiction fund");
        req.flash('error', 'Insufficient wallet balance for this purchase.');
        return res.redirect('/payment');
      }

    }

    const orderItems = {
      userId: userId,
      products: products,
      totalQuantity: totalQuantity,
      totalPrice: totalPrice,
      address: {
        firstName: selectedAddress.firstName,
        lastName: selectedAddress.lastName,
        state: selectedAddress.state,
        address: selectedAddress.address,
        city: selectedAddress.city,
        zip: selectedAddress.zip,
      },
      paymentMethod: paymentMethods,
      orderDate: new Date()
    };

    const order = await orderCollection.create(orderItems);
    const coupon = req.session.appliedCoupon;
    if (coupon) {
      const couponId = await couponsCollection.findOne({ couponCode: coupon.couponCode });
      await checkingCoupons.create({ userId: userId, couponsId: couponId._id });
    }

    if (order) {
      await cartCollection.deleteMany()

      if (req.session.appliedCoupon) {
        delete req.session.appliedCoupon;
      }

    }
    console.log("Order successfully created", order);

    // Decrease stock for each product in the order
    for (const productItem of orderItems.products) {
      const product = await Product.findById(productItem.productid);

      if (product && product.stock >= productItem.quantity) {
        product.stock -= productItem.quantity;
        await product.save();
      } else {
        console.error(`Insufficient stock for product ${productItem.productid}`);
      }
    }

    // Delete cart items now that the order has been placed
    // await cartCollection.deleteMany({ userid: userId }); // Ensure deletion targets user's cart

    res.redirect('/orderConfirm');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};




exports.getRazorpayOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    var instance = new Razorpay({ key_id: process.env.KEY_ID, key_secret: process.env.KEY_SECRET});
    var options = {
      amount: amount * 100, // Convert amount to the smallest currency unit (e.g., paise in INR)
      currency: "INR",
      receipt: "order_rcptid_11",
    };

    // Creating the order
    instance.orders.create(options, function (err, order) {
      if (err) {
        console.error(err);
        res.status(500).send("Error creating order");
        return;
      }

      // Add orderprice to the response object


      res.send({ orderId: order.id });
      // Replace razorpayOrderId and razorpayPaymentId with actual values
      // Redirect to /orderdata on successful payment
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

exports.getDepositepost = async (req, res) => {
  try {
    console.log('here the depo backend');
    const { amount } = req.body;
    var instance = new Razorpay({ key_id: process.env.KEY_ID, key_secret: process.env.KEY_SECRET});
    var options = {
      amount: amount * 100, 
      currency: "INR",
      receipt: "order_rcptid_11",
    };

    // Creating the order
    instance.orders.create(options, function (err, order) {
      if (err) {
        // console.error(err);
        res.status(500).send("Error creating order");
        return;
      }

      res.send({ orderId: order.id });

    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};


exports.getdepoamount = async (req, res) => {
  try {
    const userId = req.session.user.userId;
    const depositAmount = req.body.depositAmount;


    amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).send('Invalid amount');
    }

    const user = await userCollection.findById({ _id: userId });
    if (!user) return res.status(404).send('User not found');
    user.balance = user.balance + amount;
    await user.save()

    // Record transaction
    const transaction = new Transaction({
      user: userId,
      type: 'deposit',
      amount: amount
    })

    await transaction.save();
  } catch (error) {
    res.status(500).send('Server error');
  }
}





exports.getCartItemRemove = async (req, res) => {
try {
  const deleteid = req.params.deleteId
  console.log("CartItem deleted" + deleteid);
  const deleteCart = await cartCollection.findOneAndDelete({ productid: deleteid });

  res.redirect('/cart')
} catch (error) {
  console.error(error);
  res.status(500).send("Internal Server Error");
}
}




exports.wishlistItemRemove = async (req, res) => {
try {
  const deleteid = req.params.deleteId
  console.log("CartItem deleted" + deleteid);
  const deleteCart = await wishlistCollections.findOneAndDelete({ productid: deleteid });

  res.redirect('/wishlist')
} catch (error) {
  console.error(error);
  res.status(500).send("Internal Server Error");
}
}





exports.getyourOrder = async (req, res) => {
try {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  const userId = req.session.user.userId

  // Fetch orders with pagination
  let orders = await orderCollection.find({ userId: userId }).sort({ orderDate: -1 }).skip(skip).limit(limit);

  // Assuming each order has a list of product names or IDs, and you need to calculate discount for each
  for (let order of orders) {
    var orderDiscount = 0;
    for (let product of order.products) { // Assuming 'products' field in each order
      const offers = await offerCollection.findOne({ applicableProducts: product.name }); // Adjust according to your schema
      if (offers) {
        // Assuming you store total price for each product in the order
        const discountAmount = product.price * (offers.discount / 100);
        orderDiscount += discountAmount;

      }
    }
    order.discountPrice = orderDiscount;
  }

  const totalDocuments = await orderCollection.countDocuments();
  const totalPages = Math.ceil(totalDocuments / limit);

  res.render('yourOrder', {
    orderDiscount,
    orders,
    page,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    nextPage: page + 1,
    previousPage: page - 1,
    lastPage: totalPages
  });
} catch (error) {
  console.error(error);
  res.status(500).send("Internal Server Error");
}
};







exports.postCancelOrder = async (req, res) => {

  try {

    const userId = req.session.user.userId
    const { orderId, productId } = req.params; // Add productId to receive from request parameters

    const order = await orderCollection.findById(orderId);

    if (order && order.products && order.products.length > 0) {
      const productIndex = order.products.findIndex(p => p.productid.toString() === productId); // Find the index of the product to cancel

      if (productIndex !== -1) {
        // Product found in the order
        const productDetail = order.products[productIndex];
        const product = await Product.findById(productId);

        if (product) {
          const updatedStock = product.stock + productDetail.quantity;
          // Update the stock of the specific product
          await Product.findByIdAndUpdate(productId, { stock: updatedStock });


          // Update the status of the specific product to "Cancelled"
          order.products[productIndex].status = "Cancelled";
          await orderCollection.findByIdAndUpdate(orderId, { products: order.products });
          // const balenceAmout = await orderCollection.findOne({ _id: orderId });
          const userWallet = await userCollection.findById(userId)
          userWallet.balance += order.products[productIndex].price;
          await userWallet.save()
       

          const user = await userCollection.findById({ _id: userId })
          const transaction = new Transaction({
            user: user._id,
            type: 'refunded',
            amount: order.products[productIndex].price
          })
          
      await transaction.save()

          console.log("Specific product cancelled and stock updated successfully");
          res.json({ message: 'Specific product cancelled successfully' });
        } else {
          res.status(404).json({ message: 'Product not found' });
        }
      } else {
        res.status(404).json({ message: 'Product not found in order' });
      }
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    console.error("Error cancelling specific product in order:", error);
    res.status(500).json({ message: 'Error cancelling specific product in order', error: error });
  }
};








exports.postReturnOrder = async (req, res) => {
  try {
    const { orderId, productId } = req.params; // Add productId to receive from request parameters

    const order = await orderCollection.findById(orderId);

    if (order && order.products && order.products.length > 0) {
      const productIndex = order.products.findIndex(p => p.productid.toString() === productId); // Find the index of the product to cancel

      if (productIndex !== -1) {
        // Product found in the order
        const productDetail = order.products[productIndex];
        const product = await Product.findById(productId);

        if (product) {
          const updatedStock = product.stock + productDetail.quantity;
          // Update the stock of the specific product
          await Product.findByIdAndUpdate(productId, { stock: updatedStock });

          // Update the status of the specific product to "Cancelled"
          order.products[productIndex].status = "Returned";
          await orderCollection.findByIdAndUpdate(orderId, { products: order.products });

          console.log("Specific product cancelled and stock updated successfully");
          res.json({ message: 'Specific product cancelled successfully' });
        } else {
          res.status(404).json({ message: 'Product not found' });
        }
      } else {
        res.status(404).json({ message: 'Product not found in order' });
      }
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    console.error("Error cancelling specific product in order:", error);
    res.status(500).json({ message: 'Error cancelling specific product in order', error: error });
  }
};









exports.getChangepassword = (req, res) => {
  res.render('changePassword')
}




exports.postChangepassword = async (req, res) => {
try {
  const userid = req.session.user.userId;

  const Passwords = {
    currentPassword: req.body.currentPassword,
    newPassword: req.body.newPassword,
    confirmPassword: req.body.confirmPassword
  }
  const user = await userCollection.findOne({ _id: userid });
  console.log("User is ", user);
  if (!user) {
    console.log("User not found");
    return res.render("changePassword", { message: "User not found." });
  }
  const passwordMatch = await bcrypt.compare(Passwords.currentPassword, user.password);

  if (!passwordMatch) {
    console.log("password is not match");
    return res.render('changePassword', { message: "Incorrect current password." })
  } else {
    const hashedNewPassword = await bcrypt.hash(Passwords.newPassword, 10);

    await userCollection.updateOne({ _id: userid }, { $set: { password: hashedNewPassword } })
    res.redirect("/profile")
    console.log("Password successfully updated.");
  }
} catch (error) {
  res.status(500).send('Server error');

}
}





exports.getEditAddress = async (req, res) => {
  try {
    const addressId = req.params.addressId;
  const address = await Address.findOne({ _id: addressId });

  res.render('editAdrress', { address })
  } catch (error) {
    res.status(500).send('Server error');
  }
}





exports.postEditAddress = async (req, res) => {
  try {
    const userId = req.session.user.userId;
    const addressId = req.params.editAddressId;
    const updateData = req.body;
    console.log("aaaaaaaaaaa", updateData);
    console.log("Address ID:", addressId);
    console.log("User ID:", userId);

    const check = await Address.findOne({ _id: addressId, userId: userId });

    if (check) {
      const address = await Address.updateOne({ _id: addressId, userId: userId }, { $set: updateData })
      res.redirect('/profile');
    } else {
      res.render('editAddress', { error: 'Address not found or access denied.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};





exports.addCart = async (req, res) => {
  try {
    const userId = req.session.user.userId;
    const productId = req.params.productid;
    const userAddress = await Address.find({ userId: userId })
    const product = await Product.findOne({ _id: productId })
    if (product) {

      const cartData = {
        userid: userId,
        productid: productId,
        product: product.productname,
        price: product.price,
        brand: product.brand,
        quantity: 1,
        address: {
          firstName: userAddress.firstName,
          lastName: userAddress.lastName,
          state: userAddress.state,
          address: userAddress.address,
          city: userAddress.city,
          zip: userAddress.zip
        },
        image: product.imageUrl[0],
        status: "Pending"
      };

      const cartProduct = await cartCollection.findOne({ productid: productId, userid: userId });

      if (cartProduct) {
        const newQuantity = cartProduct.quantity + 1;
        await cartCollection.updateOne({ _id: cartProduct._id }, { $set: { quantity: newQuantity } });
        res.redirect('/cart')

      } else {
        await cartCollection.create(cartData);
        res.redirect('/cart')

      }

    }

  } catch (error) {
    console.log(error);
  }

}







exports.updateQuantity = async (req, res) => {
 
  try {
    const { itemId, quantity } = req.body;
    const userId = req.session.user.userId; // Assuming you have the user's ID in session
  
    // First, update the quantity of the specified item
    const product = await Product.findOne({ _id: itemId });
    if (!product || quantity > product.stock) {
      return res.json({ success: false, message: "Product not found or insufficient stock" });
    }

    const updateQuantity = await cartCollection.findOneAndUpdate(
      { userid: userId, productid: itemId },
      { $set: { quantity: quantity } },
      { new: true }
    );
    if (!updateQuantity) {
      return res.json({ success: false, message: "Cart update failed" });
    }

    // Then, recalculate the total price for the entire cart, including specific discounts per product
    const cart = await cartCollection.find({ userid: userId });
    let totalPrice = 0;
    let totalDiscount = 0; // Total discount across all items
    for (const item of cart) {
      const product = await Product.findById(item.productid);
      let itemTotalPrice = product.price * item.quantity;
      totalPrice += itemTotalPrice; // Add item price before discount

      // Apply product-specific discounts
      const offer = await offerCollection.findOne({ applicableProducts: product.productname });
      if (offer) {
        let itemDiscount = itemTotalPrice * (offer.discount / 100);
        totalDiscount += itemDiscount;
      }
    }

    let discountPrice = totalDiscount; // Total discount for the cart
    let totalPayable = totalPrice - totalDiscount; // Total price after applying all discounts

    // Return the recalculated total for the entire cart
    res.json({
      success: true,
      message: "Quantity updated and total recalculated",
      totalPrice: totalPrice, // Before discount
      discountPrice: discountPrice, // Total discount
      totalPayable: totalPayable // After discount
    });
  } catch (error) {
    console.error("Error updating quantity:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};







exports.getOrderDetails = async (req, res) => {
  try {
    const { orderId, productId } = req.params;
    // Fetch the order by its ID
    const order = await orderCollection.findById(orderId);
    if (!order) { 
      return res.status(404).send('Order not found');
    }

    // Find the specific product in the order
    const productDetail = order.products.find(p => p.productid.toString() === productId);

    if (!productDetail) {
      return res.status(404).send('Product not found in order');
    }

    // Fetch the product details from the products collection
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send('Product not found');
    }

    // Render the order details page with both order and product information
    res.render('orderDetails', { order: order, productDetail: productDetail, product: product });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).send('Error fetching order details');
  }
};




exports.downloadInvoice = async (req, res) => {
  try {
    let user = req.session.user.username;
    let userId = req.session.user.userId;

    const orderId = req.params.orderId;
    console.log("Entered", orderId);

    const invoiceDetails = await userCollection.findOne({ _id: userId });
    console.log("Invoice", invoiceDetails);

    const specificOrder = await orderCollection.findById(orderId).populate("products");
    console.log("Invoice", specificOrder);

    // Create a new PDF document
    const doc = new PDFDocument();

    // Set response headers to trigger a download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="invoice.pdf"');
    // Pipe the PDF document to the response
    doc.pipe(res);
    const imagePath = "public/images/Logo.png"; // Change this to the path of your image
    const imageWidth = 100; // Adjust image width based on your layout
    const imageX = 550 - imageWidth; // Adjust X-coordinate based on your layout
    const imageY = 50;
    // Adjust Y-coordinate to place the image at the top
    doc.image(imagePath, imageX, imageY, { width: imageWidth });

    // Move to the next section after the image
    doc.moveDown(1);

    // Add content to the PDF document
    doc.fontSize(16).text("Billing Details", { align: "center" });
    doc.moveDown(1);
    doc.fontSize(10).text("Customer Details", { align: "center" });
    doc.text(`Order ID: ${orderId}`);
    doc.moveDown(0.3);
    doc.text(`Name: ${invoiceDetails.username || ""}`);
    doc.moveDown(0.3);
    doc.text(`Email: ${invoiceDetails.email || ""}`);
    doc.moveDown(0.3);
    doc.text(`Phone: ${invoiceDetails.phoneNumber || ""}`);

    doc.moveDown(0.3);
    const address = specificOrder.address;
    doc.text(
      `Address: ${address.address}, ${address.city}, ${address.state} ${address.pincode || ""
      }`
    );
    doc.moveDown(0.3);
    doc.text(`Payment Method: ${specificOrder.paymentMethod || ""}`);

    doc.moveDown(0.3);

    const headerY = 300; // Adjust this value based on your layout
    doc.font("Helvetica-Bold");
    doc.text("Name", 100, headerY, { width: 150, lineGap: 5 });
    doc.text("Status", 300, headerY, { width: 150, lineGap: 5 });
    doc.text("Quantity", 400, headerY, { width: 50, lineGap: 5 });
    doc.text("Price", 500, headerY, { width: 50, lineGap: 5 });
    doc.font("Helvetica");

    // Table rows
    const contentStartY = headerY + 30; // Adjust this value based on your layout
    let currentY = contentStartY;
    specificOrder.products.forEach((product, index) => {
      doc.text(product.productName || "", 100, currentY, {
        width: 150,
        lineGap: 5,
      });

      doc.text(product.status || "", 300, currentY, {
        width: 50,
        lineGap: 5,
      });
      doc.text(product.quantity || "", 400, currentY, {
        width: 50,
        lineGap: 5,
      });

      doc.text(product.price || "", 500, currentY, {
        width: 50,
        lineGap: 5,
      });
      console.log("Reached Here");

      // Calculate the height of the current row and add some padding
      const lineHeight = Math.max(
        doc.heightOfString(product.product || "", { width: 150 }),
        doc.heightOfString(product.status || "", { width: 150 }),
        doc.heightOfString(specificOrder.totalQuantity[index] || "", {
          width: 50,
        }),
        doc.heightOfString(product.price || "", { width: 50 })
      );
      currentY += lineHeight + 10; // Adjust this value based on your layout
    });
    doc.text(`Total Price: ${specificOrder.totalPrice || ""}`, {
      width: 400, // Adjust the width based on your layout
      lineGap: 5,
    });

    // Set the y-coordinate for the "Thank you" section
    const separation = 50; // Adjust this value based on your layout
    const thankYouStartY = currentY + separation; // Update this line

    // Move to the next section
    doc.y = thankYouStartY; // Change this line

    // Move the text content in the x-axis
    const textX = 60; // Adjust this value based on your layout
    const textWidth = 500; // Adjust this value based on your layout
    doc
      .fontSize(16)
      .text(
        "Thank you for choosing EyesCart! We appreciate your support and are excited to have you as part of our  family.",
        textX,
        doc.y,
        { align: "left", width: textWidth, lineGap: 10 }
      );

    doc.end();
  } catch (error) {
    res.render("error");
  }
};







exports.applyCoupon = async (req, res) => {
  try {
    const userId = req.session.user.userId;
    const { couponCode } = req.body;

    const coupon = await couponsCollection.findOne({ couponCode: couponCode });
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    const checkCoupons = await checkingCoupons.findOne({ userId: userId, couponsId: coupon._id });
    if (checkCoupons) {
      return res.status(409).json({ message: 'Coupon already used by this user' });
    }


    req.session.appliedCoupon = {
      couponCode: coupon.couponCode,
      discount: coupon.discount,
      purchaseAmount: coupon.purcheseAmount,
    };


    res.json({
      message: 'Coupon applied successfully',
      discount: coupon.discount,
      purcheseAmount: coupon.purcheseAmount
    });

  } catch (error) {
    console.error('Error applying coupon:', error);
    res.status(500).json({ message: 'An error occurred while applying the coupon' });
  }
};






exports.getWallet = async (req, res) => {
try {
  const userId = req.session.user.userId;
  const user = await userCollection.findById({ _id: userId });

  // Pagination parameters
  const page = parseInt(req.query.page) || 1; // Default to page 1 if not specified
  const limit = parseInt(req.query.limit) || 4; // Default to 10 items per page
  const skip = (page - 1) * limit;

  // Fetch transactions with pagination
  const transactions = await Transaction.find({ user: userId }).sort({ timestamp: -1 }).skip(skip).limit(limit);

  // Count the total number of transactions to calculate total pages
  const totalTransactions = await Transaction.countDocuments({ user: userId });
  const totalPages = Math.ceil(totalTransactions / limit);

  res.render("wallet", {
    balance: user.balance,
    transactions: transactions,
    currentPage: page,
    totalPages: totalPages,
    limit,

  });
} catch (error) {
  res.status(500).send('Internal Server Error');
}
};





exports.getDeposite = async (req, res) => {
try {
  const userId = req.session.user.userId
  const user = await userCollection.findById({ _id: userId })
  res.render("walletDeposite", { balance: user.balance })
} catch (error) {
  res.status(500).send('Internal Server Error');
}
}


exports.postDeposit = async (req, res) => {

  try {
    const userId = req.session.user.userId
    let { amount } = req.body;
    console.log("amount is", amount);
    console.log("User id is", userId);
  
    amount = parseFloat(amount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).send('Invalid amount');
    }

    const user = await userCollection.findById({ _id: userId });
    if (!user) return res.status(404).send('User not found');
    user.balance = user.balance + amount;
    await user.save()

    // Record transaction
    const transaction = new Transaction({
      user: userId,
      type: 'deposit',
      amount: amount
    })

    await transaction.save();
    //  res.redirect("/wallet")


    res.send({ message: 'Deposit successful', balance: user.balance, redirect: "/wallet" });

  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
}


exports.getWithdraw = async (req, res) => {
try {
  const userId = req.session.user.userId;
  const user = await userCollection.findById({ _id: userId })
  res.render("walletWithdraw", { balence: user.balance });
} catch (error) {
  res.status(500).send('Internal Server Error');
}
}



exports.postWalletWithdraw = async (req, res) => {
try {
  const userId = req.session.user.userId
  const { amount } = req.body;
  const user = await userCollection.findById({ _id: userId })

  if (user.balance >= amount) {
    user.balance -= amount;
    await user.save()
    const transaction = new Transaction({
      user: userId,
      type: 'withdrawal',
      amount: amount
    })

    await transaction.save();
    res.redirect("/wallet")
  }
} catch (error) {
  res.status(500).send('Internal Server Error');
}
}

exports.logout = (req, res) => {
  // Destroy the session
  req.session.destroy()

  res.redirect("/login")
};






exports.index = async (req, res) => {
try {
  const products = await Product.find({ isListed: false })
  res.render('index', { products })
} catch (error) {
  res.status(500).send('Internal Server Error');
}
}




exports.about = (req, res) => {
  res.render('about')
}

exports.contact = (req, res) => {
  res.render('contact')
}


exports.testimonial = (req, res) => {
  res.render('testimonial')
}


exports.account = (req, res) => {
  res.render("account")
}

exports.wishlist = async (req, res) => {
try {
  const userId = req.session.user.userId
  const wishlist = await wishlistCollections.find({userid:userId});

  res.render('wishlist',{ wishlist: wishlist })
} catch (error) {
  res.status(500).send('Internal Server Error');

}
}


exports.addWishlist = async(req,res)=>{
 try {
  const productid = req.params.productid;
 
  const userId = req.session.user.userId;
  const wishlist = await wishlistCollections.findOne({userid:userId, productid:productid});
  const product = await Product.findById({_id:productid})
  if(wishlist){
    return res.status(409).send({ message: 'Product is already in the wishlist' });
  }
  
  if(!wishlist){
    await wishlistCollections.create({
      userid:userId,
      productid:productid,
      product:product.productname,
      price:product.price,
      brand:product.brand,
      image:product.imageUrl[0]
    })

  }
  return res.status(200).send({ message: 'Product added to wishlist successfully' });
 } catch (error) {
  res.status(500).send('Internal Server Error');
 }
}



exports.forgotPassword = (req,res)=>{
  res.render("forgotPassword")
}



exports.postforgotPassword = async (req,res)=>{
  const {email} = req.body
  const user = await userCollection.findOne({email:email});
  if(!user){
    return res.render("login",{message:"User is not exists"})
  }
  req.session.userEmail = user.email;


  res.redirect("/forgotPassword")
}





exports.postforgotPass= (req,res) =>{
  const {newPassword,confirmPassword}=req.body;
  console.log("newpassword is ",newPassword);
  console.log("confirm password is ",confirmPassword);

  const data = {
    pass : newPassword,
    email: req.session.userEmail
  }

  req.session.userNewPass =data

  console.log("user new pass is ",req.session.userNewPass.pass);
  
  const userEmailAddress = req.session.userNewPass.email;
  req.session.otpToken = generateOTPToken();
      console.log(req.session.otpToken);
      otpmail = userEmailAddress
      // Send OTP via email
      sendOTPEmail(userEmailAddress, req.session.otpToken);

      res.redirect("/forgotOtp");

}


exports.getForgotOtp = (req,res)=>{
  res.render("forgotOtp")
}


exports.postForgotOtp = async (req,res)=>{
  try {
    console.log(req.session.userEmail);
    const userEmail = req.session.userEmail
    console.log("user new pass is ",req.session.userNewPass.pass);

    const enteredotp = req.body.digits;
    console.log("User entered OTP:", enteredotp);

    if (enteredotp === req.session.otpToken) {

      // Hash and salt the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(req.session.userNewPass.pass, saltRounds);

      // Replace plain password with hashed password
      // req.session.userdetails.password = hashedPassword;
           

      await userCollection.findOneAndUpdate({email:userEmail},{$set:{password:hashedPassword}})
      
      // Create a user in the database
      

      // Redirect to login page upon successful registration
      res.redirect('/login');
      console.log("OTP verified successfully!");
    } else {
      // Render an error message if OTP is invalid
      res.render("otp", { message: "Invalid OTP. Please try again." });
      console.log("Invalid OTP. Please try again.");
    }
  } catch (error) {
    // Log and handle errors appropriately
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
}