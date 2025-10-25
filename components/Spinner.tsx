
import React from 'react';

const Spinner = () => {
  return (
    <div className="absolute inset-0 bg-slate-900 bg-opacity-75 flex flex-col items-center justify-center z-50 transition-opacity duration-300">
      <div className="w-16 h-16 border-4 border-slate-300 border-t-blue-500 rounded-full animate-spin"></div>
      <p className="text-white text-lg mt-4 font-semibold">AI is enhancing your photo...</p>
      <p className="text-slate-300 text-sm mt-1">This may take a moment.</p>
    </div>
  );
};

export default Spinner;
