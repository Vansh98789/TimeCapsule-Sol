import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { decodeCapsuleState } from "../../utils/Decode";
import idl from "../../../../packages/programs/idl/my_time_capsule.json";
import * as anchor from "@coral-xyz/anchor";

const programId = new PublicKey("H5Xk59HCFQahM1cJLE3xAV1gZJ37FDiY3u3TZ2TKnHh9");
const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const CAPSULE_SEED = Buffer.from("capsule");

// Derive capsule PDA from creator pubkey + index (u64 as little-endian 8 bytes)
function deriveCapsulePDA(creator: PublicKey, index: string): PublicKey {
  const indexBuf = Buffer.alloc(8);
  indexBuf.writeBigUInt64LE(BigInt(index));
  const [pda] = PublicKey.findProgramAddressSync(
    [CAPSULE_SEED, creator.toBuffer(), indexBuf],
    programId
  );
  return pda;
}

export default function AllCapsule() {
  const [capsules, setCapsules] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [unlockingIdx, setUnlockingIdx] = useState<number | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [txSuccess, setTxSuccess] = useState<string | null>(null);

  const { publicKey, signTransaction, signAllTransactions, connected } = useWallet();

  const getProvider = () => {
    if (!publicKey || !signTransaction) {
      throw new Error("Wallet not connected");
    }
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

  const fetchAllAccounts = async () => {
    try {
      setLoading(true);
      setError(null);

      const accounts = await connection.getProgramAccounts(programId);

      const decodedCapsules = accounts
        .map((acc) => {
          try {
            const decoded = decodeCapsuleState(acc.account.data);
            // Store the on-chain pubkey alongside decoded data so we can use it for unlock
            return { ...decoded, pubkey: acc.pubkey.toBase58() };
          } catch (e) {
            console.warn("Failed to decode account:", e);
            return null;
          }
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);

      setCapsules(decodedCapsules);
    } catch (err: any) {
      console.error("Error fetching program accounts:", err);
      setError(err.message || "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAccounts();
  }, []);

  const handleCapsuleUnlock = async (cap: any, idx: number) => {
    setTxError(null);
    setTxSuccess(null);

    if (!publicKey || !signTransaction) {
      setTxError("Please connect your wallet first.");
      return;
    }

    // Check unlock time — program will also check this, but give early feedback
    const now = Math.floor(Date.now() / 1000);
    if (now < cap.unlock_time) {
      const unlockDate = new Date(cap.unlock_time * 1000).toLocaleString();
      setTxError(`Capsule is not unlockable yet. Unlocks at: ${unlockDate}`);
      return;
    }

    if (cap.is_unlocked) {
      setTxError("This capsule is already unlocked.");
      return;
    }

    try {
      setUnlockingIdx(idx);

      const provider = getProvider();
      const program = new anchor.Program(idl as anchor.Idl, provider);

      // Derive the capsule PDA from creator + index (matches on-chain seeds)
      const creatorPubkey = new PublicKey(cap.creator);
      const capsulePDA = deriveCapsulePDA(creatorPubkey, cap.index);

      const tx = await program.methods
        .unlockCapsule()
        .accounts({
          capsule: capsulePDA,
          opener: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setTxSuccess(`Capsule unlocked! Tx: ${tx}`);

      // Refresh capsule list to reflect new is_unlocked state
      await fetchAllAccounts();
    } catch (err: any) {
      console.error("Unlock error:", err);

      // Parse Anchor error codes into friendly messages
      if (err.error?.errorCode?.code === "AlreadyUnlocked") {
        setTxError("This capsule has already been unlocked.");
      } else if (err.error?.errorCode?.code === "NotUnlocked") {
        setTxError("The unlock time has not been reached yet.");
      } else if (err.error?.errorCode?.code === "InvalidOpener") {
        setTxError("You are not authorized to unlock this capsule.");
      } else {
        setTxError(err.message || "Transaction failed.");
      }
    } finally {
      setUnlockingIdx(null);
    }
  };

  const canUnlock = (cap: any) => {
    const now = Math.floor(Date.now() / 1000);
    return !cap.is_unlocked && now >= cap.unlock_time;
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>All Capsules</h1>

      {!connected && (
        <p style={{ color: "orange" }}>⚠️ Connect your wallet to unlock capsules.</p>
      )}

      {txSuccess && (
        <p style={{ color: "green", wordBreak: "break-all" }}>✅ {txSuccess}</p>
      )}
      {txError && (
        <p style={{ color: "red" }}>❌ {txError}</p>
      )}

      {loading && <p>Loading capsules...</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      {!loading && !error && capsules.length === 0 && <p>No capsules found.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {capsules.map((cap, idx) => {
          const unlockable = canUnlock(cap);
          const isUnlocking = unlockingIdx === idx;

          return (
            <div
              key={idx}
              style={{
                padding: "15px",
                border: "1px solid #ccc",
                borderRadius: "8px",
                backgroundColor: cap.is_unlocked
                  ? "#e0ffe0"
                  : cap.is_private
                  ? "#f9f9f9"
                  : "#fff8e1",
              }}
            >
              <h2 style={{ marginTop: 0 }}>
                {cap.title || "Untitled"}{" "}
                {cap.is_unlocked && <span style={{ color: "green" }}>🔓 Unlocked</span>}
                {!cap.is_unlocked && <span style={{ color: "gray" }}>🔒 Locked</span>}
              </h2>

              <p><strong>Description:</strong> {cap.description}</p>
              <p><strong>Creator:</strong> <code>{cap.creator}</code></p>
              <p><strong>CID:</strong> {cap.cid}</p>
              <p><strong>Reward Amount:</strong> {cap.reward_amount} lamports</p>
              <p>
                <strong>Unlock Time:</strong>{" "}
                {new Date(cap.unlock_time * 1000).toLocaleString()}
              </p>
              <p><strong>Private:</strong> {cap.is_private ? "Yes" : "No"}</p>
              <p><strong>Bump:</strong> {cap.bump}</p>
              <p><strong>Index:</strong> {cap.index}</p>

              <button
                onClick={() => handleCapsuleUnlock(cap, idx)}
                disabled={!connected || cap.is_unlocked || isUnlocking}
                style={{
                  marginTop: "10px",
                  padding: "10px 20px",
                  borderRadius: "6px",
                  border: "none",
                  cursor:
                    !connected || cap.is_unlocked || isUnlocking
                      ? "not-allowed"
                      : "pointer",
                  backgroundColor: cap.is_unlocked
                    ? "#aaa"
                    : unlockable
                    ? "#4CAF50"
                    : "#f0a500",
                  color: "white",
                  fontWeight: "bold",
                  fontSize: "14px",
                }}
              >
                {isUnlocking
                  ? "Unlocking..."
                  : cap.is_unlocked
                  ? "Already Unlocked"
                  : unlockable
                  ? "Unlock Capsule 🔓"
                  : "Not Yet Unlockable ⏳"}
              </button>

              {!cap.is_unlocked && !unlockable && (
                <p style={{ fontSize: "12px", color: "#888", marginTop: "6px" }}>
                  Unlocks on {new Date(cap.unlock_time * 1000).toLocaleString()}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}   