const dotenv = require("dotenv");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config");
dotenv.config();

const GOOGLE_OAUTH_URL = process.env.GOOGLE_OAUTH_URL;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CALLBACK_URL = "http%3A//localhost:8000/api/oauth/google/callback";
const GOOGLE_OAUTH_SCOPES = [
    "https%3A//www.googleapis.com/auth/userinfo.email",
    "https%3A//www.googleapis.com/auth/userinfo.profile",
];

const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_ACCESS_TOKEN_URL = process.env.GOOGLE_ACCESS_TOKEN_URL;

exports.OAuthGoogle = async (req, res) => {
    const state = "some_state";
    const scopes = GOOGLE_OAUTH_SCOPES.join(" ");
    const GOOGLE_OAUTH_CONSENT_SCREEN_URL = `${GOOGLE_OAUTH_URL}?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${GOOGLE_CALLBACK_URL}&access_type=offline&response_type=code&state=${state}&scope=${scopes}`;
    res.redirect(GOOGLE_OAUTH_CONSENT_SCREEN_URL);
}

exports.OAuthGoogleCallback = async (req, res) => {
    const { code } = req.query;
    const data = {
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: "http://localhost:8000/api/oauth/google/callback",
        grant_type: "authorization_code",
    };

    // exchange authorization code for access token & id_token
    const response = await fetch(GOOGLE_ACCESS_TOKEN_URL, {
        method: "POST",
        body: JSON.stringify(data),
    });

    const access_token_data = await response.json();
    const { id_token } = access_token_data;

    // verify and extract the information in the id token
    const token_info_response = await fetch(
        `${process.env.GOOGLE_TOKEN_INFO_URL}?id_token=${id_token}`
    );

    const token_info_data = await token_info_response.json();
    const { email, name, given_name, family_name } = token_info_data;

    let user = await User.findOne({ username: email.split("@")[0] });

    if (!user) {
        // create a new user
        user = new User({
            firstName: given_name,
            lastName: family_name,
            username: email.split("@")[0],
            email,
            password: "google_oauth_no_password",
            gender: "other"
        });
        await user.save();
    }

    const token = jwt.sign(
        { userId: user._id, userName: user.username, role: user.role },
        jwtSecret,
        { expiresIn: "1h" }
    );

    const profile = user.profile ? user.profile : null;

    const payload = JSON.stringify({ token, message: "Login successful", profile });
    
    res.send(`<!doctype html>
        <html><body>
        <script>
        (function(){
            try {
            window.opener && window.opener.postMessage(${payload}, window.location.origin);
            } finally {
            window.close();
            }
        })();
        </script>
        </body></html>`);
}