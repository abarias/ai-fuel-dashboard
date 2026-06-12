import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { exit } from "@tauri-apps/plugin-process";
import { useProviders } from "../store/useProviders";
import "./ContextMenu.css";

interface Props {
  x: number;
  y: number;
  onClose: () => void;
}

export default function ContextMenu({ x, y, onClose }: Props) {
  const { widgetState, setWidget } = useProviders();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = () => onClose();
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [onClose]);

  const action = (fn: () => void | Promise<void>) => (e: React.MouseEvent) => {
    e.stopPropagation();
    void fn();
    onClose();
  };

  const toggleAlwaysOnTop = async () => {
    const next = !widgetState.alwaysOnTop;
    await invoke("set_always_on_top", { value: next });
    setWidget({ alwaysOnTop: next });
  };

  return (
    <div
      ref={ref}
      className="cmenu"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <button onClick={action(() => setWidget({ activeView: "settings" }))}>
        ⚙ Settings
      </button>
      <button onClick={action(() => setWidget({ isExpanded: !widgetState.isExpanded }))}>
        {widgetState.isExpanded ? "▲ Compact Mode" : "▼ Expanded Mode"}
      </button>
      <button onClick={action(toggleAlwaysOnTop)}>
        {widgetState.alwaysOnTop ? "📌 Unpin Window" : "📌 Pin on Top"}
      </button>
      <button
        onClick={action(() =>
          setWidget({ opacity: widgetState.opacity > 0.6 ? 0.55 : 0.95 })
        )}
      >
        ◑ Toggle Transparency
      </button>
      <div className="cmenu__divider" />
      <button className="cmenu__danger" onClick={action(() => exit(0))}>
        ✕ Quit
      </button>
    </div>
  );
}
