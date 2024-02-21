const express = require("express");
const app = express();
const session = require("express-session");
const cookieParser = require("cookie-parser")
const multer = require("multer")
const path = require('path');
require('dotenv').config();
const flash = require('connect-flash');
app.use(flash());


app.use(express.static('public/uploads'));


app.use(cookieParser());
app.use(session({
    secret: "secret",
    resave: true,
    saveUninitialized: true
}))


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(express.static(__dirname + "/public"))


app.set("view engine", "ejs");
//app.set("views", __dirname + "/views/admin");
app.set("views", ["./views/user", "./views/admin"]);


const userRouter = require("./router/user")
const adminRouter = require("./router/admin")


app.use("/", userRouter);
app.use("/", adminRouter);


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server is running http://localhost:${PORT}/index`))


