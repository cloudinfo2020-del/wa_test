```javascript
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
        ]

    }

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

        /*
        CHECK WHATSAPP READY
        */

        if (!client.info) {

            return res.json({

                status: false,

                error: 'WhatsApp not connected'

            });

        }

        /*
        GET DATA
        */

        let number =
            req.body.number;

        const message =
            req.body.message;

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

        number = number.replace(/\D/g, '');

        /*
        CREATE CHAT ID
        */

        const chatId =
            number + '@c.us';

        /*
        CHECK REGISTERED
        */

        const isRegistered =
            await client.isRegisteredUser(chatId);

        if (!isRegistered) {

            return res.json({

                status: false,

                error: 'Number not in WhatsApp'

            });

        }

        /*
        SEND MESSAGE
        */

        await client.sendMessage(
            chatId,
            message
        );

        return res.json({

            status: true,

            message: 'Message Sent'

        });

    } catch (error) {

        return res.json({

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
```
