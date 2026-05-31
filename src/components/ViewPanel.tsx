import type { ReactNode } from 'react';
import './ViewPanel.css';

type ViewStatus = 'ready' | 'empty' | 'loading' | 'error';

interface ViewPanelProps {
  title: string;
  toolbar?: ReactNode;
  legend?: ReactNode;
  children?: ReactNode;
  status?: ViewStatus;
  message?: string;
}

export function ViewPanel({
  title,
  toolbar,
  legend,
  children,
  status = 'ready',
  message,
}: ViewPanelProps) {
  const fallbackTextByStatus: Record<ViewStatus, string> = {
    ready: '',
    empty: '暂无数据',
    loading: '数据加载中…',
    error: '数据加载失败',
  };

  const content =
    status === 'ready' ? (
      children
    ) : (
      <div className={`view-panel__state view-panel__state--${status}`}>
        {message ?? fallbackTextByStatus[status]}
      </div>
    );

  return (
    <section className="view-panel">
      <header className="view-panel__header">
        <h2 className="view-panel__title">{title}</h2>
        <div className="view-panel__toolbar">{toolbar}</div>
      </header>
      <div className="view-panel__legend">{legend}</div>
      <div className="view-panel__content">{content}</div>
    </section>
  );
}

