const mongoose = require("../Database/db.connect")

const categorySchema = new mongoose.Schema({
    categoryname: {
        type: String,
    }
})

const Category = mongoose.model("Category", categorySchema)

module.exports = Category