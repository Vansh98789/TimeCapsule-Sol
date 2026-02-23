import express from "express"
import type { Request, Response } from "express"
import AWS from "aws-sdk"
import multer from "multer"
import cors from "cors"
import dotenv from "dotenv"

dotenv.config()

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

const FILEBASE_KEY = process.env.FILEBASE_KEY as string
const FILEBASE_SECRET = process.env.FILEBASE_SECRET as string
const FILEBASE_BUCKET = process.env.FILEBASE_BUCKET as string

const s3 = new AWS.S3({
  endpoint: "https://s3.filebase.com",
  region: "us-east-1",
  accessKeyId: FILEBASE_KEY,
  secretAccessKey: FILEBASE_SECRET,
  signatureVersion: "v4",
  s3ForcePathStyle: true,
})

app.post("/upload", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const { title, description } = req.body

    if (!req.file) {
      res.status(400).json({ error: "No file provided" })
      return
    }

    const file = req.file
    const key = `capsules/${Date.now()}-${file.originalname}`

    await s3
      .putObject({
        Bucket: FILEBASE_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: { title, description },
      })
      .promise()

    const head = await s3
      .headObject({
        Bucket: FILEBASE_BUCKET,
        Key: key,
      })
      .promise()

    const cid = head.Metadata?.cid

    if (!cid) {
      res.status(500).json({ error: "CID not found in metadata" })
      return
    }

    res.json({ cid })
  } catch (err: unknown) {
    console.error("Full upload error:", JSON.stringify(err, null, 2))
    const message = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: message })
  }
})

app.listen(4000, () => console.log("Server running on http://localhost:4000"))
