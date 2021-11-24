// import express
const express = require("express")
const router = express.Router()

// Now, with that "router"-variable we just created, we can create our route 
router.get("/", (req, res) => {
  res.render("index")
})

// This doesn't work yet, since we haven't hooked up our application yet to USE THIS ROUTER - the server doesn't know that this router exists
// Therefore, we need to go to the server.js, and IMPORT this router

// We now want to export this router from this app
module.exports = router
