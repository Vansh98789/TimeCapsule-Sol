import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { NavLink } from 'react-router-dom';

const links = [
  { to: 'all',    label: 'All Capsules'  },
  { to: 'my',     label: 'My Capsules'   },
  { to: 'create', label: 'Create New'    },
  { to: 'unlock', label: 'Unlock'        },
];

const Navbar = () => {
  return (
    <nav className="relative bg-[#0e0e12] border-b border-amber-900/20 px-8 flex items-center justify-between h-14">

      {/* Bottom centre shimmer */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-amber-700/30 to-transparent pointer-events-none" />

      {/* Brand */}
      <div className="flex items-center gap-2 shrink-0 select-none">
        <span className="text-amber-800/50 text-[0.45rem] tracking-[0.3em]">◆</span>
        <span
          className="text-amber-100/65 text-[0.7rem] font-light tracking-[0.28em] uppercase"
          style={{ fontFamily: "'Georgia', serif" }}
        >
          TimeCapsule
        </span>
        <span className="text-amber-800/50 text-[0.45rem] tracking-[0.3em]">◆</span>
      </div>

      {/* Nav links */}
      <div className="flex items-center gap-0.5">
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `relative px-4 py-5 text-[0.58rem] font-semibold tracking-[0.18em] uppercase transition-all duration-200 group
              ${isActive
                ? 'text-amber-400/90'
                : 'text-amber-900/45 hover:text-amber-700/70'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {label}
                {/* Animated underline */}
                <span
                  className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-px bg-gradient-to-r from-transparent via-amber-600/55 to-transparent transition-all duration-300
                    ${isActive ? 'w-full' : 'w-0 group-hover:w-3/4'}`}
                />
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* Wallet button */}
      <div
        className="shrink-0
          [&_.wallet-adapter-button]:!bg-transparent
          [&_.wallet-adapter-button]:!border
          [&_.wallet-adapter-button]:!border-amber-800/40
          [&_.wallet-adapter-button]:!text-amber-500/80
          [&_.wallet-adapter-button]:!text-[0.58rem]
          [&_.wallet-adapter-button]:!font-semibold
          [&_.wallet-adapter-button]:!tracking-[0.15em]
          [&_.wallet-adapter-button]:!uppercase
          [&_.wallet-adapter-button]:!rounded-sm
          [&_.wallet-adapter-button]:!px-4
          [&_.wallet-adapter-button]:!py-2
          [&_.wallet-adapter-button]:!h-auto
          [&_.wallet-adapter-button]:!shadow-none
          [&_.wallet-adapter-button]:!transition-all
          [&_.wallet-adapter-button]:!duration-200
          [&_.wallet-adapter-button:hover]:!border-amber-700/60
          [&_.wallet-adapter-button:hover]:!text-amber-300
          [&_.wallet-adapter-button:hover]:!bg-amber-950/20
          [&_.wallet-adapter-button-start-icon]:!hidden"
      >
        <WalletMultiButton />
      </div>
    </nav>
  );
};

export default Navbar;