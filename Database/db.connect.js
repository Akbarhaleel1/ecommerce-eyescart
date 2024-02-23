const mongoose = require('mongoose');
require('dotenv').config();


mongoose.connect(process.env.MONGO_STR)
               .then(()=>{
                console.log("Mongodb connected");
               })
               .catch(()=>{
                console.log("connection failed");
               })   

module.exports = mongoose