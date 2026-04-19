export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t py-4 px-6 text-center text-sm text-muted-foreground">
      Kindred · {currentYear}
    </footer>
  )
}
