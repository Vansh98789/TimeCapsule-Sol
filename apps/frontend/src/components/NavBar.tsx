import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { NavLink } from 'react-router-dom';

const linkClass =
  'px-4 py-2 rounded text-sm font-medium transition';

const Navbar = () => {
  return (
    <nav className="bg-white shadow px-6 py-3 flex gap-4">
      <NavLink
        to="all"
        className={({ isActive }) =>
          `${linkClass} ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700'}`
        }
      >
        All Capsule
      </NavLink>

      <NavLink
        to="my"
        className={({ isActive }) =>
          `${linkClass} ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700'}`
        }
      >
        My Capsule
      </NavLink>

      <NavLink
        to="create"
        className={({ isActive }) =>
          `${linkClass} ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700'}`
        }
      >
        Create New Capsule
      </NavLink>
      <NavLink
        to="unlock"
        className={({ isActive }) =>
          `${linkClass} ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700'}`
        }
      >
        Unlock Capsule
      </NavLink>
      <div className='ml-160'>
      <WalletMultiButton/>

      </div>
    </nav>
  );
};

export default Navbar;