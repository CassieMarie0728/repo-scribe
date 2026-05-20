import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Scroll } from "lucide-react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";

export default function Header() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="container flex items-center justify-between py-4">
        {/* Logo and Title */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <Scroll className="w-6 h-6 text-accent" strokeWidth={1.5} />
          <div className="flex flex-col items-start">
            <span className="text-xs font-semibold tracking-widest text-accent uppercase">
              Repo · Scribe
            </span>
            <span className="text-sm font-light text-foreground">
              Legal Document Generator
            </span>
          </div>
        </button>

        {/* Navigation */}
        <nav className="flex items-center gap-6">
          {user ? (
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/generate")}
                className="text-xs text-foreground hover:text-accent transition-colors"
              >
                Generate
              </button>
              <button
                onClick={() => navigate("/history")}
                className="text-xs text-foreground hover:text-accent transition-colors"
              >
                History
              </button>
              <button
                onClick={() => navigate("/settings")}
                className="text-xs text-foreground hover:text-accent transition-colors"
              >
                Settings
              </button>
              <span className="text-xs text-muted-foreground">{user.name}</span>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Logout
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => (window.location.href = getLoginUrl())}
              size="sm"
              className="text-xs"
            >
              Sign In
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
