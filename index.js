// const express = require("express");
// const cors = require("cors");
// const { File } = require("megajs"); // use File, not Storage
// const app = express();

// app.use(cors());
// app.get("/", (req, res) => {
//   res.send("hello");
// });

// const MEGA_FOLDER_LINK =
//   "https://mega.nz/folder/3RUACIqQ#arlFsMWEpHoVgjwh7Hzjog";

// app.get("/hls/:filename", async (req, res) => {
//   const { filename } = req.params;

//   try {
//     // load the shared folder as a File object
//     const folder = File.fromURL(MEGA_FOLDER_LINK);
//     await folder.loadAttributes(); // gets folder metadata and children
//     const child = folder.children.find((f) => f.name === filename);
//     if (!child) return res.status(404).send("File not found");

//     const stream = child.download();
//     const type = filename.endsWith(".m3u8")
//       ? "application/vnd.apple.mpegurl"
//       : filename.endsWith(".ts")
//       ? "video/MP2T"
//       : "application/octet-stream";

//     res.setHeader("Content-Type", type);
//     res.setHeader("Access-Control-Allow-Origin", "*");
//     stream.pipe(res);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Streaming error");
//   }
// });

// app.listen(5000, () =>
//   console.log("✅ Backend running on http://localhost:5000")
// );

//////////////////////////////

// server/index.js

const express = require("express");
const cors = require("cors");
const { Storage } = require("megajs");
require("dotenv").config();

const app = express();
app.use(cors());
console.log(process.env.PASSWORD);
const storage = new Storage({
  email: process.env.USER,
  password: process.env.PASSWORD,
  autologin: false, // we'll call login manually
  allowUploadBuffering: true,
});

let folderRef = null;

storage.on("ready", () => {
  console.log("✅ Logged into MEGA");

  // Cache the folder by name once login is ready
  folderRef = storage.root.children.find(
    (f) => f.name === process.env.FILENAME
  );

  if (!folderRef) {
    console.error("❌ Folder not found");
    process.exit(1);
  }

  // Start the server *after* MEGA login
  app.listen(process.env.PORT, () =>
    console.log(`🚀 Server running at http://localhost:${process.env.PORT}`) 
  );
});

storage.on("error", (err) => {
  console.error("❌ MEGA login failed:", err);
});

storage.login(); // ✅ Only call this ONCE globally!

app.get("/hls/:filename", (req, res) => {
  const { filename } = req.params;

  if (!folderRef) return res.status(503).send("Folder not loaded yet");

  const file = folderRef.children.find((f) => f.name === filename);
  if (!file) return res.status(404).send("File not found");

  const stream = file.download();

  const contentType = filename.endsWith(".m3u8")
    ? "application/vnd.apple.mpegurl"
    : filename.endsWith(".ts")
    ? "video/MP2T"
    : "application/octet-stream";

  res.setHeader("Content-Type", contentType);
  res.setHeader("Access-Control-Allow-Origin", "*");

  stream.pipe(res);
});
