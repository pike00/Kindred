import { EnvironmentChip } from "@/components/Common/EnvironmentChip"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t py-4 px-6 text-sm text-muted-foreground">
      <div className="flex items-center justify-center gap-3">
        <span>Kindred · {currentYear}</span>
        <a
          href={`https://github.com/pike00/Kindred/commit/${__APP_HASH__}`}
          target="_blank"
          rel="noopener noreferrer"
          title={`v${__APP_VERSION__} · ${__APP_HASH__}`}
          className="flex items-center gap-1.5 hover:underline"
        >
          <img
            src="/assets/github-mark.svg"
            alt="GitHub"
            width={14}
            height={14}
            className="opacity-60 dark:invert"
          />
          v{__APP_VERSION__} · {__APP_HASH__}
        </a>
        <EnvironmentChip />
      </div>
    </footer>
  )
}
