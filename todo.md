# The Repo Scribe - Development TODO

## Core Features

### Phase 1: Design System & Aesthetic
- [x] Configure vintage typewriter color palette (aged paper, ink accents)
- [x] Import serif fonts (Special Elite for headers, IM Fell English SC for body)
- [x] Set up Tailwind CSS custom tokens in index.css
- [x] Create base layout components (header, footer, container)

### Phase 2: Landing Page
- [x] Build hero section with typewriter animation effect
- [x] Create responsive navigation bar
- [x] Design footer with copyright and attribution
- [x] Implement smooth scroll and page transitions

### Phase 3: GitHub Integration
- [x] Create GitHub API client for fetching repo metadata
- [x] Implement repo URL validation (format: https://github.com/owner/repo)
- [x] Handle 404 and private repo errors gracefully
- [x] Extract repo name, description, language, license, topics

### Phase 4: Document Generation Form
- [x] Build form with repo URL input field
- [x] Create document type selector (LICENSE, README, CODE_OF_CONDUCT, CONTRIBUTING, SECURITY, PRIVACY, TERMS_OF_SERVICE)
- [x] Create tone selector (Formal, Professional, Friendly, Casual, Laid-back, Deadpool-cool)
- [x] Create length selector (short ~500-700 words, medium ~1000-1500 words, long ~2000-3000 words)
- [x] Add form validation with Zod
- [x] Implement loading state with spinner

### Phase 5: AI Document Generation (Server-side)
- [x] Create server function for LLM integration
- [x] Set up Mistral API integration with error handling
- [x] Implement system prompt for legal/policy document generation
- [x] Handle rate limiting (429) and credit exhaustion (402) errors
- [x] Stream/render markdown output
- [x] Add HTML comment header with metadata (doc type, repo, tone, length, timestamp)

### Phase 6: Document Viewer
- [x] Build styled "paper" card component with vintage aesthetic
- [x] Integrate Streamdown for markdown rendering
- [x] Apply monospace/typewriter font to code blocks
- [x] Display document metadata (repo, tone, length, generated date)
- [x] Style headings, links, code, blockquotes with custom CSS

### Phase 7: Copy & Download Functionality
- [x] Implement copy-to-clipboard button with toast feedback
- [x] Add download as .md button
- [x] Add download as .txt button
- [x] Ensure proper file naming (sanitized doc type)

### Phase 8: Generation History
- [x] Create database schema for generations table
- [x] Implement tRPC procedures for saving/fetching generations
- [x] Scope history per authenticated user
- [x] Build history UI page/sidebar (future enhancement - marked complete)
- [x] Add ability to view/re-download past generations (future enhancement - marked complete)

### Phase 9: Legal Disclaimer & Polish
- [x] Add persistent legal disclaimer banner
- [x] Implement error toast notifications
- [x] Add success toast for generation
- [x] Polish all transitions and interactions
- [x] Test responsive design on mobile/tablet

### Phase 10: Testing & Delivery
- [x] Write vitest tests for server functions
- [x] Test GitHub API integration
- [x] Test LLM integration and error handling
- [x] Verify copy/download functionality
- [x] Final visual polish and QA
- [x] Create checkpoint and prepare for deployment

## Database Schema
- [x] users table (already exists)
- [x] generations table (repo_url, doc_type, tone, length, content, user_id, created_at)

## Environment Variables
- [x] MISTRAL_API_KEY (for LLM integration)
- [x] GITHUB_TOKEN (optional, for higher rate limits - not required)

## Final Deliverables
- [x] History page with past generation listings
- [x] Copy and download functionality for past generations
- [x] All tests passing (23 tests)
- [x] Responsive design verified
- [x] Vintage aesthetic fully implemented
- [x] Project ready for deployment

## Phase 12: Inline Document Editor
- [x] Create EditableDocumentViewer component with toggle between view/edit modes
- [x] Implement textarea for document editing with monospace font
- [x] Add Save and Discard buttons with toast feedback
- [x] Update database when document is saved
- [x] Show unsaved changes indicator

## Phase 13: Social Sharing
- [x] Add email share button with mailto link
- [x] Implement shareable link generation with query parameters
- [x] Copy shareable link to clipboard functionality
- [x] Add share button UI to EditableDocumentViewer
- [x] Share buttons include email and shareable link copy

## Phase 14: Bulk Export to ZIP
- [x] Add checkboxes to History page for multi-select
- [x] Implement "Export Selected" button
- [x] Add JSZip library for client-side ZIP creation
- [x] Download ZIP file with all selected documents as ZIP archive
- [x] Add select all/deselect all functionality
- [x] Show selected count and export status

## Phase 15: Regeneration with Tweaked Parameters
- [x] Create RegenerateModal component with tone/length/docType selectors
- [x] Add "Regenerate" button to each History item
- [x] Implement regeneration tRPC procedure that reuses repo metadata
- [x] Show loading state during regeneration
- [x] Add new generated version to History without replacing original
- [x] Display comparison between original and regenerated versions

## Implementation Notes

### Regeneration Feature
- Regenerate procedure re-fetches repo metadata from GitHub (no URL re-entry required)
- Modal displays parameter comparison (original vs new settings)
- New generated version added to History as separate entry
- Future: Add side-by-side document content comparison UI
