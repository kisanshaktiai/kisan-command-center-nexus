
import { useState, useCallback } from 'react';

export interface ModalState {
  isOpen: boolean;
  data: any;
}

export const useModalManager = <T = any>() => {
  const [modals, setModals] = useState<Record<string, ModalState>>({});

  const openModal = useCallback((modalId: string, data?: T) => {
    setModals(prev => ({
      ...prev,
      [modalId]: { isOpen: true, data }
    }));
  }, []);

  const closeModal = useCallback((modalId: string) => {
    setModals(prev => ({
      ...prev,
      [modalId]: { isOpen: false, data: null }
    }));
  }, []);

  const getModalState = useCallback((modalId: string): ModalState => {
    return modals[modalId] || { isOpen: false, data: null };
  }, [modals]);

  const isModalOpen = useCallback((modalId: string): boolean => {
    return modals[modalId]?.isOpen || false;
  }, [modals]);

  const getModalData = useCallback(<T = any>(modalId: string): T | null => {
    return modals[modalId]?.data || null;
  }, [modals]);

  return {
    openModal,
    closeModal,
    getModalState,
    isModalOpen,
    getModalData
  };
};
