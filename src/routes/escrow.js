// routes/escrow.js
const express = require("express");
const router = express.Router();
const escrowController = require("../controllers/escrowController");

// *** NEW ROUTE ***
router.post("/init-data", escrowController.getInitData);

// Keep or remove old route depending on if you want to keep both flows
// router.post("/initialize-pda", escrowController.generateInitializePdaTransaction);

router.post("/submit", escrowController.submitTransaction);

module.exports = router;