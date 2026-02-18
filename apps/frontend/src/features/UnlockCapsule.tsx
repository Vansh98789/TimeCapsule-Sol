import { useState } from "react";

export default function UnlockCapsule() {
  const [cid, setCid] = useState<string>("");
  const [url, setUrl] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleClick() {
    if (!cid.trim()) return;
    setUrl(`https://ipfs.filebase.io/ipfs/${cid.trim()}`);
    setSubmitted(true);
  }

  function handleReset() {
    setCid("");
    setUrl("");
    setSubmitted(false);
  }

  return (
    <div className="w-full">
      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* Page header */}
        <div className="text-center mb-10">
          <p className="text-[0.58rem] font-semibold tracking-[0.28em] uppercase text-amber-700/55 mb-2">
            IPFS · Filebase
          </p>
          <h1 className="text-[2rem] font-light tracking-widest text-amber-50/90 font-serif mb-4">
            Unlock Content
          </h1>
          <div className="flex items-center gap-3">
            <span className="flex-1 h-px bg-gradient-to-r from-transparent to-amber-900/35" />
            <span className="text-amber-800/45 text-[0.5rem] tracking-[0.35em]">◆</span>
            <span className="flex-1 h-px bg-gradient-to-l from-transparent to-amber-900/35" />
          </div>
        </div>

        {/* Input card */}
        <div className="relative bg-[#111115] border border-amber-900/20 rounded-sm px-8 py-8 shadow-[0_0_60px_rgba(0,0,0,0.6)] mb-6">
          {/* Top shimmer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-amber-700/35 to-transparent pointer-events-none" />

          {/* Corner accents */}
          <span className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-amber-700/30" />
          <span className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-amber-700/30" />
          <span className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-amber-700/30" />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-amber-700/30" />

          <label className="block text-[0.58rem] font-semibold tracking-[0.22em] uppercase text-amber-800/55 mb-2">
            Content Identifier (CID)
          </label>
          <input
            type="text"
            placeholder="Enter your IPFS CID..."
            value={cid}
            onChange={(e) => setCid(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleClick()}
            className="w-full bg-white/[0.02] border border-amber-900/20 rounded-sm px-4 py-3
              text-amber-100/80 text-sm font-light placeholder-amber-900/30
              outline-none focus:border-amber-700/50 focus:bg-amber-900/5
              transition-all duration-200 font-mono tracking-wide"
          />

          <p className="text-[0.6rem] text-amber-900/30 tracking-wide mt-2">
            Paste the CID from your unlocked capsule to retrieve the stored content.
          </p>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleClick}
              disabled={!cid.trim()}
              className="flex-1 border border-amber-700/50 bg-amber-950/25 text-amber-400/90 rounded-sm py-3
                text-[0.6rem] font-semibold tracking-[0.22em] uppercase
                hover:border-amber-600/70 hover:text-amber-300 hover:bg-amber-950/40
                disabled:opacity-25 disabled:cursor-not-allowed
                transition-all duration-200"
            >
              Reveal Content
            </button>

            {submitted && (
              <button
                onClick={handleReset}
                className="border border-amber-900/25 bg-transparent text-amber-900/45 rounded-sm px-5
                  text-[0.6rem] font-semibold tracking-[0.22em] uppercase
                  hover:border-amber-800/40 hover:text-amber-800/60
                  transition-all duration-200"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Content viewer */}
        {url && (
          <div className="relative bg-[#111115] border border-emerald-900/30 rounded-sm shadow-[0_0_60px_rgba(0,0,0,0.6)] overflow-hidden">
            {/* Top shimmer — emerald when content loaded */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-emerald-700/30 to-transparent pointer-events-none z-10" />

            {/* Corner accents */}
            <span className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-emerald-700/35 z-10" />
            <span className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-emerald-700/35 z-10" />
            <span className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-emerald-700/35 z-10" />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-emerald-700/35 z-10" />

            {/* Card header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-900/20">
              <div>
                <span className="text-[0.55rem] font-semibold tracking-[0.2em] uppercase text-emerald-600/70">
                  🔓 Content Revealed
                </span>
                <p className="text-[0.6rem] font-mono text-amber-900/40 mt-0.5 truncate max-w-xs">
                  {cid}
                </p>
              </div>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[0.55rem] font-semibold tracking-[0.18em] uppercase text-amber-800/45
                  hover:text-amber-700/70 transition-colors duration-200 border border-amber-900/20
                  hover:border-amber-800/35 px-3 py-1.5 rounded-sm"
              >
                Open ↗
              </a>
            </div>

            {/* iframe */}
            <iframe
              src={url}
              className="w-full"
              style={{ height: "70vh" }}
              title="Capsule Content"
            />
          </div>
        )}

      </div>
    </div>
  );
}