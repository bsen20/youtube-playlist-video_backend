// server.js
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// ✅ Add this to parse incoming JSON requests
app.use(express.json());

// File paths
const USERS_FILE = path.join(__dirname, "data", "users.json");
const PLAYLISTS_FILE = path.join(__dirname, "data", "playlists.json");

// Utility Functions
const generateUserId = () => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

const readJSON = (filePath) => {
  try {
    const data = fs.readFileSync(filePath);
    return JSON.parse(data);
  } catch (err) {
    return {};
  }
};

const writeJSON = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// Routes

// Signup
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required." });

  const users = readJSON(USERS_FILE).users || [];
  if (users.find((user) => user.email === email)) {
    return res.status(409).json({ error: "User already exists." });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const userId = generateUserId();
  users.push({ userId, email, password: hashedPassword });

  writeJSON(USERS_FILE, { users });

  const playlists = readJSON(PLAYLISTS_FILE);
  playlists[userId] = {};
  writeJSON(PLAYLISTS_FILE, playlists);

  res.json({ userId });
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const users = readJSON(USERS_FILE).users || [];
  const user = users.find((u) => u.email === email);
  if (!user) return res.status(404).json({ error: "User not found." });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: "Incorrect password." });

  res.json({ userId: user.userId });
});

// Get user playlists
app.get("/user/:userId/data", (req, res) => {
  const { userId } = req.params;
  const playlists = readJSON(PLAYLISTS_FILE);
  if (!playlists[userId])
    return res.status(404).json({ error: "User data not found." });
  res.json(playlists[userId]);
});

// Add playlist
app.post("/playlist", (req, res) => {
  const { userId, playlistName } = req.body;
  const playlists = readJSON(PLAYLISTS_FILE);

  if (!playlists[userId]) playlists[userId] = {};
  if (playlists[userId][playlistName]) {
    return res.status(409).json({ error: "Playlist already exists." });
  }

  playlists[userId][playlistName] = [];
  writeJSON(PLAYLISTS_FILE, playlists);
  res.json({ message: "Playlist added." });
});

// Delete playlist
app.delete("/playlist", (req, res) => {
  const { userId, playlistName } = req.body;
  const playlists = readJSON(PLAYLISTS_FILE);

  if (playlists[userId] && playlists[userId][playlistName]) {
    delete playlists[userId][playlistName];
    writeJSON(PLAYLISTS_FILE, playlists);
    return res.json({ message: "Playlist deleted." });
  }

  res.status(404).json({ error: "Playlist not found." });
});

// Edit playlist (add/remove videos)
app.put("/playlist", (req, res) => {
  const { userId, playlistName, action, videoId } = req.body;
  const playlists = readJSON(PLAYLISTS_FILE);

  if (!playlists[userId] || !playlists[userId][playlistName]) {
    return res.status(404).json({ error: "Playlist not found." });
  }

  if (action === "add") {
    if (!playlists[userId][playlistName].includes(videoId)) {
      playlists[userId][playlistName].push(videoId);
    }
  } else if (action === "remove") {
    playlists[userId][playlistName] = playlists[userId][playlistName].filter(
      (id) => id !== videoId
    );
  } else {
    return res.status(400).json({ error: "Invalid action." });
  }

  writeJSON(PLAYLISTS_FILE, playlists);
  res.json({ message: "Playlist updated." });
});

//home page working check
app.get("/", (req, res) => {
  res.send("Welcome to the Video Playlist API!");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
