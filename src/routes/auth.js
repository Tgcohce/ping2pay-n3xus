const express = require('express');
const axios = require('axios');
const router = express.Router();
const { zoom } = require('../config');

// Redirect to Zoom OAuth consent screen.
router.get('/zoom', (req, res) => {
    const authUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${zoom.clientId}&redirect_uri=${encodeURIComponent(zoom.redirectUri)}`;
    res.redirect(authUrl);
});

// Callback endpoint: exchange the code for an access token.
router.get('/zoom/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) {
        return res.status(400).json({ error: 'Missing code parameter' });
    }
    try {
        const tokenResponse = await axios.post(
            'https://zoom.us/oauth/token',
            null,
            {
                params: {
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: zoom.redirectUri,
                },
                auth: {
                    username: zoom.clientId,
                    password: zoom.clientSecret,
                },
            }
        );
        // In production, store the access token securely and associate it with the user.
        res.json(tokenResponse.data);
    } catch (error) {
        console.error('Zoom OAuth error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Zoom OAuth failed' });
    }
});

module.exports = router;
