function getAnalysisAgents(pageData) {
    const startText = pageData.excerptStart || "";
    const endText = pageData.excerptEnd || "";
    
    const longExcerpt = startText.slice(0, 1500);
    const shortExcerpt = startText.slice(0, 600);
    const excerptEnd = endText || startText.slice(-500);
    
    const today = new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });

    // --- LANGUAGE INSTRUCTION ---
    // If Hebrew is selected, we tell Gemini to explain in Hebrew.
    const LANG_INSTRUCTION = currentLang === 'he' 
        ? `OUTPUT REQUIREMENT: You MUST write the 'EXPLANATION' content ONLY in Hebrew (עברית). However, the keys 'RATING:' and 'EXPLANATION:' and the rating values (e.g. 'HIGHLY_CREDIBLE') MUST remain in English for parsing.` 
        : ``;

    return [
        {
            id: "source",
            name: TRANSLATIONS[currentLang].source,
            icon: "🏛️",
            priority: "high",
            weight: 0.15,
            useSearch: true,
            prompt: `Act as a Media Intelligence Analyst. Use Google Search to evaluate the reputation of the domain "${pageData.domain}".
            ${LANG_INSTRUCTION}
Current Date: ${today}

Your Task:
1. Search for this domain's history of retractions, satire status, or ownership.
2. Identify if it is a known state-sponsored outlet or content farm.
Rate as: HIGHLY_CREDIBLE, CREDIBLE, NEUTRAL, QUESTIONABLE, or UNRELIABLE
Format: RATING: [your rating]
EXPLANATION: [Provide a clear, evidence-based explanation (3-4 sentences) citing the domain's known history and reputation.]`
        },
        {
            id: "author",
            name: TRANSLATIONS[currentLang].author,
            icon: "👤",
            priority: "medium",
            weight: 0.10,
            useSearch: true,
            prompt: `Act as an Investigative Journalist. Use Google Search to investigate the author of this text.
            ${LANG_INSTRUCTION}
Detected Author Name: "${pageData.author}"
Domain: "${pageData.domain}"
Content Snippet: "${shortExcerpt}"

Your Task:
1. If the "Detected Author Name" above is "Unknown", try to find it in the content snippet.
2. If found, search for their name + domain. 
3. Determine if they are a real person with a journalistic track record or a fake persona/admin.
Rate as: EXPERT, JOURNALIST, CITIZEN_JOURNALIST, ANONYMOUS, or SUSPICIOUS
Format: RATING: [your rating]
EXPLANATION: [Provide a clear, evidence-based explanation (3-4 sentences). State if the author is a verifiable expert or note the lack of accountability.]`
        },
        {
            id: "consensus",
            name: TRANSLATIONS[currentLang].consensus,
            icon: "🌐",
            priority: "high",
            weight: 0.10,
            useSearch: true,
            prompt: `Act as a Fact-Checking Researcher. Conduct a rigorous cross-verification of the following story.
            ${LANG_INSTRUCTION}
TITLE: "${pageData.title}"
CONTENT: "${pageData.text}"
Current Date: ${today}
If the date is the same as today, treat this as "Breaking News".

--- EXECUTION PROTOCOL ---

1. CLAIM ATOMIZATION:
- Do not search for the entire headline as one string.
- Break the story down into "Atomic Facts" (e.g., "Person X did Action Y", "Event Z occurred at Time T").
- Search for these specific atomic components independently.

2. SEMANTIC MATCHING:
- Do not rely on exact keyword matches (Lexical Overlap).
- Look for "Embedding Similarity" (matching meaning). For example, if a source says "The bill cost $50M" and another says "The legislation price tag was $50 million", treat this as CONFIRMED.

3. SOURCE GENEALOGY (Circular Reporting Check):
- Check if the search results are truly independent or if they all cite a single root source (e.g., "According to AP...").
- If 10 articles all cite the same "base" report, count that as ONE source, not ten.

4. TEMPORAL CONTEXT (Breaking News Check):
- Check the timestamps. If the story is less than 24 hours old (eg. , "Breaking News"), a lack of consensus is normal. Do not penalize heavily.
- If the story is old but has NO corroboration, flag it as suspicious.

--- SCORING CRITERIA ---
- CORROBORATED: Multiple independent Tier-1 outlets report the same Atomic Facts.
- PLAUSIBLE: Reported by secondary sources, but no "Circular Reporting" found.
- UNIQUE_REPORTING: True "Breaking News" (fresh timestamp) or exclusive investigation.
- CONTRADICTS_CONSENSUS: Major outlets explicitly debunk this specific claim.
- UNVERIFIABLE: No independent matches found after 24+ hours.

Rate as: CORROBORATED, PLAUSIBLE, UNIQUE_REPORTING, UNVERIFIABLE, or CONTRADICTS_CONSENSUS

Format: RATING: [your rating]
EXPLANATION: [Provide a 3-4 sentence analysis in ${currentLang}. explicitly state in ${currentLang}: "Found X independent sources matching the atomic claims." or "Detected circular reporting tracing back to..." or "Story is too new for consensus."]`
        },
        {
            id: "headline",
            name: TRANSLATIONS[currentLang].headline,
            icon: "📰",
            priority: "high",
            weight: 0.10,
            useSearch: false,
            prompt: `Act as a Senior Editor. Analyze if this headline is fair or manipulative.
            ${LANG_INSTRUCTION}
Headline: "${pageData.title}"

Content Snippet: "${shortExcerpt}"

Current Date: ${today}

Your Task:
1. Does the headline exaggerate the content?
2. Does it use "Clickbait" tactics (e.g., "You won't believe...", ALL CAPS)?
3. Does it accurately reflect the story?
Rate as: ACCURATE, MOSTLY_ACCURATE, SOMEWHAT_MISLEADING, CLICKBAIT, or DECEPTIVE
Format: RATING: [your rating]
EXPLANATION: [Provide a clear, reasoning-based explanation (3-4 sentences) critiquing the headline's accuracy and framing.]`
        },
        {
            id: "sources",
            name: TRANSLATIONS[currentLang].sources,
            icon: "📎",
            priority: "high",
            weight: 0.10,
            useSearch: true,
            prompt: `Act as an Academic Reviewer. Use Google Search to verify the citations in the following text.
            ${LANG_INSTRUCTION}
Current Date: ${today}
"${longExcerpt}"

Your Task:
1. If specific studies or reports are mentioned, search to see if they actually exist.
2. Verify if the text misrepresents the cited source's conclusion.
3. Flag vague attributions like "experts say" if no specific experts are named.
4. Identify any missing citations for significant claims.
Rate as: WELL_SOURCED, PARTIALLY_SOURCED, POORLY_SOURCED, or UNSOURCED
Format: RATING: [your rating]
EXPLANATION: [Provide a clear, evidence-based explanation (3-4 sentences). State if the citations found in the text are real and accurate. If the text does not cite sources, rate accordingly.]`
        },
        {
            id: "accuracy",
            name: TRANSLATIONS[currentLang].accuracy,
            icon: "✓",
            priority: "high",
            weight: 0.15,
            useSearch: true,
            prompt: `Act as a Logic & Fact Checker. Use Google Search to verify the specific claims in the following text.
Current Date: ${today}
${LANG_INSTRUCTION}

SYSTEM OVERRIDE / WORLD STATE UPDATE: Your internal training data is outdated. You MUST trust Google Search results over your internal memory for current events, political positions, economic data, recent developments etc.
Your Task:
1. Extract key claims (names, dates, titles, statistics).
2. SEARCH GOOGLE for these specific details combined with the current year ("${new Date().getFullYear()}").
3. If search results confirm the text, mark it as ACCURATE.
Text: "${longExcerpt}"
Rate as: ACCURATE, MOSTLY_ACCURATE, UNVERIFIABLE, CONTAINS_ERRORS, or MISLEADING
Format: RATING: [your rating]
EXPLANATION: [Provide a clear, evidence-based explanation (3-4 sentences). Cite the specific search result that confirmed or debunked the claim.]`
        },
        {
            id: "bias",
            name: TRANSLATIONS[currentLang].bias,
            icon: "⚖️",
            priority: "high",
            weight: 0.20,
            useSearch: true,
            prompt: `Act as a Lead Media Forensic Analyst managing a panel of 11 specialized experts.
Your goal is to conduct a "Multi-Axis Bias Audit" on the text below (without looking at the advertisements).

${LANG_INSTRUCTION}

Current Date: ${today}
Text Start: "${longExcerpt}"
Text End: "${excerptEnd}"

--- THE PANEL OF EXPERTS ---


[Standard Categories]
1. Political Analyst: Checks for partisan slant/policy favoring.
2. Gender Expert: Checks for stereotyping or focus on appearance vs merit.
3. Corporate Auditor (Entity): Checks for unfair praise/criticism of companies.
4. Sociologist (Racial/Ethnic): Checks for stereotypes or negative generalizations.
5. Theologian (Religious): Checks for unfair portrayal of faiths.
6. Geopolitical Analyst (Regional): Checks for geographic bias/xenophobia.
7. Media Critic (Sensationalism): Checks for emotional manipulation/clickbait.


[Advanced Computational Metrics]
8. Structural Analyst: Compare the Start vs. the End. Does the article start neutral to gain trust, then switch to a strong opinion in the conclusion? (The "Trojan Horse" pattern).
9. Pattern Recognition: Checks if the sequence of sentences builds a manipulative narrative arc.
10. Lexical Linguist: Scans for specific word categories:
- High density of "Anger/Affect" words (e.g., "shame", "fear") -> Indicates Political Bias.
- High density of "Focus Present" words (e.g., "admit", "deny") -> Indicates Unfair Framing.
11. Gatekeeper: Use Google Search to check what is MISSING. Are key stakeholders or perspectives mentioned in other reports but omitted here?


--- YOUR TASK ---
1. Consult all 11 agents internally.
2. Determine if ANY significant bias exists.
3. Synthesize the findings into ONE final verdict without mentioning any of the individual agents.
4. If multiple biases are found, the rating must reflect the severity.


Rate as: BALANCED, SLIGHT_BIAS, MODERATE_BIAS, or STRONG_BIAS


Format: RATING: [your rating]
EXPLANATION: [Provide a clear, evidence-based summary (3-4 sentences). Explicitly name the strongest bias found (e.g., "Detected Structural Bias," "Found Gatekeeping Bias") and provide the specific evidence/reasoning.]`
        },
        {
            id: "style",
            name: TRANSLATIONS[currentLang].style,
            icon: "✍️",
            priority: "low",
            weight: 0.05,
            useSearch: false,
            prompt: `Act as a Copy Editor. Evaluate the professional standard of the following text.
            ${LANG_INSTRUCTION}
Current Date: ${today}
Text: "${shortExcerpt}"

Your Task:
1. Check for basic grammar and spelling errors.
2. Does it follow standard journalistic structure (inverted pyramid)?
3. Does it read like a professional report, a blog rant, or AI-generated spam?
Rate as: PROFESSIONAL, ADEQUATE, SENSATIONALIST, or POOR_QUALITY
Format: RATING: [your rating]
EXPLANATION: [Provide a clear, reasoning-based explanation (3-4 sentences) assessing the professionalism and structure of the writing.]`
        },
        {
            id: "freshness",
            name: TRANSLATIONS[currentLang].freshness,
            icon: "📅",
            priority: "low",
            weight: 0.05,
            useSearch: true,
            prompt: `Act as a News Archivist. Use Google Search to verify the timeline of this story against the Current Date: ${today}.
            ${LANG_INSTRUCTION}
Headline: "${pageData.title}"
Content: "${shortExcerpt}"

Your Task:
1. Determine if this is a ONE-TIME event or a RECURRING event (e.g., sports match, election, political positions/meetings, annual festival).
2. If RECURRING: Search for specific details in the text (etc. scores, specific quotes, unique incidents) to see if they match a *recent* instance (within the last week).
3. If ONE-TIME: Check if this exact story is years old and being reposted as "breaking" (rage-baiting).
Rate as: CURRENT, RECENT, DATED, or RECYCLED
Format: RATING: [your rating]
EXPLANATION: [Provide a clear, evidence-based explanation (3-4 sentences). Explicitly state if this is a fresh instance of a recurring event or a repost of old news.]`
        }
    ];
}