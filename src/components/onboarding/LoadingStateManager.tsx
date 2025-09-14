
import React, { createContext, useContext, useReducer, ReactNode } from 'react';

type LoadingState = {
  tenant: boolean;
  workflow: boolean;
  steps: boolean;
  global: boolean;
};

type LoadingAction = 
  | { type: 'SET_TENANT_LOADING'; payload: boolean }
  | { type: 'SET_WORKFLOW_LOADING'; payload: boolean }
  | { type: 'SET_STEPS_LOADING'; payload: boolean }
  | { type: 'RESET_ALL' };

const initialState: LoadingState = {
  tenant: false,
  workflow: false,
  steps: false,
  global: false
};

function loadingReducer(state: LoadingState, action: LoadingAction): LoadingState {
  switch (action.type) {
    case 'SET_TENANT_LOADING':
      return {
        ...state,
        tenant: action.payload,
        global: action.payload || state.workflow || state.steps
      };
    case 'SET_WORKFLOW_LOADING':
      return {
        ...state,
        workflow: action.payload,
        global: state.tenant || action.payload || state.steps
      };
    case 'SET_STEPS_LOADING':
      return {
        ...state,
        steps: action.payload,
        global: state.tenant || state.workflow || action.payload
      };
    case 'RESET_ALL':
      return initialState;
    default:
      return state;
  }
}

const LoadingStateContext = createContext<{
  state: LoadingState;
  dispatch: React.Dispatch<LoadingAction>;
} | null>(null);

export const LoadingStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(loadingReducer, initialState);

  return (
    <LoadingStateContext.Provider value={{ state, dispatch }}>
      {children}
    </LoadingStateContext.Provider>
  );
};

export const useLoadingState = () => {
  const context = useContext(LoadingStateContext);
  if (!context) {
    throw new Error('useLoadingState must be used within LoadingStateProvider');
  }
  return context;
};
