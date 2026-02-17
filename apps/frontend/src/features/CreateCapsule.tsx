import { useState } from "react";
import * as anchor from "@coral-xyz/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import idl from "../../../../packages/programs/idl/my_time_capsule.json";

const programId = new PublicKey("54ZFDozFNDgK8xWMaq7jZYRyKvWQmdN64DaLWtDxw3d5");
const network = "https://api.devnet.solana.com";

interface UserStateAccount {
  owner: PublicKey;
  count: anchor.BN;
}

export default function CreateCapsule() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cid, setCid] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [amountSol, setAmountSol] = useState("");
  const [days, setDays] = useState("");
  const [hrs, setHrs] = useState("");
  const [minutes, setMinutes] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);

  const { publicKey, signTransaction, signAllTransactions, connected } = useWallet();

  const getProvider = () => {
    if (!publicKey || !signTransaction) throw new Error("Wallet not connected");
    const connection = new Connection(network, "confirmed");
    return new anchor.AnchorProvider(
      connection,
      {
        publicKey,
        signTransaction,
        signAllTransactions: signAllTransactions ?? (async (txs) => txs),
      } as anchor.Wallet,
      { commitment: "confirmed" }
    );
  };

  const handleUpload = async () => {
    if (!file) return setStatus({ type: "error", msg: "Please select a file first" });
    if (!title.trim()) return setStatus({ type: "error", msg: "Please enter a title" });

    setLoading(true);
    setStatus({ type: "info", msg: "Uploading to IPFS..." });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append("description", description);

      const res = await fetch("http://localhost:4000/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const data = await res.json();
      setCid(data.cid);
      setStatus({ type: "success", msg: `File uploaded! CID: ${data.cid}` });
    } catch (error: any) {
      setStatus({ type: "error", msg: "Upload failed: " + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCapsule = async () => {
    if (!publicKey || !signTransaction) {
      return setStatus({ type: "error", msg: "Connect your wallet first" });
    }
    if (!cid) {
      return setStatus({ type: "error", msg: "Upload a file first to get a CID" });
    }
    if (!title.trim()) {
      return setStatus({ type: "error", msg: "Title is required" });
    }

    const parsedSol = parseFloat(amountSol);
    if (!amountSol || isNaN(parsedSol) || parsedSol <= 0) {
      return setStatus({ type: "error", msg: "Enter a valid SOL deposit amount greater than 0" });
    }
    const lamports = Math.floor(parsedSol * anchor.web3.LAMPORTS_PER_SOL);

    const totalSeconds =
      (parseInt(days) || 0) * 86400 +
      (parseInt(hrs) || 0) * 3600 +
      (parseInt(minutes) || 0) * 60;
    if (totalSeconds <= 0) {
      return setStatus({ type: "error", msg: "Set a future unlock time (days/hours/minutes)" });
    }

    const unlockTime = Math.floor(Date.now() / 1000) + totalSeconds;

    if (cid.length > 196) {
      return setStatus({ type: "error", msg: "CID too long (max 196 chars)" });
    }
    if (title.length > 96) {
      return setStatus({ type: "error", msg: "Title too long (max 96 chars)" });
    }
    if (description.length > 296) {
      return setStatus({ type: "error", msg: "Description too long (max 296 chars)" });
    }

    try {
      setLoading(true);
      setStatus({ type: "info", msg: "Preparing transaction..." });

      const provider = getProvider();
      const connection = new Connection(network, "confirmed");
      const program = new anchor.Program(idl as anchor.Idl, provider);

      const [userPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_state"), publicKey.toBuffer()],
        programId
      );

      let userCount = new anchor.BN(0);
      let needsInit = false;

      try {
        const userState = (await (program.account as any).userState.fetch(
          userPda
        )) as UserStateAccount;
        userCount = userState.count;
      } catch {
        needsInit = true;
      }

      const [capsulePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("capsule"),
          publicKey.toBuffer(),
          userCount.toArrayLike(Buffer, "le", 8),
        ],
        programId
      );

      const tx = new anchor.web3.Transaction();

      if (needsInit) {
        const initIx = await program.methods
          .initUser()
          .accounts({
            userState: userPda,
            user: publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .instruction(); 
        tx.add(initIx);
      }

      const createIx = await program.methods
        .createCapsule(
          cid,
          new anchor.BN(lamports),
          new anchor.BN(unlockTime),
          isPrivate,
          title,
          description
        )
        .accounts({
          capsule: capsulePda,
          userState: userPda,
          user: publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .instruction();

      tx.add(createIx);

      tx.feePayer = publicKey;
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;

      setStatus({ type: "info", msg: `Approve the transaction in your wallet (${parsedSol} SOL)...` });

      const signed = await signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize());

      setStatus({ type: "info", msg: "Confirming transaction..." });

      await connection.confirmTransaction(
        { signature: sig, blockhash, lastValidBlockHeight },
        "confirmed"
      );

      setStatus({
        type: "success",
        msg: `✅ Capsule created! TX: ${sig}`,
      });

      setTitle("");
      setDescription("");
      setCid("");
      setFile(null);
      setAmountSol("");
      setDays("");
      setHrs("");
      setMinutes("");
      setIsPrivate(false);
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.error?.errorMessage ||
        err?.message ||
        "Unknown error";
      setStatus({ type: "error", msg: "Failed: " + msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl p-8 space-y-4">
        <h1 className="text-3xl font-bold text-center text-gray-800">Create Time Capsule</h1>

        {status && (
          <div
            className={`p-3 rounded-lg text-sm font-medium break-all ${
              status.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : status.type === "error"
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-blue-50 text-blue-700 border border-blue-200"
            }`}
          >
            {status.msg}
          </div>
        )}

        <input
          type="text"
          placeholder="Title (max 96 chars)"
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={title}
          maxLength={96}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          placeholder="Description (max 296 chars)"
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={description}
          maxLength={296}
          onChange={(e) => setDescription(e.target.value)}
        />

        <input
          type="file"
          className="w-full p-3 border rounded-lg"
          onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
        />

        <input
          type="number"
          step="0.001"
          min="0.001"
          placeholder="Deposit Amount in SOL (e.g. 0.1)"
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={amountSol}
          onChange={(e) => setAmountSol(e.target.value)}
        />
        {amountSol && parseFloat(amountSol) > 0 && (
          <p className="text-xs text-gray-500 -mt-2 pl-1">
            = {Math.floor(parseFloat(amountSol) * anchor.web3.LAMPORTS_PER_SOL).toLocaleString()} lamports
          </p>
        )}

        <select
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={isPrivate ? "private" : "public"}
          onChange={(e) => setIsPrivate(e.target.value === "private")}
        >
          <option value="public">Public (anyone can unlock)</option>
          <option value="private">Private (only you can unlock)</option>
        </select>

        <p className="text-sm font-medium text-gray-600">Unlock after:</p>
        <div className="grid grid-cols-3 gap-3">
          <input
            type="number"
            min="0"
            placeholder="Days"
            className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
          <input
            type="number"
            min="0"
            max="23"
            placeholder="Hours"
            className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={hrs}
            onChange={(e) => setHrs(e.target.value)}
          />
          <input
            type="number"
            min="0"
            max="59"
            placeholder="Minutes"
            className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </div>

        <button
          onClick={handleUpload}
          disabled={loading || !file}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-semibold transition"
        >
          {loading && !cid ? "Uploading..." : "Step 1: Upload File to IPFS"}
        </button>

        {cid && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600 break-all">
            <span className="font-semibold text-gray-800">CID: </span>{cid}
          </div>
        )}

        {cid && (
          <button
            onClick={handleCreateCapsule}
            disabled={loading}
            className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 font-semibold transition"
          >
            {loading ? "Creating Capsule..." : `Step 2: Create Capsule & Deposit SOL`}
          </button>
        )}
      </div>
    </div>
  );
}