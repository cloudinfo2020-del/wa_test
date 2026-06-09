
const express = require('express');

const {
    Client,
    LocalAuth
} = require('whatsapp-web.js');

const qrcode = require('qrcode');

const app = express();

/*
BODY PARSER
*/

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));

let qrCodeImage = null;

/*
WHATSAPP CLIENT
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
            '--disable-gpu'
        ],

        protocolTimeout: 300000
    },

    webVersionCache: {
        type: 'none'
    },

    takeoverOnConflict: true,
    takeoverTimeoutMs: 120000
});

/*
QR EVENT
*/

client.on('qr', async (qr) => {

    console.log('QR RECEIVED');

    qrCodeImage =
        await qrcode.toDataURL(qr);

});

/*
READY
*/

client.on('ready', () => {

    console.log(
        'WhatsApp Ready'
    );

});

/*
AUTHENTICATED
*/

client.on('authenticated', () => {

    console.log(
        'Authenticated'
    );

});

/*
DISCONNECTED
*/

client.on('disconnected', reason => {

    console.log(
        'Disconnected',
        reason
    );

});

/*
INITIALIZE
*/

client.initialize();

/*
HOME
*/

app.get('/', (req, res) => {

    res.send(
        'WhatsApp Server Running'
    );

});

/*
QR PAGE
*/

app.get('/qr', (req, res) => {

    if (!qrCodeImage) {

        return res.send(
            'QR Loading...'
        );

    }

    res.send(`
        <h2>Scan WhatsApp QR</h2>
        <img src="${qrCodeImage}" />
    `);

});

/*
STATUS
*/

app.get('/status', (req, res) => {

    if (client.info) {

        return res.json({

            connected: true,

            number:
                client.info.wid.user

        });

    }

    res.json({

        connected: false

    });

});

/*
SEND MESSAGE API
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
        CHECK WHATSAPP READY
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

        console.log('Checking number:', chatId);

        /*
        CHECK NUMBER EXISTS
        */
        const isRegistered = await client.isRegisteredUser(chatId);

        if (!isRegistered) {

            return res.json({
                status: false,
                error: 'WhatsApp number not found'
            });
        }

        /*
        SMALL DELAY
        */
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('Sending message to:', chatId);

        /*
        SEND MESSAGE
        */
        const response = await client.sendMessage(chatId, message);

        return res.json({
            status: true,
            message: 'Message sent successfully',
            id: response.id.id
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
PORT
*/

const PORT =
    process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {

    console.log(
        'Server Running on Port ' + PORT
    );

});
