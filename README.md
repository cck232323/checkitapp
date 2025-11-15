# LiedIn - Deception Analysis Tool

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

## Production Deployment (AWS EC2)

The repository ships with a single Docker image that runs both the Next.js frontend and the Python analysis backend. The image is production-ready and can be deployed on an Amazon Linux 2023 or Ubuntu EC2 instance.

### 1. Prepare the EC2 instance

- Launch an EC2 instance with at least 2 vCPUs and 4 GB RAM (t3.medium or better is recommended for video processing).
- Attach a security group that allows inbound HTTP (80), HTTPS (443 if you terminate TLS on the instance), and any custom ports you plan to expose (defaults are 3000 for the UI and 5000 for the backend API).
- SSH into the instance and install Docker and the Compose plugin:

  ```bash
  sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin
  sudo systemctl enable docker --now
  sudo usermod -aG docker $USER
  newgrp docker
  ```

  On Amazon Linux use `sudo yum install docker` instead of `apt-get`.

### 2. Configure environment variables

Create an `.env.production` file based on the provided template `.env.production`. At a minimum set:

```env
OPENAI_API_KEY=your_openai_key
DATABASE_URL=file:/app/prisma/dev.db
```

Optional overrides:

- `APP_HTTP_PORT` – host port that serves the Next.js UI (default 3000). Set to 80 to serve on the standard HTTP port.
- `APP_BACKEND_PORT` – host port that forwards to the Python API (default 5000). You can omit exposing this if the frontend is the only consumer.

### 3. Build and run with Docker Compose

```bash
git clone https://github.com/yourusername/liedin.git
cd liedin
cp .env.production .env
docker compose -f deploy/ec2/docker-compose.yml up -d --build
```

The compose file tags the image as `liedin-app:latest`. Push the same image to Amazon ECR if you prefer building in CI/CD (use `push-to-ecr.sh` as a starting point) and set `LIEDIN_IMAGE` to the fully qualified ECR image URL before running Compose.

### 4. Post-deployment

- Verify health: `curl http://localhost:3000/api/healthz` should return `{ "status": "ok" }`.
- Tail logs: `docker compose -f deploy/ec2/docker-compose.yml logs -f`.
- Persist uploads: a named Docker volume (`liedin_uploads`) stores generated frames and uploads.
- (Optional) Put Nginx or an Application Load Balancer in front of the container for TLS termination and custom domains.

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
