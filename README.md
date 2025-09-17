# Lyric Muse Organizer

A beautiful, mobile-first lyrics viewer and organizer with advanced features including pinch-to-resize gestures.

## Features

- **Pinch Gesture Support**: Pinch in/out on lyrics to resize font size dynamically
- **Auto-scroll**: Automatically scroll through lyrics at different speeds
- **Bold Text Toggle**: Switch between normal and bold text for better readability
- **Mobile Optimized**: Touch-friendly interface with responsive design
- **Dark/Light Theme**: Beautiful theme switching with musical color palette
- **Search & Organize**: Search for songs and organize your favorites

## Getting Started

### Prerequisites

- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Installation

```sh
# Step 1: Clone the repository
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory
cd lyric-muse-organizer

# Step 3: Install the necessary dependencies
npm install

# Step 4: Start the development server
npm run dev
```

### Building for Production

```sh
# Build and start production server (includes Musixmatch proxy)
npm run build:prod

# Or build and start separately
npm run build
npm start

# Build for mobile (Android)
npx cap add android
npx cap sync android
npx cap run android
```

## Technologies Used

This project is built with:

- **Vite** - Fast build tool and dev server
- **TypeScript** - Type-safe JavaScript
- **React** - UI library
- **shadcn/ui** - Beautiful UI components
- **Tailwind CSS** - Utility-first CSS framework
- **Capacitor** - Cross-platform mobile development
- **Musixmatch API** - Lyrics data provider

## Mobile Development

This project uses Capacitor to build native mobile apps from the web codebase. The app can be deployed to both iOS and Android platforms.

## API Integration

The app integrates with the Musixmatch API for lyrics data. Due to CORS restrictions:

- **Development**: Uses Vite's proxy server to bypass CORS
- **Production**: Includes an Express.js proxy server (`server.js`) to handle API requests

The proxy server automatically forwards requests from `/api/musixmatch/*` to the Musixmatch API with proper CORS headers.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
