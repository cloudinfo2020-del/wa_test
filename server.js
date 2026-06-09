const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/*
==================================================
VARIABLES
==================================================
*/

let qrCodeData = '';
let isClientReady = false;
let connectedNumber = '';

/*
==================================================
WHATSAPP CLIENT
==================================================
*/

const client = new Client({

    authStrategy: new LocalAuth({
        clientId: "client-one",
        dataPath: "./sessions"
    }),

    puppeteer: {

        headless: true,

        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process'
        ]
    },

    webVersionCache: {
        type: 'none'
    }
});

/*
==================================================
QR EVENT
==================================================
*/

client.on('qr', async (qr) => {

    console.log('================================');
    console.log('QR RECEIVED');
    console.log('================================');

    qrCodeData = qr;

    qrcode.generate(qr, { small: true });
});

/*
==================================================
READY EVENT
==================================================
*/



/*
========================================
READY EVENT
========================================
*/

client.on('ready', async () => {

    console.log('================================');
    console.log('WHATSAPP READY');
    console.log('================================');

    clientReady = true;

    try {

        connectedNumber = client.info.wid.user;

        console.log('CONNECTED NUMBER:', connectedNumber);

    } catch (err) {

        console.log(err);
    }
});

/*
========================================
LOADING
========================================
*/

client.on('loading_screen', (percent, message) => {

    console.log('LOADING:', percent, message);
});

/*
========================================
AUTHENTICATED
========================================
*/

client.on('authenticated', () => {

    console.log('AUTHENTICATED');
});

/*
========================================
DISCONNECTED
========================================
*/

client.on('disconnected', (reason) => {

    console.log('DISCONNECTED:', reason);

    clientReady = false;

    connectedNumber = '';
});
/*
==================================================
HOME ROUTE
==================================================
*/

app.get('/', (req, res) => {

    res.json({
        status: true,
        message: 'WhatsApp API Running'
    });
});

/*
==================================================
QR ROUTE
==================================================
*/

app.get('/qr', async (req, res) => {

    try {

        if (!qrCodeData) {

            return res.send('QR Code not generated yet');
        }

        const qrImage = await QRCode.toDataURL(qrCodeData);

        res.send(`
            <html>
                <head>
                    <title>WhatsApp QR</title>
                </head>

                <body style="text-align:center;font-family:Arial;padding-top:30px;">

                    <h2>Scan WhatsApp QR</h2>

                    <img src="${qrImage}" />

                </body>
            </html>
        `);

    } catch (err) {

        res.send(err.message);
    }
});

/*
==================================================
STATUS ROUTE
==================================================
*/

app.get('/status', async (req, res) => {

    try {

        /*
        CHECK STATE
        */
        const state = await client.getState();

        /*
        CONNECTED
        */
        if (
            state === 'CONNECTED' ||
            state === 'OPENING' ||
            client.info
        ) {

            return res.json({
                status: true,
                connected: true,
                state: state,
                number: client.info?.wid?.user || connectedNumber || '',
                pushname: client.info?.pushname || '',
                platform: client.info?.platform || ''
            });
        }

        /*
        NOT CONNECTED
        */
        return res.json({
            status: false,
            connected: false,
            state: state,
            message: 'WhatsApp not connected'
        });

    } catch (err) {

        return res.json({
            status: false,
            connected: false,
            error: err.message
        });
    }
});
/*
==================================================
SEND MESSAGE ROUTE
==================================================
*/

app.post('/send', async (req, res) => {

    try {

        const number = req.body.number;
        const message = req.body.message;

        /*
        VALIDATION
        */
        if (!number || !message) {

            return res.status(400).json({
                status: false,
                error: 'number and message required'
            });
        }

        /*
        CHECK READY
        */
        if (!client.info) {

            return res.status(500).json({
                status: false,
                error: 'WhatsApp client not ready'
            });
        }

        /*
        CLEAN NUMBER
        */
        const cleanNumber = number.replace(/\D/g, '');

        /*
        FORMAT CHAT ID
        */
        const chatId = cleanNumber + '@c.us';

        console.log('Sending to:', chatId);

        /*
        WAIT BEFORE SEND
        */
        await new Promise(resolve => setTimeout(resolve, 2000));

        let sent = null;
        let retry = 0;

        /*
        RETRY SYSTEM
        */
        while (retry < 3) {

            try {

                sent = await client.sendMessage(chatId, message);

                break;

            } catch (err) {

                console.log('Retry Error:', err.message);

                retry++;

                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        /*
        FAILED
        */
        if (!sent) {

            return res.status(500).json({
                status: false,
                error: 'Failed after retries'
            });
        }

        /*
        SUCCESS
        */
        return res.json({
            status: true,
            message: 'Message sent successfully',
            id: sent.id.id
        });

    } catch (error) {

        console.log('FULL ERROR:', error);

        return res.status(500).json({
            status: false,
            error: error.message
        });
    }
});

/*
==================================================
START SERVER
==================================================
*/

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log('================================');
    console.log('SERVER STARTED ON PORT:', PORT);
    console.log('================================');
});

/*
==================================================
INITIALIZE CLIENT
==================================================
*/

client.initialize();
