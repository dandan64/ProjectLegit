function getAnalysisAgents(pageData) {
    const startText = pageData.excerptStart || "";
    const endText = pageData.excerptEnd || "";
    
    const longExcerpt = startText;
    const shortExcerpt = startText.slice(0, 600);
    const excerptEnd = endText || startText.slice(-500);
    
    const today = new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });
    
    return [
        {
            id: "source",
            name: TRANSLATIONS[currentLang].source,
            icon: "🏛️",
            priority: "high",
            weight: 0.20,
            useSearch: true,
            prompt: `Act as an Information Scientist specializing in Media Ecology, Source Verification, and Institutional Bias. Your goal is to evaluate the credibility of the *organization* behind the domain "${pageData.domain}" using SIFT and Lateral Reading methods.
            
Current Date: ${today}
you need to answer in "${currentLang === 'en' ? 'English' : 'Hebrew'}" but keep the format as is

Your Methodology: SIFT (Lateral Reading Focus)
1. Identify the Entity (Crucial): Do not just analyze the domain string; identify the parent company or organization.
2. Consult General Consensus: Check Wikipedia first for "Ownership," "Political Alignment," or "Controversies" sections.
3. Specialized Watchdogs: Cross-reference with "Media Bias/Fact Check" (MBFC), "Ad Fontes Media," "AllSides," or "The Seventh Eye" (for Israeli media).
4. Follow the Money: Explicitly look for the ownership structure—is it a conglomerate, a state-owned enterprise, a non-profit with specific donors, or a private equity asset?

Search Queries to Perform:
- "${pageData.domain} Wikipedia"
- "${pageData.domain} media bias fact check funding"
- "who owns ${pageData.domain} media group"
- "${pageData.domain} major donors shareholders"
- "${pageData.domain} political alignment controversy"

Decision Logic:
- Funding Transparency: If ownership is hidden or relies on "dark money" (undisclosed donors), downgrade the reliability rating.
- State vs. Public: Distinguish between *Public Broadcasters* (often independent, e.g., BBC) and *State-Controlled Media* (propaganda arm).
- Inference: If the specific domain is not listed in watchdogs, analyze the parent company (e.g., if "N12", analyze "Keshet Media Group").

Your Task:
Determine three distinct factors:
1. Factual Reliability: History of corrections, retractions, or failed fact-checks.
2. Political/Editorial Bias: The specific ideological lean (e.g., "Fiscal Conservative," "Progressive Left," "Pro-Government").
3. Financial Context: Who pays the bills? (e.g., "Ad-driven corporate," "State-funded," "Donor-supported").

Rate as: HIGHLY_CREDIBLE, CREDIBLE, NEUTRAL, QUESTIONABLE, or UNRELIABLE
Format:
RATING: [your rating]
EXPLANATION: [Provide a forensic analysis (3-4 sentences). Focus entirely on external reputation. Explicitly state what *other* sources say about this domain's history, funding transparency, and adherence to factual consensus. Use neutral, professional language.]` 
        },
        {
            id: "author",
            name: TRANSLATIONS[currentLang].author,
            icon: "👤",
            priority: "medium",
            weight: 0.10,
            useSearch: true,
            prompt: `Act as an Investigative Journalist. Use Google Search to investigate the author of this text.
### INPUT DATA          
you need to answer in "${currentLang === 'en' ? 'English' : 'Hebrew'}" but keep the format as is
Detected Author Name: "${pageData.author}"
Domain: "${pageData.domain}"
Content Snippet: "${shortExcerpt}"


### INVESTIGATIVE PROTOCOL (Internal Reasoning)
1. **Extraction**: If Author is "Unknown", scan the Excerpt for "By [Name]" or "Written by". 
2. **Verification**: Search for the exact name + the host domain. Check for a dedicated author profile page.
3. **External Footprint**: Cross-reference the name with Muck Rack, LinkedIn, or Twitter to verify they are a real person and not an AI-generated persona.
4. **Constraint**: Do not guess. If no information exists outside the current domain, rate as ANONYMOUS or SUSPICIOUS based on the site's reputation.

### RATING SCALE
- EXPERT: Recognized authority/specialist with advanced credentials.
- JOURNALIST: Verifiable staff or freelance writer for established news outlets.
- CITIZEN_JOURNALIST: Independent contributor or blogger with a traceable history.
- ANONYMOUS: No specific author found; content attributed to "Staff" or "Admin."
- SUSPICIOUS: Failed verification, no digital footprint, or known misinformation purveyor

### FINAL FORMAT
RATING: [INSERT RATING]
EXPLANATION: [Identify the author's primary role. Mention one specific platform where they are verified (e.g., Muck Rack, LinkedIn, or official staff page). Conclude with a statement on their overall accountability.]` 
        },
    {
        id: "consensus-verify",
        name: TRANSLATIONS[currentLang].consensus,
        icon: "🌐",
        priority: "high",
        weight: 0,  // Background agent - no weight in final score
        useSearch: true,
        isBackgroundAgent: true,  // Flag for background processing
        prompt:  `Act as a Fact-Checking Researcher. Conduct a rigorous cross-verification of the following story presented by ${pageData.siteName}, and provide a detailed analysis with source citations.

you need to answer in "${currentLang === 'en' ? 'English' : 'Hebrew'}" but keep the format as is
TITLE: "${pageData.title}"
CONTENT: "${longExcerpt}"
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
- If the story is old but has NO corroboration, flag it as suspicious.4

5. SOURCE INDEPENDENCE:
- Note that this data is from "${pageData.siteName}". Do not use the source itself to verify its own claims.

OUTPUT REQUIREMENT:
You must output a JSON-like list of sources you found, followed by your analysis.
Do NOT use citation numbers like [1]. Use the full URL.

--- SCORING CRITERIA ---
- CORROBORATED: Multiple independent Tier-1 outlets report the same Atomic Facts.
- PLAUSIBLE: Reported by secondary sources, but no "Circular Reporting" found.
- UNIQUE_REPORTING: True "Breaking News" (fresh timestamp) or exclusive investigation.
- CONTRADICTS_CONSENSUS: Major outlets explicitly debunk this specific claim.
- UNVERIFIABLE: No independent matches found after 24+ hours.

Rate as: CORROBORATED, PLAUSIBLE, UNIQUE_REPORTING, UNVERIFIABLE, or CONTRADICTS_CONSENSUS

Format:
RATING: [your rating]
SOURCES_LIST:
- STATUS: [SUPPORTING/CONTRADICTING]
- SOURCE_NAME: [e.g. BBC]
- URL: [The actual link found in search] 
- RELEVANT_QUOTE: [Quote an exact short sentence (approx. 10-15 words) from the source that proves the point. Do not use quotation marks.]

ANALYSIS:
[Write your 3-4 sentence analysis here. Do not worry about linking sources here, just summarize the consensus.]
`
    },
        {
            id: "consensus-format",
            name: TRANSLATIONS[currentLang].consensus,
            icon: "🌐",
            priority: "high",
            weight: 0.25,  // This one counts toward final score
            useSearch: false,
            dependsOn: "consensus-verify",  // Receives input from first agent
            prompt: `You are a Citation Formatter.
I will give you a list of sources and an analysis text.
Your task is to append the sources to the text using a specific format.
you need to answer in "${currentLang === 'en' ? 'English' : 'Hebrew'}" but keep the format as is

INPUT DATA:
{INPUT_FROM_CONSENSUS_VERIFY}

INSTRUCTIONS:
1. Read the "ANALYSIS" text.
2. Read the "SOURCES_LIST".
3. Re-write the analysis. Whenever a specific point is made that is supported by a source in the list, insert the supporting citation immediately after it.
4. Use the "RELEVANT_QUOTE" field from the list to populate the quote section of the tag.
5. Add at MAX 2 citation per point, and DO NOT use the same source twice for the same point. 
6. If possible, DO NOT use the same source twice in the entire analysis.
7. DO NOT use sources in SOURCES_LIST with a similar name to the original source name (e.g., "ynet.co.il" is similar to "ynetnews.com"). Original source name: ${pageData.domain}.

REQUIRED CITATION INSERTION FORMAT:
For supporting: [[SOURCE::Name::URL::Quote::SOURCE]]
For contradicting: [[CONTRA::Name::URL::Quote::CONTRA]]

Final Output Structure:
RATING: [Keep the original rating]
EXPLANATION: [The text with the formatted citations inserted]`
        },
        {
            id: "headline",
            name: TRANSLATIONS[currentLang].headline,
            icon: "📰",
            priority: "high",
            weight: 0.10,
            useSearch: false,
            prompt: `Act as a Skeptical Media Auditor specializing in linguistic manipulation. Your goal is to find the "Truth Gap" between a headline and its source text. You value precision over professional courtesy.

you need to answer in "${currentLang === 'en' ? 'English' : 'Hebrew'}" but keep the format as is   
###CONTEXT:
Headline: "${pageData.title}"
Content Snippet: "${longExcerpt}"
Current Date: ${today}


### THE AUDIT LOGIC
1. **The Shorthand Test**: A headline is only "Accurate Shorthand" if it captures the *primary consequence* of the story. If it skips the main event to focus on a side-detail, it is SOMEWHAT_MISLEADING.
2. **The Omission Test**: Does the headline withhold the "Who" or "What" to force a click? (e.g., "This happened...") If yes, it is CLICKBAIT.
3. **The Distortion Test**: Does the headline use high-valence emotional words (Terror, Chaos, Miracle) that aren't justified by the data? If yes, it is SENSATIONAL.

### RATING SCALE
- ACCURATE: A neutral, factual summary of the core event.
- SENSATIONAL: Factual, but uses "loud" or emotional language to provoke the reader.
- SOMEWHAT_MISLEADING: Technically true but framed to suggest a false conclusion or focus on a minor point.
- CLICKBAIT: Uses a curiosity gap or "mystery" framing to harvest clicks.
- DECEPTIVE: Directly contradicts or invents claims not found in the snippet.

### OUTPUT FORMAT
RATING: [RATING]
EXPLANATION: [Sentence 1: The cold, hard relationship between title and text. Sentence 2: Identify the specific linguistic tactic or framing error. Sentence 3: A direct warning or confirmation for the user.]`
        },
        {
            id: "bias",
            name: TRANSLATIONS[currentLang].bias,
            icon: "⚖️",
            priority: "high",
            weight: 0.25,
            useSearch: true,
            prompt: 
            `You are a Media Bias Analyst. Analyze the following article for bias.
        you need to answer in "${currentLang === 'en' ? 'English' : 'Hebrew'}" but keep the format as is
        Current Date: ${today}
        Text: "${longExcerpt}"
        
        YOUR TASK:
        1. Check for these bias types:
           - Political bias (partisan language, one-sided arguments)
           - Gender bias (stereotyping, focus on appearance over merit)
           - Corporate bias (unfair praise/criticism of companies)
           - Racial/ethnic bias (stereotypes, generalizations)
           - Religious bias (unfair portrayal of faiths)
           - Geographic bias (xenophobia, regional stereotyping)
           - Sensationalism (emotional manipulation, clickbait language)
        
        2. Look for structural bias:
           - Does the article start neutral but become opinionated at the end?
           - Are key stakeholders or perspectives missing?
           - Is there high density of emotional/loaded words?
        
        3. use google search to check if important perspectives are omitted.
        
        CRITICAL OUTPUT RULES:
        - You MUST use EXACT quotes from the article as evidence.
        - Format quotes as: [[QUOTE::text from article::QUOTE]]
        - Keep quotes under 15 words.
        - DO NOT translate the quotes - keep them in article's original language.
        - Use 1-5 specific quotes that are of the most significant bias.
        
        Rate as: BALANCED, SLIGHT_BIAS, MODERATE_BIAS, or STRONG_BIAS
        
        FORMAT:
        RATING: [your rating]
        EXPLANATION: Your analysis (3-5 sentences). When citing evidence, use [[QUOTE::exact text::QUOTE]] format. Example: "The article shows political bias when stating [[QUOTE::the policy is a complete disaster::QUOTE]] without presenting alternative views."` 
         },
        {
            id: "style",
            name: TRANSLATIONS[currentLang].style,
            icon: "✍️",
            priority: "low",
            weight: 0.10,
            useSearch: false,
            prompt: `Act as a Senior News Editor and Quality Analyst. 
Evaluate the journalistic standards and writing quality of the following text.
 you need to answer in "${currentLang === 'en' ? 'English' : 'Hebrew'}" but keep the format as is
Current Date: ${today}
Text to Analyze: "${longExcerpt}"

YOUR ANALYSIS CRITERIA:
1. **Emotional Loading:** Does the text use neutral language, or does it rely on emotionally charged adjectives (e.g., "shocking," "horrible," "miraculous") to manipulate the reader?
2. **Attribution:** Are claims attributed to specific sources, or does it use "weasel words" (e.g., "Many say," "It is rumored")?
3. **Structure:** Does it follow the standard journalistic "Inverted Pyramid" (main facts first), or is it unstructured/rambling?
4. **Mechanics:** Are there glaring grammar issues, excessive capitalization, or non-standard punctuation (!!!)?

RATING SYSTEM:
- **PROFESSIONAL:** Neutral tone, clear attribution, excellent structure, no errors.
- **ADEQUATE:** Readable, mostly neutral, minor structural flaws.
- **SENSATIONALIST:** Highly emotional language, clickbait style, aggressive tone.
- **POOR_QUALITY:** Riddled with errors, incoherent, or clearly AI-generated spam.

Your Task:
Assign a RATING from the list above.
Then, write a concise EXPLANATION (max 3 sentences) citing specific examples from the text (e.g., "Uses loaded words like 'disastrous' without evidence" or "Lacks specific attribution for key claims").

Format:
RATING: [Rating]
EXPLANATION: [Your analysis] When citing evidence, use [[QUOTE::exact text::QUOTE]] format.
` 
         },
         {
            id: "summary",
            name: TRANSLATIONS[currentLang].summary,
            icon: "📋",
            priority: "high",
            weight: 0.00,
            useSearch: false,
            dependsOn: "all",  // Special flag: runs after ALL other agents complete
             prompt: `You are the Chief Legitimacy Analyst. Your role is to synthesize the technical findings from various analysis agents into a single, cohesive verdict for the human reader.
 you need to answer in "${currentLang === 'en' ? 'English' : 'Hebrew'}" but keep the format as is
INPUT DATA (Agent | Rating | findings):
{INPUT_FROM_ALL_AGENTS}

ANALYSIS GUIDELINES:
1. **Focus on the Content, Not the Agents:** Do not use phrases like "The Source Agent says..." or "The Bias Agent found...". Instead, state the reality directly: "The article relies on credible sources..." or "The language is heavily biased...".
2. **Prioritize Evidence:** "Source Credibility" and "Factual Accuracy" are more important than "Tone". A clickbait headline on a factually accurate story is a minor issue; a fake story with a neutral tone is a major issue.
3. **Detect Patterns:** If multiple agents flag "Fearmongering" and "No Sources," combine them into a single insight about "unverified emotional manipulation."

OUTPUT RULES:
- **Format:** A single, smooth paragraph (2-4 sentences).
- **Structure:** Start with the "Bottom Line" (Is it trustworthy?). Follow with the *primary reason* why. End with any necessary nuance or warnings.
- **Tone:** Professional, objective, and decisive.
- **Conflict Resolution:** If agents disagree (e.g., Safe Source vs. Biased Text), acknowledge the nuance (e.g., "While the publisher is reputable, this specific article uses highly charged language...").

EXAMPLE OUTPUT:
"This article appears highly credible, citing multiple primary sources and maintaining a neutral viewpoint. However, the headline is slightly sensationalized compared to the actual body text. Readers can trust the core facts presented here."`
        }
    ];
}