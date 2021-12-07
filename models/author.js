const mongoose = require("mongoose")

// Here we setup a table in our mongoose-database - it is set up as a JSON object, with each key-value pay being a column
const authorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  }
})

module.exports = mongoose.model("Author", authorSchema)