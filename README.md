# YouTube Learning Assistant

AI-powered YouTube learning assistant using MERN stack (MongoDB, Express, React, Node.js).

## Features
- Extract transcripts from YouTube educational videos
- Generate AI-powered summaries
- Create key learning points
- Generate 10 quiz questions based on video content
- Store all data in MongoDB

## Setup

### 1. Install Dependencies
```bash
npm run install-all
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
```
Edit `.env` and add:
- `MONGODB_URI` - Your MongoDB connection string
- `OPENAI_API_KEY` - Your OpenAI API key

### 3. Start MongoDB
Make sure MongoDB is running on your system.

### 4. Run the Application
```bash
# Run both backend and frontend
npm run dev

# Or run separately:
npm run server  # Backend on port 5000
npm run client  # Frontend on port 3000
```

## Usage
1. Open http://localhost:3000
2. Paste a YouTube video URL
3. Click "Generate Learning Content"
4. View summary, key points, and quiz questions

## Tech Stack
- **Frontend:** React.js
- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose
- **AI:** OpenAI API
- **Transcript:** youtube-transcript library
