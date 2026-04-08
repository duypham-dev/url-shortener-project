import express from 'express';
import morgan from 'morgan';
import cors from "cors";
import helmet from "helmet";
import cookieParser from 'cookie-parser';
import shortenRouter from './routes/shorten'
// import Route from '#routes/index.js';
const app = express()


const baseUrl = process.env.BASE_URL || '/api/v1';
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
};

app.use(helmet({
  referrerPolicy: { policy: 'no-referrer' },
}));

app.use(morgan('common'));
app.use(cookieParser());
app.use(express.json());
app.use(cors(corsOptions)); //comment to test with postman
app.use(express.urlencoded({ extended: false })); // GIS redirect POST form

// Mount API routes
app.use(baseUrl, shortenRouter)

export default app