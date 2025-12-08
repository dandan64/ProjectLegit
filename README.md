# Legit - AI-Powered Fake News Detection Extension

A Chrome extension that uses Google's Gemini AI to analyze news articles and detect potential misinformation through multi-agent analysis.

## 🌟 Features

### Enhanced Analysis System
- **10 Specialized AI Agents** analyzing different aspects:
  - 🏛️ Source Credibility
  - 📰 Headline Analysis
  - 📎 Source Attribution
  - ✓ Factual Accuracy
  - 🎭 Emotional Tone
  - ⚖️ Bias Detection
  - ✍️ Writing Quality
  - 📅 Content Freshness
  - (Plus 2 more from original implementation)

### User Experience Improvements
- **Progressive Loading**: See results as each agent completes analysis
- **Overall Legitimacy Score**: Weighted scoring system (0-100)
- **Visual Rating System**: Color-coded badges for quick scanning
- **Priority-Based Display**: High-priority agents shown first
- **Smooth Animations**: Modern, polished UI transitions

### Technical Enhancements
- **Response Caching**: Reduces API calls for similar analyses
- **Rate Limiting**: Prevents API quota exhaustion
- **Error Recovery**: Automatic retries with exponential backoff
- **Better Error Messages**: Clear, actionable error descriptions

### Modern UI/UX
- **Glassmorphic Design**: Beautiful gradient backgrounds with blur effects
- **Responsive Layout**: Adapts to different content lengths
- **Keyboard Shortcut**: Ctrl+B (Cmd+B on Mac) to open
- **Export Functionality**: Save analysis results (coming soon)

## 📦 Installation

### 1. Get Your Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key

### 2. Install the Extension

#### Option A: Load Unpacked (Development)
1. Download/clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked"
5. Select the extension folder
6. The Legit icon should appear in your toolbar

#### Option B: Package as .crx
1. Go to `chrome://extensions/`
2. Enable Developer mode
3. Click "Pack extension"
4. Select the extension directory
5. Install the generated .crx file

### 3. Configure API Key
1. Click the Legit icon in your toolbar
2. Enter your Gemini API key
3. Click "Save API Key"
4. You're ready to analyze!

## 🚀 Usage

### Analyzing a Page
1. Navigate to any news article
2. Click the Legit icon (or press Ctrl+B / Cmd+B)
3. Click "Analyze This Page"
4. Wait for the multi-agent analysis to complete
5. Review the overall score and individual agent assessments

### Understanding Results

#### Overall Score
- **80-100**: Highly Credible ✅
- **60-79**: Moderately Credible ⚠️
- **40-59**: Questionable ❌
- **0-39**: Highly Questionable 🚨

#### Priority Levels
- **Red Border**: High priority - most important for credibility
- **Orange Border**: Medium priority - contextual factors
- **Blue Border**: Low priority - supplementary information

#### Rating Badges
Each agent provides a specific rating with explanation:
- **Green badges**: Positive indicators
- **Yellow badges**: Neutral/uncertain
- **Orange badges**: Warning signs
- **Red badges**: Serious concerns

## 📁 File Structure

```
legit-extension/
├── manifest.json           # Extension configuration
├── Legit.html             # Popup interface
├── scripts/
│   ├── popup.js           # UI logic & analysis orchestration
│   └── background.js      # API calls & caching
├── Images/
│   ├── Legit_logo_16.png
│   ├── Legit_logo_32.png
│   ├── Legit_logo_48.png
│   └── Legit_logo_128.png
└── README.md              # This file
```

## 🛠️ Development

### Prerequisites
- Google Chrome (or Chromium-based browser)
- Gemini API key
- Basic knowledge of JavaScript

### Local Development
1. Make changes to the code
2. Go to `chrome://extensions/`
3. Click the refresh icon on the Legit extension card
4. Test your changes

### Debugging
- **Popup Console**: Right-click the extension icon → "Inspect popup"
- **Background Service Worker**: Click "service worker" link on extensions page
- **Content Scripts**: Use regular Chrome DevTools on the page

### Key Configuration Points

#### Adjusting Agent Weights
In `popup.js`, modify the `weight` property in the `getAnalysisAgents()` function:
```javascript
{
    id: "source",
    name: "Source Credibility",
    weight: 0.2,  // 20% of overall score
    // ...
}
```

#### Modifying Cache Duration
In `background.js`:
```javascript
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes
```

#### Adjusting Rate Limits
In `background.js`:
```javascript
const MAX_REQUESTS_PER_MINUTE = 30;
```

## 🎨 Customization

### Changing Color Scheme
Edit the CSS in `Legit.html`:
```css
body {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

### Modifying Agent Prompts
In `popup.js`, edit the `prompt` field in `getAnalysisAgents()`:
```javascript
{
    id: "source",
    prompt: `Your custom prompt here...`
}
```

### Adding New Agents
1. Add new agent definition in `getAnalysisAgents()`
2. Set appropriate `id`, `name`, `icon`, `priority`, and `weight`
3. Create a specific prompt for the agent's task
4. The UI will automatically display the new agent

## ⚠️ Limitations & Considerations

### API Costs
- Gemini API has free tier limits
- Each page analysis uses 8-10 API calls
- Monitor your usage at [Google AI Studio](https://aistudio.google.com/)

### Accuracy
- AI analysis is not perfect
- Results should inform, not replace, critical thinking
- Cross-reference important claims with multiple sources

### Privacy
- API key stored locally in browser
- Page content sent to Google's Gemini API for analysis
- No data collected or stored by this extension

### Performance
- Analysis takes 10-30 seconds depending on content length
- Caching reduces repeated analyses
- Rate limiting prevents API quota exhaustion

## 🔮 Future Enhancements

### Planned Features
- [ ] PDF export of analysis results
- [ ] Historical analysis storage
- [ ] Comparison mode (analyze multiple sources)
- [ ] Browser notification for highly questionable sites
- [ ] Crowd-sourced credibility ratings
- [ ] Integration with fact-checking databases
- [ ] Real-time monitoring mode
- [ ] Custom agent creation interface
- [ ] Team collaboration features

### Community Contributions
Want to contribute? Areas we'd love help with:
- Additional analysis agents
- UI/UX improvements
- Performance optimizations
- Internationalization
- Test coverage
- Documentation


## 📄 License

MIT License - feel free to use, modify, and distribute

## 🤝 Support

For issues, questions, or suggestions:
1. Check existing issues on GitHub
2. Create a new issue with detailed description
3. Include browser version and error messages

## 🙏 Acknowledgments

- Google Gemini AI for powering the analysis
- Chrome Extensions API documentation
- Open-source community for inspiration

---

**Disclaimer**: This tool provides AI-generated analysis to assist with critical evaluation of news content. It should not be considered a definitive source of truth. Always exercise your own judgment and consult multiple sources for important information.
