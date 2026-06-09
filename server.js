
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let qrCodeData = '';

/*
================================================
WHATSAPP CLIENT
================================================
*/

const client = new Client({

    authStrategy: new LocalAuth({
        clientId: 'main',
        dataPath: './sessions'
    }),

    puppeteer: {

        headless: true,

        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-accelerated-2d-canvas',
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
================================================
EVENTS
================================================
*/

client.on('qr', async (qr) => {

    console.log('QR RECEIVED');

    qrCodeData = qr;
});

client.on('authenticated', () => {

    console.log('AUTHENTICATED SUCCESS');
});

client.on('ready', () => {

    console.log('WHATSAPP READY');
});

client.on('loading_screen', (percent, message) => {

    console.log('LOADING:', percent, message);
});

client.on('change_state', (state) => {

    console.log('STATE:', state);
});

client.on('disconnected', (reason) => {

    console.log('DISCONNECTED:', reason);
});

client.on('auth_failure', (msg) => {

    console.log('AUTH FAILURE:', msg);
});

/*
================================================
HOME
================================================
*/

app.get('/', (req, res) => {

    res.json({
        status: true,
        message: 'API Running'
    });
});

/*
================================================
QR
================================================
*/

app.get('/qr', async (req, res) => {

    try {

        if (!qrCodeData) {

            return res.send('QR not generated yet');
        }

        const qrImage = await QRCode.toDataURL(qrCodeData);

        res.send(`
            <html>
                <body style="text-align:center;padding-top:30px;">
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
================================================
STATUS
================================================
*/

app.get('/status', async (req, res) => {

    try {

        const state = await client.getState();

        res.json({
            connected: !!client.info,
            state: state,
            info: client.info || null
        });

    } catch (err) {

        res.json({
            connected: false,
            error: err.message
        });
    }
});

/*
================================================
SEND
================================================
*/

app.post('/send', async (req, res) => {

    try {

        if (!client.info) {

            return res.json({
                status: false,
                error: 'WhatsApp not connected'
            });
        }

        const number = req.body.number;
        const message = req.body.message;

        if (!number || !message) {

            return res.json({
                status: false,
                error: 'number and message required'
            });
        }

        const chatId = number.replace(/\D/g, '') + '@c.us';

        const response = await client.sendMessage(chatId, message);

        res.json({
            status: true,
            response
        });

    } catch (err) {

        res.json({
            status: false,
            error: err.message
        });
    }
});

/*
================================================
START SERVER
================================================
*/

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {

    console.log('SERVER STARTED:', PORT);
});

/*
================================================
INITIALIZE
================================================
*/

client.initialize()
.then(() => {

    console.log('CLIENT INITIALIZED');
})
.catch(err => {

    console.log('INITIALIZE ERROR:', err);
});
