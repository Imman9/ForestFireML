import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import fireReportsRouter from './routes/fireReports';
import authRouter from './routes/auth';
import predictRouter from './routes/predict';
import notificationsRouter from './routes/notifications';
import firmsRouter from './routes/firms';
import weatherRouter from './routes/weather';
import { sequelize } from './models';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;


app.use(express.json({ limit: "10mb" })); // Increase as needed (10mb, 20mb, 50mb)
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Forest Fire Detection Backend is running.' });
});



app.use('/api/fire-reports', fireReportsRouter);
app.use('/api/auth', authRouter);
app.use('/api/predict', predictRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/firms', firmsRouter);
app.use('/api/weather', weatherRouter);

// In development, alter tables to match models automatically
const syncOptions = process.env.NODE_ENV === 'production' ? {} : { alter: true };
sequelize.sync(syncOptions).then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}); 