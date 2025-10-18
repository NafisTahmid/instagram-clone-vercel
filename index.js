import express from "express";
import cors from "cors";
import passport from "passport";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "./config/connectDB.js";
import userRoute from "./routes/user.route.js";
import postRoute from "./routes/post.route.js";
import messageRoute from "./routes/message.route.js";
import authRoute from "./routes/auth.route.js";
import { configureGoogleAuth } from "./config/passport.js";

dotenv.config({});
const app = express();
app.use(passport.initialize());

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
configureGoogleAuth();
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use("/api/v1/user", userRoute);
app.use("/api/v1/post", postRoute);
app.use("/api/v1/message", messageRoute);
app.use("/auth", authRoute);

app.get("/", (req, res) => {
  res.status(200).json({ message: "Hello world", success: true });
});

const listen = async () => {
  const connection = await connectDB();
  if (connection) {
    const PORT = process.env.PORT || 8000;
    app.listen(PORT, () => {
      console.log(`Server is running on PORT:${PORT}`);
    });
  }
};

listen();
