import { useTranslation } from "react-i18next";

export function SearchFooter() {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between border-t px-3 py-2 text-[11px] text-muted-foreground">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <kbd className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded border bg-muted px-1 font-mono text-[10px]">↑</kbd>
          <kbd className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded border bg-muted px-1 font-mono text-[10px]">↓</kbd>
          {t("searchDialog.toNavigate", "navigate")}
        </span>
        <span className="flex items-center gap-1">
          <kbd className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded border bg-muted px-1 font-mono text-[10px]">↵</kbd>
          {t("searchDialog.toSelect", "select")}
        </span>
        <span className="flex items-center gap-1">
          <kbd className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded border bg-muted px-1 font-mono text-[10px]">esc</kbd>
          {t("searchDialog.toClose", "close")}
        </span>
      </div>
    </div>
  );
}
