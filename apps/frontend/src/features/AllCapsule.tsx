import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { decodeCapsuleState } from "../../utils/Decode";
import idl from "../../../../packages/programs/idl/my_time_capsule.json";
import * as anchor from "@coral-xyz/anchor";

const programId = new PublicKey("H5Xk59HCFQahM1cJLE3xAV1gZJ37FDiY3u3TZ2TKnHh9");
const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const CAPSULE_SEED = Buffer.from("capsule");

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
    if (!publicKey || !signTransaction) throw new Error("Wallet not connected");
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
            return { ...decoded, pubkey: acc.pubkey.toBase58() };
          } catch (e) {
            console.warn("Failed to decode account:", e);
            return null;
          }
        })
        .filter((c): c is NonNullable<typeof c> => c !== null)
        .filter((c) => !c.is_private);
      setCapsules(decodedCapsules);
    } catch (err: any) {
      console.error("Error fetching program accounts:", err);
      setError(err.message || "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAllAccounts(); }, []);

  const handleCapsuleUnlock = async (cap: any, idx: number) => {
    setTxError(null);
    setTxSuccess(null);
    if (!publicKey || !signTransaction) {
      setTxError("Please connect your wallet first.");
      return;
    }
    const now = Math.floor(Date.now() / 1000);
    if (now < cap.unlock_time) {
      setTxError(`Capsule is not unlockable yet. Unlocks at: ${new Date(cap.unlock_time * 1000).toLocaleString()}`);
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
      const creatorPubkey = new PublicKey(cap.creator);
      const capsulePDA = deriveCapsulePDA(creatorPubkey, cap.index);
      const tx = await program.methods
        .unlockCapsule()
        .accounts({ capsule: capsulePDA, opener: publicKey, systemProgram: SystemProgram.programId })
        .rpc();
      setTxSuccess(`Capsule unlocked! Tx: ${tx}`);
      await fetchAllAccounts();
    } catch (err: any) {
      console.error("Unlock error:", err);
      if (err.error?.errorCode?.code === "AlreadyUnlocked") setTxError("This capsule has already been unlocked.");
      else if (err.error?.errorCode?.code === "NotUnlocked") setTxError("The unlock time has not been reached yet.");
      else if (err.error?.errorCode?.code === "InvalidOpener") setTxError("You are not authorized to unlock this capsule.");
      else setTxError(err.message || "Transaction failed.");
    } finally {
      setUnlockingIdx(null);
    }
  };

  const canUnlock = (cap: any) => {
    const now = Math.floor(Date.now() / 1000);
    return !cap.is_unlocked && now >= cap.unlock_time;
  };

  return (
    <div className="w-full">




      <div className="max-w-3xl mx-auto px-6 py-12">

        
        <div className="text-center mb-10">
          <p className="text-[0.58rem] font-semibold tracking-[0.28em] uppercase text-amber-700/55 mb-2">
            Solana · Devnet
          </p>
          <h1 className="text-[2rem] font-light tracking-widest text-amber-50/90 font-serif mb-4">
            All Capsules
          </h1>
          <div className="flex items-center gap-3">
            <span className="flex-1 h-px bg-gradient-to-r from-transparent to-amber-900/35" />
            <span className="text-amber-800/45 text-[0.5rem] tracking-[0.35em]">◆</span>
            <span className="flex-1 h-px bg-gradient-to-l from-transparent to-amber-900/35" />
          </div>
        </div>

        {!connected && (
          <div className="bg-amber-950/40 border border-amber-800/25 rounded-sm px-4 py-3 text-xs text-amber-500/80 tracking-wide mb-6">
            ⚠ Connect your wallet to unlock capsules.
          </div>
        )}
        {txSuccess && (
          <div className="bg-emerald-950/50 border border-emerald-800/30 rounded-sm px-4 py-3 text-xs text-emerald-400/90 tracking-wide break-all mb-6">
            ✅ {txSuccess}
          </div>
        )}
        {txError && (
          <div className="bg-red-950/50 border border-red-800/30 rounded-sm px-4 py-3 text-xs text-red-400/90 tracking-wide mb-6">
            ✕ {txError}
          </div>
        )}

        {loading && (
          <div className="text-center py-20">
            <p className="text-[0.65rem] tracking-[0.25em] uppercase text-amber-800/45 animate-pulse">
              Retrieving capsules...
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-950/50 border border-red-800/30 rounded-sm px-4 py-3 text-xs text-red-400/90 tracking-wide">
            Error: {error}
          </div>
        )}

        {!loading && !error && capsules.length === 0 && (
          <div className="text-center py-20">
            <p className="text-[0.65rem] tracking-[0.25em] uppercase text-amber-900/40">
              No public capsules found.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-5">
          {capsules.map((cap, idx) => {
            const unlockable = canUnlock(cap);
            const isUnlocking = unlockingIdx === idx;
            const isOwner = publicKey?.toBase58() === cap.creator;

            return (
              <div
                key={idx}
                className={`relative bg-[#111115] border rounded-sm px-8 py-6 shadow-[0_0_40px_rgba(0,0,0,0.5)] transition-all duration-300
                  ${cap.is_unlocked
                    ? "border-emerald-900/30"
                    : "border-amber-900/20"
                  }`}
              >
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent to-transparent pointer-events-none
                  ${cap.is_unlocked ? "via-emerald-700/30" : "via-amber-700/25"}`} />

                <span className={`absolute top-0 left-0 w-2.5 h-2.5 border-t border-l ${cap.is_unlocked ? "border-emerald-700/35" : "border-amber-700/30"}`} />
                <span className={`absolute top-0 right-0 w-2.5 h-2.5 border-t border-r ${cap.is_unlocked ? "border-emerald-700/35" : "border-amber-700/30"}`} />
                <span className={`absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l ${cap.is_unlocked ? "border-emerald-700/35" : "border-amber-700/30"}`} />
                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r ${cap.is_unlocked ? "border-emerald-700/35" : "border-amber-700/30"}`} />

                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <h2 className="text-base font-light tracking-wider text-amber-100/80 font-serif">
                      {cap.title || "Untitled"}
                    </h2>
                    {isOwner && (
                      <span className="text-[0.55rem] tracking-[0.15em] uppercase text-amber-700/45 mt-0.5 block">
                        Your Capsule
                      </span>
                    )}
                  </div>
                  <span className={`text-[0.55rem] font-semibold tracking-[0.18em] uppercase px-2.5 py-1 rounded-sm border shrink-0
                    ${cap.is_unlocked
                      ? "text-emerald-400/80 border-emerald-800/35 bg-emerald-950/30"
                      : "text-amber-600/70 border-amber-900/30 bg-amber-950/20"
                    }`}>
                    {cap.is_unlocked ? "🔓 Unlocked" : "🔒 Locked"}
                  </span>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-amber-900/20 to-transparent mb-5" />

                <div className="grid grid-cols-1 gap-3 mb-5">
                  {[
                    { label: "Description", value: cap.description },
                    { label: "Creator", value: cap.creator, mono: true },
                    { label: "Reward", value: `${cap.reward_amount} lamports` },
                    {
                      label: "Unlock Time",
                      value: new Date(cap.unlock_time * 1000).toLocaleString(),
                    },
                    { label: "Index", value: cap.index },
                  ].map(({ label, value, mono }) => (
                    <div key={label} className="flex gap-3">
                      <span className="text-[0.55rem] font-semibold tracking-[0.18em] uppercase text-amber-800/50 w-24 shrink-0 mt-0.5">
                        {label}
                      </span>
                      <span className={`text-xs text-amber-100/55 font-light leading-relaxed break-all ${mono ? "font-mono text-[0.65rem]" : ""}`}>
                        {value}
                      </span>
                    </div>
                  ))}

                  {cap.is_unlocked && (
                    <div className="flex gap-3">
                      <span className="text-[0.55rem] font-semibold tracking-[0.18em] uppercase text-emerald-700/60 w-24 shrink-0 mt-0.5">
                        CID
                      </span>
                      <span className="text-[0.65rem] font-mono text-emerald-400/70 break-all leading-relaxed">
                        {cap.cid}
                      </span>
                    </div>
                  )}
                </div>

                {cap.is_unlocked ? (
                  <div className="w-full border border-emerald-800/30 bg-emerald-950/20 text-emerald-500/60 rounded-sm py-3
                    text-[0.58rem] font-semibold tracking-[0.2em] uppercase text-center">
                    Already Unlocked
                  </div>
                ) : unlockable ? (
                  <button
                    onClick={() => handleCapsuleUnlock(cap, idx)}
                    disabled={!connected || isUnlocking}
                    className="w-full border border-amber-700/50 bg-amber-950/25 text-amber-400/90 rounded-sm py-3
                      text-[0.58rem] font-semibold tracking-[0.2em] uppercase
                      hover:border-amber-600/70 hover:text-amber-300 hover:bg-amber-950/40
                      disabled:opacity-30 disabled:cursor-not-allowed
                      transition-all duration-200"
                  >
                    {isUnlocking ? "Unlocking..." : "Unlock Capsule"}
                  </button>
                ) : (
                  <div className="w-full border border-amber-900/20 bg-transparent rounded-sm py-3
                    text-[0.58rem] font-semibold tracking-[0.2em] uppercase text-amber-900/40 text-center">
                    Not Yet Unlockable · {new Date(cap.unlock_time * 1000).toLocaleString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}