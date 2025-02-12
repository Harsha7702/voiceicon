const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const XLSX = require("xlsx");
const multer = require("multer");
const path = require("path");
const Fuse = require("fuse.js");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// In-memory storage for uploaded data
const excelData = {};

// File upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// Upload endpoint with validation
app.post("/upload", upload.single("file"), (req, res) => {
  const filePath = req.file.path;
  const workbook = XLSX.readFile(filePath);
  const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

  if (!sheet || sheet.length === 0) {
    return res.status(400).json({ error: "The uploaded file is empty or invalid." });
  }

  const requiredColumns = ["Question", "Answer"];
  const sheetKeys = Object.keys(sheet[0]);

  const missingColumns = requiredColumns.filter((col) => !sheetKeys.includes(col));
  if (missingColumns.length > 0) {
    return res.status(400).json({
      error: `Missing columns: ${missingColumns.join(", ")}.`,
    });
  }

  const scriptId = Date.now().toString();
  const redirectUrl = `/ask/${scriptId}`;

  // Store data with Fuse.js fuzzy search
  excelData[scriptId] = {
    sheet,
    fuse: new Fuse(sheet, { keys: ["Question"], threshold: 0.4 }),
  };

  // Save the script link
  const scriptLink = `https://voiceoverpoj-1.onrender.com:${redirectUrl}\n`;
  fs.appendFile("script_links.txt", scriptLink, (err) => {
    if (err) console.error("Error saving script link:", err);
  });

  res.json({ scriptId, redirectUrl });
});

// Process speech input
app.post("/process-speech/:id", (req, res) => {
  const scriptId = req.params.id;
  const userQuestion = req.body.question.toLowerCase();

  if (!excelData[scriptId]) {
    return res.status(404).json({ answer: "No data found for this script." });
  }

  const { sheet, fuse } = excelData[scriptId];
  const result = fuse.search(userQuestion);

  if (result.length > 0) {
    res.json({ answer: result[0].item.Answer });
  } else {
    res.json({ answer: "Sorry, I don't understand that question." });
  }
});

// Serve the Ask page
app.get("/ask/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "ask.html"));
});

// Catch-all to serve index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
