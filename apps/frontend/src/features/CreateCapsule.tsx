import { useState } from "react";
import * as anchor from "@coral-xyz/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import idl from "../../../../packages/programs/idl/my_time_capsule.json";

const programId = new PublicKey("H5Xk59HCFQahM1cJLE3xAV1gZJ37FDiY3u3TZ2TKnHh9");
const network = "https://api.devnet.solana.com";

interface UserStateAccount {
  owner: PublicKey;
  count: anchor.BN;
}

const inputClass =
  "w-full bg-white/[0.02] border border-amber-900/20 rounded-sm px-4 py-3 text-amber-100/80 text-sm font-light placeholder-amber-900/30 outline-none focus:border-amber-700/50 focus:bg-amber-900/5 transition-all duration-200";

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
  const [dragOver, setDragOver] = useState(false);

  const { publicKey, signTransaction, signAllTransactions } = useWallet();

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
      const res = await fetch("https://time-capsule-backend.vercel.app/upload", { method: "POST", body: formData });
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
    if (!publicKey || !signTransaction)
      return setStatus({ type: "error", msg: "Connect your wallet first" });
    if (!cid)
      return setStatus({ type: "error", msg: "Upload a file first to get a CID" });
    if (!title.trim())
      return setStatus({ type: "error", msg: "Title is required" });
    const parsedSol = parseFloat(amountSol);
    if (!amountSol || isNaN(parsedSol) || parsedSol <= 0)
      return setStatus({ type: "error", msg: "Enter a valid SOL deposit amount greater than 0" });
    const lamports = Math.floor(parsedSol * anchor.web3.LAMPORTS_PER_SOL);
    const totalSeconds =
      (parseInt(days) || 0) * 86400 +
      (parseInt(hrs) || 0) * 3600 +
      (parseInt(minutes) || 0) * 60;
    if (totalSeconds <= 0)
      return setStatus({ type: "error", msg: "Set a future unlock time (days/hours/minutes)" });
    const unlockTime = Math.floor(Date.now() / 1000) + totalSeconds;
    if (cid.length > 196) return setStatus({ type: "error", msg: "CID too long (max 196 chars)" });
    if (title.length > 96) return setStatus({ type: "error", msg: "Title too long (max 96 chars)" });
    if (description.length > 296) return setStatus({ type: "error", msg: "Description too long (max 296 chars)" });

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
        const userState = (await (program.account as any).userState.fetch(userPda)) as UserStateAccount;
        userCount = userState.count;
      } catch { needsInit = true; }

      const [capsulePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("capsule"), publicKey.toBuffer(), userCount.toArrayLike(Buffer, "le", 8)],
        programId
      );
      const tx = new anchor.web3.Transaction();
      if (needsInit) {
        const initIx = await program.methods.initUser()
          .accounts({ userState: userPda, user: publicKey, systemProgram: anchor.web3.SystemProgram.programId })
          .instruction();
        tx.add(initIx);
      }
      const createIx = await program.methods
        .createCapsule(cid, new anchor.BN(lamports), new anchor.BN(unlockTime), isPrivate, title, description)
        .accounts({ capsule: capsulePda, userState: userPda, user: publicKey, systemProgram: anchor.web3.SystemProgram.programId })
        .instruction();
      tx.add(createIx);
      tx.feePayer = publicKey;
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      setStatus({ type: "info", msg: `Approve the transaction in your wallet (${parsedSol} SOL)...` });
      const signed = await signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize());
      setStatus({ type: "info", msg: "Confirming transaction..." });
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
      setStatus({ type: "success", msg: `✅ Capsule created! TX: ${sig}` });
      setTitle(""); setDescription(""); setCid(""); setFile(null);
      setAmountSol(""); setDays(""); setHrs(""); setMinutes(""); setIsPrivate(false);
    } catch (err: any) {
      console.error(err);
      setStatus({ type: "error", msg: "Failed: " + (err?.error?.errorMessage || err?.message || "Unknown error") });
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  };

  const statusStyles = {
    success: "bg-emerald-950/50 border border-emerald-800/30 text-emerald-400/90",
    error: "bg-red-950/50 border border-red-800/30 text-red-400/90",
    info: "bg-blue-950/50 border border-blue-800/25 text-blue-400/80",
  };

  return (
    <div className="min-h-screen bg-[#0c0c10] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient glow layers */}
      <div className="fixed top-0 left-0 w-2/3 h-3/4 bg-amber-950/10 rounded-full blur-[120px] -translate-x-1/4 -translate-y-1/3 pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-1/2 h-2/3 bg-indigo-950/10 rounded-full blur-[100px] translate-x-1/4 translate-y-1/3 pointer-events-none" />

      <div className="relative w-full max-w-[540px]">
        {/* Main card */}
        <div className="relative bg-[#111115] border border-amber-900/20 rounded-sm px-10 pt-10 pb-10 shadow-[0_0_80px_rgba(0,0,0,0.8)]">

          {/* Top shimmer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-amber-700/40 to-transparent" />

          {/* Corner accents */}
          <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-amber-700/40" />
          <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-amber-700/40" />
          <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-amber-700/40" />
          <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-amber-700/40" />

          {/* Header */}
          <div className="text-center mb-8">
            <p className="text-[0.58rem] font-semibold tracking-[0.28em] uppercase text-amber-700/55 mb-2">
              Solana · Devnet
            </p>
            <h1 className="text-[2rem] font-light tracking-widest text-amber-50/90 font-serif">
              Time Capsule
            </h1>
            <div className="flex items-center gap-3 mt-4">
              <span className="flex-1 h-px bg-gradient-to-r from-transparent to-amber-900/35" />
              <span className="text-amber-800/45 text-[0.5rem] tracking-[0.35em]">◆</span>
              <span className="flex-1 h-px bg-gradient-to-l from-transparent to-amber-900/35" />
            </div>
          </div>

          {/* Status message */}
          {status && (
            <div className={`${statusStyles[status.type]} rounded-sm px-4 py-3 text-xs font-medium tracking-wide break-all leading-relaxed mb-6`}>
              {status.msg}
            </div>
          )}

          <div className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-[0.58rem] font-semibold tracking-[0.22em] uppercase text-amber-800/55 mb-2">
                Title
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder="Name your capsule"
                value={title}
                maxLength={96}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-[0.58rem] font-semibold tracking-[0.22em] uppercase text-amber-800/55 mb-2">
                Description
              </label>
              <textarea
                className={`${inputClass} resize-none h-24`}
                placeholder="A note to the future..."
                value={description}
                maxLength={296}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* File upload */}
            <div>
              <label className="block text-[0.58rem] font-semibold tracking-[0.22em] uppercase text-amber-800/55 mb-2">
                Artifact
              </label>
              <div
                className={`relative border border-dashed rounded-sm px-5 py-6 text-center cursor-pointer transition-all duration-200
                  ${dragOver
                    ? "border-amber-700/50 bg-amber-950/20"
                    : "border-amber-900/20 bg-white/[0.01] hover:border-amber-800/40 hover:bg-amber-950/10"
                  }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                {file ? (
                  <>
                    <p className="text-amber-700/50 text-lg mb-1">◈</p>
                    <p className="text-xs text-amber-200/65 font-medium tracking-wide">{file.name}</p>
                  </>
                ) : (
                  <>
                    <p className="text-amber-900/40 text-xl mb-1">↑</p>
                    <p className="text-[0.65rem] text-amber-900/35 tracking-widest">
                      Drop file here or click to browse
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* SOL Amount */}
            <div>
              <label className="block text-[0.58rem] font-semibold tracking-[0.22em] uppercase text-amber-800/55 mb-2">
                Deposit (SOL)
              </label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                className={inputClass}
                placeholder="0.000"
                value={amountSol}
                onChange={(e) => setAmountSol(e.target.value)}
              />
              {amountSol && parseFloat(amountSol) > 0 && (
                <p className="text-[0.62rem] text-amber-900/40 tracking-wide mt-1.5 pl-0.5">
                  {Math.floor(parseFloat(amountSol) * anchor.web3.LAMPORTS_PER_SOL).toLocaleString()} lamports
                </p>
              )}
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-[0.58rem] font-semibold tracking-[0.22em] uppercase text-amber-800/55 mb-2">
                Visibility
              </label>
              <div className="flex bg-white/[0.02] border border-amber-900/20 rounded-sm overflow-hidden">
                {[
                  { label: "Public", value: false },
                  { label: "Private", value: true },
                ].map(({ label, value }) => (
                  <button
                    key={label}
                    onClick={() => setIsPrivate(value)}
                    className={`flex-1 py-2.5 text-[0.6rem] font-semibold tracking-[0.2em] uppercase transition-all duration-200
                      ${isPrivate === value
                        ? "bg-amber-900/15 text-amber-400/90"
                        : "text-amber-900/35 hover:text-amber-800/55 hover:bg-white/[0.01]"
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-[0.6rem] text-amber-900/30 tracking-wide mt-1.5 pl-0.5">
                {isPrivate ? "Only you can unlock this capsule" : "Anyone can unlock this capsule"}
              </p>
            </div>

            {/* Unlock time */}
            <div>
              <label className="block text-[0.58rem] font-semibold tracking-[0.22em] uppercase text-amber-800/55 mb-2">
                Unlock After
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { placeholder: "Days", value: days, onChange: setDays, max: undefined },
                  { placeholder: "Hours", value: hrs, onChange: setHrs, max: "23" },
                  { placeholder: "Minutes", value: minutes, onChange: setMinutes, max: "59" },
                ].map(({ placeholder, value, onChange, max }) => (
                  <input
                    key={placeholder}
                    type="number"
                    min="0"
                    max={max}
                    className={inputClass}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Step 1 */}
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-[18px] h-[18px] rounded-full border border-amber-800/40 flex items-center justify-center text-[0.5rem] font-semibold text-amber-700/60 shrink-0">
                1
              </span>
              <span className="text-[0.57rem] font-semibold tracking-[0.2em] uppercase text-amber-800/45">
                Preserve to IPFS
              </span>
            </div>
            <button
              onClick={handleUpload}
              disabled={loading || !file}
              className="w-full border border-amber-800/40 bg-amber-950/20 text-amber-500/85 rounded-sm py-3.5
                text-[0.6rem] font-semibold tracking-[0.22em] uppercase
                hover:border-amber-700/60 hover:text-amber-300 hover:bg-amber-950/30
                disabled:opacity-25 disabled:cursor-not-allowed
                transition-all duration-200"
            >
              {loading && !cid ? "Uploading..." : "Upload File"}
            </button>
          </div>

          {/* CID display */}
          {cid && (
            <div className="mt-4 bg-white/[0.02] border border-amber-900/15 rounded-sm px-4 py-3 break-all leading-relaxed">
              <span className="text-[0.58rem] font-semibold tracking-[0.15em] uppercase text-amber-700/70">CID · </span>
              <span className="text-[0.65rem] text-amber-700/50 tracking-wide">{cid}</span>
            </div>
          )}

          {/* Step 2 */}
          {cid && (
            <div className="mt-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-[18px] h-[18px] rounded-full border border-indigo-700/40 flex items-center justify-center text-[0.5rem] font-semibold text-indigo-500/60 shrink-0">
                  2
                </span>
                <span className="text-[0.57rem] font-semibold tracking-[0.2em] uppercase text-indigo-600/50">
                  Seal on Chain
                </span>
              </div>
              <button
                onClick={handleCreateCapsule}
                disabled={loading}
                className="w-full border border-indigo-800/35 bg-indigo-950/20 text-indigo-400/80 rounded-sm py-3.5
                  text-[0.6rem] font-semibold tracking-[0.22em] uppercase
                  hover:border-indigo-600/55 hover:text-indigo-300 hover:bg-indigo-950/30
                  disabled:opacity-25 disabled:cursor-not-allowed
                  transition-all duration-200"
              >
                {loading ? "Sealing Capsule..." : "Deposit & Create Capsule"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
