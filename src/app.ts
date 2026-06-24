import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import authRouter from './Routes/authRouter';
import cookieParser from 'cookie-parser';
import path from 'path';
import citizenRouter from './Routes/citizenRouter';
import adminRouter from './Routes/adminRouter';
import workerRouter from './Routes/workerRouter';
import geocodeRouter from "./Routes/geocode";
import { getnotifications, getUnreadNotifications } from './Controllers/allNotifications';
import { updateNotifications } from './Controllers/updateNotification';
import { authenticateToken } from './Middlewares/auth';
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser())
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
// app.options('*', cors()); 
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.get('/notifications/long-poll',authenticateToken, getnotifications);
app.patch("/notifications/:id/read",authenticateToken, updateNotifications);
app.get("/unread/notifications", authenticateToken, getUnreadNotifications);
app.use("/api", geocodeRouter);
app.use("/", authRouter);
app.use("/citizen",citizenRouter);
app.use("/admin", adminRouter);
app.use("/worker",workerRouter);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});