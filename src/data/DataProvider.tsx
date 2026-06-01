import { useEffect, useState, type ReactNode } from 'react';
import { buildIndexes, loadDataBundle } from './loadData';
import { DataRuntimeContext, type DataRuntimeState } from './dataRuntimeContext';

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataRuntimeState>({ status: 'loading' });

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const bundle = await loadDataBundle();
        const indexes = buildIndexes(bundle);
        if (!active) {
          return;
        }
        setState({ status: 'ready', bundle, indexes });
      } catch (error) {
        if (!active) {
          return;
        }
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  return <DataRuntimeContext.Provider value={state}>{children}</DataRuntimeContext.Provider>;
}
