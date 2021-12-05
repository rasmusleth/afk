const express = require("express")
const router = express.Router()
const Match = require("../models/match")

// First route - see all matches
router.get("/", async (req, res) => {
  let searchOptions = {}
  if (req.query.hometeam != null && req.query.hometeam !== ""){
    searchOptions.hometeam = new RegExp(req.query.hometeam, "i")
  }
  try {
    const matches = await Match.find(searchOptions)
    res.render("matches/index", { 
      matches: matches,
      searchOptions: req.query
    })
  } catch {
    res.redirect("/")
  }

  
})


// Second: new match form (this displays the form for creating a new match)
router.get("/new", (req, res) => {
  res.render("matches/new", { match: new Match()})
})

// Third: creating the new match (actually creates the new match)
router.post("/", async (req, res) => {
  const match = new Match({
    hometeam: req.body.hometeam
  })
  try {
    const newMatch = await match.save()
    // res.redirect(`matches/${newMatch.id}`)
    res.redirect("matches")
  } catch {
    res.render("matches/new", {
      match: match,
      errorMessage: "Error creating Match"
    })
  }
})

module.exports = router