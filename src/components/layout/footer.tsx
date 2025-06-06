export function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="border-t border-border/40 bg-background/95">
      <div className="container py-6 text-center text-sm text-muted-foreground">
        <p>&copy; {currentYear} TCU TC-691 "Tropicalización de la Tecnología". Todos los derechos reservados.</p>
        <p>Universidad de Costa Rica</p>
      </div>
    </footer>
  );
}
