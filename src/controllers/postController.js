const PostModel = require("../models/Post");
const User = require("../models/User");
const { createNotification } = require("./notificationController");

// Create Post
exports.createPost = async (req, res) => {
  try {
    const newPost = await PostModel.create({
      author: req.userId,
      content: req.body.content,
      image: req.file ? req.file.path : "",
    });

    const populated = await PostModel.findById(newPost._id)
      .populate("author", "username profilePic");

    res.json({
      status: 1,
      message: "Post uploaded successfully",
      post: populated
    });
  } catch (err) {
    console.error("Create post error:", err);
    res.status(500).json({ status: 0, message: "Failed to create post" });
  }
};

// Get single post by ID
exports.getPostById = async (req, res) => {
  try {
    const post = await PostModel.findById(req.params.id)
      .populate("author", "_id username profilePic")
      .populate("comments.author", "_id username profilePic");

    if (!post) return res.status(404).json({ status: 0, message: "Post not found" });

    res.json({ status: 1, post });
  } catch (err) {
    console.error("Get post by ID error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};

// Get posts by user
exports.getUserPosts = async (req, res) => {
  try {
    const posts = await PostModel.find({ author: req.params.userId })
      .populate("author", "username profilePic")
      .populate("comments.author", "username profilePic")
      .sort({ createdAt: -1 });

    res.json({ status: 1, posts });
  } catch (err) {
    console.error("Get user posts error:", err);
    res.status(500).json({ status: 0, message: "Failed to fetch user posts" });
  }
};

// Get feed
exports.getFeed = async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);

    let posts = await PostModel.find({ author: { $in: currentUser.following } })
      .populate("author", "username profilePic blockedUsers")
      .populate("comments.author", "username profilePic")
      .sort({ createdAt: -1 });

    posts = posts.filter((post) => {
      const blockedByCurrent = currentUser.blockedUsers?.includes(post.author._id.toString());
      const blockedByAuthor = post.author.blockedUsers?.includes(currentUser._id.toString());
      return !blockedByCurrent && !blockedByAuthor;
    });

    res.json({ status: 1, feed: posts });
  } catch (err) {
    console.error("Get feed error:", err);
    res.status(500).json({ status: 0, message: "Failed to fetch feed" });
  }
};

// Like/unlike post
exports.likePost = async (req, res) => {
  try {
    const post = await PostModel.findById(req.params.postId);
    if (!post) return res.status(404).json({ status: 0, message: "Post not found" });

    const alreadyLiked = post.likes.includes(req.userId);
    if (alreadyLiked) post.likes.pull(req.userId);
    else post.likes.push(req.userId);

    await post.save();

    if (!alreadyLiked && post.author.toString() !== req.userId) {
      await createNotification({
        type: "like",
        sender: req.userId,
        receiver: post.author,
        postId: post._id,
      });
    }

    res.json({ status: 1, likes: post.likes });
  } catch (err) {
    console.error("Like post error:", err);
    res.status(500).json({ status: 0, message: "Failed to like post" });
  }
};

// Add comment
exports.addComment = async (req, res) => {
  try {
    const post = await PostModel.findById(req.params.postId);
    if (!post) return res.status(404).json({ status: 0, message: "Post not found" });

    const newComment = { author: req.userId, text: req.body.text };
    post.comments.push(newComment);
    await post.save();

    const updated = await PostModel.findById(req.params.postId)
      .populate("comments.author", "username profilePic");

    if (post.author.toString() !== req.userId) {
      await createNotification({
        type: "comment",
        sender: req.userId,
        receiver: post.author,
        postId: post._id,
      });
    }

    res.json({ status: 1, comments: updated.comments });
  } catch (err) {
    console.error("Add comment error:", err);
    res.status(500).json({ status: 0, message: "Failed to add comment" });
  }
};

// Delete comment
exports.deleteComment = async (req, res) => {
  try {
    const post = await PostModel.findById(req.params.postId);
    if (!post) return res.status(404).json({ status: 0, message: "Post not found" });

    post.comments = post.comments.filter((c) => c._id.toString() !== req.params.commentId);
    await post.save();

    res.json({ status: 1, message: "Comment deleted" });
  } catch (err) {
    console.error("Delete comment error:", err);
    res.status(500).json({ status: 0, message: "Failed to delete comment" });
  }
};

// Delete post
exports.deletePost = async (req, res) => {
  try {
    const post = await PostModel.findById(req.params.postId);
    if (!post) return res.status(404).json({ status: 0, message: "Post not found" });
    if (post.author.toString() !== req.userId)
      return res.status(403).json({ status: 0, message: "Not authorized" });

    await post.deleteOne();
    res.json({ status: 1, message: "Post deleted" });
  } catch (err) {
    console.error("Delete post error:", err);
    res.status(500).json({ status: 0, message: "Failed to delete post" });
  }
};
