const express = require('express');
const QRCode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/*
=====================================
WHATSAPP CLIENT
=====================================
*/

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './sessions'
    }),

    puppeteer: {
        headless: true,

        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process'
        ],

        timeout: 300000,
        protocolTimeout: 300000
    },

    webVersionCache: {
        type: 'none'
    },

    restartOnAuthFail: true
});
/*
=====================================
QR
=====================================
*/
let qrCodeData = '';

client.on('qr', async (qr) => {

    console.log('QR RECEIVED');

    qrCodeData = qr;
});

/*
=====================================
READY
=====================================
*/

client.on('ready', () => {

    console.log('====================');
    console.log('WHATSAPP READY');
    console.log('====================');
});

/*
=====================================
ERRORS
=====================================
*/

client.on('auth_failure', msg => {
    console.log('AUTH FAILURE:', msg);
});

client.on('disconnected', reason => {
    console.log('DISCONNECTED:', reason);
});

client.on('change_state', state => {
    console.log('STATE:', state);
});



app.get('/qr', async (req, res) => {

    try {

        if (!qrCodeData) {

            return res.send('QR Code not generated yet');
        }

        const qrImage = await QRCode.toDataURL(qrCodeData);

        res.send(`
            <html>
                <body style="text-align:center;font-family:Arial">
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
=====================================
HOME
=====================================
*/

app.get('/', (req, res) => {

    res.json({
        status: true,
        message: 'WhatsApp API Running'
    });
});

/*
=====================================
SEND MESSAGE
=====================================
*/

app.post('/send', async (req, res) => {

    try {

        const number = req.body.number;
        const message = req.body.message;

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
                error: 'WhatsApp not connected'
            });
        }

        /*
        CLEAN NUMBER
        */
        const cleanNumber = number.replace(/\D/g, '');

        const chatId = cleanNumber + '@c.us';

        console.log('Checking:', chatId);

        /*
        VERIFY NUMBER
        */
        const exists = await client.isRegisteredUser(chatId);

        if (!exists) {

            return res.json({
                status: false,
                error: 'Number not on WhatsApp'
            });
        }

        console.log('Sending message...');

        /*
        SEND MESSAGE
        */
        const sent = await client.sendMessage(chatId, message);

        console.log('Message sent');

        return res.json({
            status: true,
            message: 'Message sent successfully',
            id: sent.id.id
        });

    } catch (err) {

        console.log('FULL ERROR:', err);

        return res.status(500).json({
            status: false,
            error: err.message
        });
    }
});

/*
=====================================
START SERVER
=====================================
*/

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log('Server started on port ' + PORT);
});

/*
=====================================
INITIALIZE
=====================================
*/

client.initialize();
