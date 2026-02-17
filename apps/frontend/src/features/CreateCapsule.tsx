import { useState } from "react"

export default function CreateCapsule() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [cid, setCid] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file")
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("title", title)
      formData.append("description", description)

      const res = await fetch("http://localhost:4000/upload", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Upload failed")
      }

      const data = await res.json()
      setCid(data.cid)
      console.log("Uploaded CID:", data.cid)
    } catch (error: any) {
      console.error("Upload failed:", error)
      alert("Upload failed: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const ipfsUrl = `https://ipfs.filebase.io/ipfs/${cid}`

  return (
    <>
      <h1>Create your own capsule</h1>

      <input
        placeholder="Title"
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <input
        placeholder="Description"
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <input
        type="file"
        onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
      />

      <button onClick={handleUpload} disabled={loading}>
        {loading ? "Uploading..." : "Create"}
      </button>

      {cid && (
        <p>
          Uploaded CID: {cid} <br />
          Access via:{" "}
          <a href={ipfsUrl} target="_blank" rel="noreferrer">
            {ipfsUrl}
          </a>
        </p>
      )}
    </>
  )
}