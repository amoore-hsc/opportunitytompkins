

## Plan: Add Employer Filter + AI Job Categories

### What we're building
1. **Employer filter dropdown** on the Employment page — lets users filter by specific employer (Cornell University, City of Ithaca, etc.)
2. **AI-powered job category classification** — a new `job_category` column that the scraper populates automatically using AI, plus a category filter on the frontend

### Database changes
- Add `job_category` column (text, nullable) to `employment_opportunities` table
- Categories: Education, Healthcare, Hospitality, Government, Technology, Trades/Labor, Administrative, Social Services, Other

### Backend changes (scrape-jobs edge function)
- After scraping jobs, call Lovable AI (gemini-2.5-flash-lite) to classify each job into a category based on job title + employer
- Store the result in `job_category`
- Use batch classification (send multiple jobs in one prompt) to minimize API calls

### Frontend changes (Employment.tsx)
- Add employer filter dropdown (dynamic, based on available employers)
- Add job category filter dropdown (dynamic, based on available categories)
- Display the category as a badge on each job card
- Update filtering logic to support both new filters

### One-time backfill
- Create and run a script via Lovable AI to classify all existing ~150 jobs and update their `job_category`

### Technical details
- Model: `google/gemini-2.5-flash-lite` (cheapest, sufficient for simple classification)
- Prompt: classify job title + employer into one of the predefined categories
- The scraper will batch classify all new jobs from each source in a single AI call using tool calling for structured output
- Employer filter shows employers with 2+ jobs to keep the dropdown manageable

