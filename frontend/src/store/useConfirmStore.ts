import { create } from 'zustand';

export interface ConfirmConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
}

interface ConfirmStore {
  isOpen: boolean;
  config: ConfirmConfig;
  resolver: ((value: boolean) => void) | null;
  showConfirmDialog: (config: ConfirmConfig) => Promise<boolean>;
  closeConfirmDialog: (value: boolean) => void;
}

const defaultConfig: ConfirmConfig = {
  title: 'Confirm',
  message: 'Are you sure?',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'info',
};

export const useConfirmStore = create<ConfirmStore>((set) => ({
  isOpen: false,
  config: defaultConfig,
  resolver: null,
  showConfirmDialog: (config) => {
    return new Promise((resolve) => {
      set({
        isOpen: true,
        config: { ...defaultConfig, ...config },
        resolver: resolve,
      });
    });
  },
  closeConfirmDialog: (value) => {
    set((state) => {
      if (state.resolver) {
        state.resolver(value);
      }
      return {
        isOpen: false,
        resolver: null,
      };
    });
  },
}));

// Export the imperative function directly for use anywhere (React components, regular functions, etc.)
export const showConfirmDialog = (config: ConfirmConfig) => {
  return useConfirmStore.getState().showConfirmDialog(config);
};
