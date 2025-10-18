import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      unique: true,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
    },
    googleID: {
      type: String,
    },
    password: {
      type: String,
      required: false,
    },
    profilePicture: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
    },
    gender: { type: String, enum: ["male", "female"] },
    followers: [{ type: mongoose.Schema.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.ObjectId, ref: "User" }],
    posts: [{ type: mongoose.Schema.ObjectId, ref: "Post" }],
    bookmarks: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Post",
      },
    ],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
