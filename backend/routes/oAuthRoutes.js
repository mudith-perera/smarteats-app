const express = require("express");
const { OAuthGoogle, OAuthGoogleCallback } = require("../controllers/oAuthController");
const router = express.Router();

router.get("/google", OAuthGoogle);
router.get("/google/callback", OAuthGoogleCallback);

module.exports = router;