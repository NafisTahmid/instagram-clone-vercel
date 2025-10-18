import dotenv from "dotenv";
dotenv.config({});
import express from "express";
import passport from "passport";
const router = express.Router();
import jsonwebtoken from "jsonwebtoken";
import User from "../models/user.model.js";

router.get(
  "/google",
  passport.authenticate("google", { scope: ["email", "profile"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "http://localhost:5173/login",
  }),
  async (req, res) => {
    const profile = req.user;
    let user = await User.findOne({
      $or: [{ googleID: profile.id }, { email: profile.emails[0].value }],
    });
    if (user) {
      if (!user.googleID) {
        user.googleID = profile.id;
        await user.save();
      }
    } else {
      user = new User({
        username: profile.displayName,
        email: profile.emails[0].value,
        googleID: profile.id,
      });
      await user.save();
    }
    const token = jsonwebtoken.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "2d",
    });
    res.cookie("token", token, {
      httpOnly: true, // Prevent JS access to cookie
      sameSite: "strict", // Prevent CSRF
      maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
      domain: "localhost", // Ensure domain is set to localhost in dev environment
    });

    // Redirect the user to frontend after successful login
    return res.redirect("http://localhost:5173");
  }
);

export default router;
