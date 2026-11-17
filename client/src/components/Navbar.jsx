import React from 'react';
import { CheckSquare, LogOut, Sparkles, User as UserIcon } from 'lucide-react';
import { logoutUser } from '../firebase';

export default function Navbar({ user }) {
  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="navbar">
      <div className="nav-brand">
        <div className="brand-icon">
          <CheckSquare size={22} strokeWidth={2.5} />
        </div>
        <div>
          <span className="brand-title">TaskFlow AI</span>
          <span className="nav-badge" style={{ marginLeft: '0.6rem' }}>MERN + MCP</span>
        </div>
      </div>

      <div className="nav-user">
        <div className="user-badge">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={displayName}
              style={{ width: '26px', height: '26px', borderRadius: '50%' }}
            />
          ) : (
            <div className="user-avatar">{initial}</div>
          )}
          <span>{displayName}</span>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={handleLogout}
          title="Sign out"
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}
