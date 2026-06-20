import { useEffect, useMemo, useRef, useState } from 'react';
import type { Actor } from '../../data/types';
import { useVizStore } from '../../store/useVizStore';

interface ActorSearchProps {
  actors: Actor[];
}

const MAX_SUGGESTIONS = 8;

/**
 * 图例卡片中的演员搜索栏：输入姓名挑选演员。
 * 选中等价于「在视图 A 单击该演员」——复用 store 的 selectActorSingle，保证链路一致。
 */
export function ActorSearch({ actors }: ActorSearchProps) {
  const selectedActorId = useVizStore((state) => state.selectedActorId);
  const selectActorSingle = useVizStore((state) => state.selectActorSingle);

  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const actorsById = useMemo(() => {
    const map = new Map<string, Actor>();
    for (const actor of actors) {
      map.set(actor.id, actor);
    }
    return map;
  }, [actors]);

  // 未聚焦时，输入框回显当前选中的演员（包括在视图 A 中选中的）。
  const selectedName = selectedActorId ? (actorsById.get(selectedActorId)?.name ?? '') : '';
  useEffect(() => {
    if (!focused) {
      setQuery(selectedName);
    }
  }, [selectedName, focused]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [];
    }
    const scored: Array<{ actor: Actor; index: number }> = [];
    for (const actor of actors) {
      const index = actor.name.toLowerCase().indexOf(q);
      if (index >= 0) {
        scored.push({ actor, index });
      }
    }
    scored.sort(
      (left, right) => left.index - right.index || left.actor.name.localeCompare(right.actor.name),
    );
    return scored.slice(0, MAX_SUGGESTIONS).map((entry) => entry.actor);
  }, [actors, query]);

  const showSuggestions = open && focused && matches.length > 0;

  const commitSelection = (actor: Actor) => {
    selectActorSingle(actor.id);
    setQuery(actor.name);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.min(current + 1, matches.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      const target = matches[activeIndex] ?? matches[0];
      if (target) {
        event.preventDefault();
        commitSelection(target);
      }
      return;
    }
    if (event.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="actor-search">
      <input
        ref={inputRef}
        type="search"
        className="actor-search__input"
        placeholder=""
        aria-label="按姓名搜索演员（等同于在视图 A 单击选择）"
        autoComplete="off"
        role="combobox"
        aria-expanded={showSuggestions}
        aria-controls="actor-search-listbox"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onFocus={() => {
          setFocused(true);
          setOpen(true);
        }}
        onBlur={() => {
          setFocused(false);
          setOpen(false);
        }}
        onKeyDown={handleKeyDown}
      />
      {showSuggestions && (
        <ul className="actor-search__list" id="actor-search-listbox" role="listbox">
          {matches.map((actor, index) => (
            <li key={actor.id} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={`actor-search__option${index === activeIndex ? ' is-active' : ''}${
                  actor.id === selectedActorId ? ' is-selected' : ''
                }`}
                // mousedown 抢在 input blur 之前，确保点击能选中。
                onMouseDown={(event) => {
                  event.preventDefault();
                  commitSelection(actor);
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span className="actor-search__option-name">{actor.name}</span>
                <span className="actor-search__option-meta">C{actor.clusterId}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
