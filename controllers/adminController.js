const express = require("express");
// const bcrypt = require("bcryptjs");
const Category = require("../model/categorySchema");
const Product = require("../model/productSchema");
const collection = require("../model/userSchema")
const multer = require("multer");
const { use } = require("../router/user");
const Address = require("../model/addressSchema");
const orderCollection = require("../model/orderSchema");
const adminCollection = require('../model/adminSchema')
const offerCollection = require("../model/offerSchema")
const couponsCollection = require("../model/couponSchema")
const PDFDocument = require("pdfkit-table");
const ExcelJS = require("exceljs");
const router = require("../router/user");

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "public/uploads");
//   },
//   filename: function (req, file, cb) {
//     cb(null, file.fieldname + "-" + Date.now() + "-" + file.originalname);
//   },
// });

// exports.uploads = multer({ storage: storage }).array("image"); 


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now() + "-" + file.originalname);
  },
});

exports.uploads = multer({ storage: storage }).array("image");



// // Hash the password (use a secure method for storing passwords)
// const saltRounds = 10; // Number of salt rounds for bcrypt
// const hashedPassword = bcrypt.hashSync("admin123", saltRounds);

// const credentials = {
//   Name: "admin",
//   Password: hashedPassword
// };

// adminGetlogin
exports.getAdminLogin = (req, res) => {
  res.render("adminLogin");
};





// adminPostlogin
exports.postAdminLogin = async (req, res) => {
  try {

    const { adminName, adminPassword } = req.body;


    const admin = await adminCollection.find();
    console.log("admin data is", admin[0].password);



    if (adminName !== admin[0].name || adminPassword !== admin[0].password) {
      res.render("adminLogin", { message: "Invalid credentials. Please try again." });
    } else {
      req.session.adminPassword = adminPassword;
      console.log("admin session is", req.session.adminPassword);
      res.redirect("/adminDashboard");
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).send("Internal Server Error");
  }
};





//adminGetDashboard
exports.getAdminDashboard = async (req, res) => {
  try {

    // const topProducts = await orderCollection.aggregate([
    //   { $unwind: "$products" },
    //   {
    //     $group: {
    //       _id: "$products.productid",
    //       totalQuantity: { $sum: "$products.quantity" },
    //       totalSales: { $sum: { $multiply: ["$products.quantity", { $ifNull: ["$products.discountPrice", "$products.price"] }] }},
    //       productName: { $first: "$products.productName" } // Assumes productName is consistent for each productid
    //     }
    //   },
    //   { $sort: { totalQuantity: -1 } }, // Sort by totalQuantity descending
    //   { $limit: 10 } 
    // ]);


    const page = req.query.page ? parseInt(req.query.page) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 4;


    const topBrands = await orderCollection.aggregate([
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.productid",
          brand: { $first: "$products.brand" },
          productName: { $first: "$products.productName" }
        }
      }
      ,
      { $sort: { totalQuantity: -1 } },
      { $limit: 8 }

    ])


    const topProducts = await orderCollection.aggregate([
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.productid",
          totalQuantity: { $sum: "$products.quantity" },
          debugDiscountPrice: { $first: "$products.discountPrice" }, // Debugging
          debugPrice: { $first: "$products.price" },
          brand: { $first: "$products.brand" },
          debugQuantity: { $sum: "$products.quantity" }, // Debugging
          totalSales: {
            $sum: {
              $multiply: [
                "$products.quantity",
                {
                  $cond: {
                    if: { $gt: ["$products.discountPrice", 0] },
                    then: { $subtract: ["$products.price", "$products.discountPrice"] },
                    else: "$products.price"
                  }
                }
              ]
            }
          },
          productName: { $first: "$products.productName" }
        }
      }
      ,
      { $sort: { totalQuantity: -1 } },
      { $skip: (page - 1) * limit }, // Sort by totalQuantity descending
      { $limit: limit } // Limit to top 10 products
    ]);



    const topProductsWithImageUrls = await Promise.all(topProducts.map(async (product) => {
      // Find the product in the Product collection by productname (note the lowercase 'n' to match your schema)
      const productDetails = await Product.findOne({ productname: product.productName }).lean();

      // Assuming the `imageUrl` field in your Product model is an array of strings as per your schema,
      // you might want to just grab the first URL, or handle it differently depending on your requirements
      if (productDetails && productDetails.imageUrl.length > 0) {
        product.imageUrl = productDetails.imageUrl[0]; // Taking the first image URL, adjust as needed
      } else {
        product.imageUrl = null; // Or a default image URL, if no productDetails is found or if there are no images
      }

      return product;
    }));

    const totalCount = await orderCollection.countDocuments();
    const maxPage = Math.ceil(totalCount / limit);




    const { from_date, to_date } = req.query;

    console.log("from date is", from_date);
    console.log("To date is", to_date);

    let query = {};
    if (from_date && to_date) {
      const fromDate = new Date(from_date);
      const toDate = new Date(to_date);

      toDate.setHours(23, 59, 59, 999);

      query.orderDate = {
        $gte: fromDate,
        $lte: toDate
      };

      var orders = await orderCollection.find(query);

    } else {
      var orders = await orderCollection.find();
    }
    // const orders = await orderCollection.find();

    // Daily Orders
    const dailyOrders = await orderCollection.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const { dates, orderCounts, totalOrderCount } = dailyOrders.reduce(
      (result, order) => {
        result.dates.push(order._id);
        result.orderCounts.push(order.orderCount);
        result.totalOrderCount += order.orderCount;
        return result;
      },
      { dates: [], orderCounts: [], totalOrderCount: 0 }
    );
    // monthly
    const monthlyOrders = await orderCollection.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$orderDate" },
            month: { $month: "$orderDate" },
          },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);
    const monthlyData = monthlyOrders.reduce((result, order) => {
      const monthYearString = `${order._id.year}-${String(
        order._id.month
      ).padStart(2, "0")}`;
      result.push({
        month: monthYearString,
        orderCount: order.orderCount,
      });
      return result;
    }, []);
    let monthdata = orderCounts;

    //  Yearly Order
    const yearlyOrders = await orderCollection.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y", date: "$orderDate" } },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const { years, orderCounts3, totalOrderCount3 } = yearlyOrders.reduce(
      (result, order) => {
        result.years.push(order._id);
        result.orderCounts3.push(order.orderCount);
        result.totalOrderCount3 += order.orderCount;
        return result;
      },
      { years: [], orderCounts3: [], totalOrderCount3: 0 }
    );

    res.render("adminDashboard", {
      dates,
      orderCounts,
      totalOrderCount,
      monthdata,
      years,
      orderCounts3,
      totalOrderCount3,
      orders,
      topProducts, page, limit, maxPage, topBrands
    });
  } catch (error) {
    console.error("Error fetching and aggregating orders:", error);
    res.status(500).send("Internal Server Error");
  }
};




// //adminGetOrder
// exports.getAdminOrder = async (req, res) => {
//   const order = await orderCollection.find()

//   res.render("adminOrder",{order});
// };



exports.getAdminOrder = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10; // Default limit to 10 orders per page
  const skip = (page - 1) * limit;

  const totalOrders = await orderCollection.countDocuments();
  const order = await orderCollection.find().sort({ orderDate: -1 }).skip(skip).limit(limit);

  const totalPages = Math.ceil(totalOrders / limit);

  res.render("adminOrder", {
    order, // Updated to 'orders' to match iteration variable in EJS
    page,
    totalPages,
    limit
  });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
};


//adminPostOrder
exports.postAdminOrder = (req, res) => {

}

// //adminGetStatistics
// exports.getAdminStatistics = async(req, res) => {

//   const { from_date, to_date } = req.query;

//     console.log("from date is", from_date);
//     console.log("To date is", to_date);

//     let query = {};
//     if(from_date&& to_date){
//       const fromDate = new Date (from_date);
//       const toDate = new Date(to_date);

//       toDate.setHours(23, 59, 59, 999);

//       query.orderDate = {
//         $gte: fromDate,
//         $lte: toDate
//     };

//     var orders = await orderCollection.find(query);

//     }else{
//       var orders = await orderCollection.find();
//     }

//   // console.log("Order is",orders);
//   const util = require('util');

// // Inside your async function where you log the orders
// console.log("Order is", util.inspect(orders, { showHidden: false, depth: null, colors: true }));

//   res.render("adminStatistics",{orders});
// };



exports.getAdminStatistics = async (req, res) => {
try {
  const { from_date, to_date, page = 1, limit = 10 } = req.query; // Default to page 1 and limit 10 if not provided

  console.log("from date is", from_date);
  console.log("To date is", to_date);

  let query = {};
  if (from_date && to_date) {
    const fromDate = new Date(from_date);
    const toDate = new Date(to_date);
    toDate.setHours(23, 59, 59, 999);

    query.orderDate = {
      $gte: fromDate,
      $lte: toDate
    };
  }

  // Calculate the total number of orders for pagination metadata
  const totalOrders = await orderCollection.countDocuments(query);

  // Adjust the query to include pagination
  const orders = await orderCollection.find(query)
    .sort({ orderDate: -1 })
    .skip((page - 1) * limit) // Calculate the correct skip
    .limit(limit); // Limit the number of items

  // Prepare pagination metadata
  const pagination = {
    currentPage: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(totalOrders / limit),
    from_date: from_date || '', // Ensure from_date is defined, even as an empty string if not provided
    to_date: to_date || '' // Ensure to_date is defined, even as an empty string if not provided
  };

  res.render("adminStatistics", { orders, pagination, from_date: pagination.from_date, to_date: pagination.to_date, limit: limit, page: page });
} catch (error) {
  res.status(500).send("Internal Server Error");

}
};




exports.getAdminOffers = async (req, res) => {
 try {
  const offers = await offerCollection.find()
  if (offers.endDate < new Date()) {
    offers.isActive = false;
    await offers.save()
  }
  res.render("adminOffers", { offers });
 } catch (error) {
  res.status(500).send("Internal Server Error");
 }
};

//adminPostStatistics
exports.postAdminOffers = (req, res) => {

}


// GET router for retreving data from db
exports.getadminCategory = async (req, res) => {
try {
  let category = await Category.find()
  res.render("adminCategory", { category })
} catch (error) {
  res.status(500).send("Internal Server Error");

}
}




//Get router for add catergory
exports.getAddCategory = (req, res) => {
  res.render('addCategory', { message: '' });
}


//post router for validatin of add catergory
exports.postAddCategory = async (req, res) => {
  
  try {
    const categoryRegex = /^[A-Z][a-zA-Z0-9\s]*$/;

  const categoryName = req.body.categoryname.trim();

  // Check if a category with the same name already exists
  const existingCategory = await Category.findOne({ categoryname: categoryName });

  // Validate the category name
  if (!categoryName) {
    return res.render("addCategory", { message: "Category name cannot be empty." });
  } else if (!categoryRegex.test(categoryName)) {
    return res.render("addCategory", { message: "Invalid category name format." });
  } else if (existingCategory) {
    return res.render("addCategory", { message: "Category with the same name already exists." });
  }

    // Attempt to create a new category
    const newCategory = {
      categoryname: categoryName
    };

    const createdCategory = await Category.create(newCategory);
    res.redirect('/adminCategory');
  } catch (error) {
    console.error("Error adding category", error);
    res.sendStatus(500); // Send 500 Internal Server Error status
  }
};




// Get router for edit Category
exports.getEditCategory = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    const category = await Category.findById(categoryId);
    res.render('editCategery', { category, message: '' }); // Ensure errorMessage is defined
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};



// Post router for edit Category
exports.postEditCategery = async (req, res) => {
 

  try {

    const categoryRegex = /^[A-Z][a-zA-Z0-9\s]*$/;
    const CategoryName = req.body.categoryname.trim();
    const categoryId = req.params.categoryId;
    const category = await Category.findById(categoryId);
    // Check if the edited category name already exists
    const existingCategory = await Category.findOne({ categoryname: CategoryName });
    if (!CategoryName) {
      return res.render("editCategery", { message: "Category name cannot be empty.", category })
    } else if (!categoryRegex.test(CategoryName)) {
      return res.render("editCategery", { message: "Invalid category name format.", category })
    } else if (existingCategory) {
      return res.render("editCategery", { message: "Category with the same name already exists.", category })
    }

    // Update the category
    const updatedCategory = await Category.findOneAndUpdate(
      { _id: categoryId },
      { $set: { categoryname: CategoryName } },
      { new: true } // Returns the updated document   

    );

    res.redirect("/adminCategory");

  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};



//get Route for delete Category 
exports.deleteCategory = async (req, res) => {
 try {
  const deleteCategory = req.params.categoryId;
  const deleated = await Category.findOneAndDelete({ _id: deleteCategory },)

  res.redirect("/adminCategory")
 } catch (error) {
  res.status(500).send("Internal Server Error");
 }
}


exports.getAddProduct = async (req, res) => {
try {
  const categories = await Category.find()
  console.log(categories);
  res.render("addProduct", { message: "", categories })
} catch (error) {
  res.status(500).send("Internal Server Error");
}
}




exports.postAddProduct = async (req, res) => {
  // const imageArray = [];
  // for (const file of req.files) {
  //   imageArray.push(file.filename);
  // }

  // console.log("Hello",req.body);
  // console.log("Helloaaaaaaaa",req.files);
try {
  const checkProduct = {
    productname: req.body.productname,
    description: req.body.description,
    // Category:req.body.category,
    brand: req.body.brand,
    price: req.body.price,
    imageUrl: req.body.croppedImages,
    stock: req.body.stock,
  }
  // console.log("jjjjjjjjjjjjjjjjjjjjj",checkProduct.Category);

  const check = await Product.findOne({ productname: req.body.productname });
  // console.log("sssssssssss",check);
  if (!check) {
    const addedProduct = await Product.create(checkProduct);
    res.redirect("/adminProducts");
  } else {
    res.render("addProduct", { message: "This same Product already Exixts" })
  }
} catch (error) {
  res.status(500).send("Internal Server Error");

}
  // You can handle the success scenario, for example, by redirecting or rendering a success message

}



//render database datas into ejs file
// exports.getAdminProducts = async (req, res) => {

//   const products = await Product.find()

//   console.log(products.productname);
//   res.render("adminProducts",{products});

// };



exports.getAdminProducts = async (req, res) => {
 

  try {
     // Retrieve the page number and limit from query parameters. Set default values if they are not provided.
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10; // You can adjust the default limit as necessary

  // Calculate the number of documents to skip based on the current page
  const skip = (page - 1) * limit;

    // Fetch a page of products from the database
    const products = await Product.find().skip(skip).limit(limit);

    // Get the total count of documents in the collection to calculate total pages
    const totalProducts = await Product.countDocuments();

    // Calculate the total number of pages
    const totalPages = Math.ceil(totalProducts / limit);

    // Render the template with the products and pagination data
    res.render("adminProducts", {
      products,
      page: page, // Ensure this matches what you use in the template
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      nextPage: page + 1,
      previousPage: page - 1,
      limit
    });

  } catch (error) {
    console.error("Failed to fetch products:", error);
    res.status(500).send("An error occurred while fetching products.");
  }
};




exports.getEditProduct = async (req, res) => {

  try {
    const producId = req.params.producId;

    const productData = await Product.findById(producId)
    const errorMessage = req.flash('error')[0] || '';
    console.log("productData", productData);
    res.render("editProduct", { productData, message: "", errorMessage: errorMessage })
  } catch (error) {
    console.error("error", error);
  }
}




exports.postEditProduct = async (req, res) => {


  try {

    console.log("Entered Update Post");

    const productId = req.params.id;
  
    const { deleteImage } = req.body;
    console.log('Images to delete:', deleteImage);
  
    const product = await Product.findOne({ _id: productId })
  
    // if(product && deleteImage){
    //   deleteImage.forEach(index => {
    //     if(index>=0 && index< product.imageUrl.length){
    //        product.imageUrl.splice(index, 1);
    //     }
    //   });
    // }
  
    if (product && deleteImage) {
      // Convert each string index to a number and sort them in descending order
      const sortedIndices = deleteImage.map(Number).sort((a, b) => b - a);
  
      // Remove images from the end
      sortedIndices.forEach(index => {
        if (index >= 0 && index < product.imageUrl.length) {
          product.imageUrl.splice(index, 1);
        }
      });
    }
  
  
    await product.save();
  
  
  
    const {
      productname,
      description,
      brand,
      size,
      rating,
      price,
      imageUrl,
      stock,
    } = req.body;

    const existingProduct = await Product.findOne({ productname: productname, _id: { $ne: productId } });


    if (existingProduct) {
      // Product with the same name exists, return an error message or handle as needed
      console.log("Product with this name already exists.");
      req.flash('error', 'A product with this name already exists.'); // Store the error message
      return res.redirect('/editProduct/' + productId); // Adjust the redirect path as necessary
    }


    const updateProduct = await Product.findByIdAndUpdate(
      productId,
      {
        productname: productname,
        description: description,
        brand: brand,
        size: size,
        rating: rating,
        price: price,
        stock: stock,
      },
      { new: true } // This option returns the modified document rather than the original
    );

    if (req.body.croppedImages) {
      console.log('eii');
      const newImages = req.body.croppedImages
      updateProduct.imageUrl = updateProduct.imageUrl.concat(newImages);
    } else {
      updateProduct.imageUrl = updateProduct.imageUrl;
    }
    if (!updateProduct) {
      console.log("Product not found");
      res.status(404).send("Product not found");
      return;
    }

    await updateProduct.save();

    res.redirect("/adminProducts");
  } catch (error) {
    console.log(error);
  }
};





exports.deleteProduct = async (req, res) => {
try {
  const deleteProduct = req.params.producId;
  console.log('prodect delete', deleteProduct);
  const deleated = await Product.findOneAndDelete({ _id: deleteProduct },)

  res.redirect("/adminProducts")
} catch (error) {
  console.log(error);
}
}




// exports.editImages_delete = async (req,res)=>{


//   const product = await Product.findOne() 
// }







// exports.getListProduct = async (req,res)=>{

//   const productIdValue = req.params.productId;
//   console.log("hello");

//   try{
//     const product = await Product.findOne({ _id: productIdValue });
//     console.log(product);
//     product.isListed = true;
//     await product.save();
//   }catch(error){
//     console.error('Error updating product:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// }

exports.getListProduct = async (req, res) => {
  
  try {
    console.log("hello");
  const productIdValue = req.params.productId;

    // Using findOne to find a document with the specified productId
    const product = await Product.findOne({ _id: productIdValue });

    if (product) {
      // Toggle the 'isListed' property
      product.isListed = !product.isListed;

      // Save the changes back to the database
      await product.save();

      console.log(`Product ${productIdValue} ${product.isListed ? 'listed' : 'unlisted'}`);
    } else {
      // No document found with the specified productId
      console.log('Product not found');
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (error) {
    // Handle errors (e.g., database connection issues)
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


//adminGetUsers
exports.getAdminUsers = async (req, res) => {
try {
  
  const User = await collection.find();
  console.log(User);
  res.render("adminUsers", { User });
} catch (error) {
  res.status(500).json({ error: 'Internal server error' });

}
};


//adminBlockUsers

exports.getBlockUser = async (req, res) => {


  try {

    const userId = req.params.userid;
    console.log("userId is:", userId);

    const user = await collection.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update the 'blocked' field to true
    user.isBlocked = true;


    // Save the changes using the save method on the Mongoose model
    await user.save();

    console.log(`User ${userId} has been blocked.`);

    // Render the "adminUsers" view with the status "InActive"
    res.redirect("/adminUsers");
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};



//adminUnBlockUsers

exports.getUnblockUser = async (req, res) => {
try {
  const userId = req.params.userid;
  const checkUserId = await collection.findById(userId)

  if (checkUserId) {
    checkUserId.isBlocked = false;
    await checkUserId.save();
    console.log(`User ${userId} has been Unblocked.`)
  }
} catch (error) {
  res.status(500).json({ error: 'Internal server error' });

}
}


// exports.postUpdateStatus = async (req,res) =>{
//   const {status,productId} = req.body ;
//   console.log("ststus is",status);
//   console.log("productId is",productId);

//   try{
//     const result = await orderCollection.findOneAndUpdate(
//       { _id: orderId, "products.productid": productId }, // Correctly identify the order and product within it
//       { $set: { "products.$.status": status } }, // Update the status of the matched product
//       { new: true }
//     );

//     console.log("result is",result);
//     res.status(200).json({message:'Status updated successfully',status: result.status})
//   }catch (error) {
//     res.status(500).json({ message: 'Error updating status', error: error });
// }
// }

exports.postUpdateStatus = async (req, res) => {
  

  try {
    const { status, orderId, productId } = req.body;
  console.log("Status is", status);
  console.log("ProductId is", productId);
  console.log("OrderId is", orderId);
    // Use findOneAndUpdate with a filter that matches both the order ID and the product within it
    const result = await orderCollection.findOneAndUpdate(
      { "_id": orderId, "products.productid": productId },
      { $set: { "products.$.status": status } },
      { new: true }
    );

    if (result) {
      console.log("Result is", result);
      res.status(200).json({ message: 'Status updated successfully', status: status });
    } else {
      // If no document was found and updated, handle appropriately
      res.status(404).json({ message: 'Order or Product not found' });
    }
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ message: 'Error updating status', error });
  }
};



exports.getAddOffer = async (req, res) => {
try {
  const productsData = await Product.find()
  res.render("addOffer", { productsData })
} catch (error) {
  res.status(500).json({ message: 'Error updating status', error });

}
}


exports.addOffer = async (req, res) => {
try {
  const { type, discount, startDate, endDate, category } = req.body;

  const isActive = req.body.isActive ? true : false;

  const prodects = await Product.findOne({ productname: category });

  const offers = await offerCollection.create({
    type: type,
    discount: discount,
    startDate: startDate,
    endDate: endDate,
    isActive: isActive,
    applicableProducts: prodects.productname
  })

  res.redirect("/adminOffers")
} catch (error) {
console.log(error);
}
}






exports.excelReport = async (req, res) => {
  try {

    console.log("Excel");

    const startdate = new Date(req.query.startingdate);
    const Endingdate = new Date(req.query.endingdate);
    console.log("ssssssssss", startdate);
    console.log("sssssssss", Endingdate);
    Endingdate.setDate(Endingdate.getDate() + 1);

    const orderCursor = await orderCollection.aggregate([
      {
        $match: {
          orderDate: { $gte: startdate, $lte: Endingdate },
        },
      },
    ]);
    console.log(orderCursor);
    if (orderCursor.length === 0) {
      return res.redirect("/admindashboard");
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sheet 1");

    // Add data to the worksheet
    worksheet.columns = [
      { header: "Username", key: "username", width: 15 },
      { header: "Product Name", key: "productname", width: 20 },
      { header: "Quantity", key: "quantity", width: 15 },
      { header: "Price", key: "price", width: 15 },
      { header: "Status", key: "status", width: 15 },
      { header: "Order Date", key: "orderdate", width: 18 },
      { header: "Address", key: "address", width: 30 },
      { header: "City", key: "city", width: 20 },
      { header: "Pincode", key: "pincode", width: 15 },
      { header: "State", key: "state", width: 15 },
    ];



    for (const orderItem of orderCursor) {
      // Fetch address details based on the address ID

      worksheet.addRow({
        username: orderItem.address.firstName + " " + orderItem.address.lastName,
        productname: orderItem.products
          .map((product) => product.productName)
          .join(", "),
        quantity: orderItem.totalQuantity,
        price: orderItem.totalPrice,
        status: orderItem.products.map((product) => product.status).join(", "),
        orderdate: orderItem.orderDate,
        address: orderItem.address.address,
        city: orderItem.address.city,
        pincode: orderItem.address.zip,
        state: orderItem.address.state,
      });
    }

    // Generate the Excel file and send it as a response
    workbook.xlsx.writeBuffer().then((buffer) => {
      const excelBuffer = Buffer.from(buffer);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", "attachment; filename=excel.xlsx");
      res.send(excelBuffer);
    });
  } catch (error) {
    console.error("Error creating or sending Excel file:", error);
    res.status(500).send("Internal Server Error");
  }
};










exports.salesPdf = async (req, res) => {



  try {

    require('pdfkit-table');

    const startingDate = new Date(req.query.startingdate);
    const endingDate = new Date(req.query.endingdate);


    console.log("from date is", startingDate);
    console.log("To date is", endingDate);
    endingDate.setHours(23, 59, 59, 999);



    if (isNaN(startingDate.getTime()) || isNaN(endingDate.getTime())) {
      return res.redirect("/admindashboard");
    }


    // Fetch orders within the specified date range
    const orders = await orderCollection.find({
      orderDate: { $gte: startingDate, $lte: endingDate },
    });


    // Create a PDF document
    const doc = new PDFDocument();
    const filename = "sales_report.pdf";

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    // Add content to the PDF document
    doc.text("Sales Report", { align: "center", fontSize: 10, margin: 2 });

    const tableData = {
      headers: [
        "Username",
        "Product Name",
        "Price",
        "Quantity",
        "Address",
        "City",
        "Pincode",
        "State",
      ],
      rows: []
    };

    orders.forEach(order => {
      order.products.forEach(product => {
        tableData.rows.push([
          order.address.firstName + " " + order.address.lastName,
          product.productName,
          product.price,
          product.quantity,
          order.address.address,
          order.address.city,
          order.address.zip,
          order.address.state,
        ]);
      });
    });


    // Draw the table 
    await doc.table(tableData, {
      prepareHeader: () => doc.font("Helvetica-Bold"),
      prepareRow: () => doc.font("Helvetica"),
    });

    // Finalize the PDF document
    doc.end();
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send("Internal Server Error");
  }
};




exports.adminCoupons = async (req, res) => {
  try {

    const coupons = await couponsCollection.find();

    console.log("Coupons:", coupons);

    res.render("adminCoupons", { coupons });
  } catch (error) {
    console.error("Error fetching coupons:", error);

    res.status(500).send("Error fetching coupons");
  }
};


exports.postAddCoupon = async (req, res) => {
try {
  const { couponCode, discount, expiryDate, purcheseAmount } = req.body;

  const couponsData = {
    couponCode: couponCode,
    discount: discount,
    expireDate: expiryDate,
    purcheseAmount: purcheseAmount
  }

  console.log("eeeeeeee", couponsData);
  const coupons1 = await couponsCollection.findOne({ couponCode: couponsData.couponCode })
  const coupons = await couponsCollection.find()

  if (coupons1) {
    return res.render("adminCoupons", { message: "Coupon Already exists", coupons })
  }
  await couponsCollection.create(couponsData)
  res.redirect("/adminCoupons")
} catch (error) {
  console.log(error);
}
}


exports.deleteCoupons = async (req, res) => {
 try {
  const couponsId = req.params.couponsId;
  const deletedCoupons = await couponsCollection.findById({ _id: couponsId });
  await couponsCollection.deleteOne(deletedCoupons);
  res.redirect("/adminCoupons")
 } catch (error) {
  console.log(error);
 }

}


// exports.editCoupons = async(req,res)=>{
//   const data = {
//     couponCode:req.body.couponCode,
//     discount:req.body.discount,
//     expiryDate:req.body.expiryDate,
//     purcheseAmount:req.body.purcheseAmount
//   }

//   // console.log("ewwwwwww", data.couponCode, data.discount, data.expiryDate,data.purcheseAmount);
//   const couponsEdited = await couponsCollection.findOneUpdate(data)
//   console.log("eeeeeeee",couponsEdited);
//   res.redirect('/adminCoupons')
// }



exports.editCoupons = async (req, res) => {
  try {
    const { couponCode, discount, expiryDate, purcheseAmount } = req.body;

    console.log("ewwwwwww", couponCode, discount, expiryDate, purcheseAmount);

    // Assuming you have a way to uniquely identify the coupon to be updated, e.g., using a coupon ID
    const couponId = req.body.couponId; // You might need to adjust this based on your actual data structure

    // Validate the request data here (omitted for brevity)

    const updateData = {
      couponCode,
      discount,
      expiryDate,
      purcheseAmount,
    };

    // Update the specific coupon by its ID
    const couponsEdited = await couponsCollection.updateOne({ _id: couponId }, { $set: updateData });

    console.log("Coupon updated:", couponsEdited);

    // Redirect for web applications or send a success response for APIs
    res.redirect('/adminCoupons');
    // For an API: res.json({ success: true, message: 'Coupon updated successfully.' });
  } catch (error) {
    console.error("Error updating coupon:", error);
    res.status(500).json({ success: false, message: 'Error updating coupon' });
  }
};




exports.adminBanner = (req, res) => {
  res.render("adminBanner")
}










exports.adminLogOut = (req, res) => {
  // Destroy the entire session
  console.log("aaaaaaa");
  req.session.destroy((err) => {
    if (err) {
      console.error("Session destruction error:", err);
      return res.status(500).send("An error occurred while logging out.");
    }
    // Redirect to admin login page after successful logout
    res.redirect("/adminLogin");
  });
};
