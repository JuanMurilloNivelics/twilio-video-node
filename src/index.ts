import express from 'express';
import config from './config';
import roomsRouter from './routes/room';
import { Twilio } from 'twilio';
import cors from 'cors';



// Initialize Twilio client
const getTwilioClient = () => {
    if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_API_KEY || !config.TWILIO_API_SECRET) {
        throw new Error(`Unable to initialize Twilio client -> key problem`);
    }
    return new Twilio(config.TWILIO_API_KEY, config.TWILIO_API_SECRET, { accountSid: config.TWILIO_ACCOUNT_SID })
}

export const twilioClient = getTwilioClient()

const app = express();

app.use(cors())

app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

// Forward requests for the /rooms URI to our rooms router
app.use('/rooms', roomsRouter);


app.listen(4000, () => {
    console.log('Express server listening on port 4000');
});



