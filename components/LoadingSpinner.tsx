import React from 'react';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-blue-600 text-lg font-medium">Merancang petualangan impian Anda...</p>
      <p className="text-gray-500 text-sm text-center">Ini mungkin memakan waktu sebentar saat saya mengumpulkan data real-time.</p>
    </div>
  );
};
