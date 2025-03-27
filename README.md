# Cosmic Insights - Astrology App

A modern React application that provides personalized astrological insights based on birth date, time, and place, powered by Together AI's Llama 3 model.

![Cosmic Insights Screenshot](https://via.placeholder.com/800x450.png?text=Cosmic+Insights+App)

## Features

- Clean, responsive UI built with React and TypeScript
- Form for collecting birth date, time, and location
- AI-powered astrological insights using Llama 3 70B via Together AI API
- Modern styling with Tailwind CSS
- Error handling and loading states

## Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/cosmic-insights.git
   cd cosmic-insights
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your Together AI API key:
   - Create an account on [Together AI](https://together.ai/)
   - Generate an API key in your Together AI dashboard
   - Add the API key to your .env file:
     ```js
     VITE_TOGETHER_API_KEY = 'your-together-ai-key';
     ```

## Running the App

Start the development server:

```bash
npm run dev
```

Visit `http://localhost:5173` to view the app in your browser.

## Building for Production

To create a production build:

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## Deploying to Netlify/Vercel

### Netlify

1. Create a Netlify account and connect it to your Git repository.
2. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Set environment variables for your API keys in Netlify dashboard.

### Vercel

1. Create a Vercel account and connect it to your Git repository.
2. Vercel will automatically detect the Vite configuration.
3. Set environment variables for your API keys in Vercel dashboard.

## Project Structure

```
cosmic-insights/
├── public/            # Static assets
├── src/
│   ├── components/    # React components
│   │   ├── BirthDataForm.tsx     # Form for birth details
│   │   └── AstrologyInsight.tsx  # Display component for insights
│   ├── services/      # API and external services
│   │   └── api.ts     # Together AI API integration
│   ├── types/         # TypeScript interfaces and types
│   │   └── index.ts   # Type definitions
│   ├── App.tsx        # Main application component
│   ├── App.css        # App-specific styles
│   ├── index.css      # Global styles with Tailwind
│   └── main.tsx       # Application entry point
├── tailwind.config.js # Tailwind CSS configuration
├── postcss.config.js  # PostCSS configuration
├── index.html         # HTML entry point
├── package.json       # Project dependencies
└── README.md          # Project documentation
```

## Future Improvements

- Add user accounts to save past readings
- Implement visualization of astrological charts
- Add social sharing functionality
- Include daily/weekly/monthly forecasts
- Add support for multiple languages

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Vite](https://vitejs.dev/)
- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Together AI](https://together.ai/)
