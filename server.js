if (process.env.NODE_ENV !== "production") {
  require("dotenv").config()
}



// Initially, we get in/import the libraries/packages that we installed by requiring them
const express = require("express")
const app = express()
const expressLayouts = require("express-ejs-layouts")

const indexRouter = require("./routes/index")

// Now we can start configuring our "express application"
app.set("view engine", "ejs")
app.set("views", __dirname + "/views")
// After that, make sure to create that "views"-folder just specified above
// Lastly, we want to hook up express layouts
  // The idea of this layout-file is that every single file is being put inside THIS file to avoid duiblicating all initial and ening HTML of our page
app.set("layout", "layouts/layout")
// WE need to tell our express-app that we want to use "Express Layouts"
app.use(expressLayouts)
// We also want to tell express where our public files are going to bee (stylesheets, javascript, images, etc.)
app.use(express.static("public"))


// Mongoose installation
  // Import Mongoose library
  const mongoose = require("mongoose")
  // Set up connection for our database - instead of hard-coding the URL for the connection (since we want it dependent on the environment, i.e. development or not), we will put in a string/variable that comes from our environment-variables
  mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true })
  // Lastly, we simply want to log whether or not we are connected to our database
  const db = mongoose.connection
  db.on("error", error => console.error(error))
  db.once("open", () => console.log("Connected to Mongoose"))




app.use("/", indexRouter)

// We can now tell our app, that we want to listen on a certain port
app.listen(process.env.PORT || 3000)