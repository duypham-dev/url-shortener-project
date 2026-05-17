import React from 'react';

export const AccountSettings: React.FC = () => {
  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 transition-colors">Account Settings</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">
          Manage your account details and security.
        </p>
      </div>
      <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 transition-colors">
        <p className="text-gray-600 dark:text-gray-300">Account settings options will go here.</p>
      </div>
    </div>
  );
};
