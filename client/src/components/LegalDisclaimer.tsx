import { AlertCircle } from "lucide-react";

export default function LegalDisclaimer() {
  return (
    <div className="disclaimer-banner flex items-start gap-3">
      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-sm mb-1">Legal Disclaimer</p>
        <p className="text-xs leading-relaxed">
          Generated documents are AI-drafted templates provided for informational purposes only.
          They are not a substitute for professional legal advice. Always have a qualified attorney
          review any legal document before use. The Repo Scribe assumes no liability for the use
          or misuse of generated content.
        </p>
      </div>
    </div>
  );
}
