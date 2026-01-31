const axios = require('axios');
const Groq = require('groq-sdk');
const Video = require('../models/Video');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Extract video ID from YouTube URL
 */
function extractVideoId(url) {
  url = url.trim();
  let match;
  
  match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  
  match = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  
  match = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  
  match = url.match(/^([a-zA-Z0-9_-]{11})$/);
  if (match) return match[1];
  
  return null;
}

/**
 * Fetch transcript from YouTube
 */
async function getTranscript(videoId) {
  console.log(`Fetching transcript for: ${videoId}`);
  
  try {
    // Get video page
    const response = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    
    const html = response.data;
    
    // Find caption URL - try multiple patterns
    let captionUrl = null;
    
    // Pattern 1: Look for baseUrl in captionTracks
    const baseUrlMatch = html.match(/"baseUrl":"(https:\/\/www\.youtube\.com\/api\/timedtext[^"]+)"/);
    if (baseUrlMatch) {
      captionUrl = baseUrlMatch[1].replace(/\\u0026/g, '&');
      console.log('Found caption URL via baseUrl pattern');
    }
    
    // Pattern 2: Alternative pattern
    if (!captionUrl) {
      const altMatch = html.match(/timedtext[^"]*v=${videoId}[^"]*/);
      if (altMatch) {
        captionUrl = 'https://www.youtube.com/' + altMatch[0].replace(/\\u0026/g, '&');
        console.log('Found caption URL via alt pattern');
      }
    }
    
    if (!captionUrl) {
      throw new Error('No captions available for this video');
    }
    
    console.log('Fetching captions from URL...');
    
    // Fetch captions - try JSON format first (fmt=json3)
    let captionsText = '';
    
    // Try JSON format
    try {
      const jsonUrl = captionUrl + '&fmt=json3';
      const captionResponse = await axios.get(jsonUrl);
      const jsonData = captionResponse.data;
      
      if (jsonData && jsonData.events) {
        captionsText = jsonData.events
          .filter(e => e.segs)
          .map(e => e.segs.map(s => s.utf8).join(''))
          .join(' ');
        console.log('Got captions in JSON format');
      }
    } catch (e) {
      console.log('JSON format failed, trying XML...');
    }
    
    // Try XML format if JSON failed
    if (!captionsText) {
      const captionResponse = await axios.get(captionUrl);
      const xmlData = captionResponse.data;
      
      // Check if it's JSON
      if (typeof xmlData === 'object' && xmlData.events) {
        captionsText = xmlData.events
          .filter(e => e.segs)
          .map(e => e.segs.map(s => s.utf8).join(''))
          .join(' ');
      } else if (typeof xmlData === 'string') {
        // Parse XML
        const textMatches = xmlData.match(/>([^<]+)</g);
        if (textMatches) {
          captionsText = textMatches
            .map(m => m.slice(1, -1))
            .filter(t => t.trim())
            .join(' ');
        }
      }
    }
    
    // Clean up text
    captionsText = captionsText
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (!captionsText || captionsText.length < 50) {
      throw new Error('Transcript is empty or too short');
    }
    
    console.log(`✅ Got transcript: ${captionsText.length} characters`);
    return captionsText;
    
  } catch (error) {
    console.error('Transcript error:', error.message);
    throw new Error('Could not fetch transcript: ' + error.message);
  }
}

/**
 * Generate learning content using Groq AI
 */
async function generateLearningContent(transcript) {
  const maxLength = 6000;
  const text = transcript.length > maxLength 
    ? transcript.substring(0, maxLength) + '...' 
    : transcript;

  const prompt = `Analyze this video transcript and create educational content.

TRANSCRIPT:
${text}

Return ONLY valid JSON (no markdown, no explanation):
{
  "summary": "2-3 paragraph summary",
  "keyPoints": ["point1", "point2", "point3", "point4", "point5"],
  "quizQuestions": [
    {"question": "Q1?", "options": ["A", "B", "C", "D"], "correctAnswer": "A"},
    {"question": "Q2?", "options": ["A", "B", "C", "D"], "correctAnswer": "B"},
    {"question": "Q3?", "options": ["A", "B", "C", "D"], "correctAnswer": "C"},
    {"question": "Q4?", "options": ["A", "B", "C", "D"], "correctAnswer": "D"},
    {"question": "Q5?", "options": ["A", "B", "C", "D"], "correctAnswer": "A"},
    {"question": "Q6?", "options": ["A", "B", "C", "D"], "correctAnswer": "B"},
    {"question": "Q7?", "options": ["A", "B", "C", "D"], "correctAnswer": "C"},
    {"question": "Q8?", "options": ["A", "B", "C", "D"], "correctAnswer": "D"},
    {"question": "Q9?", "options": ["A", "B", "C", "D"], "correctAnswer": "A"},
    {"question": "Q10?", "options": ["A", "B", "C", "D"], "correctAnswer": "B"}
  ]
}`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      { role: 'system', content: 'Return only valid JSON.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.5,
    max_tokens: 3000,
  });

  let content = response.choices[0].message.content.trim();
  content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    content = content.substring(start, end + 1);
  }
  
  return JSON.parse(content);
}

/**
 * Process YouTube video
 */
exports.processVideo = async (req, res) => {
  try {
    const { youtubeUrl } = req.body;

    if (!youtubeUrl) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    const videoId = extractVideoId(youtubeUrl);
    console.log(`Video ID: ${videoId}`);
    
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    // Check cache
    const cached = await Video.findOne({ videoId });
    if (cached) {
      console.log('✅ Using cache');
      return res.json(cached);
    }

    // Get transcript
    console.log('📝 Fetching transcript...');
    const transcript = await getTranscript(videoId);

    // Generate content
    console.log('🤖 Generating content...');
    const content = await generateLearningContent(transcript);

    // Save
    const video = new Video({
      youtubeUrl,
      videoId,
      transcript,
      summary: content.summary,
      keyPoints: content.keyPoints || [],
      quizQuestions: content.quizQuestions || [],
    });

    await video.save();
    console.log('💾 Done!');

    res.json(video);

  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.getAllVideos = async (req, res) => {
  try {
    const videos = await Video.find().select('-transcript').sort({ createdAt: -1 });
    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
};

exports.getVideoById = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: 'Not found' });
    res.json(video);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
};

/**
 * Process direct transcript input (no YouTube URL needed)
 */
exports.processTranscript = async (req, res) => {
  try {
    const { transcript, title } = req.body;

    if (!transcript || transcript.trim().length < 50) {
      return res.status(400).json({ error: 'Please provide a transcript with at least 50 characters' });
    }

    console.log('📝 Processing direct transcript...');
    console.log(`Transcript length: ${transcript.length} characters`);

    // Generate content using AI
    console.log('🤖 Generating content...');
    const content = await generateLearningContent(transcript);

    // Create response object (not saving to DB for direct transcripts)
    const result = {
      title: title || 'Direct Transcript',
      transcript: transcript,
      summary: content.summary,
      keyPoints: content.keyPoints || [],
      quizQuestions: content.quizQuestions || [],
      createdAt: new Date(),
    };

    console.log('✅ Done!');
    res.json(result);

  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};
