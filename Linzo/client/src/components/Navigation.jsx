import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../assets/linzo-logo.png';

const Navigation = () => {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navLinkStyle = (path) => ({
    padding: '8px 16px',
    color: (isActive(path) || (path !== '/' && location.pathname.startsWith(path))) ? '#2c3e50' : 'white',
    background: (isActive(path) || (path !== '/' && location.pathname.startsWith(path))) ? 'white' : 'transparent',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    whiteSpace: 'nowrap'
  });

  return (
    <nav className="bg-[#684CFE] p-2 sm:px-5 mb-5 rounded-lg shadow-md">
      <div className="max-w-[1200px] mx-auto min-h-[60px] flex flex-col sm:flex-row justify-between items-center gap-4 py-2 sm:py-0">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full sm:w-auto">
          <Link to="/" className="text-white no-underline text-xl font-bold flex items-center gap-2">
            <img src={logo} alt="Linzo Logo" className="w-auto h-[45px] sm:h-[55px] object-contain" />
          </Link>

          <div className="flex gap-2 overflow-x-auto w-full sm:w-auto justify-center sm:justify-start pb-2 sm:pb-0 no-scrollbar">
            <Link to="/" style={navLinkStyle('/')}>
              Dashboard
            </Link>

            <Link to="/multicall" style={navLinkStyle('/multicall')}>
              Multilingual Translation
            </Link>

            <Link to="/demo" style={navLinkStyle('/demo')}>
              Sign Language Demo
            </Link>
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-white border border-white rounded-md text-sm transition-all hover:bg-white hover:text-slate-800"
          >
            GitHub
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
