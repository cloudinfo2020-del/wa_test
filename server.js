const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
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

/*
==================================================
CHROME PATH
==================================================
*/


/*
==================================================
WHATSAPP CLIENT
==================================================
*/


const puppeteer = require('puppeteer');



const client = new Client({

    authStrategy: new LocalAuth({
        clientId: 'main',
        dataPath: './sessions'
    }),

    puppeteer: {

        headless: true,

        executablePath: '/usr/bin/chromium',

        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    },

    webVersionCache: {
        type: 'none'
    }
});






/*
==================================================
EVENTS
==================================================
*/

client.on('qr', async (qr) => {

    console.log('================================');
    console.log('QR RECEIVED');
    console.log('================================');

    qrCodeData = qr;
});

client.on('authenticated', () => {

    console.log('================================');
    console.log('AUTHENTICATED');
    console.log('================================');
});

client.on('ready', () => {

    console.log('================================');
    console.log('WHATSAPP READY');
    console.log('================================');

    if (client.info) {

        console.log('CONNECTED NUMBER:', client.info.wid.user);
    }
});

client.on('loading_screen', (percent, message) => {

    console.log('LOADING:', percent, message);
});

client.on('change_state', (state) => {

    console.log('STATE:', state);
});

client.on('disconnected', (reason) => {

    console.log('================================');
    console.log('DISCONNECTED:', reason);
    console.log('================================');
});

client.on('auth_failure', (msg) => {

    console.log('================================');
    console.log('AUTH FAILURE:', msg);
    console.log('================================');
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

            return res.send('QR not generated yet');
        }

        const qrImage = await QRCode.toDataURL(qrCodeData);

        res.send(`
            <html>
                <head>
                    <title>WhatsApp QR</title>
                </head>

                <body style="text-align:center;padding-top:40px;font-family:Arial;">

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

        let state = null;

        try {

            state = await client.getState();

        } catch (e) {

            state = null;
        }

        return res.json({

            connected: !!client.info,

            state: state,

            info: client.info
                ? {
                    number: client.info.wid.user,
                    pushname: client.info.pushname,
                    platform: client.info.platform
                }
                : null
        });

    } catch (err) {

        return res.json({
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

        /*
        CHECK WHATSAPP READY
        */
        if (!client.info) {

            return res.json({
                status: false,
                error: 'WhatsApp not connected'
            });
        }

        const number = req.body.number;
        const message = req.body.message;

        /*
        VALIDATION
        */
        if (!number || !message) {

            return res.json({
                status: false,
                error: 'number and message required'
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

        console.log('SENDING TO:', chatId);

        /*
        SEND MESSAGE
        */
        const response = await client.sendMessage(chatId, message);

        return res.json({
            status: true,
            message: 'Message sent successfully',
            id: response.id.id
        });

    } catch (err) {

        console.log('SEND ERROR:', err);

        return res.json({
            status: false,
            error: err.message
        });
    }
});

/*
==================================================
TEST BROWSER ROUTE
==================================================
*/




app.get('/test-browser', async (req, res) => {

    try {

        const puppeteer = require('puppeteer');

        const browser = await puppeteer.launch({

            headless: true,

            executablePath: '/usr/bin/chromium',

            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        });

        const page = await browser.newPage();

        await page.goto('https://google.com');

        const title = await page.title();

        await browser.close();

        res.json({
            status: true,
            title: title
        });

    } catch (err) {

        res.json({
            status: false,
            error: err.message
        });
    }
});

/*
==================================================
START SERVER
==================================================
*/

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {

    console.log('================================');
    console.log('SERVER STARTED:', PORT);
    console.log('================================');
});

/*
==================================================
INITIALIZE CLIENT
==================================================
*/

client.initialize()
.then(() => {

    console.log('================================');
    console.log('CLIENT INITIALIZED');
    console.log('================================');
})
.catch(err => {

    console.log('================================');
    console.log('INITIALIZE ERROR:', err);
    console.log('================================');
});
