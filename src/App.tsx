import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './App.css'
import BirthDataForm from './components/BirthDataForm'
import AstrologyInsight from './components/AstrologyInsight'
import ShareCard from './components/ShareCard'
import EnvTester from './components/EnvTester'
import { BirthData, AstrologyInsight as AstrologyInsightType } from './types'
import api from './services/api'

function App() {
  const [insight, setInsight] = useState<AstrologyInsightType>({
    message: '',
    loading: false,
    error: null
  });

  const [lastSubmittedData, setLastSubmittedData] = useState<BirthData | null>(null);

  const handleBirthDataSubmit = async (birthData: BirthData) => {
    // Check if this is a different birth data than before
    const isDifferentData = !lastSubmittedData || 
      lastSubmittedData.date !== birthData.date ||
      lastSubmittedData.time !== birthData.time ||
      lastSubmittedData.place !== birthData.place ||
      lastSubmittedData.name !== birthData.name;
      
    // If it's different data, clear the cache
    if (isDifferentData) {
      console.log('New birth data submitted, clearing cache');
      api.clearCache();
    }
    
    // Update state to show loading
    setInsight({
      message: '',
      loading: true,
      error: null
    });

    try {
      // Call the API to get the astrological insight
      const response = await api.getAstrologyInsight(birthData);
      
      if (response.success && response.data) {
        // Update state with the insight message
        setInsight({
          message: response.data.insight,
          loading: false,
          error: null
        });
        
        // Store the submitted data
        setLastSubmittedData(birthData);
        
        // Preload all birth chart data in the background
        // This will ensure that data is cached when the user clicks "View Complete Cosmic Analysis"
        try {
          console.log('Preloading birth chart data in the background');
          api.preloadBirthChartData(birthData).catch(error => {
            console.warn('Background preloading failed, will load on demand instead:', error);
          });
        } catch (preloadError) {
          // Silently handle preload errors - this won't affect the user experience
          console.warn('Error during background preloading:', preloadError);
        }
      } else {
        // Handle API error
        setInsight({
          message: '',
          loading: false,
          error: response.error || 'Failed to generate astrological insight.'
        });
      }
    } catch (error) {
      // Handle unexpected errors
      setInsight({
        message: '',
        loading: false,
        error: 'An unexpected error occurred. Please try again.'
      });
    }
  };

  return (
    <div className="min-h-screen bg-astro-bg-primary text-astro-text-primary p-4 sm:p-6">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <motion.header 
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-astro-bg-card rounded-full border border-astro-border-light flex items-center justify-center">
              <motion.svg 
                width="32" 
                height="32" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                animate={{ 
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.05, 1]
                }}
                transition={{ 
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <circle cx="12" cy="12" r="10" stroke="#B28F4C" strokeWidth="1.5"/>
                <path d="M12 2V12L17 17" stroke="#B28F4C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </motion.svg>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-astro-accent-primary heading-accent mb-2">
            Astroworld Insights
          </h1>
          <p className="text-astro-text-secondary max-w-xl mx-auto">
            Discover the cosmic forces that shape your journey through life. Enter your birth details below to receive a personalized astrological analysis.
          </p>
        </motion.header>

        {/* Environment Variables Tester */}
        <EnvTester />

        <div className="grid grid-cols-1 gap-8">
          {/* Birth Data Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <BirthDataForm onSubmit={handleBirthDataSubmit} isLoading={insight.loading} />
          </motion.div>

          {/* Astrology Insight */}
          <AnimatePresence mode="wait">
            {(insight.loading || insight.message || insight.error) && (
              <motion.div
                key="insight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                <AstrologyInsight insight={insight} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ShareCard Component - only visible when there's an insight */}
        {insight.message && !insight.loading && !insight.error && (
          <ShareCard insight={insight} />
        )}

        {/* Footer */}
        <motion.footer
          className="mt-16 text-center text-sm relative z-10 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          {/* Psychedelic background effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-500/20 to-indigo-600/20 animate-gradient-x animate-rainbow"></div>
          
          {/* Star effect around the text */}
          <div className="absolute inset-0 opacity-30">
            {[...Array(20)].map((_, i) => (
              <div 
                key={i}
                className="footer-star animate-twinkle"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${1 + Math.random() * 3}s`
                }}
              ></div>
            ))}
          </div>
          
          <div className="py-3 px-8 rounded-full bg-gradient-to-r from-purple-600/30 via-fuchsia-500/30 to-indigo-500/30 inline-block backdrop-blur-sm border border-indigo-400/30 shadow-lg shadow-purple-500/20 relative">
            {/* Animated rainbow border */}
            <div className="absolute inset-0 rounded-full border-2 border-transparent bg-gradient-to-r from-yellow-400 via-purple-500 to-pink-500 opacity-50 animate-border-pulse animate-rainbow"></div>
            
            <p className="font-medium bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 animate-pulse relative z-10 footer-text-glow">
               Astroworld Insights 2025 • Designed by{" "}
              <span className="relative inline-block group">
                <span className="relative z-10 font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-200 group-hover:bg-gradient-to-r group-hover:from-green-300 group-hover:via-blue-500 group-hover:to-purple-600 transition-all duration-1000 nipun-text-shine">
                  Nipun
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 blur-sm opacity-70 animate-pulse"></span>
                {/* Halo effect */}
                <span className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-purple-500 to-pink-500 rounded-full blur-md opacity-0 group-hover:opacity-70 transition-opacity duration-700"></span>
              </span>
              
            </p>
          </div>
        </motion.footer>
      </div>
    </div>
  );
}

export default App;
