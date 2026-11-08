# JobLens — AI-assisted job posting checker

A responsive web app for reviewing potential warning signs in job advertisements. Built with HTML, CSS, and vanilla JavaScript, with a small Netlify serverless function for secure AI requests.

## Features

- Analyze pasted job text, a publicly accessible job listing URL, or a job-ad screenshot (any one is enough).
- AI-powered screenshot reading and warning-sign analysis using an existing multimodal model.
- Expandable findings with supporting evidence, a caution score (not a fraud probability), and practical verification steps.
- Animated responsive interface, sample job post, drag-and-drop image preview, copy report, and optional additional input fields.

## Deploy and enable AI on Netlify

1. Upload the **contents of this folder** to a public GitHub repository. Do not upload API keys or `.env` files.
2. In Netlify, choose **Add new project → Import an existing project** and connect the GitHub repository. This is recommended because the project includes a serverless function; a static drag-and-drop deploy may not deploy the function.
3. Set the publish directory to `.` and the functions directory to `netlify/functions` (already configured in `netlify.toml`). No build command is needed.
4. In **Site configuration → Environment variables**, add `OPENAI_API_KEY` with your own OpenAI API key. Optionally set `OPENAI_MODEL` to `gpt-4o-mini` (default). The API is billed separately from a ChatGPT subscription; ensure your API account has credits.
5. **Trigger a new deploy** after setting the environment variable. Open the deployed site and test all three inputs.
6. For local full-function testing, install the Netlify CLI and run `netlify dev` from the project folder. Opening `index.html` directly or using VS Code Live Server will show the UI but cannot execute the serverless AI function.

## How it works

- `index.html` — structure, accessible form, tabs, and results area.
- `style.css` — visual design, animation, mobile responsiveness.
- `script.js` — input selection, preview, validation, loading state, API call, and results rendering.
- `netlify/functions/analyze.js` — securely reads an allowed public webpage (where possible), sends text/image to an existing AI model, and returns structured findings.

## Limitations and responsible use

- LinkedIn, Facebook, login-only, JavaScript-rendered, and bot-protected pages may not be readable. If a link is inaccessible, the model receives only the URL; users should paste the job description or attach a screenshot.
- A screenshot is sent to the configured AI provider for processing. Do not upload sensitive identity documents or private information.
- AI can make mistakes. A low caution score is not proof of safety; a high score is not proof of fraud. JobLens does not independently verify company ownership or recruiter identities.
- This is a recruitment demonstration, not a hardened production service. A public deployment should eventually add rate limits, abuse protection, stronger network egress restrictions, and privacy controls. The URL fetcher blocks obvious private hosts and IP ranges but should not be treated as a complete SSRF defense.

## Walkthrough outline (3–5 minutes)

1. Problem: fake job ads can look genuine, and job seekers need understandable warning signs.
2. Demonstrate the text tab with the sample advertisement; open findings and verification steps.
3. Demonstrate image upload and URL input (use a publicly readable job page).
4. Explain how `script.js` sends inputs to the Netlify function, which calls an existing AI model without exposing the key.
5. Mention the limits of AI judgment and websites that block automatic reading.


## Deadline-ready fallback
If the Netlify AI function is unavailable, pasted text and URL patterns still produce an interactive, clearly labeled local rule-based report. A URL is **not fetched** in fallback mode. Image-only analysis needs the AI function and will show an honest message if unavailable. Do not claim OCR or AI works unless tested live.


## Photography
This version uses real editorial photographs served from Unsplash via `images.unsplash.com` in `index.html`. An internet connection is required for those photographs to display. They are not bundled in the ZIP. Photo credits: Unsplash. Check licensing/attribution requirements for your intended use.

## Interaction
The safety-tip carousel uses plain JavaScript (`showSafetyTip`) and has previous, next and dot controls.
