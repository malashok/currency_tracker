const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const axios = require('axios');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
require('dotenv').config();
const Subscriber = require('./models/Subscriber');

const app = express()
const port = 3000

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(express.json());

mongoose.connect('mongodb://0.0.0.0:27017/currency')
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));


/**
 * @swagger
 * /rate:
 *   get:
 *     summary: Get current USD rate
 *     description: Retrieve current USD rate
 *     responses:
 *       200:
 *         description: Successful response.
 *       404:
 *         description: Not found.
 *       500:
 *         description: Server error.
 */
app.get('/rate', async (req, res) => {
    try {
        const response = await axios.get('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&json');
        const data = response.data;

        if (data) {
            res.status(200).json({"USD": data[0].rate})
        } else {
            res.status(404).send('Not Found');
        }

    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');

    }
})


/**
 * @swagger
 * /subscribe:
 *   post:
 *     summary: Post email to db
 *     description: Add email to database
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       201:
 *         description: Created.
 *       400:
 *         description: Invalid email or already in database.
 *       500:
 *         description: Server error.
 */
app.post('/subscribe', async (req, res) => {
    const {email} = req.body;

    if (!email) {
        return res.status(400).send('Invalid email');
    }

    try {
        const subscriber = new Subscriber({email});
        await subscriber.save();
        res.status(201).send('Subscription is successful');
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).send('You have already subscribed');
        } else {
            console.error(error);
            res.status(500).send('Server error');
        }
    }
});

let transporter = nodemailer.createTransport({
    host: process.env.HOST,
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    }
});

let lastRate = null
const checkRateAndSendEmails = async () => {
    try {
        const response = await axios.get('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&json');
        const data = response.data[0];

        if (data) {
            const currentRate = data.rate;

            if (lastRate === null || currentRate !== lastRate) {
                lastRate = currentRate;

                const subscribers = await Subscriber.find();

                const mailOptions = {
                    from: process.env.EMAIL,
                    subject: 'Актуальний курс USD',
                    text: `USD: ${currentRate} UAH`
                };

                // for (let subscriber of subscribers) {
                //     mailOptions.to = subscriber.email;
                //     await transporter.sendMail(mailOptions);
                // }

                console.log('Letters were sent successfully');
            }
        }
    } catch (error) {
        console.error('Error', error);
    }
};

cron.schedule('*/10 * * * *', checkRateAndSendEmails);

app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})