import { useNavigate, useSearch } from "@tanstack/react-router";
import { type KeyboardEvent, type ReactNode, useRef } from "react";

export interface ProjectTab {
  id: string;
  label: string;
  /** A short line under the label so it's clear what each tab covers. */
  detail: string;
  content: ReactNode;
}

/**
 * Splits a long case study into tabs. The open tab lives in `?tab=`, so it renders on the server
 * and a link can point straight at it. The first tab is the default and keeps a clean URL.
 */
export function ProjectTabs({ label, tabs }: { label: string; tabs: ProjectTab[] }) {
  const { tab } = useSearch({ from: "/projects/$slug" });
  const navigate = useNavigate({ from: "/projects/$slug" });
  const listRef = useRef<HTMLDivElement>(null);
  const active = tabs.find((item) => item.id === tab) ?? tabs[0]!;

  function select(id: string, options: { focus?: boolean; scroll?: boolean } = {}) {
    void navigate({
      search: (previous) => ({ ...previous, tab: id === tabs[0]!.id ? undefined : id }),
      replace: true,
      resetScroll: false,
      viewTransition: false,
    });
    if (options.focus) listRef.current?.querySelector<HTMLElement>(`#tab-${id}`)?.focus();
    if (options.scroll) listRef.current?.scrollIntoView({ block: "start" });
  }

  function onKeyDown(event: KeyboardEvent) {
    const index = tabs.indexOf(active);
    const target = {
      ArrowRight: tabs[(index + 1) % tabs.length],
      ArrowLeft: tabs[(index - 1 + tabs.length) % tabs.length],
      Home: tabs[0],
      End: tabs.at(-1),
    }[event.key];
    if (!target) return;
    event.preventDefault();
    select(target.id, { focus: true });
  }

  return (
    <div className="case-tabs">
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        className="case-tabs__list"
        onKeyDown={onKeyDown}
      >
        {tabs.map((item) => {
          const selected = item.id === active.id;
          return (
            <button
              key={item.id}
              id={`tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              className="case-tabs__tab"
              onClick={() => select(item.id)}
            >
              <strong>{item.label}</strong>
              <span>{item.detail}</span>
            </button>
          );
        })}
      </div>

      {tabs.map((item, index) => {
        const next = tabs[index + 1];
        return (
          <div
            key={item.id}
            id={`panel-${item.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${item.id}`}
            hidden={item.id !== active.id}
            className="case-tabs__panel"
          >
            {item.content}
            {next ? (
              <button
                type="button"
                className="case-tabs__next"
                onClick={() => select(next.id, { scroll: true })}
              >
                <strong>Next up: {next.label}</strong>
                <span>{next.detail}</span>
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
