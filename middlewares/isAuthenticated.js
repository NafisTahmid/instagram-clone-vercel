import jsonwebtoken from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config({});

const isAuthenticated = (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res
        .status(401)
        .json({ message: "No token available", success: false });
    }

    const decodedToken = jsonwebtoken.verify(token, process.env.JWT_SECRET);
    if (!decodedToken) {
      return res.status(401).json({ message: "Invalid token", success: false });
    }

    req.id = decodedToken._id;

    next();
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Something went wrong", success: false });
  }
};

export default isAuthenticated;
