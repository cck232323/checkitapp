# LiedIn - Deception Analysis Tool
Highlight Link: http://13.54.193.109/
LiedIn is an advanced web application designed to analyze text, images, videos, and audio for signs of deception and truthfulness. Using artificial intelligence and machine learning techniques, LiedIn provides detailed reports on potential indicators of dishonesty in various media formats.

## Features

* **Multi-format Analysis**: Upload and analyze text, images, videos, and audio files
* **Frame-by-frame Video Analysis**: Extracts and analyzes individual frames from videos
* **Audio Transcription**: Converts speech to text for detailed analysis
* **Comprehensive Reports**: Provides detailed analysis reports with specific deception indicators
* **User-friendly Interface**: Simple upload process and clear result presentation

## Technology Stack

* **Frontend**: Next.js with TypeScript and React
* **Styling**: Tailwind CSS
* **Backend Processing**: Node.js with serverless API routes
* **AI Integration**: OpenAI GPT for text analysis
* **Media Processing**: FFmpeg for video and audio extraction
* **Audio Transcription**: Whisper API

## Getting Started

### Prerequisites

* Node.js (v14 or later)
* npm or yarn
* FFmpeg (for video processing)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/liedin.git
   cd liedin
   ```
2. Install dependencies:

   ```bash
   npm install
   # or
   yarn install
   ```
3. Set up environment variables:
   Create a `.env.local` file in the root directory with the following variables:

   ```env
   OPENAI_API_KEY=your_openai_api_key
   ```
4. Run the development server:

   ```bash
   npm run dev
   # or
   yarn dev
   ```
5. Open `http://localhost:3000` in your browser to see the application.

## Usage

1. Navigate to the home page
2. Select the type of content you want to analyze (text, image, or video)
3. Upload your file or enter text
4. Click "Analyze" and wait for the processing to complete
5. View the detailed analysis report with deception indicators

## Project Structure

```
liedin/
├── components/         # React components
│   ├── FramePreview.tsx
│   ├── Loader.tsx
│   ├── ResultReport.tsx
│   └── UploadForm.tsx
├── lib/                # Utility libraries
│   ├── frameUtils.ts
│   ├── gpt.ts
│   ├── promptBuilder.ts
│   └── whisper.ts
├── pages/              # Next.js pages
│   ├── api/
│   │   └── analyze.ts  # API endpoint for analysis
│   ├── _app.tsx
│   ├── _document.tsx
│   ├── index.tsx       # Home page
│   └── result.tsx      # Results page
├── public/             # Static assets
│   └── uploads/        # Uploaded files storage
├── styles/             # CSS styles
│   └── globals.css
├── types/              # TypeScript type definitions
│   └── Report.ts
└── utils/              # Utility functions
    └── fileToBase64.ts
```

## API Reference

### `/api/analyze`

* **Method**: POST
* **Purpose**: Analyze uploaded content for deception
* **Request Body**: FormData containing file and type information
* **Response**: JSON object with analysis results

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

* OpenAI for providing the GPT API
* FFmpeg for media processing capabilities
* Next.js team for the excellent React framework
