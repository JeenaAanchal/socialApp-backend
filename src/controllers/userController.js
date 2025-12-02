const User = require("../models/User");
const { createNotification } = require("./notificationController");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cloudinary = require("../config/cloudinary");

// Utility to remove password from returned user object
const sanitizeUser = (userDoc) => {
  if (!userDoc) return null;
  const obj = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  delete obj.password;
  return obj;
};

// --- SIGNUP ---
exports.signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const exists = await User.findOne({ $or: [{ username }, { email }] });
    if (exists)
      return res.status(400).json({ message: "Username or email already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hashed });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({ status: 1, user: sanitizeUser(user), token });
  } catch (err) {
    console.error("signup error:", err);
    res.status(500).json({ message: "Signup failed" });
  }
};

// --- LOGIN ---
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ status: 1, user: sanitizeUser(user), token });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ message: "Login failed" });
  }
};

// --- GET OWN PROFILE ---
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select("-password")
      .populate("followers following", "username profilePic");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ status: 1, user });
  } catch (err) {
    console.error("getProfile error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --- UPDATE PROFILE (username / bio) ---
exports.updateProfile = async (req, res) => {
  try {
    const updates = {};
    ["username", "bio"].forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    if (updates.username) {
      const exists = await User.findOne({ username: updates.username });
      if (exists && String(exists._id) !== String(req.userId))
        return res.status(400).json({ message: "Username already taken" });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No updates provided" });
    }

    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true })
      .select("-password")
      .populate("followers following", "username profilePic");

    return res.json({ status: 1, user });
  } catch (err) {
    console.error("updateProfile error:", err);
    return res.status(500).json({ message: "Failed to update profile" });
  }
};

// --- UPLOAD PROFILE PIC ---
exports.uploadProfilePic = async (req, res) => {
  try {
    // multer-storage-cloudinary usually attaches file.path or file.secure_url / file.url
    if (!req.file) {
      return res.status(400).json({ message: "Image missing" });
    }

    // Try multiple properties to find the uploaded file URL
    const file = req.file;
    const possibleUrls = [
      file.path,
      file.url,
      file.secure_url,
      file.secureUrl,
      file.location, // some storages use location
      file.publicUrl,
      file.public_url,
    ];
    const profilePicURL = possibleUrls.find((u) => typeof u === "string" && u.length > 0);

    if (!profilePicURL) {
      // As a fallback, if you configured cloudinary directly (not via storage), you could upload here.
      console.warn("uploadProfilePic: uploaded file did not expose URL on expected props:", Object.keys(file));
      return res.status(500).json({ message: "Uploaded but could not determine file URL" });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { profilePic: profilePicURL },
      { new: true }
    )
      .select("-password")
      .populate("followers following", "username profilePic");

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({ status: 1, user });
  } catch (err) {
    console.error("Upload Profile Pic Error:", err);
    return res.status(500).json({ message: "Failed to upload profile picture." });
  }
};

// --- CHANGE PASSWORD ---
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Old password incorrect" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    return res.json({ status: 1, message: "Password updated" });
  } catch (err) {
    console.error("changePassword error:", err);
    return res.status(500).json({ message: "Failed to change password" });
  }
};

// --- FOLLOW / UNFOLLOW / BLOCK / UNBLOCK ---
// (Keep your existing implementations; just wrap in try/catch for safety)
exports.followUser = async (req, res) => {
  try {
    const targetId = req.params.id;
    if (String(req.userId) === String(targetId))
      return res.status(400).json({ message: "Can't follow yourself" });

    const me = await User.findById(req.userId);
    const target = await User.findById(targetId);
    if (!me || !target) return res.status(404).json({ message: "User not found" });

    if (!me.following.includes(targetId)) {
      me.following.push(targetId);
      target.followers.push(req.userId);
      await me.save();
      await target.save();

      await createNotification({ type: "follow", sender: req.userId, receiver: targetId });
    }

    const profile = await User.findById(targetId)
      .populate("followers following", "username profilePic")
      .select("-password");

    return res.json({ status: 1, user: profile });
  } catch (err) {
    console.error("followUser error:", err);
    return res.status(500).json({ message: "Follow failed" });
  }
};

exports.unfollowUser = async (req, res) => {
  try {
    const targetId = req.params.id;
    const me = await User.findById(req.userId);
    const target = await User.findById(targetId);
    if (!me || !target) return res.status(404).json({ message: "User not found" });

    me.following = me.following.filter((f) => f.toString() !== targetId);
    target.followers = target.followers.filter((f) => f.toString() !== req.userId);

    await me.save();
    await target.save();

    const profile = await User.findById(targetId)
      .populate("followers following", "username profilePic")
      .select("-password");

    return res.json({ status: 1, user: profile });
  } catch (err) {
    console.error("unfollowUser error:", err);
    return res.status(500).json({ message: "Unfollow failed" });
  }
};

exports.blockUser = async (req, res) => {
  try {
    const targetId = req.params.id;
    if (String(req.userId) === String(targetId))
      return res.status(400).json({ message: "Can't block yourself" });

    const me = await User.findById(req.userId);
    const target = await User.findById(targetId);
    if (!me || !target) return res.status(404).json({ message: "User not found" });

    if (!me.blockedUsers.includes(targetId)) me.blockedUsers.push(targetId);

    me.following = me.following.filter((f) => f.toString() !== targetId);
    me.followers = me.followers.filter((f) => f.toString() !== targetId);
    target.following = target.following.filter((f) => f.toString() !== req.userId);
    target.followers = target.followers.filter((f) => f.toString() !== req.userId);

    await me.save();
    await target.save();

    const profile = await User.findById(targetId)
      .populate("followers following", "username profilePic")
      .select("-password");

    return res.json({ status: 1, user: profile });
  } catch (err) {
    console.error("blockUser error:", err);
    return res.status(500).json({ message: "Block failed" });
  }
};

exports.unblockUser = async (req, res) => {
  try {
    const targetId = req.params.id;
    const me = await User.findById(req.userId);
    if (!me) return res.status(404).json({ message: "User not found" });

    me.blockedUsers = me.blockedUsers.filter((id) => id.toString() !== targetId);
    await me.save();

    const profile = await User.findById(targetId)
      .populate("followers following", "username profilePic")
      .select("-password");

    return res.json({ status: 1, user: profile });
  } catch (err) {
    console.error("unblockUser error:", err);
    return res.status(500).json({ message: "Unblock failed" });
  }
};

// --- FOLLOWERS & FOLLOWING LISTS ---
exports.getFollowers = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("followers", "username profilePic");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ status: 1, followers: user.followers });
  } catch (err) {
    console.error("getFollowers error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getFollowersById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("followers", "username profilePic");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ followers: user.followers });
  } catch (err) {
    console.error("getFollowersById error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getFollowingById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("following", "username profilePic");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ following: user.following });
  } catch (err) {
    console.error("getFollowingById error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --- GET PROFILE BY ID ---
exports.getProfileById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("followers following", "username profilePic");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ status: 1, user });
  } catch (err) {
    console.error("getProfileById error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --- SEARCH USERS ---
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q?.trim()) return res.json({ users: [] });

    const users = await User.find({ username: { $regex: q, $options: "i" } }).select(
      "_id username profilePic"
    );

    return res.json({ users });
  } catch (err) {
    console.error("searchUsers error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --- DELETE ACCOUNT ---
// --- DELETE ACCOUNT WITH PASSWORD ---
exports.deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: "Password is required" });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Incorrect password" });

    await User.findByIdAndDelete(req.userId);

    // Optionally: remove user data from other collections

    return res.json({ status: 1, message: "Account deleted successfully" });
  } catch (err) {
    console.error("deleteAccount error:", err);
    return res.status(500).json({ message: "Failed to delete account" });
  }
};


