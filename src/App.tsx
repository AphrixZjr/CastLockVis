import { useEffect, useMemo, useState } from 'react';
import { ViewPanel } from './components/ViewPanel';
import { buildIndexes, loadDataBundle } from './data/loadData';
import type { DataBundle, DataIndexes, MarkovStage } from './data/types';
import { useVizStore } from './store/useVizStore';
import './App.css';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; bundle: DataBundle; indexes: DataIndexes };

const PANEL_TITLES = [
  'A · Genre-Space Cluster',
  'B · Career River',
  'D · Markov Transition Gate',
  'C · Transformation Alignment',
] as const;

function StageToggle() {
  const stage = useVizStore((state) => state.markovStage);
  const setMarkovStage = useVizStore((state) => state.setMarkovStage);

  return (
    <div className="stage-toggle" role="group" aria-label="Markov stage switch">
      {(['early', 'mid', 'late'] as MarkovStage[]).map((entry) => (
        <button
          key={entry}
          type="button"
          data-active={stage === entry}
          onClick={() => setMarkovStage(entry)}
        >
          {entry}
        </button>
      ))}
    </div>
  );
}

export function App() {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const bundle = await loadDataBundle();
        const indexes = buildIndexes(bundle);
        if (!active) {
          return;
        }
        setLoadState({ status: 'ready', bundle, indexes });
      } catch (error) {
        if (!active) {
          return;
        }
        setLoadState({
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

  const metaText = useMemo(() => {
    if (loadState.status !== 'ready') {
      return '等待数据契约加载…';
    }
    return `数据已加载：genres=${loadState.bundle.genres.length} · actors=${loadState.bundle.actors.length} · films=${loadState.bundle.films.length} · entropy=${loadState.bundle.entropy.length} · markov=${loadState.bundle.markov.length} · alignment=${loadState.bundle.alignment.length}`;
  }, [loadState]);

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1 className="app-title">CastLock-Vis</h1>
        <p className="app-subtitle">演员类型锁定与转型窗口期可视分析系统（S1 骨架）</p>
        <div className="app-meta">
          <span className="status-text">{metaText}</span>
        </div>
      </header>

      <section className="app-grid">
        {PANEL_TITLES.map((title) => {
          const isMarkovPanel = title.startsWith('D');
          const panelStatus =
            loadState.status === 'loading'
              ? 'loading'
              : loadState.status === 'error'
                ? 'error'
                : 'empty';

          return (
            <ViewPanel
              key={title}
              title={title}
              toolbar={isMarkovPanel ? <StageToggle /> : undefined}
              legend={<span className="status-text">Legend 占位</span>}
              status={panelStatus}
              message={loadState.status === 'error' ? loadState.message : undefined}
            >
              <div className="panel-placeholder">视图内容将在 S2/S3 接入</div>
            </ViewPanel>
          );
        })}
      </section>
    </main>
  );
}
