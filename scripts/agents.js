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
            prompt: currentLang === 'en' ? `Act as an Information Scientist specializing in Media Ecology, Source Verification, and Institutional Bias. Your goal is to evaluate the credibility of the *organization* behind the domain "${pageData.domain}" using SIFT and Lateral Reading methods.
            
Current Date: ${today}

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
EXPLANATION: [Provide a forensic analysis (3-4 sentences). Focus entirely on external reputation. Explicitly state what *other* sources say about this domain's history, funding transparency, and adherence to factual consensus. Use neutral, professional language.]` :

`פעל כמדען מידע המתמחה באקולוגיית מדיה, אימות מקורות והטיה מוסדית. המטרה שלך היא להעריך את האמינות של הארגון שמאחורי הדומיין "${pageData.domain}" באמצעות שיטות SIFT וקריאה רוחבית.
תאריך נוכחי: ${today}
שיטת העבודה שלך: SIFT (מיקוד בקריאה רוחבית)
1. זיהוי הישות (קריטי): אל תנתח רק את מחרוזת הדומיין; זהה את החברה או הארגון האם.
2. התייעצות עם קונצנזוס כללי: בדוק תחילה בוויקיפדיה עבור סעיפי "בעלות," "הטיה פוליטית," או "מחלוקות."
3. שומרי ראש מתמחים: השווה עם "Media Bias/Fact Check" (MBFC), "Ad Fontes Media," "AllSides," או "The Seventh Eye" (למדיה ישראלית).
4. עקוב אחרי הכסף: חפש במפורש את מבנה הבעלות—האם זו קונגלומרט, יישות בבעלות המדינה, ארגון ללא מטרות רווח עם תורמים ספציפיים, או נכס של הון פרטי?
 חיפושים לביצוע:
- "${pageData.domain} ויקיפדיה"
- "${pageData.domain} media bias fact check funding"
- "מי הבעלים של ${pageData.domain} media group"
- "${pageData.domain} תורמים עיקריים בעלי מניות"
- "${pageData.domain} הטיה פוליטית מחלוקת"
לוגיקת החלטה:
- שקיפות מימון: אם הבעלות מוסתרת או מסתמכת על "כסף אפל" (תורמים לא מדווחים), הורד את דירוג האמינות.
- מדינה מול ציבור: הבחין בין *שדרנים ציבוריים* (לעיתים קרובות עצמאיים, למשל, BBC) ו*מדיה בשליטת המדינה* (זרוע תעמולה).
- הסקה: אם הדומיין הספציפי אינו מופיע בשומרי הראש, נתח את חברת האם (למשל, אם "N12", נתח את "קשת מדיה גרופ").
המשימה שלך:
קבע שלושה גורמים מובחנים:
1. אמינות עובדתית: היסטוריה של תיקונים, הסרות או בדיקות עובדות שנכשלו.
2. הטיה פוליטית/עיתונאית: הנטייה האידיאולוגית הספציפית (למשל, "שמרני כלכלי," "שמאל פרוגרסיבי," "תומך ממשלתי").
3. הקשר פיננסי: מי משלם את החשבונות? (למשל, "מונע פרסומות תאגידיות," "ממומן על ידי המדינה," "נתמך על ידי תורמים").
דרג כ: HIGHLY_CREDIBLE, CREDIBLE, NEUTRAL, QUESTIONABLE, או UNRELIABLE
FORMAT:
RATING: [הדירוג שלך]
EXPLANATION: [ספק ניתוח פורנזי (3-4 משפטים). התרכז במוניטין חיצוני בלבד. ציין במפורש מה *מקורות אחרים* אומרים על ההיסטוריה של הדומיין הזה, שקיפות המימון, והציות לקונצנזוס העובדתי. השתמש בשפה ניטרלית ומקצועית.]`
        },
        {
            id: "author",
            name: TRANSLATIONS[currentLang].author,
            icon: "👤",
            priority: "medium",
            weight: 0.10,
            useSearch: true,
            prompt: currentLang === 'en' ? `Act as an Investigative Journalist. Use Google Search to investigate the author of this text.
            
Detected Author Name: "${pageData.author}"
Domain: "${pageData.domain}"
Content Snippet: "${shortExcerpt}"

Your Task:
1. If the "Detected Author Name" above is "Unknown", try to find it in the content snippet.
2. If found, search for their name + domain. 
3. Determine if they are a real person with a journalistic track record or a fake persona/admin.
Rate as: EXPERT, JOURNALIST, CITIZEN_JOURNALIST, ANONYMOUS, or SUSPICIOUS
Format: RATING: [your rating]
EXPLANATION: [Provide a clear, evidence-based explanation (3-4 sentences). State if the author is a verifiable expert or note the lack of accountability.]` : 

`פעל כעיתונאי חוקר. חפש בגוגל על מנת לחקור את מחבר הטקסט הזה.
שם המחבר שזוהה: "${pageData.author}"
דומיין: "${pageData.domain}"
קטע תוכן: "${shortExcerpt}"
המשימה שלך:
1. אם "שם המחבר שזוהה" למעלה הוא "Unknown", נסה למצוא אותו בקטע התוכן.
2. אם נמצא, חפש את שמו + הדומיין.
3. קבע אם הוא אדם אמיתי עם רקורד עיתונאי או פרסונה מזויפת/מנהל.
דרג כ: EXPERT, JOURNALIST, CITIZEN_JOURNALIST, ANONYMOUS, או SUSPICIOUS
FORMAT:
RATING: [הדירוג שלך]
EXPLANATION: [ספק הסבר ברור ומבוסס ראיות בעברית (3-4 משפטים). ציין אם המחבר הוא מומחה שניתן לאמת או ציין את חוסר האחריות.]`
        },
    {
        id: "consensus-verify",
        name: TRANSLATIONS[currentLang].consensus,
        icon: "🌐",
        priority: "high",
        weight: 0,  // Background agent - no weight in final score
        useSearch: true,
        isBackgroundAgent: true,  // Flag for background processing
        prompt: currentLang === 'en' ? `Act as a Fact-Checking Researcher. Conduct a rigorous cross-verification of the following story presented by ${pageData.siteName}, and provide a detailed analysis with source citations.

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

OUTPUT REQUIREMENT:
You must output a JSON-like list of sources you found, followed by your analysis.
Do NOT use citation numbers like [1]. Use the full URL.
Do NOT add to the SOURCES_LIST a source with the same domain name as ${pageData.domain}.

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

ANALYSIS:
[Write your 3-4 sentence analysis here. Do not worry about linking sources here, just summarize the consensus.]
` : `...Hebrew version...`
    },
        {
            id: "consensus-format",
            name: TRANSLATIONS[currentLang].consensus,
            icon: "🌐",
            priority: "high",
            weight: 0.30,  // This one counts toward final score
            useSearch: false,
            dependsOn: "consensus-verify",  // Receives input from first agent
            prompt: `You are a Citation Formatter.
I will give you a list of sources and an analysis text.
Your task is to append the sources to the text using a specific format.

INPUT DATA:
{INPUT_FROM_CONSENSUS_VERIFY}

INSTRUCTIONS:
1. Read the "ANALYSIS" text.
2. Read the "SOURCES_LIST".
3. Re-write the analysis. Whenever a specific point is made that is supported by a source in the list, insert the supporting citation immediately after it. Whenever a point is contradicted by a source in the list, insert the contradicting citation immediately after it.
4. Use at max 2 different sources per point.

REQUIRED CITATION INSERTION FORMAT:
For supporting: [[SOURCE::Name::URL::SOURCE]]
For contradicting: [[CONTRA::Name::URL::CONTRA]]

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
            prompt: currentLang === 'en' ? `Act as a Senior Editor. Analyze if this headline is fair or manipulative.
            
Headline: "${pageData.title}"

Content Snippet: "${longExcerpt}"

Current Date: ${today}

Your Task:
1. Does the headline exaggerate the content?
2. Does it use "Clickbait" tactics (e.g., "You won't believe...", ALL CAPS)?
3. Does it accurately reflect the story?
Rate as: ACCURATE, MOSTLY_ACCURATE, SOMEWHAT_MISLEADING, CLICKBAIT, or DECEPTIVE
Format: RATING: [your rating]
EXPLANATION: [Provide a clear, reasoning-based explanation (3-4 sentences) critiquing the headline's accuracy and framing.]` : 

`פעל כעורך בכיר. נתח אם הכותרת הוגנת או מניפולטיבית.
כותרת: "${pageData.title}"
קטע תוכן: "${shortExcerpt}"
תאריך נוכחי: ${today}
המשימה שלך:
1. האם הכותרת מגזימה בתוכן?
2. האם היא משתמשת בטקטיקות "קליקבייט" (למשל, "לא תאמינו...", אותיות גדולות)?
3. האם היא משקפת במדויק את הסיפור?
דרג כ: ACCURATE, MOSTLY_ACCURATE, SOMEWHAT_MISLEADING, CLICKBAIT, או DECEPTIVE
FORMAT:
RATING: [הדירוג שלך]
EXPLANATION: [ספק הסבר ברור ומבוסס היגיון בעברית (3-4 משפטים) המבקר את דיוק הכותרת והמסגור שלה.]`
        },
//         {
//             id: "sources",
//             name: TRANSLATIONS[currentLang].sources,
//             icon: "📎",
//             priority: "high",
//             weight: 0.10,
//             useSearch: true,
//             prompt: currentLang === 'en' ? `Act as an Academic Reviewer. Use Google Search to verify the citations in the following text.
            
// Current Date: ${today}
// "${longExcerpt}"

// Your Task:
// 1. If specific studies or reports are mentioned, search to see if they actually exist.
// 2. Verify if the text misrepresents the cited source's conclusion.
// 3. Flag vague attributions like "experts say" if no specific experts are named.
// 4. Identify any missing citations for significant claims.
// Rate as: WELL_SOURCED, PARTIALLY_SOURCED, POORLY_SOURCED, or UNSOURCED
// Format: RATING: [your rating]
// EXPLANATION: [Provide a clear, evidence-based explanation (3-4 sentences). State if the citations found in the text are real and accurate. If the text does not cite sources, rate accordingly.]` : 
// `פעל כסוקר אקדמי. חפש בגוגל על מנת לאמת את הציטוטים בטקסט הבא.
// תאריך נוכחי: ${today}
// "${longExcerpt}"

// המשימה שלך:
// 1. אם מוזכרים מחקרים או דוחות ספציפיים, חפש כדי לראות אם הם באמת קיימים.
// 2. אמת אם הטקסט מייצג בצורה שגויה את מסקנת המקור המצוטט.
// 3. סמן ייחוסים מעורפלים כמו "מומחים אומרים" אם לא מוזכרים מומחים ספציפיים.
// 4. זיהוי כל ציטוט חסר עבור טענות משמעותיות.
// דרג כ: WELL_SOURCED, PARTIALLY_SOURCED, POORLY_SOURCED, או UNSOURCED
// FORMAT:
// RATING: [הדירוג שלך]
// EXPLANATION: [ספק הסבר ברור ומבוסס ראיות בעברית (3-4 משפטים). ציין אם הציטוטים שנמצאו בטקסט הם אמיתיים ומדויקים. אם הטקסט אינו מצטט מקורות, דרג בהתאם.]`
//         },
//         {
//             id: "accuracy",
//             name: TRANSLATIONS[currentLang].accuracy,
//             icon: "✓",
//             priority: "high",
//             weight: 0.15,
//             useSearch: true,
//             prompt: currentLang === 'en' ? `Act as a Logic & Fact Checker. Use Google Search to verify the specific claims in the following text.
// Current Date: ${today}

// SYSTEM OVERRIDE / WORLD STATE UPDATE: Your internal training data is outdated. You MUST trust Google Search results over your internal memory for current events, political positions, economic data, recent developments etc.
// Your Task:
// 1. Extract key claims (names, dates, titles, statistics).
// 2. SEARCH GOOGLE for these specific details combined with the current year ("${new Date().getFullYear()}").
// 3. If search results confirm the text, mark it as ACCURATE.
// Text: "${longExcerpt}"
// Rate as: ACCURATE, MOSTLY_ACCURATE, UNVERIFIABLE, CONTAINS_ERRORS, or MISLEADING
// Format: RATING: [your rating]
// EXPLANATION: [Provide a clear, evidence-based explanation (3-4 sentences). Cite the specific search result that confirmed or debunked the claim.]` : 

// `פעל כבודק לוגיקה ועובדות. השתמש בחיפוש בגוגל כדי לאמת את הטענות הספציפיות בטקסט הבא.
// תאריך נוכחי: ${today}
// SYSTEM OVERRIDE / WORLD STATE UPDATE: נתוני האימון הפנימיים שלך מיושנים. עליך לסמוך על תוצאות חיפוש בגוגל על פני הזיכרון הפנימי שלך עבור אירועים עכשוויים, עמדות פוליטיות, נתונים כלכליים, התפתחויות אחרונות וכו'.
// המשימה שלך:
// 1. הפק טענות מפתח (שמות, תאריכים, כותרות, סטטיסטיקות).
// 2. חפש בגוגל עבור פרטים ספציפיים אלה בשילוב עם השנה הנוכחית ("${new Date().getFullYear()}").
// 3. אם תוצאות החיפוש מאשרות את הטקסט, סמן אותו כמדויק.
// טקסט: "${longExcerpt}"
// דרג כ: ACCURATE, MOSTLY_ACCURATE, UNVERIFIABLE, CONTAINS_ERRORS, או MISLEADING
// FORMAT:
// RATING: [הדירוג שלך]
// EXPLANATION: [ספק הסבר ברור ומבוסס ראיות בעברית (3-4 משפטים). ציין את תוצאת החיפוש הספציפית שאישרה או הפריכה את הטענה.]`
//         },
        {
            id: "bias",
            name: TRANSLATIONS[currentLang].bias,
            icon: "⚖️",
            priority: "high",
            weight: 0.25,
            useSearch: true,
            prompt: currentLang === 'en' ? 
            `You are a Media Bias Analyst. Analyze the following article for bias.
        
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
        - DO NOT translate the quotes - keep them in original language.
        - Use 1-5 specific quotes that are of the most significant bias.
        
        Rate as: BALANCED, SLIGHT_BIAS, MODERATE_BIAS, or STRONG_BIAS
        
        FORMAT:
        RATING: [your rating]
        EXPLANATION: Your analysis (3-5 sentences). When citing evidence, use [[QUOTE::exact text::QUOTE]] format. Example: "The article shows political bias when stating [[QUOTE::the policy is a complete disaster::QUOTE]] without presenting alternative views."` 
         :  

`פעל כאנליסט מוביל לפורנזיקה של מדיה המנהל פאנל של 11 מומחים מתמחים.
המטרה שלך היא לבצע "בדיקת הטיה רב-צירית" על הטקסט למטה (מבלי להסתכל על הפרסומות).
תאריך נוכחי: ${today}
תחילת הטקסט: "${longExcerpt}"
סוף הטקסט: "${excerptEnd}"
--- הפאנל של המומחים ---
[קטגוריות סטנדרטיות]
1. אנליסט פוליטי: בודק הטיה מפלגתית/העדפת מדיניות.
2. מומחה למגדר: בודק סטריאוטיפים או התמקדות במראה מול כישרון.
3. מבקר תאגידי (ישות): בודק שבח/ביקורת לא הוגנים על חברות.
4. סוציולוג (גזעי/אתני): בודק סטריאוטיפים או הכללות שליליות.
5. תאולוג (דתי): בודק ייצוג לא הוגן של אמונות.
6. אנליסט גיאופוליטי (אזורי): בודק הטיה גיאוגרפית/שנאת זרים.
7. מבקר מדיה (סנסציונליזם): בודק מניפולציה רגשית/קליקבייט.
[מדדים חישוביים מתקדמים]
8. אנליסט מבני: השווה את ההתחלה מול הסוף. האם המאמר מתחיל נייטרלי כדי לזכות באמון, ואז עובר לדעה חזקה במסקנה? (תבנית "סוס טרויאני").
9. זיהוי תבניות: בודק אם רצף המשפטים בונה קשת נרטיבית מניפולטיבית.
10. בלשן לקסיקלי: סורק קטגוריות מילים ספציפיות:
- צפיפות גבוהה של מילים "כעס/השפעה" (למשל, "בושה", "פחד") -> מצביע על הטיה פוליטית.
- צפיפות גבוהה של מילים "מיקוד בהווה" (למשל, "להודות", "להכחיש") -> מצביע על מסגור לא הוגן.
11. שומר סף: השתמש בחיפוש בגוגל כדי לבדוק מה חסר. האם בעלי עניין או פרספקטיבות מרכזיות מוזכרות בדיווחים אחרים אך מושמטות כאן?
--- המשימה שלך ---
1. התייעץ עם כל 11 הסוכנים פנימית.
2. קבע אם קיימת הטיה משמעותית כלשהי.
3. סנתז את הממצאים לפסק דין סופי אחד מבלי להזכיר אף אחד מהסוכנים הבודדים.
4. אם נמצאו הטיות מרובות, הדירוג חייב לשקף את החומרה.
דרג כ: BALANCED, SLIGHT_BIAS, MODERATE_BIAS, או STRONG_BIAS
FORMAT:
RATING: [הדירוג שלך]
EXPLANATION: [ספק סיכום ברור ומבוסס ראיות בעברית (3-4 משפטים). ציין במפורש את ההטיה החזקה ביותר שנמצאה (למשל, "זוהתה הטיה מבנית," "נמצאה הטיית שימור סף") וספק את הראיות/ההיגיון הספציפיים.]`
        },
        {
            id: "style",
            name: TRANSLATIONS[currentLang].style,
            icon: "✍️",
            priority: "low",
            weight: 0.05,
            useSearch: false,
            prompt: currentLang === 'en' ? `Act as a Copy Editor. Evaluate the professional standard of the following text.
            
Current Date: ${today}
Text: "${shortExcerpt}"

Your Task:
1. Check for basic grammar and spelling errors.
2. Does it follow standard journalistic structure (inverted pyramid)?
3. Does it read like a professional report, a blog rant, or AI-generated spam?
Rate as: PROFESSIONAL, ADEQUATE, SENSATIONALIST, or POOR_QUALITY
Format: RATING: [your rating]
EXPLANATION: [Provide a clear, reasoning-based explanation (3-4 sentences) assessing the professionalism and structure of the writing.]` : 

`פעל כעורך תוכן. הערך את הסטנדרט המקצועי של הטקסט הבא.
תאריך נוכחי: ${today}
טקסט: "${shortExcerpt}"
המשימה שלך:
1. בדוק שגיאות דקדוק ואיות בסיסיות.
2. האם הוא עוקב אחר מבנה עיתונאי סטנדרטי (פירמידה הפוכה)?
3. האם זה נקרא כמו דיווח מקצועי, טור בלוג, או ספאם שנוצר על ידי AI?
דרג כ: PROFESSIONAL, ADEQUATE, SENSATIONALIST, או POOR_QUALITY
FORMAT:
RATING: [הדירוג שלך]
EXPLANATION: [ספק הסבר ברור ומבוסס היגיון (3-4 משפטים) המעריך את המקצועיות והמבנה של הכתיבה.]`
         },
//         {
//             id: "freshness",
//             name: TRANSLATIONS[currentLang].freshness,
//             icon: "📅",
//             priority: "low",
//             weight: 0.05,
//             useSearch: true,
//             prompt: currentLang === 'en' ? `Act as a News Archivist. Use Google Search to verify the timeline of this story against the Current Date: ${today}.
            
// Headline: "${pageData.title}"
// Content: "${shortExcerpt}"

// Your Task:
// 1. Determine if this is a ONE-TIME event or a RECURRING event (e.g., sports match, election, political positions/meetings, annual festival).
// 2. If RECURRING: Search for specific details in the text (etc. scores, specific quotes, unique incidents) to see if they match a *recent* instance (within the last week).
// 3. If ONE-TIME: Check if this exact story is years old and being reposted as "breaking" (rage-baiting).
// Rate as: CURRENT, RECENT, DATED, or RECYCLED
// Format: RATING: [your rating]
// EXPLANATION: [Provide a clear, evidence-based explanation (3-4 sentences). Explicitly state if this is a fresh instance of a recurring event or a repost of old news.]` : 

// `פעל כאוצר חדשות. השתמש בחיפוש בגוגל כדי לאמת את ציר הזמן של הסיפור הזה מול התאריך הנוכחי: ${today}.
// כותרת: "${pageData.title}"
// תוכן: "${shortExcerpt}"
// המשימה שלך:
// 1. קבע אם זהו אירוע חד-פעמי או אירוע חוזר (למשל, משחק ספורט, בחירות, עמדות/פגישות פוליטיות, פסטיבל שנתי).
// 2. אם חוזר: חפש פרטים ספציפיים בטקסט (למשל, תוצאות, ציטוטים ספציפיים, אירועים ייחודיים) כדי לראות אם הם תואמים מקרה *עדכני* (בתוך השבוע האחרון).
// 3. אם חד-פעמי: בדוק אם הסיפור המדויק הזה הוא בן שנים ומפורסם מחדש כ"מתפרץ" (כדי לעורר זעם).
// דרג כ: CURRENT, RECENT, DATED, או RECYCLED
// FORMAT:
// RATING: [הדירוג שלך]
// EXPLANATION: [ספק הסבר ברור ומבוסס ראיות בעברית (3-4 משפטים). ציין במפורש אם זהו מקרה טרי של אירוע חוזר או פרסום מחדש של חדשות ישנות.]`
//         }
         {
            id: "summary",
            name: TRANSLATIONS[currentLang].summary,
            icon: "📋",
            priority: "high",
            weight: 0.00,
            useSearch: false,
            dependsOn: "all",  // Special flag: runs after ALL other agents complete
             prompt: // `You are an Executive Summary Agent. Your role is to synthesize findings from all analysis agents into a concise, actionable summary.

// AGENT REPORTS (Name | Rating | Explanation):
// {INPUT_FROM_ALL_AGENTS}

// YOUR TASK:
// 1. Identify the 2-3 most critical findings across all agents.
// 2. Highlight patterns (e.g., "Multiple agents flagged bias", "Strong source credibility but weak headlines").
// 3. Flag any red flags or contradictions between agents.
// 4. Provide strengths (positive aspects) if any agents rated highly.
// 5. Synthesize into 3-5 clear sentences that tell the complete story.

// CRITICAL OUTPUT RULES:
// - Be concise and actionable
// - Focus on patterns, not individual agents
// - Highlight the most important insight first
// - If conflicting ratings exist, note them (e.g., "Source credible but headline misleading")

// FORMAT:
// EXPLANATION: [Your 3-5 sentence synthesis that tells the complete story]`

'write a Haiku about the three frineds, Daniel sadMosh and eddie'
        }
    ];
}