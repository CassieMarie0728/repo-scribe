import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import LegalDisclaimer from "@/components/LegalDisclaimer";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";

export default function Home() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const handleGetStarted = () => {
    if (user) {
      navigate("/generate");
    } else {
      window.location.href = getLoginUrl();
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-32 border-b border-border">
          <div className="container max-w-4xl mx-auto px-4">
            <div className="text-center space-y-6">
              {/* Main Headline */}
              <h1 className="text-5xl md:text-6xl font-light tracking-tight leading-tight">
                The Repository
                <br />
                <span className="text-accent font-normal">Scribe</span>
              </h1>

              {/* Typewriter Subtitle */}
              <div className="h-12 flex items-center justify-center">
                <p className="typewriter-text text-lg md:text-xl text-muted-foreground font-light">
                  Conjure legal & policy documents from your GitHub repository.
                </p>
              </div>

              {/* Description */}
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Instantly generate tailored legal documents—README, Privacy Policy, Terms of Service,
                Code of Conduct, and more—powered by AI. Perfect for open-source projects that need
                professional documentation without the legal overhead.
              </p>

              {/* CTA Button */}
              <div className="pt-4">
                <Button
                  onClick={handleGetStarted}
                  size="lg"
                  className="btn-vintage-primary text-base px-8 py-3"
                >
                  {user ? "Generate Document" : "Sign In to Get Started"}
                </Button>
              </div>

              {/* Features Grid */}
              <div className="pt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-left space-y-2">
                  <h3 className="text-sm font-semibold text-accent uppercase tracking-wider">
                    AI-Powered
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Advanced language models generate contextual, professional documents in seconds.
                  </p>
                </div>
                <div className="text-left space-y-2">
                  <h3 className="text-sm font-semibold text-accent uppercase tracking-wider">
                    Customizable
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Choose document type, tone, and length to match your project's unique needs.
                  </p>
                </div>
                <div className="text-left space-y-2">
                  <h3 className="text-sm font-semibold text-accent uppercase tracking-wider">
                    Reviewable
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Edit, download, and have a lawyer review before publishing. Always verify.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Legal Disclaimer Section */}
        <section className="py-12 bg-background/50">
          <div className="container max-w-3xl mx-auto px-4">
            <LegalDisclaimer />
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 md:py-20 border-b border-border">
          <div className="container max-w-3xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-light text-center mb-12">
              How It <span className="text-accent font-normal">Works</span>
            </h2>

            <div className="space-y-8">
              {[
                {
                  step: "01",
                  title: "Provide Your Repository",
                  description:
                    "Enter your public GitHub repository URL. We'll fetch your repo metadata, README, and package information.",
                },
                {
                  step: "02",
                  title: "Choose Your Document",
                  description:
                    "Select from LICENSE, README, Privacy Policy, Terms of Service, Code of Conduct, Contributing Guide, and more.",
                },
                {
                  step: "03",
                  title: "Customize Tone & Length",
                  description:
                    "Pick a tone (Formal, Professional, Friendly, Casual, Laid-back, or Deadpool-cool) and desired length.",
                },
                {
                  step: "04",
                  title: "Generate & Review",
                  description:
                    "AI generates a tailored document. Review, edit, download as .md or .txt, and have a lawyer verify.",
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-6">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-12 h-12 rounded-sm bg-accent text-accent-foreground font-semibold">
                      {item.step}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-20">
          <div className="container max-w-2xl mx-auto px-4 text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-light">
              Ready to Generate Your <span className="text-accent font-normal">Documents?</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Join developers worldwide who are using The Repo Scribe to create professional legal
              documentation in minutes, not weeks.
            </p>
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="btn-vintage-primary text-base px-8 py-3"
            >
              {user ? "Start Generating" : "Sign In Now"}
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
