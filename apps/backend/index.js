const express = require("express")
const AWS = require("aws-sdk")
const multer = require("multer")
const cors = require("cors")
require("dotenv").config()

const app = express()
const upload = multer({ storage: multer.memoryStorage() })

app.use(
  cors({
    origin: [
      "https://time-capsule-sol-frontend.vercel.app",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
)

app.options("*", cors())

const s3 = new AWS.S3({
  endpoint: "https://s3.filebase.com",
  region: "us-east-1",
  accessKeyId: process.env.FILEBASE_KEY,
  secretAccessKey: process.env.FILEBASE_SECRET,
  signatureVersion: "v4",
  s3ForcePathStyle: true,
})

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    hasKey: !!process.env.FILEBASE_KEY,
    hasSecret: !!process.env.FILEBASE_SECRET,
    hasBucket: !!process.env.FILEBASE_BUCKET,
  })
})

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { title, description } = req.body

    if (!req.file) {
      return res.status(400).json({ error: "No file provided" })
    }

    if (!process.env.FILEBASE_KEY || !process.env.FILEBASE_SECRET || !process.env.FILEBASE_BUCKET) {
      return res.status(500).json({ error: "Missing storage credentials" })
    }

    const file = req.file
    const key = `capsules/${Date.now()}-${file.originalname}`

    await s3.putObject({
      Bucket: process.env.FILEBASE_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        title: title ?? "",
        description: description ?? "",
      },
    }).promise()

    const head = await s3.headObject({
      Bucket: process.env.FILEBASE_BUCKET,
      Key: key,
    }).promise()

    const cid = head.Metadata?.cid

    if (!cid) {
      return res.status(500).json({ error: "CID not found in metadata" })
    }

    res.json({ cid })
  } catch (err) {
    console.error("Upload error:", err)
    res.status(500).json({ error: err.message || "Unknown error" })
  }
})

module.exports = app
