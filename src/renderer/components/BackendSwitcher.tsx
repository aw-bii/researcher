import { memo } from "react";
import { useBackends } from "../hooks/useBackends";

interface Props {
  value: string;
  onChange: (id: string) => void;
  refreshTrigger?: number;
}

const AUTH_COMMANDS: Record<string, string> = {
  claude: "claude login",
  gemini: "gemini auth login",
  opencode: "opencode auth",
};

export const BackendSwitcher = memo(function BackendSwitcher({
  value,
  onChange,
  refreshTrigger = 0,
}: Props) {
  const { backends } = useBackends(refreshTrigger);
  const selected = backends.find((b) => b.id === value);
  const needsAuth = selected?.available && !selected?.authenticated;

  return (
    <div className="flex flex-col gap-0.5">
      <select
        className="text-xs px-2 py-1 rounded border border-border-strong bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {backends.map((b) => (
          <option key={b.id} value={b.id} disabled={!b.available}>
            {b.label}
            {!b.available
              ? " (not installed)"
              : !b.authenticated
                ? " (not auth)"
                : ""}
          </option>
        ))}
      </select>
      {needsAuth && (
        <span
          role="alert"
          className="text-xs text-amber-600 dark:text-amber-400"
        >
          Not signed in — run{" "}
          <code className="font-mono bg-bubble px-0.5 rounded">
            {AUTH_COMMANDS[value] ?? `${value} auth login`}
          </code>{" "}
          first
        </span>
      )}
    </div>
  );
});
