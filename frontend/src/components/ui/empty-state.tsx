import Link from "next/link";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  secondaryAction?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action, secondaryAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4 text-4xl text-white/20">{icon}</div>}
      <h3 className="text-lg font-medium text-white/60">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-white/40">{description}</p>
      )}
      <div className="mt-4 flex items-center gap-3">
        {action && (
          <Link
            href={action.href}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/90"
          >
            {action.label}
          </Link>
        )}
        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-white/60 transition-colors hover:border-white/20 hover:text-white"
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
}
