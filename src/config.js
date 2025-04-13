require('dotenv').config();

module.exports = {
    port: process.env.PORT || 3002,
    zoom: {
        clientId: process.env.ZOOM_CLIENT_ID,
        clientSecret: process.env.ZOOM_CLIENT_SECRET,
        redirectUri: process.env.ZOOM_REDIRECT_URI,
    },
    solana: {
        network: process.env.SOLANA_NETWORK,
    },
    programId: process.env.PROGRAM_ID,
    backendWalletSecret: process.env.BACKEND_WALLET_SECRET
};
