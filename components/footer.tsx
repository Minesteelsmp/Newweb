import Link from 'next/link'
import { Zap, Instagram, Youtube } from 'lucide-react'

interface FooterProps {
  settings?: {
    discord_url?: string
    discord_invite?: string
    instagram_url?: string
    youtube_url?: string
    support_email?: string
    site_name?: string
  }
}

// Discord icon (inline SVG)
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.114 18.1.143 18.116a19.943 19.943 0 0 0 6.002 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
    </svg>
  )
}

export function Footer({ settings }: FooterProps) {
  const siteName = settings?.site_name || 'CubiqHost'
  const discord = settings?.discord_url || settings?.discord_invite || ''
  const instagram = settings?.instagram_url || ''
  const youtube = settings?.youtube_url || ''
  const email = settings?.support_email || ''

  return (
    <footer className="border-t border-border/50 bg-card/30">
      <div className="container mx-auto px-4 py-10">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 group w-fit">
              <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <span className="font-bold">{siteName}</span>
            </Link>
            <p className="text-sm text-muted-foreground mt-3 max-w-xs">
              Affordable, fast Minecraft hosting. Spin up your server in seconds.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Products</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/plans/server" className="hover:text-primary transition-colors">Server Plans</Link></li>
              <li><Link href="/worlds" className="hover:text-primary transition-colors">World Plans</Link></li>
              <li><Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link></li>
            </ul>
          </div>

          {/* Contact & Social */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Get in touch</h4>
            <div className="flex items-center gap-3 mb-3">
              {discord && (
                <a
                  href={discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Discord"
                  className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  <DiscordIcon className="w-4 h-4" />
                </a>
              )}
              {instagram && (
                <a
                  href={instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {youtube && (
                <a
                  href={youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  <Youtube className="w-4 h-4" />
                </a>
              )}
            </div>
            {email && (
              <a
                href={`mailto:${email}`}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {email}
              </a>
            )}
          </div>
        </div>

        <div className="border-t border-border/40 mt-8 pt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} {siteName}. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
