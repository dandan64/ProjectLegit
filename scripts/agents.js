function getAnalysisAgents(pageData) {
    const startText = pageData.excerptStart || "";
    const endText = pageData.excerptEnd || "";
    
    const longExcerpt = startText;
    const shortExcerpt = startText.slice(0, 600);
    const excerptEnd = endText || startText.slice(-500);
    
    const today = new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });

    const lang = currentLang === 'en' ? 'English' : 'Hebrew';
    
    return [
        {
            id: "source",
            name: TRANSLATIONS[currentLang].source,
            icon: "🏛️",
            priority: "high",
            weight: 0.20,
            useSearch: true,
            tokenBudget: 0,
            systemInstruction: `Act as an Information Scientist specializing in Media Ecology, Source Verification, and Institutional Bias. Your goal is to evaluate the credibility of the *organization* behind the domain provided using SIFT and Lateral Reading methods.

            Your Methodology: SIFT (Lateral Reading Focus)
1. Identify the Entity (Crucial): Do not just analyze the domain string; identify the parent company or organization.
2. Consult General Consensus: Check Wikipedia first for "Ownership," "Political Alignment," or "Controversies" sections.
3. Specialized Watchdogs: Cross-reference with "Media Bias/Fact Check" (MBFC), "Ad Fontes Media," "AllSides," or "The Seventh Eye" (for Israeli media).
4. Follow the Money: Explicitly look for the ownership structure—is it a conglomerate, a state-owned enterprise, a non-profit with specific donors, or a private equity asset?
            
            Decision Logic:
- Funding Transparency: If ownership is hidden or relies on "dark money" (undisclosed donors), downgrade the reliability rating.
- State vs. Public: Distinguish between *Public Broadcasters* (often independent, e.g., BBC) and *State-Controlled Media* (propaganda arm).
- Inference: If the specific domain is not listed in watchdogs, analyze the parent company (e.g., if "N12", analyze "Keshet Media Group").`,
            prompt:`Current Date: ${today}
            Page Domain: "${pageData.domain}".

Search Queries to Perform:
- "${pageData.domain} Wikipedia"
- "${pageData.domain} media bias fact check funding"
- "who owns ${pageData.domain} media group"
- "${pageData.domain} major donors shareholders"
- "${pageData.domain} political alignment controversy"

Your Task:
Determine and synthesize three distinct factors:
1. Factual Reliability: History of corrections, retractions, or failed fact-checks.
2. Political/Editorial Bias: The specific ideological lean (e.g., "Fiscal Conservative," "Progressive Left," "Pro-Government").
3. Financial Context: Who pays the bills? (e.g., "Ad-driven corporate," "State-funded," "Donor-supported").

**IMPORTANT**: Write the EXPLANATION part in ${lang}.

Rate as: HIGHLY_CREDIBLE, CREDIBLE, NEUTRAL, QUESTIONABLE, or UNRELIABLE
Format:
RATING: [your rating]
EXPLANATION: [Provide a forensic analysis (3-4 sentences MAX). Focus entirely on external reputation. Explicitly state what *other* sources say about this domain's history, funding transparency, and adherence to factual consensus. Use neutral,professional language. DO NOT make your explanation in bullet points.]`
        },
        {
            id: "author",
            name: TRANSLATIONS[currentLang].author,
            icon: "👤",
            priority: "medium",
            weight: 0.10,
            useSearch: true,
            tokenBudget: 0,
            prompt:`Act as an Investigative Journalist. Use Google Search to investigate the author of this text.
### INPUT DATA          
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
- SUSPICIOUS: Failed verification, no digital footprint, or known misinformation purveyor.

**IMPORTANT**: Write the explanation in ${lang}.

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
        tokenBudget: 0,
        isBackgroundAgent: true,  // Flag for background processing
        prompt:`Act as a Fact-Checking Researcher. Conduct a rigorous cross-verification of the following story presented by ${pageData.domain}, and provide a detailed, smooth, professional, and cohesive nanalysis with source citations.

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
- If the story is old but has NO corroboration, flag it as suspicious.

5. **CRITICAL** SOURCE INDEPENDENCE:
- Note that this data is from "${pageData.siteName}". DO NOT USE THE SOURCE TO "${pageData.siteName}" TO VERIFY ITS OWN CLAIMS.

OUTPUT REQUIREMENT:
1. You must output a JSON-like list of sources you found, followed by your analysis.
2. Do NOT use citation numbers like [1]. Use the full URL.

**IMPORTANT**: Write the analysis in ${lang}.

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
- SOURCE_NAME: [e.g. "bbc"]
- ARTICLE_TITLE: [The distinct title of the article]
DO NOT rely on internal citation tools.
- RELEVANT_QUOTE: [Quote an exact short sentence (approx. 10-15 words) from the source that proves the point. Do not use quotation marks.]

ANALYSIS:
[Write your 3-5 sentences analysis here. Do not worry about linking sources here, just summarize the consensus.]`
    },
        {
            id: "consensus-format",
            name: TRANSLATIONS[currentLang].consensus,
            icon: "🌐",
            priority: "high",
            weight: 0.25,  // This one counts toward final score
            useSearch: false,
            tokenBudget: 0,
            dependsOn: "consensus-verify",  // Receives input from first agent
            prompt:`You are a Citation Formatter.
I will give you a list of sources and an analysis text.
Your task is to append the sources to the text using a specific format.

INPUT DATA:
{INPUT_FROM_CONSENSUS_VERIFY}

INSTRUCTIONS:
1. Read the "ANALYSIS" text.
2. Read the "SOURCES_LIST".
3. Re-write the analysis. Whenever a specific point is made that is supported by a source in the list, insert the supporting citation immediately after it.
4. Use the "RELEVANT_QUOTE" field from the list to populate the quote section of the tag.
5. Add at MAX 2 citation per point, and DO NOT use the same source twice for the same point. 
6. If possible, DO NOT use the same source twice in the entire analysis.
7. Original source name: "${pageData.siteName}". **DO NOT USE SOURCES with an EXACT OR SIMILAR name to the original source name** (e.g., "ynet.co.il" is similar to "ynetnews.com").
8. DO NOT add links if there are no supporting/contradicting sources.

**##IMPORTANT## REQUIRED CITATION INSERTION FORMAT**:
For supporting: [[SOURCE::SOURCE_NAME::Article_Title::Quote::SOURCE]]
For contradicting: [[CONTRA::SOURCE_NAME::Article_Title::Quote::CONTRA]]

Final Output Structure:
RATING: [Keep the original rating]
EXPLANATION: [The original analysis with the formatted citations inserted]`
        },
        {
            id: "headline",
            name: TRANSLATIONS[currentLang].headline,
            icon: "📰",
            priority: "high",
            weight: 0.10,
            useSearch: false,
            tokenBudget: 0,
            prompt:`Act as a Skeptical Media Auditor specializing in linguistic manipulation. Your goal is to find the "Truth Gap" between a headline and its source text. You value precision over professional courtesy.
   
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

**IMPORTANT**: Write the explanation in ${lang}.

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
            tokenBudget: 0,
            systemInstruction: `You are a Media Bias Analyst. Analyze articles for bias.
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
        
        3. use google search to check if important perspectives are omitted.`,
            prompt:`Current Date: ${today}
            Text to analyze: "${longExcerpt}"
        
        CRITICAL OUTPUT RULES:
        - You MUST use EXACT quotes from the article as evidence.
        - Format quotes as: [[QUOTE::text from article::QUOTE]]
        - DO NOT translate the quotes - keep them in article's original language.
        - Use 1-5 specific quotes that are of the most significant bias.

        **IMPORTANT**: Write the explanation in ${lang}.
        
        Rate as: BALANCED, SLIGHT_BIAS, MODERATE_BIAS, or STRONG_BIAS
        
        FORMAT:
        RATING: [your rating]
        EXPLANATION: [Your analysis (1-3 sentences AT MAX)]. When citing evidence, use [[QUOTE::exact text::QUOTE]] format. Example: "The article shows political bias when stating [[QUOTE::the policy is a complete disaster::QUOTE]] without presenting alternative views."`
         },
        {
            id: "style",
            name: TRANSLATIONS[currentLang].style,
            icon: "✍️",
            priority: "low",
            weight: 0.10,
            useSearch: false,
            tokenBudget: 0,
            prompt:`Act as a Senior News Editor and Quality Analyst. 
Evaluate the journalistic standards and writing quality of the following text.
Current Date: ${today}
Text to Analyze: "${longExcerpt}"

YOUR ANALYSIS CRITERIA:
1. **Emotional Loading:** Does the text use neutral language, or does it rely on emotionally charged adjectives (e.g., "shocking," "horrible," "miraculous") to manipulate the reader?
2. **Attribution:** Are claims attributed to specific sources, or does it use "weasel words" (e.g., "Many say," "It is rumored")?
3. **Structure:** Does it follow the standard journalistic "Inverted Pyramid" (main facts first), or is it unstructured/rambling?
4. **Mechanics:** Are there glaring grammar issues, excessive capitalization, or non-standard punctuation (!!!)?

RATING SYSTEM:
- PROFESSIONAL: Neutral tone, clear attribution, excellent structure, no errors.
- ADEQUATE: Readable, mostly neutral, minor structural flaws.
- SENSATIONALIST: Highly emotional language, clickbait style, aggressive tone.
- POOR_QUALITY: Riddled with errors, incoherent, or clearly AI-generated spam.

Your Task:
Assign a RATING from the list above.
Then, write a concise EXPLANATION (max 3 sentences) citing exact specific examples from the text (e.g., "Uses loaded words like 'disastrous' without evidence" or "Lacks specific attribution for key claims").

**IMPORTANT**: Write the explanation in ${lang}.

Format:
RATING: [Rating]
EXPLANATION: [Your analysis] When citing evidence, use [[QUOTE::exact text::QUOTE]] format.`
         },
         {
            id: "summary",
            name: TRANSLATIONS[currentLang].summary,
            icon: "📋",
            priority: "high",
            weight: 0.00,
            useSearch: false,
            tokenBudget: 0,
            dependsOn: "all",  // Special flag: runs after ALL other agents complete
             prompt:`You are the Chief Legitimacy Analyst. Your role is to synthesize the technical findings from various analysis agents into a single, cohesive verdict for the human reader.
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

**IMPORTANT**: Write the explanation in ${lang}.

EXAMPLE OUTPUT:
"This article appears highly credible, citing multiple primary sources and maintaining a neutral viewpoint. However, the headline is slightly sensationalized compared to the actual body text. Readers can trust the core facts presented here."`
        }
    ];
}