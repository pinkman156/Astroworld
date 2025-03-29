import React, { useState, useRef, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  Fab, 
  Box, 
  IconButton,
  Typography,
  Button,
  Tooltip,
  Zoom,
  DialogTitle,
  Divider,
  Paper
} from '@mui/material';
import { 
  Share as ShareIcon, 
  Close as CloseIcon,
  Download as DownloadIcon,
  Twitter as TwitterIcon,
  Instagram as InstagramIcon,
  Facebook as FacebookIcon
} from '@mui/icons-material';
import html2canvas from 'html2canvas';
import { AstrologyInsight } from '../types';
import { motion } from 'framer-motion';

interface ShareCardProps {
  insight: AstrologyInsight;
}

const ShareCard: React.FC<ShareCardProps> = ({ insight }) => {
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [symbolPositions, setSymbolPositions] = useState<Array<{left: string, top: string, size: string, rotation: string, opacity: number}>>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  
  // Precompute symbol positions once
  useEffect(() => {
    const symbols = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '☿', '♀', '♂', '♃', '♄', '⚸', '♅', '♆', '♇'];
    const positions = symbols.map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: `${Math.random() * 18 + 12}px`,
      rotation: `rotate(${Math.random() * 360}deg)`,
      opacity: 0.2 + Math.random() * 0.2
    }));
    setSymbolPositions(positions);
  }, []);
  
  const handleOpen = () => {
    setOpen(true);
  };
  
  const handleClose = () => {
    setOpen(false);
  };
  
  const downloadCard = async () => {
    if (cardRef.current) {
      try {
        // Enable capture-safe mode for rendering
        setIsCapturing(true);
        
        // Wait to ensure the DOM updates with the simpler styles
        setTimeout(async () => {
          try {
            // Store reference to avoid null issues
            const cardElement = cardRef.current;
            if (!cardElement) {
              setIsCapturing(false);
              return;
            }
            
            console.log('Starting card capture...');
            
            const canvas = await html2canvas(cardElement, {
              scale: 2,
              backgroundColor: '#2E0854', // Explicitly set background color
              logging: true,
              allowTaint: true,
              useCORS: true,
              onclone: (clonedDoc) => {
                console.log('Cloning document for capture...');
                const clonedCard = clonedDoc.querySelector('[data-card-ref="true"]');
                if (clonedCard) {
                  console.log('Cloned card dimensions:', 
                    (clonedCard as HTMLElement).offsetWidth, 
                    'x', 
                    (clonedCard as HTMLElement).offsetHeight
                  );
                }
              }
            });
            
            console.log('Canvas created successfully:', canvas.width, 'x', canvas.height);
            
            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = image;
            link.download = 'astro-insight.png';
            link.click();
            
            // Restore normal display mode
            setTimeout(() => setIsCapturing(false), 500);
          } catch (error) {
            console.error('Error during canvas generation:', error);
            alert('There was an error generating your image. Please try again.');
            setIsCapturing(false);
          }
        }, 500);
      } catch (error) {
        console.error('Error in download process:', error);
        alert('There was an error generating your image. Please try again.');
        setIsCapturing(false);
      }
    }
  };
  
  // Extract sun and moon signs from the insight message
  const extractSign = (signType: string): string => {
    // First try to find in the Birth Data section with the specific format
    const birthDataRegex = new RegExp(`${signType} Sign: ([\\w\\s]+)(?:\\n|$)`, 'i');
    const birthDataMatch = insight.message.match(birthDataRegex);
    if (birthDataMatch && birthDataMatch[1]) {
      console.log(`Found ${signType} sign in Birth Data section:`, birthDataMatch[1].trim());
      return birthDataMatch[1].trim();
    }
    
    // Try alternative format with lowercase "sign"
    const altRegex = new RegExp(`${signType} sign: ([\\w\\s]+)(?:\\n|$)`, 'i');
    const altMatch = insight.message.match(altRegex);
    if (altMatch && altMatch[1]) {
      console.log(`Found ${signType} sign in alternative format:`, altMatch[1].trim());
      return altMatch[1].trim();
    }
    
    // Try alternative format in the Birth Chart Overview section
    const birthChartOverviewRegex = new RegExp(`${signType}(?:\\s+is)?\\s+in\\s+([\\w\\s]+)(?:\\(|,|\\.|\\s|$)`, 'i');
    const birthChartMatch = insight.message.match(birthChartOverviewRegex);
    if (birthChartMatch && birthChartMatch[1]) {
      console.log(`Found ${signType} sign in Birth Chart Overview:`, birthChartMatch[1].trim());
      return birthChartMatch[1].trim();
    }
    
    // Try to find in phrases like "The Sun/Moon is in Gemini/Scorpio"
    const phraseRegex = new RegExp(`The ${signType} is in ([\\w\\s]+)(?:\\(|,|\\.|\\s|$)`, 'i');
    const phraseMatch = insight.message.match(phraseRegex);
    if (phraseMatch && phraseMatch[1]) {
      console.log(`Found ${signType} sign in phrase:`, phraseMatch[1].trim());
      return phraseMatch[1].trim();
    }
    
    // Try format like "while the Sun is in Gemini"
    const whileRegex = new RegExp(`while the ${signType}(?:\\s+is)?\\s+in\\s+([\\w\\s]+)(?:\\(|,|\\.|\\s|$)`, 'i');
    const whileMatch = insight.message.match(whileRegex);
    if (whileMatch && whileMatch[1]) {
      console.log(`Found ${signType} sign in 'while' phrase:`, whileMatch[1].trim());
      return whileMatch[1].trim();
    }
    
    // Try format like "Moon in Vrischika (Scorpio)"
    const inParenRegex = new RegExp(`${signType} in ([\\w\\s]+?)(?:\\s*\\(|,|\\.|$)`, 'i');
    const inParenMatch = insight.message.match(inParenRegex);
    if (inParenMatch && inParenMatch[1]) {
      console.log(`Found ${signType} sign with parentheses:`, inParenMatch[1].trim());
      return inParenMatch[1].trim();
    }
    
    // Try to extract from other parts of the text with "is in" format
    const anywhereRegex = new RegExp(`${signType}(?:\\s+sign)?\\s+is\\s+in\\s+([\\w\\s]+)`, 'i');
    const anywhereMatch = insight.message.match(anywhereRegex);
    if (anywhereMatch && anywhereMatch[1]) {
      console.log(`Found ${signType} sign mentioned elsewhere:`, anywhereMatch[1].trim());
      return anywhereMatch[1].trim();
    }
    
    // Try the Sanskrit to Western name mapping to extract the sign
    if (signType === 'Sun' && insight.message.includes('Mithuna')) {
      console.log('Found Sun sign as Mithuna (Gemini)');
      return 'Gemini';
    } else if (signType === 'Moon' && insight.message.includes('Vrischika')) {
      console.log('Found Moon sign as Vrischika (Scorpio)');
      return 'Scorpio';
    }
    
    // Check for all Sanskrit names in the message
    const sanskritNames = [
      {sanskrit: 'Mesha', western: 'Aries'},
      {sanskrit: 'Vrishabha', western: 'Taurus'},
      {sanskrit: 'Mithuna', western: 'Gemini'},
      {sanskrit: 'Karka', western: 'Cancer'},
      {sanskrit: 'Simha', western: 'Leo'},
      {sanskrit: 'Kanya', western: 'Virgo'},
      {sanskrit: 'Tula', western: 'Libra'},
      {sanskrit: 'Vrischika', western: 'Scorpio'},
      {sanskrit: 'Dhanu', western: 'Sagittarius'},
      {sanskrit: 'Makara', western: 'Capricorn'},
      {sanskrit: 'Kumbha', western: 'Aquarius'},
      {sanskrit: 'Meena', western: 'Pisces'}
    ];
    
    for (const {sanskrit, western} of sanskritNames) {
      // Check if there's a mention of the Sun/Moon with this Sanskrit name
      const sanskritRegex = new RegExp(`${signType}\\s+(?:is\\s+in|in)\\s+${sanskrit}`, 'i');
      if (insight.message.match(sanskritRegex)) {
        console.log(`Found ${signType} sign as ${sanskrit} (${western})`);
        return western;
      }
      
      // Check for parentheses format: "Sanskrit (Western)"
      const parenthesesRegex = new RegExp(`${signType}\\s+(?:is\\s+in|in)\\s+${sanskrit}\\s*\\(${western}\\)`, 'i');
      if (insight.message.match(parenthesesRegex)) {
        console.log(`Found ${signType} sign as ${sanskrit} (${western})`);
        return western;
      }
    }
    
    // Try to extract directly from Birth Chart Overview section
    const birthChartSection = insight.message.match(/Birth Chart Overview:([\s\S]*?)(?=\n\n|$)/i);
    if (birthChartSection) {
      // Look for "Sun in" or "Moon in" within this section
      const sectionMatch = birthChartSection[1].match(new RegExp(`${signType}\\s+in\\s+([\\w\\s]+)(?:\\s|,|\\.|$)`, 'i'));
      if (sectionMatch && sectionMatch[1]) {
        console.log(`Found ${signType} sign in Birth Chart Overview section:`, sectionMatch[1].trim());
        return sectionMatch[1].trim();
      }
    }
    
    console.log(`Could not find ${signType} sign in message`);
    return signType === 'Sun' ? 'Cosmic' : 'Mystic';
  };
  
  const sunSign = extractSign('Sun');
  const moonSign = extractSign('Moon');
  
  console.log('Extracted Sun sign:', sunSign);
  console.log('Extracted Moon sign:', moonSign);
  
  // Log the first 200 characters of the insight message for debugging
  console.log('Insight message beginning:', insight.message.substring(0, 200) + '...');
  
  // Extract the name from birth details
  const extractName = (): string => {
    // Try different patterns to find the name
    const nameMatch = insight.message.match(/Name:?\s*([^\n]+)/i) || 
                      insight.message.match(/reading for\s+([^(,.\n]+)/i) ||
                      insight.message.match(/chart(?:\s+reading)? for ([^(,.\n]+)/i) ||
                      insight.message.match(/(?:individual|person|native) named ([^(,.\n]+)/i);
    
    const extractedName = nameMatch ? nameMatch[1].trim() : '';
    
    // Use a proper display name - never empty, remove spaces/special chars
    return extractedName ? extractedName.replace(/[*•-]/g, '').trim() : 'Your';
  };
  
  const name = extractName();
  // Ensure no apostrophe in possessive for "Your"
  const displayPossessive = name === 'Your' ? 'Your' : `${name}'s`;
  
  // Extract personality overview
  const extractPersonality = (): string => {
    // First try with ## format
    const headeredMatch = insight.message.match(/## Personality Overview\n([^\n#]+)/);
    if (headeredMatch && headeredMatch[1].trim().length > 5) {
      return headeredMatch[1].trim();
    }
    
    // Try the new format without ## (Personality Overview: text)
    const colonMatch = insight.message.match(/Personality Overview:([^.]+)\./i);
    if (colonMatch && colonMatch[1].trim().length > 5) {
      return colonMatch[1].trim();
    }
    
    // Try to find a section that starts with "Personality Overview" anywhere
    const sectionMatch = insight.message.match(/Personality Overview(?:[\s\n]*)([^.]+)\./i);
    if (sectionMatch && sectionMatch[1].trim().length > 5) {
      return sectionMatch[1].trim();
    }
    
    // Try to extract from numbered list in personality section
    const listMatch = insight.message.match(/Personality Overview(?:[\s\S]*?)(?:1\.|\d+\.\s+|\*\s+|\-\s+)([^.\n]+)/i);
    if (listMatch && listMatch[1].trim().length > 5) {
      return listMatch[1].trim();
    }
    
    // Try to extract first line or paragraph from a personality overview section
    const paragraphMatch = insight.message.match(/Personality Overview(?:[\s\n]*)([\s\S]*?)(?=\n\n|$)/i);
    if (paragraphMatch) {
      // Get the first line or sentence
      const firstSentence = paragraphMatch[1].split(/\.|\n/)[0].trim();
      if (firstSentence.length > 5) {
        return firstSentence;
      }
    }
    
    // Extract any meaningful personality trait from the text
    const traitMatch = insight.message.match(/(?:individual|person|native|subject)\s+(?:is|has|possesses)\s+([^.]+)\./i);
    if (traitMatch && traitMatch[1].trim().length > 5) {
      return traitMatch[1].trim();
    }
    
    // Fallback
    return 'A balanced individual with unique cosmic energy';
  };
  
  const personalityText = extractPersonality();
  
  // Extract the defining word
  const extractDefiningWord = (): string => {
    const match = insight.message.match(/## Defining Word\n([^\n#]+)/);
    const rawWord = match ? match[1].trim() : 'Cosmic';
    // Remove all asterisks from the word
    const cleanWord = rawWord.replace(/\*/g, '');
    console.log('Extracted defining word:', cleanWord);
    // Ensure first letter is capitalized
    return cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1);
  };
  
  const definingWord = extractDefiningWord();
  
  // Get the appropriate sign emoji and color
  const getSignStyleInfo = (sign: string): { emoji: string, color: string } => {
    // First convert any Sanskrit/Vedic names to Western names
    const westernSign = convertToWestern(sign);
    
    const signInfo = {
      'Aries': { emoji: '♈', color: '#FF5252' },
      'Taurus': { emoji: '♉', color: '#66BB6A' },
      'Gemini': { emoji: '♊', color: '#FDD835' },
      'Cancer': { emoji: '♋', color: '#42A5F5' },
      'Leo': { emoji: '♌', color: '#FF9800' },
      'Virgo': { emoji: '♍', color: '#4CAF50' },
      'Libra': { emoji: '♎', color: '#5C6BC0' },
      'Scorpio': { emoji: '♏', color: '#F44336' },
      'Sagittarius': { emoji: '♐', color: '#9C27B0' },
      'Capricorn': { emoji: '♑', color: '#607D8B' },
      'Aquarius': { emoji: '♒', color: '#03A9F4' },
      'Pisces': { emoji: '♓', color: '#00BCD4' }
    };
    
    return signInfo[westernSign as keyof typeof signInfo] || { emoji: '⭐', color: '#9C27B0' };
  };
  
  // Convert Sanskrit/Vedic zodiac names to Western names
  const convertToWestern = (sign: string): string => {
    const sanskritToWestern: Record<string, string> = {
      'Mesha': 'Aries',
      'Vrishabha': 'Taurus',
      'Mithuna': 'Gemini',
      'Karka': 'Cancer',
      'Simha': 'Leo',
      'Kanya': 'Virgo',
      'Tula': 'Libra',
      'Vrischika': 'Scorpio',
      'Dhanu': 'Sagittarius',
      'Makara': 'Capricorn',
      'Kumbha': 'Aquarius',
      'Meena': 'Pisces'
    };
    
    // Check if the sign is a Sanskrit name and needs conversion
    const westernName = sanskritToWestern[sign];
    
    // If found, return the Western name, otherwise return the original
    return westernName || sign;
  };
  
  const sunSignInfo = getSignStyleInfo(sunSign);
  
  // Display the Western names for the sun and moon signs
  const displaySunSign = convertToWestern(sunSign);
  const displayMoonSign = convertToWestern(moonSign);
  
  // Get a random strength with improved extraction
  const extractStrength = (): string => {
    // First try with ## format
    const headeredMatch = insight.message.match(/## Key Strengths\n([\s\S]*?)(?=##|$)/);
    
    // If found with ## format, process it
    if (headeredMatch) {
      // First try to parse bullet points with dash format
      const strengthLines = headeredMatch[1].trim().split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('-') || line.startsWith('•') || line.startsWith('*') || /^\d+\./.test(line));
      
      if (strengthLines.length > 0) {
        // Clean the bullet points and remove numbering
        const cleanStrengths = strengthLines.map(line => 
          line.replace(/^-\s*|\*\s*|•\s*|\d+\.\s*/g, '').trim()
        );
        return cleanStrengths[Math.floor(Math.random() * cleanStrengths.length)];
      }
      
      // Fallback for other formats
      const rawText = headeredMatch[1].trim();
      const fallbackStrengths = rawText.split(/\n+/).filter(line => line.trim().length > 5);
      if (fallbackStrengths.length > 0) {
        return fallbackStrengths[Math.floor(Math.random() * fallbackStrengths.length)];
      }
    }
    
    // Try the new format without ## (Key Strengths: text)
    const colonMatch = insight.message.match(/Key Strengths:([\s\S]*?)(?=Potential|Challenges|Significant|$)/i);
    if (colonMatch) {
      const strengthText = colonMatch[1].trim();
      
      // Try to extract numbered items (1., 2., 3., etc.)
      const numberedRegex = /\d+\.\s*([^.]+)(?:\.|$)/g;
      const numberedMatches = Array.from(strengthText.matchAll(numberedRegex));
      
      if (numberedMatches.length > 0) {
        const numberedStrengths = numberedMatches.map(match => match[1].trim());
        return numberedStrengths[Math.floor(Math.random() * numberedStrengths.length)];
      }
      
      // If no numbered items, split by newlines
      const lines = strengthText.split(/\n+/).filter(line => line.trim().length > 5);
      if (lines.length > 0) {
        return lines[Math.floor(Math.random() * lines.length)];
      }
    }
    
    // Fallback to looking for strength-related statements
    const strengthKeywords = ['strong', 'talent', 'ability', 'skill', 'gift', 'excellence', 'aptitude', 'prowess'];
    for (const keyword of strengthKeywords) {
      const keywordMatch = insight.message.match(new RegExp(`([^.]+${keyword}[^.]+)\.`, 'i'));
      if (keywordMatch) {
        return keywordMatch[1].trim();
      }
    }
    
    return 'Your unique cosmic gifts';
  };
  
  const randomStrength = extractStrength();
  console.log('Random strength:', randomStrength);
  
  // Process the strength text to handle quoted content
  const processStrengthText = (text: string) => {
    if (text.includes('"')) {
      // Extract the content inside quotes to make bold
      const parts = text.split('"');
      if (parts.length >= 3) {
        return (
          <>
            <span style={{ fontWeight: 700, color: '#FFD700', textShadow: '0 0 8px rgba(255,215,0,0.6)' }}>
              {parts[1].trim()}
            </span>
            <span>{' ' + parts.slice(2).join('').replace(/^"/, '').trim()}</span>
          </>
        );
      }
    }
    return text;
  };

  // Get plain text version of the strength (without quotes) for sharing
  const getPlainStrength = (text: string) => {
    if (text.includes('"')) {
      return text.replace(/"/g, '');
    }
    return text;
  };
  
  // Add Twitter sharing functionality
  const shareOnTwitter = () => {
    const text = `Check out my cosmic insights! ${displaySunSign}, ${displayMoonSign}. ${getPlainStrength(randomStrength)}`;
    const url = 'https://astro-insights.app';
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };
  
  // Add Facebook sharing functionality
  const shareOnFacebook = () => {
    const url = 'https://astro-insights.app';
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  };
  
  // Add Instagram sharing note (Instagram doesn't support direct sharing through URLs)
  const shareOnInstagram = () => {
    // Since Instagram doesn't have a web share API like Twitter or Facebook,
    // we'll download the image and suggest the user to share it manually
    downloadCard();
    // Show a message (in a real app, you might want to add a proper toast or notification)
    alert('Image downloaded! You can share it on Instagram manually.');
  };
  
  return (
    <>
      {/* Psychedelic Retro Button */}
      <Zoom in={!open} style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 1000 }}>
        <Paper 
          elevation={6} 
          onClick={handleOpen}
          sx={{
            cursor: 'pointer',
            borderRadius: '18px',
            overflow: 'hidden',
            transform: 'rotate(-2deg)',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'rotate(1deg) scale(1.05)',
              boxShadow: '0 12px 20px rgba(0,0,0,0.4)'
            }
          }}
        >
          <Box
            sx={{
              background: 'linear-gradient(45deg, #FF6B6B, #FF9E53, #FFCA3A, #8AFF53, #53FFD5, #5271FF, #8453FF, #FF53C9)',
              backgroundSize: '400% 400%',
              animation: 'gradient 15s ease infinite',
              padding: '2px',
              '@keyframes gradient': {
                '0%': { backgroundPosition: '0% 50%' },
                '50%': { backgroundPosition: '100% 50%' },
                '100%': { backgroundPosition: '0% 50%' }
              },
            }}
          >
            <Box
              sx={{
                bgcolor: 'rgba(0,0,0,0.8)',
                py: 1.5,
                px: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '16px',
              }}
            >
              <Typography
                variant="button"
                sx={{
                  color: 'white',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  fontSize: '0.9rem',
                  letterSpacing: '0.05em',
                  textShadow: '0 0 5px rgba(255,255,255,0.7), 0 0 10px rgba(255,107,107,0.5)',
                }}
              >
                Get Your Astro Card Now
              </Typography>
              <Box 
                component="span" 
                sx={{ 
                  ml: 1, 
                  fontSize: '1.1rem',
                  animation: 'pulse 1.5s infinite',
                  '@keyframes pulse': {
                    '0%': { opacity: 0.6 },
                    '50%': { opacity: 1 },
                    '100%': { opacity: 0.6 }
                  }
                }}
              >
                ✨
              </Box>
            </Box>
          </Box>
        </Paper>
      </Zoom>
      
      {/* Share Card Modal */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          style: {
            backgroundColor: 'rgba(17, 25, 40, 0.95)',
            backdropFilter: 'blur(16px)',
            borderRadius: 16,
            overflow: 'auto',
            height: 'auto',
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          p: 2,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <Typography variant="h6" component="div" sx={{ color: 'white', fontWeight: 500 }}>
            Share Your Cosmic Insights
          </Typography>
          <IconButton onClick={handleClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* The Shareable Card */}
          <Box sx={{ 
            width: '100%',
            display: 'flex', 
            justifyContent: 'center', 
            mb: 3,
            overflow: 'auto'
          }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Box 
                ref={cardRef}
                data-card-ref="true"
                sx={{
                  width: { xs: 320, sm: 360 }, // Responsive width
                  height: 'auto',
                  minHeight: 650,
                  maxHeight: { xs: 800, sm: 850 }, // Increased maxHeight
                  borderRadius: 4,
                  overflow: 'hidden',
                  position: 'relative',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 80px rgba(101, 31, 255, 0.2)',
                  background: `linear-gradient(135deg, #2E0854, #590D82)`,
                  display: 'flex',
                  flexDirection: 'column',
                  p: 0,
                  border: `2px solid rgba(255, 218, 121, 0.4)`,
                  mx: 'auto' // Center horizontally
                }}
              >
                {/* Simplified Background Pattern */}
                <Box sx={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  bottom: 0, 
                  opacity: isCapturing ? 0.05 : 0.12,
                  backgroundColor: 'rgba(255,193,7,0.15)',
                  ...(isCapturing ? 
                    {} : 
                    {
                      backgroundImage: 'radial-gradient(circle, rgba(255,193,7,0.3) 30%, rgba(229,57,53,0.2) 70%)',
                      backgroundSize: '100% 100%',
                      backgroundPosition: 'center',
                    }
                  )
                }} />
                
                {/* Floating Astrological Symbols - with stable positions */}
                <Box sx={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  bottom: 0, 
                  overflow: 'hidden',
                  zIndex: 1,
                  pointerEvents: 'none',
                  opacity: isCapturing ? 0.05 : 1
                }}>
                  {['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '☿', '♀', '♂', '♃', '♄', '⚸', '♅', '♆', '♇'].map((symbol, i) => (
                    <Box
                      key={i}
                      sx={{
                        position: 'absolute',
                        left: symbolPositions[i]?.left || '50%',
                        top: symbolPositions[i]?.top || '50%',
                        color: 'rgba(255,255,255,0.12)',
                        fontSize: symbolPositions[i]?.size || '16px',
                        transform: symbolPositions[i]?.rotation || 'rotate(0deg)',
                        opacity: symbolPositions[i]?.opacity || 0.2,
                      }}
                    >
                      {symbol}
                    </Box>
                  ))}
                </Box>
                
                {/* Header Section with Mandala-inspired Design */}
                <Box sx={{ 
                  pt: 4, // Reduced top padding
                  pb: 2, // Reduced bottom padding
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  zIndex: 5,
                  backgroundImage: isCapturing ? 'none' : 'radial-gradient(circle at 50% 10%, rgba(249, 168, 212, 0.15), rgba(104, 58, 183, 0.05))'
                }}>
                  <Box sx={{ 
                    width: 80,
                    height: 80,
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '36px',
                    backgroundColor: 'rgba(255,193,7,0.15)',
                    color: 'rgba(255,255,255,0.9)',
                    border: '2px solid rgba(255,218,121,0.3)',
                    boxShadow: isCapturing ? 'none' : '0 0 20px rgba(255,193,7,0.4), inset 0 0 10px rgba(255,255,255,0.2)',
                    mb: 2,
                    position: 'relative',
                  }}>
                    {sunSignInfo.emoji}
                    
                    {/* Simplified orbit circles */}
                    {!isCapturing && (
                      <>
                        <Box sx={{
                          position: 'absolute',
                          width: '120%',
                          height: '120%',
                          borderRadius: '50%',
                          border: '1px solid rgba(255,218,121,0.2)',
                        }} />
                        <Box sx={{
                          position: 'absolute',
                          width: '150%',
                          height: '150%',
                          borderRadius: '50%',
                          border: '1px solid rgba(255,218,121,0.15)',
                        }} />
                      </>
                    )}
                  </Box>
                  
                  <Typography 
                    variant="h5" 
                    component="div"
                    sx={{ 
                      color: 'rgba(255,255,255,0.92)', 
                      fontWeight: 700, 
                      mb: 1,
                      textShadow: '0 0 10px rgba(255,193,7,0.5)',
                      letterSpacing: '0.05em',
                      fontFamily: '"Courier New", Courier, monospace'
                    }}
                  >
                    {displayPossessive} Cosmic Card
                  </Typography>
                  
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    zIndex: 5,
                  }}>
                    <Typography 
                      variant="subtitle1" 
                      sx={{ 
                        color: 'rgba(255,255,255,0.92)', 
                        fontWeight: 700, 
                        mb: 0.5,
                        textShadow: '0 0 10px rgba(255,193,7,0.5)',
                        letterSpacing: '0.05em',
                        fontFamily: '"Courier New", Courier, monospace'
                      }}
                    >
                     ✨  {definingWord} ✨ 
                    </Typography>
                  
                  </Box>
                </Box>
                
                {/* Divider with Lotus Symbol */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  px: 3,
                  mb: 1.5, // Reduced bottom margin
                  zIndex: 5
                }}>
                  <Box sx={{ 
                    flex: 1, 
                    height: '1px', 
                    backgroundColor: 'rgba(255,218,121,0.3)',
                    ...(isCapturing ? {} : {
                      background: 'linear-gradient(to right, transparent, rgba(255,218,121,0.3), transparent)'
                    })
                  }} />
                  <Typography sx={{ px: 2, color: 'rgba(255,218,121,0.8)', fontSize: '16px', display: 'flex', alignItems: 'center' }}>
                    ☸️
                  </Typography>
                  <Box sx={{ 
                    flex: 1, 
                    height: '1px', 
                    backgroundColor: 'rgba(255,218,121,0.3)',
                    ...(isCapturing ? {} : {
                      background: 'linear-gradient(to right, transparent, rgba(255,218,121,0.3), transparent)'
                    })
                  }} />
                </Box>
                
                {/* Sign Info with Psychedelic Color Accents */}
                <Box sx={{ 
                  px: 3, 
                  py: 1.5, // Reduced vertical padding
                  display: 'flex',
                  justifyContent: 'space-around',
                  mb: 1.5, // Reduced bottom margin
                  zIndex: 5
                }}>
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    backgroundColor: 'rgba(0,0,0,0.25)',
                    borderRadius: '12px',
                    px: 3,
                    py: 1.5,
                    border: '1px solid rgba(255,218,121,0.15)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>
                    <Typography sx={{ 
                      color: 'white', 
                      fontWeight: 600, 
                      fontSize: '1.1rem',
                      textShadow: '0 0 8px rgba(255,193,7,0.4)'
                    }}>
                      Sun - {displaySunSign}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    backgroundColor: 'rgba(0,0,0,0.25)',
                    borderRadius: '12px',
                    px: 3,
                    py: 1.5,
                    border: '1px solid rgba(120,160,255,0.15)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>
                    <Typography sx={{ 
                      color: 'white', 
                      fontWeight: 600, 
                      fontSize: '1.1rem',
                      textShadow: '0 0 8px rgba(120,160,255,0.5)'
                    }}>
                      Moon - {displayMoonSign}
                    </Typography>
                  </Box>
                </Box>
                
                {/* Main Content */}
                <Box sx={{ 
                  px: 3,
                  py: 1,
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  zIndex: 5,
                  overflowY: 'auto' // Add overflow so content can scroll if needed
                }}>
                  {/* Cosmic Insight Box with Psychedelic Border */}
                  <Box sx={{ 
                    position: 'relative',
                    width: '100%',
                    mb: 2, // Reduced bottom margin
                    p: 0.5,
                    borderRadius: 4,
                    backgroundColor: isCapturing ? 'rgba(255,193,7,0.3)' : undefined,
                    ...(isCapturing ? {} : {
                      background: 'linear-gradient(45deg, #FF5722, #FF9800, #FFC107, #8BC34A, #4CAF50, #03A9F4, #3F51B5, #9C27B0)',
                      backgroundSize: '300% 300%',
                      animation: 'gradientBorder 10s ease infinite',
                      '@keyframes gradientBorder': {
                        '0%': { backgroundPosition: '0% 50%' },
                        '50%': { backgroundPosition: '100% 50%' },
                        '100%': { backgroundPosition: '0% 50%' }
                      }
                    })
                  }}>
                    <Box sx={{ 
                      bgcolor: 'rgba(30, 20, 40, 0.85)', 
                      borderRadius: 3.5,
                      p: 2, // Reduced padding
                      boxShadow: isCapturing ? 'none' : 'inset 0 2px 10px rgba(0,0,0,0.3)',
                      backdropFilter: isCapturing ? 'none' : 'blur(4px)'
                    }}>
                      <Typography 
                        variant="h6" 
                        component="div"
                        sx={{ 
                          color: 'rgba(255,218,121,0.9)', 
                          fontWeight: 700, 
                          mb: 0.5, // Reduced bottom margin
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          fontSize: '0.9rem',
                          textShadow: '0 0 8px rgba(255,193,7,0.4)',
                          fontFamily: '"Courier New", Courier, monospace'
                        }}
                      >
                        COSMIC INSIGHT
                      </Typography>
                      
                      <Typography 
                        sx={{ 
                          color: 'white', 
                          fontWeight: 400,
                          fontSize: '0.95rem', // Slightly smaller text
                          fontStyle: 'italic',
                          lineHeight: 1.4, // Reduced line height
                          textShadow: '0 0 5px rgba(0,0,0,0.5)'
                        }}
                      >
                        "{personalityText}"
                      </Typography>
                    </Box>
                  </Box>
                  
                  {/* Superpower Box with Psychedelic Border */}
                  <Box sx={{ 
                    position: 'relative',
                    width: '100%',
                    mb: 2, // Reduced bottom margin
                    p: 0.5,
                    borderRadius: 4,
                    backgroundColor: isCapturing ? 'rgba(229,57,53,0.3)' : undefined,
                    ...(isCapturing ? {} : {
                      background: 'linear-gradient(45deg, #9C27B0, #3F51B5, #03A9F4, #4CAF50, #8BC34A, #FFC107, #FF9800, #FF5722)',
                      backgroundSize: '300% 300%',
                      animation: 'gradientBorder 10s ease infinite reverse',
                    })
                  }}>
                    <Box sx={{ 
                      bgcolor: 'rgba(30, 20, 40, 0.85)', 
                      borderRadius: 3.5,
                      p: 2, // Reduced padding
                      boxShadow: isCapturing ? 'none' : 'inset 0 2px 10px rgba(0,0,0,0.3)',
                      backdropFilter: isCapturing ? 'none' : 'blur(4px)'
                    }}>
                      <Typography 
                        variant="h6" 
                        component="div"
                        sx={{ 
                          color: 'rgba(229,57,53,0.9)', 
                          fontWeight: 700, 
                          mb: 0.5, // Reduced bottom margin
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          fontSize: '0.9rem',
                          textShadow: '0 0 8px rgba(229,57,53,0.4)',
                          fontFamily: '"Courier New", Courier, monospace'
                        }}
                      >
                        YOUR SUPERPOWER
                      </Typography>
                      
                      <Typography 
                        sx={{ 
                          color: 'white', 
                          fontWeight: 500, 
                          fontSize: '1rem', // Slightly smaller text
                          lineHeight: 1.4, // Reduced line height
                          textShadow: '0 0 5px rgba(0,0,0,0.5)'
                        }}
                      >
                        {processStrengthText(randomStrength)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                
                {/* Footer with simpler pattern */}
                <Box sx={{ 
                  p: 1.5, // Reduced padding
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  position: 'relative',
                  overflow: 'hidden',
                  zIndex: 5,
                  mt: 'auto' // Push to bottom if there's space
                }}>
                  {!isCapturing && (
                    <Box sx={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
                      backgroundSize: '15px 15px',
                      opacity: 0.1
                    }}/>
                  )}
                  
                  <Typography sx={{ 
                    color: 'rgba(255,255,255,0.7)', 
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    letterSpacing: '0.05em',
                    textShadow: isCapturing ? 'none' : '0 0 5px rgba(0,0,0,0.5)',
                    fontFamily: '"Courier New", Courier, monospace'
                  }}>
                     • astro-insights.app • 
                  </Typography>
                </Box>
              </Box>
            </motion.div>
          </Box>
          
          {/* Share Options */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
            <Button 
              variant="contained" 
              startIcon={<DownloadIcon />}
              onClick={downloadCard}
              sx={{ 
                background: 'linear-gradient(45deg, #651fff, #d500f9)',
                boxShadow: '0 4px 10px rgba(101, 31, 255, 0.3)',
                px: 3
              }}
            >
              Download
            </Button>
            
            <IconButton 
              sx={{ 
                color: '#1DA1F2',
                bgcolor: 'rgba(29, 161, 242, 0.1)',
                '&:hover': {
                  bgcolor: 'rgba(29, 161, 242, 0.2)'
                }
              }}
              onClick={shareOnTwitter}
            >
              <TwitterIcon />
            </IconButton>
            
            <IconButton 
              sx={{ 
                color: '#C13584',
                bgcolor: 'rgba(193, 53, 132, 0.1)',
                '&:hover': {
                  bgcolor: 'rgba(193, 53, 132, 0.2)'
                }
              }}
              onClick={shareOnInstagram}
            >
              <InstagramIcon />
            </IconButton>
            
            <IconButton 
              sx={{ 
                color: '#4267B2',
                bgcolor: 'rgba(66, 103, 178, 0.1)',
                '&:hover': {
                  bgcolor: 'rgba(66, 103, 178, 0.2)'
                }
              }}
              onClick={shareOnFacebook}
            >
              <FacebookIcon />
            </IconButton>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ShareCard; 