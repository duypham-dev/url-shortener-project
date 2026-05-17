import React from 'react';
import { useThemeStore } from '../../store/useThemeStore';
import type { Theme } from '../../store/useThemeStore';
import { Sun, Moon, Monitor, Palette } from 'lucide-react';

export const GeneralSettings: React.FC = () => {
  const { theme, setTheme } = useThemeStore();

  const themeOptions: { id: Theme; label: string; icon: React.ReactNode; description: string }[] = [
    {
      id: 'light',
      label: 'Light',
      icon: <Sun size={24} className="mb-2 text-orange-500" />,
      description: 'Clean and bright appearance',
    },
    {
      id: 'dark',
      label: 'Dark',
      icon: <Moon size={24} className="mb-2 text-indigo-400" />,
      description: 'Easy on the eyes in low light',
    },
    {
      id: 'system',
      label: 'System',
      icon: <Monitor size={24} className="mb-2 text-gray-500 dark:text-gray-400" />,
      description: 'Follows your OS preference',
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-12">
      {/* General Settings Section */}
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 transition-colors">General Settings</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">
            Manage your general application preferences.
          </p>
        </div>
        <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 transition-colors">
          <p className="text-gray-600 dark:text-gray-300">General settings options will go here.</p>
        </div>
      </div>

      {/* Appearance / Theme Section */}
      <div className="pt-8 border-t border-gray-200 dark:border-gray-800 transition-colors">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 transition-colors">Appearance</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">
            Customize how the application looks on your device.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 transition-colors">Theme Preference</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {themeOptions.map((option) => {
                const isSelected = theme === option.id;
                
                return (
                  <button
                    key={option.id}
                    onClick={() => setTheme(option.id)}
                    className={`relative flex flex-col items-center p-6 rounded-xl border-2 transition-all duration-200 text-left w-full h-full ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-900/20'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-5 h-5 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center text-white shadow-sm">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}

                    <div className="flex flex-col items-center text-center mt-2">
                      {option.icon}
                      <span className="font-semibold text-gray-900 dark:text-white mb-1 transition-colors">
                        {option.label}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 transition-colors">
                        {option.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-8 border-t border-gray-100 dark:border-gray-700 transition-colors">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 transition-colors">Preview</h3>
            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                  <Palette className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="text-base font-medium text-gray-900 dark:text-white transition-colors">Interface Element</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 transition-colors">
                    This card demonstrates how elements look in the current theme.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
