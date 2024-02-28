const express = require("express");
const router = express.Router();
// const multer = require('multer')

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//       cb(null, "public/uploads");
//     },
//     filename: function (req, file, cb) {
//       cb(null, file.fieldname + "-" + Date.now() + "-" + file.originalname);
//     },
//   });
//   const upload = multer({ storage: storage })





const checkSession = async (req, res, next) => {
    console.log("Session is " + req.session.adminPassword);
    if (req.session.adminPassword) {
        next();
    } else {
        res.redirect("/adminLogin");
    }
};


// getAdmin controllers
const { getAdminLogin, getAdminDashboard, getAdminOrder, getAdminStatistics, getAdminProducts, getAdminUsers, getAdminOffers, getAddCategory, getadminCategory, getEditCategory, getAddProduct, deleteCategory, getEditProduct, uploads, getBlockUser, getUnblockUser, getListProduct, adminLogOut, getAddOffer, salesPdf, excelReport, adminCoupons, adminBanner, deleteCoupons, editCoupons ,getEditOffers} = require("../controllers/adminController");
//postAdmin controllers
const { postAdminLogin, postAdminOffers, postAddCategory, postEditCategery, postAddProduct, deleteProduct, postEditProduct, postUpdateStatus, addOffer, postAddCoupon,editOffer } = require("../controllers/adminController");


// GET route for admin login page
router.get("/adminLogin", getAdminLogin);

// POST route for handling admin login
router.post("/adminLogin", postAdminLogin);

// GET route for admin Dashbord page
router.get("/adminDashboard", checkSession, getAdminDashboard);


// GET route for admin Order page
router.get("/adminOrder", checkSession, getAdminOrder);


// GET route for admin statistics page
router.get("/adminStatistics", checkSession, getAdminStatistics);







router.get("/adminProducts", checkSession, getAdminProducts);

// GET route for handling addCategory
router.get("/addCategory", checkSession, getAddCategory)

// POST route for handling add Category
router.post("/addCategory", postAddCategory)

// GET route for handling add Category
router.get("/adminCategory", checkSession, getadminCategory)

// GET route for handling add Category
router.get("/adminCategory", checkSession, getadminCategory)


// GET route for handling add editCategory
router.get("/editCategory/:categoryId", checkSession, getEditCategory)

// POST route for handling add editCategory
router.post("/editCategery/:categoryId", postEditCategery)

router.get("/deleteCategory/:categoryId", checkSession, deleteCategory)

router.get("/addProduct", checkSession, getAddProduct)

// router.post("/addProduct", uploads, postAddProduct);

router.post("/addProduct", uploads, postAddProduct);




router.get("/editProduct/:producId", checkSession, getEditProduct);

router.post('/editProduct/update/:id', uploads, postEditProduct);

router.get("/deleteProduct/:producId", checkSession, deleteProduct)


// router.post('/editImages-delete',editImages_delete)

// router.get("/listProduct",listProduct)


router.get('/listProduct/:productId', checkSession, getListProduct)


router.post('/update-status', postUpdateStatus)




// GET route for admin statistics page
router.get("/adminUsers", checkSession, getAdminUsers);;

// router.post("/block-user/:userId",postBlockUser)
router.get("/block-user/:userid", checkSession, getBlockUser)

router.get("/unblock-user/:userid", checkSession, getUnblockUser)


// GET route for admin statistics page
router.get("/adminOffers", checkSession, getAdminOffers);

// POST route for handling admin Order
router.post("/adminOffers", postAdminOffers);

router.get("/addOffer", checkSession, getAddOffer)

router.post('/addOffer', checkSession, addOffer)

router.get('/excelReport', excelReport)

router.get('/generateInvoice', salesPdf)

router.get("/adminCoupons", adminCoupons)

router.post('/addCoupon', postAddCoupon)

router.get('/deleteCoupons/:couponsId', deleteCoupons)

router.post('/updateCoupon', editCoupons)

router.get("/adminBanner", adminBanner)

router.get('/adminLogOut', adminLogOut)

router.get("/editOffers/:productId",getEditOffers)

router.post("/postEditOffer",editOffer)


module.exports = router;

