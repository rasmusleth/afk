const mongoose = require("mongoose")
const Book = require("./book")

// Here we setup a table in our mongoose-database - it is set up as a JSON object, with each key-value pay being a column
const authorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  }
})

authorSchema.pre("remove", function(next) {
  Book.find({ author: this.id}, (err, books) => {
    if (err) {
      next(err)
    } else if (books.length > 0) {
      next(new Error("This author has books still"))
    } else {
      next()
    }
  })
})

module.exports = mongoose.model("Author", authorSchema)