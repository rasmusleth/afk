// Here we simply check to see if we're in the production environment or not 
  // The "process.env.NODE_ENV" is set by default by node
  // We check this since we only want to load in this environment-variable if we are in our development environment
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config()
}



// Initially, we get in/import the libraries/packages that we installed by requiring them
const express = require("express")
const app = express()
const expressLayouts = require("express-ejs-layouts")


// Here, after we created this "index-route" in our "routes-folder", we need to import it into our server
const indexRouter = require("./routes/index")
const authorRouter = require("./routes/authors")
const bookRouter = require("./routes/books")

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
app.use(express.urlencoded({ limit: "10mb", extended: false}))
app.use(express.json())


// Mongoose installation
  // Import Mongoose library
  const mongoose = require("mongoose")
  // Set up connection for our database - instead of hard-coding the URL for the connection (since we want it dependent on the environment, i.e. development or not), we will put in a string/variable that comes from our environment-variables
  mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true })
  // Lastly, we simply want to log whether or not we are connected to our database
  const db = mongoose.connection
  // What we say here is essentially, on "error", please return error
  db.on("error", error => console.error(error))
  // And here, we want to log the following only ONCE, if the connection is open
  db.once("open", () => console.log("Connected to Mongoose"))



// As we have imported our index-route above (and assigned it to the variable "indexRouter"), we can tell our app to use that route
app.use("/", indexRouter)
app.use("/authors", authorRouter)
app.use("/books", bookRouter)

// We can now tell our app, that we want to listen on a certain port - this port will come from our environment-variable if deployed(online), and by default(not deployed) it will listen on port 3000
app.listen(process.env.PORT || 3000)