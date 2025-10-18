import cloudinary from "../utils/cloudinary.js";
import sharp from "sharp";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import Comment from "../models/comment.model.js";

export const addNewPost = async (req, res) => {
  try {
    const { caption } = req.body;
    const image = req.file;
    const authorId = req.id;
    if (!image) {
      return res
        .status(400)
        .json({ message: "Image is required", status: false });
    }

    if (
      !caption ||
      typeof caption !== "string" ||
      caption.trim().length === 0
    ) {
      return res.status(400).json({
        message: "Caption is required and should be a non-empty string!!!",
        success: false,
      });
    }

    if (!image.mimetype.startsWith("image/")) {
      return res.status(400).json({
        message: "Image upload type must be an image!",
        success: false,
      });
    }
    let optimizedImageBuffer;
    try {
      optimizedImageBuffer = await sharp(image.buffer)
        .resize({
          width: 800,
          height: 800,
          fit: "inside",
        })
        .toFormat("jpeg", { quality: 80 })
        .toBuffer();
    } catch (error) {
      return res.status(500).json({
        message: "Error processing image with sharp",
        error: error.message,
      });
    }
    let cloudResponse;
    try {
      cloudResponse = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { resource_type: "auto" },
          (error, result) => {
            if (error) {
              console.log("Error uploading image to Cloudinary: ", error);
              return reject(error);
            }
            resolve(result);
          }
        );
        uploadStream.end(optimizedImageBuffer);
      });

      const imageUrl = cloudResponse.secure_url;

      const newPost = await Post.create({
        caption: caption,
        image: imageUrl,
        author: authorId,
      });

      const user = await User.findById(authorId);
      if (user) {
        user.posts.push(newPost);
        await user.save();
      }
      await newPost.populate({ path: "author", select: "-password" });

      return res
        .status(201)
        .json({ message: "New post created", success: true, newPost });
    } catch (error) {
      console.log("Error uploading image to Cloudinary:", error);
      return res.status(500).json({
        message: "Error uploading image",
        error: error.message,
      });
    }
  } catch (error) {
    console.log("Unexpected error:", error);
    return res.status(500).json({
      message: "An unexpected error occurred!",
      status: false,
      error: error.message,
    });
  }
};

export const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate({ path: "author", select: "username profilePicture" })
      .populate({
        path: "comments",
        sort: { createdAt: -1 },
        populate: { path: "author", select: "username profilePicture" },
      });
    return res.status(200).json({ posts, success: true });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An unexpected error occurred!!!", success: false });
  }
};

export const getUserPost = async (req, res) => {
  try {
    const authorID = req.id;
    const posts = await Post.find({ author: authorID })
      .populate({ path: "author", select: "username profilePicture" })
      .populate({
        path: "comments",
        sort: { createdAt: -1 },
        populate: { path: "author", select: "username profilePicture" },
      });
    return res.status(200).json({ posts, success: true });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An unexpected error occurred!!!", success: false });
  }
};

export const likePost = async (req, res) => {
  try {
    const likerID = req.id;
    const postID = req.params.id;
    const post = await Post.findById(postID);
    if (!post) {
      return res
        .status(404)
        .json({ message: "Post not found", success: false });
    }

    await post.updateOne({ $addToSet: { likes: likerID } });
    return res.status(200).json({ message: "Post liked", success: true });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An unexpected error occurred!!!", success: false });
  }
};
export const dislikePost = async (req, res) => {
  try {
    const likerID = req.id;
    const postID = req.params.id;
    const post = await Post.findById(postID);
    if (!post) {
      return res
        .status(404)
        .json({ message: "Post not found", success: false });
    }

    await post.updateOne({ $pull: { likes: likerID } });
    return res.status(200).json({ message: "Post disliked", success: true });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An unexpected error occurred!!!", success: false });
  }
};

export const addComment = async (req, res) => {
  try {
    const commentorID = req.id;
    const postID = req.params.id;
    const { text } = req.body;
    if (!text) {
      return res
        .status(400)
        .json({ message: "Text is required", success: false });
    }
    const post = await Post.findById(postID);
    if (!post) {
      return res
        .status(404)
        .json({ message: "Post not found!!!", success: false });
    }
    const newComment = await Comment.create({
      text,
      author: commentorID,
      post: postID,
    });
    await newComment.populate({
      path: "author",
      select: "username profilePicture",
    });
    post.comments.push(newComment._id);
    await post.save();
    return res.status(201).json({
      message: "Comment added successfully!!!",
      success: true,
      newComment,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An unexpexted error occurred!!!", success: false });
  }
};

export const getCommentsOfAPost = async (req, res) => {
  try {
    const postID = req.params.id;
    const post = await Post.findById(postID);
    if (!post) {
      return res
        .status(404)
        .json({ message: "Post not found", success: false });
    }
    const comments = await Comment.find({ post: postID });
    if (comments.length === 0) {
      return res.status(404).json({
        message: "No comments found for this post!!!",
        success: false,
        comments,
      });
    }
    return res.status(200).json({ comments, success: true });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An unexpected error occurred!!!", success: false });
  }
};

export const deletePost = async (req, res) => {
  try {
    const postID = req.params.id;
    const userID = req.id;

    const post = await Post.findById(postID);
    if (!post) {
      return res
        .status(404)
        .json({ message: "Post not found!!!", success: false });
    }
    if (post.author.toString() !== userID) {
      return res
        .status(403)
        .json({ message: "Unauthorized!!!", success: false });
    }
    await Post.findByIdAndDelete(postID);
    await Comment.deleteMany({ post: postID });

    const user = await User.findById(userID);
    if (user) {
      user.posts = user.posts.filter((id) => id.toString() !== postID);
      await user.save();
    }
    return res
      .status(200)
      .json({ message: "Post deleted successfully!!!", success: true });
  } catch (error) {
    res
      .status(500)
      .json({ message: "An unexpected error occurred!!!", success: false });
  }
};

export const bookmarkPost = async (req, res) => {
  try {
    const postID = req.params.id;
    const userID = req.id;

    const post = await Post.findById(postID);
    if (!post) {
      return res
        .status(404)
        .json({ message: "Post not found", success: false });
    }
    const user = await User.findById(userID);
    if (!user) {
      return res
        .status(404)
        .json({ message: "User doesn't exist!!!", success: false });
    }
    if (user.bookmarks.includes(post._id)) {
      await User.updateOne({ $pull: { bookmarks: post._id } });
      return res.status(200).json({
        type: "Unsaved",
        message: "Post removed from bookmarks",
        success: true,
      });
    } else {
      await User.updateOne({ $addToSet: { bookmarks: post._id } });
      return res.status(200).json({
        type: "Saved",
        message: "Post added to bookmarks",
        success: true,
      });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An unexpected error occurred!!!", success: false });
  }
};
