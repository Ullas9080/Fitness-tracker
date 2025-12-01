
import express from "express";
import * as dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import UserRoutes from "../routes/User.js"; 

dotenv.config();

const app = express();

app.use(cors({
  origin: "https://fitness-tracker-4v44.vercel.app",
  credentials: true,
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/user", UserRoutes);

app.get("/", (req, res) => {
  res.status(200).json({ message: "Hello developers from GFG" });
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || "Something went wrong";
  res.status(status).json({ success: false, status, message });
});


let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;
  try {
    mongoose.set("strictQuery", true);
    await mongoose.connect(process.env.MONGODB_URL);
    isConnected = true;
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Failed to connect with MongoDB", err);
  }
};


export default async function handler(req, res) {
  await connectDB(); 
  return app(req, res); 
}