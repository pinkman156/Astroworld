import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AstrologyInsight as AstrologyInsightType, BirthData, VedicChart } from '../types';
import VedicDashboard from './vedic-dashboard/VedicDashboard';
import { mockVedicData } from '../data/mockVedicData';
import api from '../services/api';
// Import Material-UI components
import { 
  Box, 
  Card, 
  CardContent, 
  CardHeader, 
  Typography, 
  Grid, 
  Paper,
  Divider,
  LinearProgress,
  Button,
  Dialog, DialogTitle, DialogContent, DialogActions, 
  IconButton
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import StarIcon from '@mui/icons-material/Star';
import CloseIcon from '@mui/icons-material/Close';

interface AstrologyInsightProps {
  insight: AstrologyInsightType;
}

const AstrologyInsight: React.FC<AstrologyInsightProps> = ({ insight }) => {
  const [showFullAnalysis, setShowFullAnalysis] = useState<boolean>(false);
  const [vedicData, setVedicData] = useState<VedicChart>(mockVedicData);
  const [isLoadingVedicData, setIsLoadingVedicData] = useState<boolean>(false);
  const [dataSource, setDataSource] = useState<'api' | 'mock' | 'cached'>('mock');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [openProDialog, setOpenProDialog] = useState<boolean>(false);
  
  // Use ref to track if data has been loaded to prevent duplicate API calls
  const dataLoadedRef = useRef<boolean>(false);

  // Extract birth details from the insight message
  const extractBirthDetails = (): BirthData | null => {
    if (!insight.message) return null;
    
    try {
      // Extract birth details section from the message
      const birthDetailsSection = insight.message.match(/## Birth Details([\s\S]*?)##/);
      if (!birthDetailsSection) return null;
      
      const birthDetailsText = birthDetailsSection[1];
      
      // Extract date, time, and place using regex
      const dateMatch = birthDetailsText.match(/Date: (.+?)(?:\r?\n|-|$)/);
      const timeMatch = birthDetailsText.match(/Time: (.+?)(?:\r?\n|-|$)/);
      const placeMatch = birthDetailsText.match(/Place: (.+?)(?:\r?\n|-|$)/);
      
      if (!dateMatch || !timeMatch || !placeMatch) return null;
      
      let date = dateMatch[1].trim();
      // Pre-process the date to remove any extra spaces or characters
      date = date.replace(/\s+/g, ' ').trim();
      console.log('Extracted date before processing:', date);
      
      let time = timeMatch[1].trim().replace(' IST', '');
      const place = placeMatch[1].trim();
      
      // IMPORTANT: We need to preserve the exact date from the insight message
      // This is crucial to honor the date the AI generated for the insight
      // If the format is already YYYY-MM-DD, keep it as is
      if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(date)) {
        console.log('Date not in YYYY-MM-DD format, will attempt to format:', date);
        
        // Special case for year 2000 to use June 15th rather than January 1st
        if (date === '2000') {
          date = '2000-06-15'; // This matches the example chart data
          console.log('Using special date for year 2000:', date);
        }
        // Handle other specific formats
        else if (/^\d{4}$/.test(date)) {
          console.log('Detected year-only format:', date);
          
          // Use mid-year as default rather than January 1st
          date = `${date}-06-15`; // Using June 15th as a mid-year default
          console.log('Using mid-year date for year-only format:', date);
        } 
        // Month and year (e.g. "June 2000")
        else if (/^[a-zA-Z]+\s+\d{4}$/.test(date)) {
          console.log('Detected month-year format:', date);
          const parts = date.split(' ');
          const month = new Date(`${parts[0]} 1, 2000`).getMonth() + 1;
          date = `${parts[1]}-${month.toString().padStart(2, '0')}-15`;
          console.log('Reformatted month-year date to:', date);
        }
        // American format (MM/DD/YYYY)
        else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(date)) {
          const parts = date.split('/');
          date = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
          console.log('Reformatted MM/DD/YYYY date to:', date);
        }
        // European format (DD/MM/YYYY)
        else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(date)) {
          const parts = date.split('-');
          date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          console.log('Reformatted DD-MM-YYYY date to:', date);
        }
        // Month name format (e.g. "June 15, 2000")
        else if (/[a-zA-Z]+\s+\d{1,2},?\s+\d{4}/.test(date)) {
          try {
            const parsedDate = new Date(date);
            if (!isNaN(parsedDate.getTime())) {
              date = parsedDate.toISOString().split('T')[0];
              console.log('Reformatted text date to:', date);
            } else {
              throw new Error('Invalid date after parsing month name format');
            }
          } catch (error) {
            console.error('Failed to parse date with month name:', error);
            return null;
          }
        }
        // As a last resort, try generic Date parsing 
        else {
          try {
            console.log('Attempting generic date parsing for:', date);
            const parsedDate = new Date(date);
            if (!isNaN(parsedDate.getTime())) {
              date = parsedDate.toISOString().split('T')[0];
              console.log('Reformatted date through generic parsing to:', date);
            } else {
              console.error('Date could not be parsed:', date);
              // If everything fails but we have a 4-digit number, treat it as a year
              if (/^\d{4}/.test(date.replace(/\D/g, ''))) {
                const yearDigits = date.replace(/\D/g, '').substring(0, 4);
                date = `${yearDigits}-06-15`; // Use June 15th instead of January 1st
                console.log('Last resort: Using June 15th for year digits:', date);
              } else {
                return null; // Invalid date format and couldn't be parsed
              }
            }
          } catch (error) {
            console.error('Date parsing error:', error);
            return null;
          }
        }
      }
      
      // Validate time format (HH:MM)
      if (!/^\d{1,2}:\d{1,2}$/.test(time)) {
        console.error('Invalid time format:', time);
        
        // Try to extract hours and minutes
        const timeMatches = time.match(/(\d{1,2})[^\d]*(\d{1,2})/);
        if (timeMatches) {
          const hours = parseInt(timeMatches[1], 10);
          const minutes = parseInt(timeMatches[2], 10);
          
          // Validate hours and minutes
          if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
            // Format as HH:MM
            time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            console.log('Reformatted time to:', time);
          } else {
            return null; // Invalid time values
          }
        } else {
          return null; // Couldn't extract hours and minutes
        }
      }
      
      return {
        date,
        time,
        place,
        name: '' // Add default empty name to match the BirthData type
      };
    } catch (error) {
      console.error('Error extracting birth details:', error);
      return null;
    }
  };

  // Load Vedic chart data when user clicks to view the full analysis
  useEffect(() => {
    const loadVedicData = async () => {
      // Only load data if:
      // 1. User wants to see full analysis
      // 2. We're not already loading data
      // 3. We haven't already loaded data for this birth chart
      if (showFullAnalysis && !isLoadingVedicData && !dataLoadedRef.current) {
        setIsLoadingVedicData(true);
        setErrorMessage(null);
        
        try {
          // Extract birth details from the insight message
          const birthDetails = extractBirthDetails();
          
          if (birthDetails) {
            console.log('Fetching Vedic chart data with birth details:', birthDetails);
            
            // Clear any previous error
            setErrorMessage(null);
            
            try {
              // Get Vedic chart data from API (with caching)
              const data = await api.getVedicChartData(birthDetails);
              
              // Set the Vedic data
              setVedicData(data);
              
              // Determine if this is real API data or mock data
              // We're checking a unique property that would only exist in mock data
              const isMockData = 
                data.birthChart.planets.some(p => p.id === 'sun' && p.sign === 9 && p.house === 9 && p.degree === 15.5) &&
                data.dashas.currentMahadasha.planet === 'Saturn' &&
                data.dashas.currentMahadasha.startDate === '2019-04-12';
                
              setDataSource(isMockData ? 'mock' : 'cached');
              console.log('Data source identified as:', isMockData ? 'mock' : 'api/cached');
              
              // Mark data as loaded to prevent duplicate API calls
              dataLoadedRef.current = true;
            } catch (error) {
              console.error('API error fetching Vedic chart data:', error);
              setErrorMessage('Unable to generate astrological data. Using sample data instead.');
              setVedicData(mockVedicData);
              setDataSource('mock');
            }
          } else {
            console.log('Could not extract birth details, using mock data');
            setErrorMessage('Could not determine birth details from the reading. Using sample data instead.');
            setVedicData(mockVedicData);
            setDataSource('mock');
          }
        } catch (error) {
          console.error('Error loading Vedic chart data:', error);
          setErrorMessage('An error occurred while generating the cosmic analysis. Using sample data instead.');
          setVedicData(mockVedicData);
          setDataSource('mock');
        } finally {
          setIsLoadingVedicData(false);
        }
      }
    };
    
    loadVedicData();
  }, [showFullAnalysis, isLoadingVedicData, insight.message]);

  // Reset loaded state when insight changes
  useEffect(() => {
    dataLoadedRef.current = false;
    setDataSource('mock');
    setErrorMessage(null);
  }, [insight.message]);

  // PRO Dialog handlers
  const handleProDialogOpen = () => {
    setOpenProDialog(true);
  };
  
  const handleProDialogClose = () => {
    setOpenProDialog(false);
  };

  // Loading state
  if (insight.loading) {
    return (
      <div className="p-6 bg-astro-bg-tertiary/30 rounded-lg border border-astro-border-light">
        <div className="flex items-center justify-center mb-5">
          <div className="w-12 h-12 rounded-full border-2 border-astro-accent-primary/20 border-t-astro-accent-primary animate-spin"></div>
        </div>
        <p className="text-astro-text-secondary text-center">
          Consulting vedic knowledge for your personalized insight...
        </p>
      </div>
    );
  }

  // Error state
  if (insight.error) {
    return (
      <div className="p-6 bg-astro-bg-tertiary/30 rounded-lg border border-red-500/30">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center mr-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 7v6M12 17.01V17M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="text-lg font-medium text-red-500">Analysis Error</h3>
        </div>
        <p className="text-astro-text-secondary mb-4">
          {insight.error}
        </p>
        <p className="text-astro-text-muted text-sm">
          Please try again with different birth details.
        </p>
      </div>
    );
  }

  // No message yet
  if (!insight.message && !showFullAnalysis) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      {!showFullAnalysis ? (
        <motion.div
          key="message"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="p-6 bg-astro-bg-tertiary/30 rounded-lg border border-astro-border-light relative overflow-hidden"
        >
          {/* Cosmic background effect */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-cover bg-center" style={{ 
              backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'400\' viewBox=\'0 0 800 800\'%3E%3Cg fill=\'none\' stroke=\'%23404\' stroke-width=\'1\'%3E%3Cpath d=\'M769 229L1037 260.9M927 880L731 737 520 660 309 538 40 599 295 764 126.5 879.5 40 599-197 493 102 382-31 229 126.5 79.5-69-63\'/%3E%3Cpath d=\'M-31 229L237 261 390 382 603 493 308.5 537.5 101.5 381.5M370 905L295 764\'/%3E%3Cpath d=\'M520 660L578 842 731 737 840 599 603 493 520 660 295 764 309 538 390 382 539 269 769 229 577.5 41.5 370 105 295 -36 126.5 79.5 237 261 102 382 40 599 -69 737 127 880\'/%3E%3Cpath d=\'M520-140L578.5 42.5 731-63M603 493L539 269 237 261 370 105M902 382L539 269M390 382L102 382\'/%3E%3Cpath d=\'M-222 42L126.5 79.5 370 105 539 269 577.5 41.5 927 80 769 229 902 382 603 493 731 737M295-36L577.5 41.5M578 842L295 764M40-201L127 80M102 382L-261 269\'/%3E%3C/g%3E%3Cg fill=\'%235d4e9d\'%3E%3Ccircle cx=\'769\' cy=\'229\' r=\'5\'/%3E%3Ccircle cx=\'539\' cy=\'269\' r=\'5\'/%3E%3Ccircle cx=\'603\' cy=\'493\' r=\'5\'/%3E%3Ccircle cx=\'731\' cy=\'737\' r=\'5\'/%3E%3Ccircle cx=\'520\' cy=\'660\' r=\'5\'/%3E%3Ccircle cx=\'309\' cy=\'538\' r=\'5\'/%3E%3Ccircle cx=\'295\' cy=\'764\' r=\'5\'/%3E%3Ccircle cx=\'40\' cy=\'599\' r=\'5\'/%3E%3Ccircle cx=\'102\' cy=\'382\' r=\'5\'/%3E%3Ccircle cx=\'127\' cy=\'80\' r=\'5\'/%3E%3Ccircle cx=\'370\' cy=\'105\' r=\'5\'/%3E%3Ccircle cx=\'578\' cy=\'42\' r=\'5\'/%3E%3Ccircle cx=\'237\' cy=\'261\' r=\'5\'/%3E%3Ccircle cx=\'390\' cy=\'382\' r=\'5\'/%3E%3C/g%3E%3C/svg%3E")',
              backgroundSize: 'cover'
            }}></div>
            <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-astro-bg-tertiary/30 to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-astro-bg-tertiary/30 to-transparent"></div>
          </div>

          <div className="relative z-10">
            <Card elevation={3} sx={{ 
              mb: 4, 
              background: 'rgba(10, 15, 30, 0.75)',
              backdropFilter: 'blur(12px)', 
              border: '1px solid rgba(78, 75, 120, 0.35)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)'
            }}>
              <CardHeader
                avatar={
                  <div className="w-8 h-8 rounded-full bg-astro-accent-primary/20 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
                    fill="#D4AF61" />
                </svg>
              </div>
                }
                title={<Typography variant="h5" sx={{ color: '#D4AF61', fontWeight: 500 }}>Astrological Analysis</Typography>}
                sx={{ py: 1.5, px: 2 }}
              />
              <CardContent sx={{ backgroundColor: 'rgba(13, 18, 35, 0.9)' }}>
            {insight.message && (
                  <Box className="space-y-6">
                {/* Birth Details Dashboard */}
                {(() => {
                  // Extract birth details section
                  const birthDetailsMatch = insight.message.match(/## Birth Data([\s\S]*?)(?=##|$)/) || 
                                           insight.message.match(/## Birth Details([\s\S]*?)(?=##|$)/);
                  const birthDetailsText = birthDetailsMatch ? birthDetailsMatch[1] : '';
                  
                  // Extract specific details with improved parsing
                  const nameMatch = birthDetailsText.match(/Name: (.+?)(?:\r?\n|-|$)/);
                  const dateMatch = birthDetailsText.match(/(?:Birth )?Date: (.+?)(?:\r?\n|-|$)/);
                  const timeMatch = birthDetailsText.match(/(?:Birth )?Time: (.+?)(?:\r?\n|-|$)/);
                  const placeMatch = birthDetailsText.match(/(?:Birth )?Place: (.+?)(?:\r?\n|-|$)/);
                  
                  const name = nameMatch ? nameMatch[1].trim() : '';
                  const date = dateMatch ? dateMatch[1].trim() : '';
                  const time = timeMatch ? timeMatch[1].trim() : '';
                  const place = placeMatch ? placeMatch[1].trim() : '';
                  
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                          whileHover={{ y: -5 }}
                        >
                          <Card sx={{ 
                            overflow: 'hidden', 
                            boxShadow: '0 4px 24px rgba(0,0,0,0.4)', 
                            mb: 3,
                            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.25) 0%, rgba(147, 51, 234, 0.25) 100%)',
                            border: '1px solid rgba(79, 70, 229, 0.35)'
                          }}>
                            <Box sx={{ 
                              p: 2, 
                              background: 'linear-gradient(90deg, #4338CA 0%, #7E22CE 100%)', 
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              py: 1.5
                            }}>
                              <Typography variant="h6" fontWeight={500}>Birth Details</Typography>
                            </Box>
                            <CardContent sx={{ p: 2, bgcolor: 'rgba(13, 18, 35, 0.8)' }}>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                {name && (
                                  <Box sx={{ flex: '1 1 100%', minWidth: '240px', mb: 1 }}>
                                    <Paper sx={{ 
                                      p: 2, 
                                      bgcolor: 'rgba(79, 70, 229, 0.15)', 
                                      height: '80%',
                                      display: 'flex',
                                      flexDirection: 'column'
                                    }}>
                                      <Typography variant="overline" sx={{ color: 'rgba(255, 255, 255, 0.75)', fontWeight: 500 }}>
                                        Name
                                      </Typography>
                                      <Typography variant="body1" fontWeight={500} sx={{ mt: 1, color: 'white' }}>
                                        {name}
                                      </Typography>
                                    </Paper>
                                  </Box>
                                )}
                                
                                <Box sx={{ 
                                  display: 'flex', 
                                  flexWrap: 'wrap', 
                                  width: '100%', 
                                  gap: 2
                                }}>
                                  <Box sx={{ flex: '1 1 calc(33.333% - 16px)', minWidth: '240px' }}>
                                    <Paper sx={{ 
                                      p: 2, 
                                      bgcolor: 'rgba(79, 70, 229, 0.2)', 
                                      height: '100%',
                                      display: 'flex',
                                      flexDirection: 'column'
                                    }}>
                                      <Typography variant="overline" sx={{ color: 'rgba(255, 255, 255, 0.75)', fontWeight: 500 }}>
                                        Date
                                      </Typography>
                                      <Typography variant="body1" fontWeight={500} sx={{ mt: 1, color: 'white' }}>
                                        {date}
                                      </Typography>
                                    </Paper>
                                  </Box>
                                  
                                  <Box sx={{ flex: '1 1 calc(33.333% - 16px)', minWidth: '240px' }}>
                                    <Paper sx={{ 
                                      p: 2, 
                                      bgcolor: 'rgba(147, 51, 234, 0.2)', 
                                      height: '100%',
                                      display: 'flex',
                                      flexDirection: 'column'
                                    }}>
                                      <Typography variant="overline" sx={{ color: 'rgba(255, 255, 255, 0.75)', fontWeight: 500 }}>
                                        Time
                                      </Typography>
                                      <Typography variant="body1" fontWeight={500} sx={{ mt: 1, color: 'white' }}>
                                        {time}
                                      </Typography>
                                    </Paper>
                                  </Box>
                                  
                                  <Box sx={{ flex: '1 1 calc(33.333% - 16px)', minWidth: '240px' }}>
                                    <Paper sx={{ 
                                      p: 2, 
                                      bgcolor: 'rgba(192, 38, 211, 0.2)', 
                                      height: '100%',
                                      display: 'flex',
                                      flexDirection: 'column'
                                    }}>
                                      <Typography variant="overline" sx={{ color: 'rgba(255, 255, 255, 0.75)', fontWeight: 500 }}>
                                        Place
                                      </Typography>
                                      <Typography variant="body1" fontWeight={500} sx={{ mt: 1, color: 'white' }}>
                                        {place}
                                      </Typography>
                                    </Paper>
                                  </Box>
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                    </motion.div>
                  );
                })()}
                
                {/* Ascendant/Lagna Dashboard */}
                {(() => {
                  // Extract Ascendant section
                  const ascendantMatch = insight.message.match(/## Ascendant\/Lagna([\s\S]*?)(?=##|$)/);
                  const ascendantText = ascendantMatch ? ascendantMatch[1].trim() : '';
                  
                  // Determine the ascendant sign from text
                  let ascendantSign = '♌'; // Default to Leo
                  
                  // Check for sign names in the text
                  const signNames = [
                        { name: 'Aries', symbol: '♈', color: '#FF5252' },
                        { name: 'Taurus', symbol: '♉', color: '#66BB6A' },
                        { name: 'Gemini', symbol: '♊', color: '#FDD835' },
                        { name: 'Cancer', symbol: '♋', color: '#42A5F5' },
                        { name: 'Leo', symbol: '♌', color: '#FF9800' },
                        { name: 'Virgo', symbol: '♍', color: '#4CAF50' },
                        { name: 'Libra', symbol: '♎', color: '#5C6BC0' },
                        { name: 'Scorpio', symbol: '♏', color: '#F44336' },
                        { name: 'Sagittarius', symbol: '♐', color: '#9C27B0' },
                        { name: 'Capricorn', symbol: '♑', color: '#607D8B' },
                        { name: 'Aquarius', symbol: '♒', color: '#03A9F4' },
                        { name: 'Pisces', symbol: '♓', color: '#00BCD4' }
                  ];
                  
                  // Find the sign from the ascendant text
                  let signColor = '#FF9800';
                  let ascendantDescription = "Your rising sign represents how others perceive you.";
                  
                  for (const sign of signNames) {
                    if (ascendantText.toLowerCase().includes(sign.name.toLowerCase())) {
                      ascendantSign = sign.symbol;
                      signColor = sign.color;
                      break;
                    }
                  }
                  
                  // Always use the actual text from the API response
                  // Even if it's short, it's better than a default message
                  if (ascendantText) {
                    ascendantDescription = ascendantText;
                  }
                  
                  console.log("Ascendant text from API:", ascendantText);
                  
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                          whileHover={{ y: -5 }}
                        >
                          <Card sx={{ 
                            overflow: 'hidden', 
                            boxShadow: '0 4px 24px rgba(0,0,0,0.4)', 
                            mb: 3,
                            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(234, 88, 12, 0.25) 100%)',
                            border: '1px solid rgba(245, 158, 11, 0.35)'
                          }}>
                            <Box sx={{ 
                              p: 2, 
                              background: 'linear-gradient(90deg, #D97706 0%, #C2410C 100%)', 
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              py: 1.5
                            }}>
                              <Typography variant="h6" fontWeight={500}>Ascendant/Lagna</Typography>
                            </Box>
                            <CardContent sx={{ p: 2, bgcolor: 'rgba(13, 18, 35, 0.8)' }}>
                              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                                <Box sx={{ 
                                  width: 48, 
                                  height: 48, 
                                  borderRadius: '50%', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  fontSize: '28px',
                                  background: `${signColor}40`,
                                  color: signColor,
                                  mr: 2,
                                  flexShrink: 0
                                }}>
                                  {ascendantSign}
                                </Box>
                                <Typography sx={{ color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.6 }}>
                                  {ascendantDescription}
                                </Typography>
                              </Box>
                            </CardContent>
                          </Card>
                    </motion.div>
                  );
                })()}
                
                {/* Personality Overview Dashboard */}
                {(() => {
                  // Extract Personality Overview section
                  const personalityMatch = insight.message.match(/## Personality Overview([\s\S]*?)(?=##|$)/);
                  const personalityText = personalityMatch ? personalityMatch[1].trim() : '';
                  
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.3 }}
                          whileHover={{ y: -5 }}
                        >
                          <Card sx={{ 
                            overflow: 'hidden', 
                            boxShadow: '0 4px 24px rgba(0,0,0,0.4)', 
                            mb: 3,
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(20, 184, 166, 0.25) 100%)',
                            border: '1px solid rgba(16, 185, 129, 0.35)'
                          }}>
                            <Box sx={{ 
                              p: 2, 
                              background: 'linear-gradient(90deg, #059669 0%, #0D9488 100%)', 
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              py: 1.5
                            }}>
                              <Typography variant="h6" fontWeight={500}>Personality Overview</Typography>
                            </Box>
                            <CardContent sx={{ p: 2, bgcolor: 'rgba(13, 18, 35, 0.8)' }}>
                              <Paper sx={{ p: 2, bgcolor: 'rgba(16, 185, 129, 0.2)' }}>
                                <Typography sx={{ color: 'rgba(255, 255, 255, 0.9)', fontStyle: 'italic', lineHeight: 1.8 }}>
                                  {personalityText}
                                </Typography>
                              </Paper>
                            </CardContent>
                          </Card>
                    </motion.div>
                  );
                })()}

                {/* Career & Relationships Dashboard */}
                {(() => {
                  // Extract Career Insights section
                  const careerMatch = insight.message.match(/## Career Insights([\s\S]*?)(?=##|$)/);
                  const careerText = careerMatch ? careerMatch[1].trim() : '';
                  
                  // Extract Relationship Patterns section
                  const relationshipMatch = insight.message.match(/## Relationship Patterns([\s\S]*?)(?=##|$)/);
                  const relationshipText = relationshipMatch ? relationshipMatch[1].trim() : '';
                  
                  // Split and clean bullet points with improved parsing
                  const parsePoints = (text: string): string[] => {
                    if (!text) return [];
                    
                    // Clean up the text first - remove line numbers and dashes that might be incorrectly formatted
                    let cleanedText = text.replace(/^\d+\s*-?\s*/gm, '') // Remove line numbers and dashes at start of lines
                                         .replace(/\n\s*-\s*/g, '\n')    // Remove dashes after line breaks
                                         .replace(/\n\d+\s*/g, '\n');    // Remove lone numbers at start of lines
                    
                    // First, try to identify title-description pairs (format: "Title: Description")
                    const titleDescriptionRegex = /([^:]+):\s*([^:]+)(?=\n|$)/g;
                    const matches = Array.from(cleanedText.matchAll(titleDescriptionRegex));
                    
                    if (matches.length > 0) {
                      return matches.map(match => {
                        const title = match[1].trim();
                        const description = match[2].trim();
                        return `${title}: ${description}`;
                      });
                    }
                    
                    // If we didn't find title-description pairs, fall back to other methods
                    
                    // Check if we have numbered points (1., 2., 3., etc.)
                    if (/\d+\./.test(cleanedText)) {
                      return cleanedText.split(/\d+\.\s*/)
                        .filter(point => point.trim().length > 0)
                        .map(point => point.trim());
                    }
                    
                    // Handle case where multiple bullet points are on a single line
                    if (cleanedText.includes('*')) {
                      return cleanedText.split('*')
                        .filter(point => point.trim().length > 0)
                        .map(point => point.trim());
                    }
                    
                    // Handle case where multiple bullet points use the • character
                    if (cleanedText.includes('•')) {
                      return cleanedText.split('•')
                        .filter(point => point.trim().length > 0)
                        .map(point => point.trim());
                    }
                    
                    // Default case: split by line breaks and look for dash prefixes
                    return cleanedText.split('\n')
                      .filter(line => line.trim().length > 0)
                      .map(line => line.trim().replace(/^-\s*/, ''));
                  };
                  
                  // Process the points
                  const careerPoints = parsePoints(careerText);
                  const relationshipPoints = parsePoints(relationshipText);
                  
                  // If both sections are empty, don't display the card
                  if (careerPoints.length === 0 && relationshipPoints.length === 0) {
                    return null;
                  }
                  
                  // Use placeholder data only if the API didn't return any content
                  const finalCareerPoints = careerPoints.length > 0 ? careerPoints : [
                    "10th house in Sagittarius suggests a career path requiring knowledge, travel, or teaching",
                    "Jupiter's placement indicates success in fields related to communication or publishing",
                    "Saturn aspects suggest career stability after age 35 with authority positions",
                  ];
                  
                  const finalRelationshipPoints = relationshipPoints.length > 0 ? relationshipPoints : [
                    "Venus in the 7th house indicates an attractive partner with artistic sensibilities",
                    "Mars square Venus suggests passionate relationships with occasional conflicts",
                    "Moon's position shows emotional needs for security and nurturing in partnerships",
                  ];
                  
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.35 }}
                      whileHover={{ y: -5 }}
                    >
                      <Card sx={{ 
                        overflow: 'hidden', 
                        boxShadow: '0 4px 24px rgba(0,0,0,0.4)', 
                        mb: 3,
                        background: 'linear-gradient(135deg, rgba(212, 63, 141, 0.25) 0%, rgba(249, 168, 212, 0.25) 100%)',
                        border: '1px solid rgba(212, 63, 141, 0.35)'
                      }}>
                        <Box sx={{ 
                          p: 2, 
                          background: 'linear-gradient(90deg, #DB2777 0%, #EC4899 100%)', 
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          py: 1.5
                        }}>
                          <Typography variant="h6" fontWeight={500}>Career & Relationships</Typography>
                        </Box>
                        <CardContent sx={{ p: 2, bgcolor: 'rgba(13, 18, 35, 0.8)' }}>
                          {/* Career Section */}
                          <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle1" sx={{ color: '#FDA4AF', mb: 1.5, fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
                                <path d="M21 16V8.00002C21 6.34317 19.6569 5.00002 18 5.00002H17.2C16.6 5.00002 16 4.60002 15.8 4.00002L15.6 3.20002C15.2 2.00002 14 1.00002 12.7 1.00002H11.3C10 1.00002 8.8 2.00002 8.4 3.20002L8.2 4.00002C8 4.60002 7.4 5.00002 6.8 5.00002H6C4.34315 5.00002 3 6.34317 3 8.00002V16C3 17.6569 4.34315 19 6 19H18C19.6569 19 21 17.6569 21 16Z" 
                                  stroke="#FDA4AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M12 15C14.2091 15 16 13.2091 16 11C16 8.79086 14.2091 7 12 7C9.79086 7 8 8.79086 8 11C8 13.2091 9.79086 15 12 15Z" 
                                  stroke="#FDA4AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Career Path
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                              {finalCareerPoints.map((point, index) => (
                                <Paper key={index} sx={{ 
                                  p: 2, 
                                  bgcolor: 'rgba(212, 63, 141, 0.15)', 
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  borderRadius: '8px'
                                }}>
                                  <Box sx={{ 
                                    minWidth: 24, 
                                    height: 24, 
                                    borderRadius: '50%', 
                                    bgcolor: 'rgba(212, 63, 141, 0.3)', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    color: '#FBCFE8',
                                    fontWeight: 'medium',
                                    mr: 2,
                                    fontSize: '0.85rem'
                                  }}>
                                    {index + 1}
                                  </Box>
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      color: 'rgba(255, 255, 255, 0.9)', 
                                      lineHeight: 1.6,
                                      fontSize: '0.95rem',
                                    }}
                                  >
                                    {/* Render with proper styling if it contains a colon */}
                                    {point.includes(':') ? (
                                      <>
                                        <span style={{ fontWeight: 700, color: "#10B981", fontSize: "1.05rem", display: "block", marginBottom: "4px" }}>{point.split(':')[0].trim().replace(/^[.•*-]+\s*/g, '')}</span>
                                        <span>{': ' + point.split(':').slice(1).join(':').trim()}</span>
                                      </>
                                    ) : point.includes('"') ? (
                                      <>
                                        <span style={{ 
                                          fontWeight: 700, 
                                          color: '#FDA4AF', 
                                          fontSize: '1.05rem',
                                          display: 'block',
                                          marginBottom: '4px'
                                        }}>{point.split('"')[1].trim()}</span>
                                        <span>{point.split('"').slice(2).join('"').trim().replace(/^"/g, '')}</span>
                                      </>
                                    ) : (
                                      point.replace(/[•*-]/g, '').trim().replace(/^[.]+\s*/g, '')
                                    )}
                                  </Typography>
                                </Paper>
                              ))}
                            </Box>
                          </Box>
                          
                          {/* Relationships Section */}
                          <Box>
                            <Typography variant="subtitle1" sx={{ color: '#FDA4AF', mb: 1.5, fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
                                <path d="M20.8401 4.60999C20.3294 4.099 19.7229 3.69364 19.0555 3.41708C18.388 3.14052 17.6726 2.99817 16.9501 2.99817C16.2276 2.99817 15.5122 3.14052 14.8448 3.41708C14.1773 3.69364 13.5709 4.099 13.0601 4.60999L12.0001 5.66999L10.9401 4.60999C9.90843 3.5783 8.50915 2.9987 7.05012 2.9987C5.59109 2.9987 4.19181 3.5783 3.16012 4.60999C2.12843 5.64169 1.54883 7.04097 1.54883 8.49999C1.54883 9.95902 2.12843 11.3583 3.16012 12.39L4.22012 13.45L12.0001 21.23L19.7801 13.45L20.8401 12.39C21.3511 11.8792 21.7565 11.2728 22.033 10.6053C22.3096 9.93789 22.4519 9.22248 22.4519 8.49999C22.4519 7.77751 22.3096 7.0621 22.033 6.39464C21.7565 5.72718 21.3511 5.12075 20.8401 4.60999Z" 
                                  stroke="#FDA4AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Relationships
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                              {finalRelationshipPoints.map((point, index) => (
                                <Paper key={index} sx={{ 
                                  p: 2, 
                                  bgcolor: 'rgba(212, 63, 141, 0.15)', 
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  borderRadius: '8px'
                                }}>
                                  <Box sx={{ 
                                    minWidth: 24, 
                                    height: 24, 
                                    borderRadius: '50%', 
                                    bgcolor: 'rgba(212, 63, 141, 0.3)', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    color: '#FBCFE8',
                                    fontWeight: 'medium',
                                    mr: 2,
                                    fontSize: '0.85rem'
                                  }}>
                                    {index + 1}
                                  </Box>
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      color: 'rgba(255, 255, 255, 0.9)', 
                                      lineHeight: 1.6,
                                      fontSize: '0.95rem',
                                    }}
                                  >
                                    {/* Render with proper styling if it contains a colon */}
                                    {point.includes(':') ? (
                                      <>
                                        <span style={{ fontWeight: 700, color: "#10B981", fontSize: "1.05rem", display: "block", marginBottom: "4px" }}>{point.split(':')[0].trim().replace(/^[.•*-]+\s*/g, '')}</span>
                                        <span>{': ' + point.split(':').slice(1).join(':').trim()}</span>
                                      </>
                                    ) : point.includes('"') ? (
                                      <>
                                        <span style={{ 
                                          fontWeight: 700, 
                                          color: '#FDA4AF', 
                                          fontSize: '1.05rem',
                                          display: 'block',
                                          marginBottom: '4px'
                                        }}>{point.split('"')[1].trim()}</span>
                                        <span>{point.split('"').slice(2).join('"').trim().replace(/^"/g, '')}</span>
                                      </>
                                    ) : (
                                      point.replace(/[•*-]/g, '').trim().replace(/^[.]+\s*/g, '')
                                    )}
                                  </Typography>
                                </Paper>
                              ))}
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })()}
                
                {/* Key Strengths Dashboard */}
                {(() => {
                  // Extract Key Strengths section
                  const strengthsMatch = insight.message.match(/## Key Strengths([\s\S]*?)(?=##|$)/);
                  const strengthsText = strengthsMatch ? strengthsMatch[1].trim() : '';
                  
                  // Improved parsing for bullet points that might be on one line
                  const parsePoints = (text: string): string[] => {
                    if (!text) return [];
                    
                    // Clean up the text first - remove line numbers and dashes that might be incorrectly formatted
                    let cleanedText = text.replace(/^\d+\s*-?\s*/gm, '') // Remove line numbers and dashes at start of lines
                                         .replace(/\n\s*-\s*/g, '\n')    // Remove dashes after line breaks
                                         .replace(/\n\d+\s*/g, '\n');    // Remove lone numbers at start of lines
                    
                    // First, try to identify title-description pairs (format: "Title: Description")
                    const titleDescriptionRegex = /([^:]+):\s*([^:]+)(?=\n|$)/g;
                    const matches = Array.from(cleanedText.matchAll(titleDescriptionRegex));
                    
                    if (matches.length > 0) {
                      return matches.map(match => {
                        const title = match[1].trim();
                        const description = match[2].trim();
                        return `${title}: ${description}`;
                      });
                    }
                    
                    // Check if we have numbered points (1., 2., 3., etc.)
                    if (/\d+\./.test(cleanedText)) {
                      return cleanedText.split(/\d+\.\s*/)
                        .filter(point => point.trim().length > 0)
                        .map(point => point.trim());
                    }
                    
                    // Handle case where multiple bullet points are on a single line
                    if (cleanedText.includes('*')) {
                      return cleanedText.split('*')
                        .filter(point => point.trim().length > 0)
                        .map(point => point.trim());
                    }
                    
                    // Handle case where multiple bullet points use the • character
                    if (cleanedText.includes('•')) {
                      return cleanedText.split('•')
                        .filter(point => point.trim().length > 0)
                        .map(point => point.trim());
                    }
                    
                    // Default case: split by line breaks and look for dash prefixes
                    return cleanedText.split('\n')
                      .filter(line => line.trim().length > 0)
                      .map(line => line.trim().replace(/^-\s*/, ''));
                  };
                  
                  // Use the new parsing logic
                  const strengthPoints = parsePoints(strengthsText);
                  
                  // Flatten sub-points to create a single array of all points
                  let allStrengthPoints: string[] = [];
                  strengthPoints.forEach(point => {
                    // Check if the point itself contains bullet characters
                    if (point.includes('•') || point.includes('*')) {
                      const subPoints = point.split(/•|\*/).filter(p => p.trim().length > 0);
                      allStrengthPoints = [...allStrengthPoints, ...subPoints.map(sp => sp.trim())];
                    } else {
                      allStrengthPoints.push(point.trim());
                    }
                  });
                  
                  // Limit visible points to first 2
                  const visiblePoints = allStrengthPoints.slice(0, 2);
                  // Check if there are more points that could be unlocked
                  const hasMorePoints = allStrengthPoints.length > 2;
                  const lockedPointsCount = allStrengthPoints.length - 2;
                  
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.4 }}
                          whileHover={{ y: -5 }}
                        >
                          <Card sx={{ 
                            overflow: 'hidden', 
                            boxShadow: '0 4px 24px rgba(0,0,0,0.4)', 
                            mb: 3,
                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(37, 99, 235, 0.25) 100%)',
                            border: '1px solid rgba(59, 130, 246, 0.35)'
                          }}>
                            <Box sx={{ 
                              p: 2, 
                              background: 'linear-gradient(90deg, #2563EB 0%, #1D4ED8 100%)', 
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              py: 1.5
                            }}>
                              <Typography variant="h6" fontWeight={500}>Key Strengths</Typography>
                            </Box>
                            <CardContent sx={{ p: 2, bgcolor: 'rgba(13, 18, 35, 0.8)' }}>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {visiblePoints.map((point, index) => (
                                  <Box key={index}>
                                    <Paper sx={{ 
                                      p: 2, 
                                      bgcolor: 'rgba(59, 130, 246, 0.2)', 
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      borderRadius: '8px'
                                    }}>
                                      <Box sx={{ 
                                        width: 28, 
                                        height: 28, 
                                        borderRadius: '50%', 
                                        bgcolor: 'rgba(59, 130, 246, 0.35)', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        color: '#DDD6FE',
                                        fontWeight: 'medium',
                                        mr: 2.5,
                                        flexShrink: 0,
                                        fontSize: '0.85rem'
                                      }}>
                                        {index + 1}
                                      </Box>
                                      <Typography 
                                        variant="body1" 
                                        sx={{ 
                                          color: 'rgba(255, 255, 255, 0.9)', 
                                          lineHeight: 1.6,
                                          fontWeight: 400,
                                          fontSize: '0.95rem',
                                          letterSpacing: '0.01em'
                                        }}
                                      >
                                        {/* Render with proper styling if it contains a colon */}
                                        {point.includes(':') ? (
                                          <>
                                            <span style={{ fontWeight: 700, color: "#10B981", fontSize: "1.05rem", display: "block", marginBottom: "4px" }}>{point.split(':')[0].trim().replace(/^[.•*-]+\s*/g, '')}</span>
                                            <span>{': ' + point.split(':').slice(1).join(':').trim()}</span>
                                          </>
                                        ) : point.includes('"') ? (
                                          <>
                                            <span style={{ 
                                              fontWeight: 700, 
                                              color: '#3B82F6', 
                                              fontSize: '1.05rem',
                                              display: 'block',
                                              marginBottom: '4px'
                                            }}>{point.split('"')[1].trim()}</span>
                                            <span>{point.split('"').slice(2).join('"').trim().replace(/^"/g, '')}</span>
                                          </>
                                        ) : (
                                          point.replace(/[•*-]/g, '').trim().replace(/^[.]+\s*/g, '')
                                        )}
                                      </Typography>
                                    </Paper>
                                  </Box>
                                ))}

                                {hasMorePoints && (
                                  <Paper 
                                    sx={{ 
                                      p: 2, 
                                      bgcolor: 'rgba(59, 130, 246, 0.05)', 
                                      borderRadius: '8px',
                                      border: '1px dashed rgba(59, 130, 246, 0.3)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      position: 'relative',
                                      overflow: 'hidden',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                      '&:hover': {
                                        bgcolor: 'rgba(59, 130, 246, 0.1)',
                                      }
                                    }}
                                    onClick={handleProDialogOpen}
                                  >
                                    <Box 
                                      sx={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: '100%',
                                        background: 'linear-gradient(180deg, rgba(37, 99, 235, 0) 0%, rgba(37, 99, 235, 0.1) 100%)',
                                        zIndex: 0
                                      }}
                                    />
                                    <Box sx={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', py: 1 }}>
                                      <LockIcon sx={{ color: 'rgba(59, 130, 246, 0.6)', mb: 1, fontSize: '1.5rem' }} />
                                      <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 0.5, fontWeight: 500 }}>
                                        {lockedPointsCount} more {lockedPointsCount === 1 ? 'strength' : 'strengths'} available
                                      </Typography>
                                      <Button
                                        variant="text"
                                        size="small"
                                        sx={{ 
                                          color: '#3B82F6', 
                                          textTransform: 'none',
                                          fontWeight: 600,
                                          '&:hover': {
                                            backgroundColor: 'rgba(59, 130, 246, 0.15)'
                                          }
                                        }}
                                      >
                                        Unlock with PRO
                                      </Button>
                                    </Box>
                                  </Paper>
                                )}
                              </Box>
                            </CardContent>
                          </Card>
                    </motion.div>
                  );
                })()}
                
                {/* Potential Challenges Dashboard */}
                {(() => {
                  // Extract Potential Challenges section
                  const challengesMatch = insight.message.match(/## Potential Challenges([\s\S]*?)(?=##|$)/);
                  const challengesText = challengesMatch ? challengesMatch[1].trim() : '';
                  
                  // Use the same parsing logic for consistent results
                  const parsePoints = (text: string): string[] => {
                    if (!text) return [];
                    
                    // Clean up the text first - remove line numbers and dashes that might be incorrectly formatted
                    let cleanedText = text.replace(/^\d+\s*-?\s*/gm, '') // Remove line numbers and dashes at start of lines
                                         .replace(/\n\s*-\s*/g, '\n')    // Remove dashes after line breaks
                                         .replace(/\n\d+\s*/g, '\n');    // Remove lone numbers at start of lines
                    
                    // First, try to identify title-description pairs (format: "Title: Description")
                    const titleDescriptionRegex = /([^:]+):\s*([^:]+)(?=\n|$)/g;
                    const matches = Array.from(cleanedText.matchAll(titleDescriptionRegex));
                    
                    if (matches.length > 0) {
                      return matches.map(match => {
                        const title = match[1].trim();
                        const description = match[2].trim();
                        return `${title}: ${description}`;
                      });
                    }
                    
                    // Check if we have numbered points (1., 2., 3., etc.)
                    if (/\d+\./.test(cleanedText)) {
                      return cleanedText.split(/\d+\.\s*/)
                        .filter(point => point.trim().length > 0)
                        .map(point => point.trim());
                    }
                    
                    // Handle case where multiple bullet points are on a single line
                    if (cleanedText.includes('*')) {
                      return cleanedText.split('*')
                        .filter(point => point.trim().length > 0)
                        .map(point => point.trim());
                    }
                    
                    // Handle case where multiple bullet points use the • character
                    if (cleanedText.includes('•')) {
                      return cleanedText.split('•')
                        .filter(point => point.trim().length > 0)
                        .map(point => point.trim());
                    }
                    
                    // Default case: split by line breaks and look for dash prefixes
                    return cleanedText.split('\n')
                      .filter(line => line.trim().length > 0)
                      .map(line => line.trim().replace(/^-\s*/, ''));
                  };
                  
                  const challengePoints = parsePoints(challengesText);
                  
                  // Flatten sub-points to create a single array of all points
                  let allChallengePoints: string[] = [];
                  challengePoints.forEach(point => {
                    // Check if the point itself contains bullet characters
                    if (point.includes('•') || point.includes('*')) {
                      const subPoints = point.split(/•|\*/).filter(p => p.trim().length > 0);
                      allChallengePoints = [...allChallengePoints, ...subPoints.map(sp => sp.trim())];
                    } else {
                      allChallengePoints.push(point.trim());
                    }
                  });
                  
                  // Limit visible points to first 2
                  const visiblePoints = allChallengePoints.slice(0, 2);
                  // Check if there are more points that could be unlocked
                  const hasMorePoints = allChallengePoints.length > 2;
                  const lockedPointsCount = allChallengePoints.length - 2;
                  
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.5 }}
                          whileHover={{ y: -5 }}
                        >
                          <Card sx={{ 
                            overflow: 'hidden', 
                            boxShadow: '0 4px 24px rgba(0,0,0,0.4)', 
                            mb: 3,
                            background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.25) 0%, rgba(225, 29, 72, 0.25) 100%)',
                            border: '1px solid rgba(244, 63, 94, 0.35)'
                          }}>
                            <Box sx={{ 
                              p: 2, 
                              background: 'linear-gradient(90deg, #DC2626 0%, #BE185D 100%)', 
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              py: 1.5
                            }}>
                              <Typography variant="h6" fontWeight={500}>Potential Challenges</Typography>
                            </Box>
                            <CardContent sx={{ p: 2, bgcolor: 'rgba(13, 18, 35, 0.8)' }}>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {visiblePoints.map((point, index) => (
                                  <Box key={index}>
                                    <Paper sx={{ 
                                      p: 2, 
                                      bgcolor: 'rgba(227, 20, 54, 0.2)', 
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      borderRadius: '8px'
                                    }}>
                                      <Box sx={{ 
                                        width: 28, 
                                        height: 28, 
                                        borderRadius: '50%', 
                                        bgcolor: 'rgba(244, 63, 94, 0.35)', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        color: '#FECDD3',
                                        fontWeight: 'medium',
                                        mr: 2.5,
                                        flexShrink: 0,
                                        fontSize: '0.85rem'
                                      }}>
                                        {index + 1}
                                      </Box>
                                      <Typography 
                                        variant="body1" 
                                        sx={{ 
                                          color: 'rgba(255, 255, 255, 0.9)', 
                                          lineHeight: 1.6,
                                          fontWeight: 400,
                                          fontSize: '0.95rem',
                                          letterSpacing: '0.01em'
                                        }}
                                      >
                                        {/* Render with proper styling if it contains a colon */}
                                        {point.includes(':') ? (
                                          <>
                                            <span style={{ fontWeight: 700, color: "#10B981", fontSize: "1.05rem", display: "block", marginBottom: "4px" }}>{point.split(':')[0].trim().replace(/^[.•*-]+\s*/g, '')}</span>
                                            <span>{': ' + point.split(':').slice(1).join(':').trim()}</span>
                                          </>
                                        ) : point.includes('"') ? (
                                          <>
                                            <span style={{ fontWeight: 700, color: "#F43F5E", fontSize: "1.05rem", display: "block", marginBottom: "4px" }}>{point.split('"')[1].trim()}</span>
                                            <span>{' ' + point.split('"').slice(2).join('"').trim().replace(/^"/g, '')}</span>
                                          </>
                                        ) : (
                                          point.replace(/[•*-]/g, '').trim().replace(/^[.]+\s*/g, '')
                                        )}
                                      </Typography>
                                    </Paper>
                                  </Box>
                                ))}

                                {hasMorePoints && (
                                  <Paper 
                                    sx={{ 
                                      p: 2, 
                                      bgcolor: 'rgba(244, 63, 94, 0.05)', 
                                      borderRadius: '8px',
                                      border: '1px dashed rgba(244, 63, 94, 0.3)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      position: 'relative',
                                      overflow: 'hidden',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                      '&:hover': {
                                        bgcolor: 'rgba(244, 63, 94, 0.1)',
                                      }
                                    }}
                                    onClick={handleProDialogOpen}
                                  >
                                    <Box 
                                      sx={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: '100%',
                                        background: 'linear-gradient(180deg, rgba(244, 63, 94, 0) 0%, rgba(244, 63, 94, 0.1) 100%)',
                                        zIndex: 0
                                      }}
                                    />
                                    <Box sx={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', py: 1 }}>
                                      <LockIcon sx={{ color: 'rgba(244, 63, 94, 0.6)', mb: 1, fontSize: '1.5rem' }} />
                                      <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 0.5, fontWeight: 500 }}>
                                        {lockedPointsCount} more {lockedPointsCount === 1 ? 'challenge' : 'challenges'} available
                                      </Typography>
                                      <Button
                                        variant="text"
                                        size="small"
                                        sx={{ 
                                          color: '#F43F5E', 
                                          textTransform: 'none',
                                          fontWeight: 600,
                                          '&:hover': {
                                            backgroundColor: 'rgba(244, 63, 94, 0.15)'
                                          }
                                        }}
                                      >
                                        Unlock with PRO
                                      </Button>
                                    </Box>
                                  </Paper>
                                )}
                              </Box>
                            </CardContent>
                          </Card>
                    </motion.div>
                  );
                })()}
                
                {/* Significant Chart Features Dashboard */}
                {(() => {
                  // Extract Significant Chart Features section
                  const chartFeaturesMatch = insight.message.match(/## Significant Chart Features([\s\S]*?)(?=##|$)/);
                  const chartFeaturesText = chartFeaturesMatch ? chartFeaturesMatch[1].trim() : '';
                  
                  // Use the same parsing logic for consistent results
                  const parsePoints = (text: string): string[] => {
                    if (!text) return [];
                    
                    // Clean up the text first - remove line numbers and dashes that might be incorrectly formatted
                    let cleanedText = text.replace(/^\d+\s*-?\s*/gm, '') // Remove line numbers and dashes at start of lines
                                         .replace(/\n\s*-\s*/g, '\n')    // Remove dashes after line breaks
                                         .replace(/\n\d+\s*/g, '\n');    // Remove lone numbers at start of lines
                    
                    // First, try to identify title-description pairs (format: "Title: Description")
                    const titleDescriptionRegex = /([^:]+):\s*([^:]+)(?=\n|$)/g;
                    const matches = Array.from(cleanedText.matchAll(titleDescriptionRegex));
                    
                    if (matches.length > 0) {
                      return matches.map(match => {
                        const title = match[1].trim();
                        const description = match[2].trim();
                        return `${title}: ${description}`;
                      });
                    }
                    
                    // Check if we have numbered points (1., 2., 3., etc.)
                    if (/\d+\./.test(cleanedText)) {
                      return cleanedText.split(/\d+\.\s*/)
                        .filter(point => point.trim().length > 0)
                        .map(point => point.trim());
                    }
                    
                    // Handle case where multiple bullet points are on a single line
                    if (cleanedText.includes('*')) {
                      return cleanedText.split('*')
                        .filter(point => point.trim().length > 0)
                        .map(point => point.trim());
                    }
                    
                    // Handle case where multiple bullet points use the • character
                    if (cleanedText.includes('•')) {
                      return cleanedText.split('•')
                        .filter(point => point.trim().length > 0)
                        .map(point => point.trim());
                    }
                    
                    // Default case: split by line breaks and look for dash prefixes
                    return cleanedText.split('\n')
                      .filter(line => line.trim().length > 0)
                      .map(line => line.trim().replace(/^-\s*/, ''));
                  };
                  
                  const chartFeaturePoints = parsePoints(chartFeaturesText);
                  
                  // Flatten sub-points to create a single array of all points
                  let allChartFeaturePoints: string[] = [];
                  chartFeaturePoints.forEach(point => {
                    // Check if the point itself contains bullet characters
                    if (point.includes('•') || point.includes('*')) {
                      const subPoints = point.split(/•|\*/).filter(p => p.trim().length > 0);
                      allChartFeaturePoints = [...allChartFeaturePoints, ...subPoints.map(sp => sp.trim())];
                    } else {
                      allChartFeaturePoints.push(point.trim());
                    }
                  });
                  
                  // Limit visible points to first 2
                  const visiblePoints = allChartFeaturePoints.slice(0, 2);
                  // Check if there are more points that could be unlocked
                  const hasMorePoints = allChartFeaturePoints.length > 2;
                  const lockedPointsCount = allChartFeaturePoints.length - 2;
                  
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.6 }}
                          whileHover={{ y: -5 }}
                        >
                          <Card sx={{ 
                            overflow: 'hidden', 
                            boxShadow: '0 4px 24px rgba(0,0,0,0.4)', 
                            mb: 3,
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.25) 100%)',
                            border: '1px solid rgba(16, 185, 129, 0.35)'
                          }}>
                            <Box sx={{ 
                              p: 2, 
                              background: 'linear-gradient(90deg, #059669 0%, #047857 100%)', 
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              py: 1.5
                            }}>
                              <Typography variant="h6" fontWeight={500}>Significant Chart Features</Typography>
                            </Box>
                            <CardContent sx={{ p: 2, bgcolor: 'rgba(13, 18, 35, 0.8)' }}>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {visiblePoints.map((point, index) => (
                                  <Box key={index}>
                                    <Paper sx={{ 
                                      p: 2, 
                                      bgcolor: 'rgba(16, 185, 129, 0.2)', 
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      borderRadius: '8px'
                                    }}>
                                      <Box sx={{ 
                                        width: 28, 
                                        height: 28, 
                                        borderRadius: '50%', 
                                        bgcolor: 'rgba(16, 185, 129, 0.35)', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        color: '#A7F3D0',
                                        fontWeight: 'medium',
                                        mr: 2.5,
                                        flexShrink: 0,
                                        fontSize: '0.85rem'
                                      }}>
                                        {index + 1}
                                      </Box>
                                      <Typography 
                                        variant="body1" 
                                        sx={{ 
                                          color: 'rgba(255, 255, 255, 0.9)', 
                                          lineHeight: 1.6,
                                          fontWeight: 400,
                                          fontSize: '0.95rem',
                                          letterSpacing: '0.01em'
                                        }}
                                      >
                                        {/* Render with proper styling if it contains a colon */}
                                        {point.includes(':') ? (
                                          <>
                                            <span style={{ fontWeight: 700, color: "#10B981", fontSize: "1.05rem", display: "block", marginBottom: "4px" }}>{point.split(':')[0].trim().replace(/^[.•*-]+\s*/g, '')}</span>
                                            <span>{': ' + point.split(':').slice(1).join(':').trim()}</span>
                                          </>
                                        ) : point.includes('"') ? (
                                          <>
                                            <span style={{ fontWeight: 700, color: "#10B981", fontSize: "1.05rem", display: "block", marginBottom: "4px" }}>{point.split('"')[1].trim()}</span>
                                            <span>{' ' + point.split('"').slice(2).join('"').trim().replace(/^"/g, '')}</span>
                                          </>
                                        ) : (
                                          point.replace(/[•*-]/g, '').trim().replace(/^[.]+\s*/g, '')
                                        )}
                                      </Typography>
                                    </Paper>
                                  </Box>
                                ))}

                                {hasMorePoints && (
                                  <Paper 
                                    sx={{ 
                                      p: 2, 
                                      bgcolor: 'rgba(16, 185, 129, 0.05)', 
                                      borderRadius: '8px',
                                      border: '1px dashed rgba(16, 185, 129, 0.3)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      position: 'relative',
                                      overflow: 'hidden',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                      '&:hover': {
                                        bgcolor: 'rgba(16, 185, 129, 0.1)',
                                      }
                                    }}
                                    onClick={handleProDialogOpen}
                                  >
                                    <Box 
                                      sx={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: '100%',
                                        background: 'linear-gradient(180deg, rgba(16, 185, 129, 0) 0%, rgba(16, 185, 129, 0.1) 100%)',
                                        zIndex: 0
                                      }}
                                    />
                                    <Box sx={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', py: 1 }}>
                                      <LockIcon sx={{ color: 'rgba(16, 185, 129, 0.6)', mb: 1, fontSize: '1.5rem' }} />
                                      <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 0.5, fontWeight: 500 }}>
                                        {lockedPointsCount} more feature{lockedPointsCount !== 1 ? 's' : ''} available
                                      </Typography>
                                      <Button
                                        variant="text"
                                        size="small"
                                        sx={{ 
                                          color: '#10B981', 
                                          textTransform: 'none',
                                          fontWeight: 600,
                                          '&:hover': {
                                            backgroundColor: 'rgba(16, 185, 129, 0.15)'
                                          }
                                        }}
                                      >
                                        Unlock with PRO
                                      </Button>
                                    </Box>
                                  </Paper>
                                )}
                              </Box>
                            </CardContent>
                          </Card>
                    </motion.div>
                  );
                })()}
                  </Box>
            )}

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                  <Button
                    onClick={handleProDialogOpen}
                    sx={{
                      px: 3,
                      py: 1.25,
                      borderRadius: '8px',
                      backgroundColor: 'rgba(30, 62, 201, 0.6)',
                      border: '1px solid rgba(78, 75, 120, 0.35)',
                      color: 'white',
                      textTransform: 'none',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      '&:hover': {
                        backgroundColor: 'rgba(30, 34, 52, 0.8)',
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
                      }
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
                      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
                      <path d="M8 11V7a4 4 0 118 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span>View Complete Cosmic Analysis</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="ml-2">
                      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="full-analysis"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-astro-bg-tertiary/30 rounded-lg border border-astro-border-light overflow-hidden"
        >
          <div className="p-4 flex justify-between items-center border-b border-astro-border-light bg-[rgba(13,18,35,0.9)]">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-astro-accent-primary/20 flex items-center justify-center mr-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
                    fill="#D4AF61" />
                </svg>
              </div>
              <h3 className="text-base font-medium text-[#D4AF61]">Comprehensive Cosmic Analysis</h3>
            </div>
            <button
              onClick={() => setShowFullAnalysis(false)}
              className="flex items-center text-astro-text-secondary hover:text-astro-text-primary transition-colors duration-200"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-sm">Back to Summary</span>
            </button>
          </div>

          <div className="p-6">
            {isLoadingVedicData ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-12 h-12 rounded-full border-2 border-astro-accent-primary/20 border-t-astro-accent-primary animate-spin mb-4"></div>
                <p className="text-astro-text-secondary">
                  Generating detailed cosmic analysis...
                </p>
              </div>
            ) : (
              <>
                {/* Show error message if any */}
                {errorMessage && (
                  <div className="mb-4 p-3 bg-orange-100/20 border border-orange-300/30 rounded-md text-orange-700 text-sm">
                    <div className="flex items-center mb-1">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="font-medium">Note</span>
                    </div>
                    <p>{errorMessage}</p>
                  </div>
                )}
                
                {/* Show data source indicator only for non-API data */}
                {dataSource === 'mock' && !errorMessage && (
                  <div className="mb-4 p-3 bg-blue-100/20 border border-blue-300/30 rounded-md text-blue-700 text-sm">
                    <div className="flex items-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                        <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>
                        Using sample astrological data for demonstration
                      </span>
                    </div>
                  </div>
                )}
                
                <VedicDashboard vedicData={vedicData} />
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* PRO Features Dialog */}
      <Dialog
        open={openProDialog}
        onClose={handleProDialogClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          style: {
            backgroundColor: 'rgba(17, 25, 40, 0.95)',
            backdropFilter: 'blur(16px)',
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          p: 2,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <StarIcon sx={{ color: '#FFD700', mr: 1 }} />
            <Typography component="div" variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
              Upgrade to Astro Insights PRO
            </Typography>
          </Box>
          <IconButton onClick={handleProDialogClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ color: '#FFD700', mb: 1, fontWeight: 600 }}>
              Unlock Your Complete Cosmic Potential
            </Typography>
            <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
              Gain access to enhanced astrological insights with our PRO version, designed for those who seek deeper cosmic understanding.
            </Typography>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ color: 'white', mb: 1.5, fontWeight: 600 }}>
              Exclusive PRO Features:
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Paper sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.1)', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Box sx={{ 
                    width: 28, 
                    height: 28, 
                    borderRadius: '50%', 
                    bgcolor: 'rgba(255, 215, 0, 0.2)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#FFD700',
                    mr: 2
                  }}>
                    1
                  </Box>
                  <Box>
                    <Typography sx={{ color: 'white', fontWeight: 500 }}>
                      Complete Strength & Challenge Analysis
                    </Typography>
                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
                      Unlock all key strengths and potential challenges for complete self-understanding.
                    </Typography>
                  </Box>
                </Box>
              </Paper>
              
              <Paper sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.1)', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Box sx={{ 
                    width: 28, 
                    height: 28, 
                    borderRadius: '50%', 
                    bgcolor: 'rgba(255, 215, 0, 0.2)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#FFD700',
                    mr: 2
                  }}>
                    2
                  </Box>
                  <Box>
                    <Typography sx={{ color: 'white', fontWeight: 500 }}>
                      Future Transit Predictions
                    </Typography>
                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
                      Get detailed predictions based on upcoming planetary movements.
                    </Typography>
                  </Box>
                </Box>
              </Paper>
              
              <Paper sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.1)', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Box sx={{ 
                    width: 28, 
                    height: 28, 
                    borderRadius: '50%', 
                    bgcolor: 'rgba(255, 215, 0, 0.2)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#FFD700',
                    mr: 2
                  }}>
                    3
                  </Box>
                  <Box>
                    <Typography sx={{ color: 'white', fontWeight: 500 }}>
                      Personalized Compatibility Reports
                    </Typography>
                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
                      Analyze your relationship compatibility with friends, family, and romantic partners.
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 2.5, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Button 
            onClick={handleProDialogClose} 
            sx={{ 
              color: 'rgba(255, 255, 255, 0.7)', 
              mr: 1,
              '&:hover': {
                color: 'white'
              }
            }}
          >
            Not Now
          </Button>
          <Button 
            variant="contained" 
            sx={{ 
              background: 'linear-gradient(45deg, #FFD700, #FFA500)',
              color: 'rgba(0, 0, 0, 0.8)',
              fontWeight: 600,
              px: 3,
              '&:hover': {
                background: 'linear-gradient(45deg, #FFB700, #FF8C00)',
              }
            }}
          >
            Upgrade to PRO
          </Button>
        </DialogActions>
      </Dialog>
    </AnimatePresence>
  );
};

export default AstrologyInsight; 

