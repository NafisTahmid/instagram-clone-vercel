import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import bcrypt from "bcryptjs";
import jsonwebtoken from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";
import dotenv from "dotenv";

dotenv.config({});

export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(403).json({
        message: "Username or email or password are missing!!!",
        success: false,
      });
    }
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "User already exists!!!", success: false });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      username,
      email,
      password: hashedPassword,
    });
    return res
      .status(201)
      .json({ message: "User created successfully", success: true });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Something went wrong!!!", success: false });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email: email });
    if (!existingUser) {
      return res.status(403).json({
        message: "User doesn't exist!!!",
        success: false,
      });
    }
    const decryptedPassword = await bcrypt.compare(
      password,
      existingUser.password
    );
    if (!decryptedPassword) {
      return res
        .status(403)
        .json({ message: "Password doesn't match!!!", success: false });
    }
    const token = jsonwebtoken.sign(
      { _id: existingUser._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const populatedPosts = await Promise.all(
      existingUser.posts.map(async (postID) => {
        const post = await Post.findById(postID);
        if (post && post.author.equals(existingUser._id)) {
          return post;
        } else {
          return null;
        }
      })
    );
    const user = {
      _id: existingUser._id,
      username: existingUser.username,
      email: existingUser.email,
      profilePicture: existingUser.profilePicture,
      followers: existingUser.followers,
      following: existingUser.following,
      posts: populatedPosts,
      bio: existingUser.bio,
    };

    return res
      .cookie("token", token, {
        httpOnly: true,
        sameSite: "None",
        secure: false,
        maxAge: 1 * 24 * 60 * 60 * 1000,
      })
      .json({
        message: `Welcome back ${existingUser.username}`,
        success: true,
        user,
      });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Something went wrong!!!", success: false });
  }
};

export const logout = async (_, res) => {
  try {
    return res
      .cookie("token", "", { maxAge: 0 })
      .json({ message: "You're logged out!!!", success: true });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Something went wrong!!!", success: false });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId)
      .populate({
        path: "posts",
        createdAt: -1,
      })
      .populate({ path: "bookmarks", createdAt: -1 })
      .select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }
    res.status(200).json({ user, success: true });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Someting went wrong!", success: false });
  }
};

export const editProfile = async (req, res) => {
  try {
    const userId = req.id;
    const { bio, gender } = req.body;
    const profilePicture = req.file;
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found!!!", success: false });
    }

    if (profilePicture) {
      const fileUri = getDataUri(profilePicture);
      const cloudResponse = await cloudinary.uploader.upload(fileUri);
      user.profilePicture = cloudResponse.secure_url;
    }

    if (bio) {
      user.bio = bio;
    }
    if (gender) {
      user.gender = gender;
    }

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully!!!",
      success: true,
      user,
    });
  } catch (error) {
    console.log("Error: ", error);
    res
      .status(500)
      .json({ message: "Something went wrong!!!", success: false });
  }
};

export const getSuggestedUsers = async (req, res) => {
  try {
    const suggestedUsers = await User.find({ _id: { $ne: req.id } }).select(
      "-password"
    );
    if (!suggestedUsers) {
      return res
        .status(404)
        .json({ message: "No suggested users found", success: false });
    }
    res.status(200).json({
      success: true,
      message: "Suggested users found!!!",
      suggestedUsers: suggestedUsers,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
};

export const followOrUnfollow = async (req, res) => {
  try {
    const follower = req.id;
    const followee = req.params.id;

    if (follower === followee) {
      return res.status(401).json({
        message: "You can't follow/unfollow yourself!!!",
        success: false,
      });
    }
    const followerUser = await User.findById(follower);
    const followingUser = await User.findById(followee);
    if (!followerUser || !followingUser) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }
    const isFollowing = followerUser.following.includes(followee);
    if (isFollowing) {
      await Promise.all([
        User.updateOne({ _id: follower }, { $pull: { following: followee } }),
      ]);
      await Promise.all([
        User.updateOne({ _id: followee }, { $pull: { followers: follower } }),
      ]);
      return res.status(200).json({
        message: "Unfollowed successfully!",
        success: true,
      });
    } else {
      await Promise.all([
        User.updateOne({ _id: follower }, { $push: { following: followee } }),
      ]);
      await Promise.all([
        User.updateOne({ _id: followee }, { $push: { followers: follower } }),
      ]);
      return res.status(200).json({
        message: "Followed successfully",
        success: true,
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong :/",
      success: false,
    });
  }
};
