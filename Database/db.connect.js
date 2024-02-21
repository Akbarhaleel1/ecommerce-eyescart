const mongoose = require('mongoose');


mongoose.connect('mongodb://127.0.0.1:27017/miniProject')
               .then(()=>{
                console.log("Mongodb connected");
               })
               .catch(()=>{
                console.log("connection failed");
               })   

module.exports = mongoose