import { createContext, useContext } from 'react';
import type { DataBundle, DataIndexes } from './types';

export type DataRuntimeState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; bundle: DataBundle; indexes: DataIndexes };

export const DataRuntimeContext = createContext<DataRuntimeState | null>(null);

export function useDataRuntime() {
  const state = useContext(DataRuntimeContext);
  if (state === null) {
    throw new Error('useDataRuntime must be used within <DataProvider>');
  }
  return state;
}

