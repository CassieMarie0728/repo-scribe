export default function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-background">
      <div className="container py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          {/* Left: Branding */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-accent uppercase tracking-wider">
              The Repo Scribe
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              AI-powered legal and policy document generator for public GitHub repositories.
              Crafted with precision. Reviewed by humans.
            </p>
          </div>

          {/* Right: Copyright */}
          <div className="text-xs text-muted-foreground text-right">
            <p className="mb-2">
              © 2026 The Repo Scribe. All rights reserved.
            </p>
            <p className="italic text-xs leading-relaxed">
              Generated documents are AI-drafted templates. Always consult a qualified attorney
              before using any legal document.
            </p>
          </div>
        </div>

        {/* Bottom divider and note */}
        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Built with vintage typewriter aesthetics and modern AI. No legal liability assumed.
          </p>
        </div>
      </div>
    </footer>
  );
}
