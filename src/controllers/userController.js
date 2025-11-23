const User = require("../models/User");
const { createNotification } = require("./notificationController");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// --- UTILS ---
const sanitizeUser = (user) => {
  const obj = user.toObject();
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
    console.error(err);
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
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
};

// --- GET OWN PROFILE ---
exports.getProfile = async (req, res) => {
  const user = await User.findById(req.userId)
    .select("-password")
    .populate("followers following", "username profilePic");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ status: 1, user });
};

// --- UPDATE PROFILE ---
exports.updateProfile = async (req, res) => {
  const updates = {};
  ["username", "bio"].forEach((key) => {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  });

  if (updates.username) {
    const exists = await User.findOne({ username: updates.username });
    if (exists && String(exists._id) !== String(req.userId))
      return res.status(400).json({ message: "Username already taken" });
  }

  const user = await User.findByIdAndUpdate(req.userId, updates, { new: true })
    .select("-password")
    .populate("followers following", "username profilePic");
  res.json({ status: 1, user });
};

// --- UPLOAD PROFILE PIC ---
exports.uploadProfilePic = async (req, res) => {
  if (!req.file || !req.file.filename)
    return res.status(400).json({ message: "Image missing" });

  const profilePicPath = `/uploads/${req.file.filename}`;
  const user = await User.findByIdAndUpdate(req.userId, { profilePic: profilePicPath }, { new: true })
    .select("-password")
    .populate("followers following", "username profilePic");

  res.json({ status: 1, user });
};

// --- CHANGE PASSWORD ---
exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) return res.status(400).json({ message: "Old password incorrect" });

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ status: 1, message: "Password updated" });
};

// --- FOLLOW & UNFOLLOW ---
exports.followUser = async (req, res) => {
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

  res.json({ status: 1, user: profile });
};

exports.unfollowUser = async (req, res) => {
  const targetId = req.params.id;
  const me = await User.findById(req.userId);
  const target = await User.findById(targetId);
  if (!me || !target) return res.status(404).json({ message: "User not found" });

  me.following = me.following.filter(f => f.toString() !== targetId);
  target.followers = target.followers.filter(f => f.toString() !== req.userId);

  await me.save();
  await target.save();

  const profile = await User.findById(targetId)
    .populate("followers following", "username profilePic")
    .select("-password");

  res.json({ status: 1, user: profile });
};

// --- BLOCK & UNBLOCK ---
exports.blockUser = async (req, res) => {
  const targetId = req.params.id;
  if (String(req.userId) === String(targetId))
    return res.status(400).json({ message: "Can't block yourself" });

  const me = await User.findById(req.userId);
  const target = await User.findById(targetId);
  if (!me || !target) return res.status(404).json({ message: "User not found" });

  if (!me.blockedUsers.includes(targetId)) me.blockedUsers.push(targetId);

  // Remove from followers/following
  me.following = me.following.filter(f => f.toString() !== targetId);
  me.followers = me.followers.filter(f => f.toString() !== targetId);
  target.following = target.following.filter(f => f.toString() !== req.userId);
  target.followers = target.followers.filter(f => f.toString() !== req.userId);

  await me.save();
  await target.save();

  const profile = await User.findById(targetId)
    .populate("followers following", "username profilePic")
    .select("-password");

  res.json({ status: 1, user: profile });
};

exports.unblockUser = async (req, res) => {
  const targetId = req.params.id;
  const me = await User.findById(req.userId);
  if (!me) return res.status(404).json({ message: "User not found" });

  me.blockedUsers = me.blockedUsers.filter(id => id.toString() !== targetId);
  await me.save();

  const profile = await User.findById(targetId)
    .populate("followers following", "username profilePic")
    .select("-password");

  res.json({ status: 1, user: profile });
};

// --- FOLLOWERS & FOLLOWING LISTS ---
exports.getFollowers = async (req, res) => {
  const user = await User.findById(req.userId).populate("followers", "username profilePic");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ status: 1, followers: user.followers });
};

exports.getFollowersById = async (req, res) => {
  const user = await User.findById(req.params.id).populate("followers", "username profilePic");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ followers: user.followers });
};

exports.getFollowingById = async (req, res) => {
  const user = await User.findById(req.params.id).populate("following", "username profilePic");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ following: user.following });
};

// --- GET PROFILE BY ID ---
exports.getProfileById = async (req, res) => {
  const user = await User.findById(req.params.id)
    .select("-password")
    .populate("followers following", "username profilePic");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ status: 1, user });
};

// --- SEARCH USERS ---
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q?.trim()) return res.json({ users: [] });

    const users = await User.find({ username: { $regex: q, $options: "i" } })
      .select("_id username profilePic");

    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
