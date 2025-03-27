import React, { useState } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  TextField,
  Button,
  InputAdornment,
  Paper,
  FormHelperText,
  Stack
} from '@mui/material';
import { styled } from '@mui/material/styles';

// Custom styled components
const StyledTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    color: 'rgba(255, 255, 255, 0.95)',
    backgroundColor: 'rgba(8, 12, 30, 0.95) !important',
    backgroundImage: 'linear-gradient(to bottom, rgba(35, 30, 95, 0.25), rgba(20, 20, 60, 0.25)) !important',
    borderRadius: '8px',
    boxShadow: 'inset 0 0 15px rgba(30, 30, 70, 0.2)',
    border: '1px solid rgba(79, 70, 229, 0.2)',
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: '#8B5CF6',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: '#A78BFA',
      borderWidth: '2px',
    },
    '&:hover': {
      backgroundColor: 'rgba(12, 15, 45, 0.98) !important',
      boxShadow: 'inset 0 0 15px rgba(40, 40, 100, 0.25), 0 3px 12px rgba(15, 23, 42, 0.3)',
    },
  },
  '& .MuiOutlinedInput-input': {
    backgroundColor: 'transparent !important',
    position: 'relative',
    zIndex: 1
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(107, 114, 142, 0.5)',
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(255, 255, 255, 0.75)',
    '&.Mui-focused': {
      color: '#A78BFA',
    },
  },
  '& .MuiInputAdornment-root': {
    color: 'rgba(255, 255, 255, 0.6)',
  },
}));

const RequiredStar = styled('span')({
  color: '#D4AF61',
  fontWeight: 'bold',
  marginLeft: '4px',
});

const ErrorText = styled(Typography)({
  color: '#ff6b6b',
  fontSize: '0.75rem',
  marginTop: '4px',
  fontWeight: 500,
});

interface BirthDataFormProps {
  onSubmit: (data: { date: string; time: string; place: string; name: string }) => void;
  isLoading?: boolean;
}

const BirthDataForm: React.FC<BirthDataFormProps> = ({ onSubmit, isLoading = false }) => {
  const [date, setDate] = useState<string>('15/06/2000');
  const [time, setTime] = useState<string>('10:15 AM');
  const [place, setPlace] = useState<string>('Morena MP');
  const [name, setName] = useState<string>('');
  
  // Error states
  const [nameError, setNameError] = useState<string>('');
  const [dateError, setDateError] = useState<string>('');
  const [timeError, setTimeError] = useState<string>('');

  const validateInputs = (): boolean => {
    let isValid = true;
    
    // Validate name (required)
    if (!name.trim()) {
      setNameError('Name is required');
      isValid = false;
    } else {
      setNameError('');
    }
    
    // Validate date format (DD/MM/YYYY)
    const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
    if (!dateRegex.test(date)) {
      setDateError('Date should be in format DD/MM/YYYY');
      isValid = false;
    } else {
      setDateError('');
    }
    
    // Validate time format (HH:MM AM/PM)
    const timeRegex = /^\d{1,2}:\d{2}\s?(AM|PM)$/i;
    if (!timeRegex.test(time)) {
      setTimeError('Time should be in format HH:MM AM/PM');
      isValid = false;
    } else {
      setTimeError('');
    }
    
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs before submitting
    if (validateInputs()) {
      onSubmit({
        date,
        time,
        place,
        name
      });
    }
  };

  return (
    <Card sx={{ 
      background: 'rgba(10, 15, 30, 0.75)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(78, 75, 120, 0.35)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      <Paper sx={{ 
        p: 2, 
        background: 'linear-gradient(90deg, #4338CA 0%, #7E22CE 100%)',
        borderRadius: 0
      }}>
        <Typography variant="h6" fontWeight={500} color="white">
          Birth Details
        </Typography>
      </Paper>
      
      <CardContent sx={{ 
        p: 2,
        backgroundColor: 'rgba(8, 12, 28, 0.95)'
      }}>
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle1" fontWeight={500} color="rgba(255, 255, 255, 0.9)" gutterBottom sx={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem' }}>
                Name
                <RequiredStar>★</RequiredStar>
              </Typography>
              
              <StyledTextField
                fullWidth
                variant="outlined"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={!!nameError}
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(8, 12, 30, 0.95) !important',
                  }
                }}
              />
              {nameError && <ErrorText>{nameError}</ErrorText>}
            </Box>
            
            <Box>
              <Typography variant="subtitle1" fontWeight={500} color="rgba(255, 255, 255, 0.9)" gutterBottom sx={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem' }}>
                Birth Date (IST)
                <RequiredStar>★</RequiredStar>
              </Typography>
              
              <StyledTextField
                fullWidth
                variant="outlined"
                placeholder="DD/MM/YYYY"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                error={!!dateError}
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(8, 12, 30, 0.95) !important',
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 2V5M16 2V5M3.5 9.09H20.5M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" 
                          stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </InputAdornment>
                  ),
                }}
              />
              {dateError ? (
                <ErrorText>{dateError}</ErrorText>
              ) : (
                <FormHelperText sx={{ color: 'rgba(255, 255, 255, 0.55)', mt: 0.5, fontSize: '0.7rem' }}>
                  Please enter date according to Indian Standard Time (IST)
                </FormHelperText>
              )}
            </Box>
            
            <Box>
              <Typography variant="subtitle1" fontWeight={500} color="rgba(255, 255, 255, 0.9)" gutterBottom sx={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem' }}>
                Birth Time (IST)
                <RequiredStar>★</RequiredStar>
              </Typography>
              
              <StyledTextField
                fullWidth
                variant="outlined"
                placeholder="HH:MM AM/PM"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                error={!!timeError}
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(8, 12, 30, 0.95) !important',
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 8V13L15 15M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" 
                          stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </InputAdornment>
                  ),
                }}
              />
              {timeError ? (
                <ErrorText>{timeError}</ErrorText>
              ) : (
                <FormHelperText sx={{ color: 'rgba(255, 255, 255, 0.55)', mt: 0.5, fontSize: '0.7rem' }}>
                  Please enter time in 12-hour format (HH:MM AM/PM)
                </FormHelperText>
              )}
            </Box>
            
            <Box>
              <Typography variant="subtitle1" fontWeight={500} color="rgba(255, 255, 255, 0.9)" gutterBottom sx={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem' }}>
                Birth Place
                <RequiredStar>★</RequiredStar>
              </Typography>
              
              <StyledTextField
                fullWidth
                variant="outlined"
                placeholder="Enter city and country"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(8, 12, 30, 0.95) !important',
                  }
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" 
                          fill="rgba(255, 255, 255, 0.5)" />
                      </svg>
                    </InputAdornment>
                  ),
                }}
              />
              
              <FormHelperText sx={{ color: 'rgba(255, 255, 255, 0.55)', mt: 0.5, fontSize: '0.7rem' }}>
                Enter the city and country of your birth
              </FormHelperText>
            </Box>
            
            <Box sx={{ mt: 2 }}>
              <Button 
                type="submit"
                fullWidth
                disabled={isLoading}
                sx={{
                  py: 1.25,
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  background: 'linear-gradient(90deg, #9F7834 0%, #D4AF61 100%)',
                  color: 'rgba(255, 255, 255, 0.98)',
                  boxShadow: '0 4px 15px rgba(159, 120, 52, 0.35)',
                  '&:hover': {
                    background: 'linear-gradient(90deg, #B28F4C 0%, #E5C07A 100%)',
                    boxShadow: '0 6px 18px rgba(178, 143, 76, 0.45)',
                  },
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {isLoading ? (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Box sx={{
                      width: '20px',
                      height: '20px',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '50%',
                      borderTopColor: 'white',
                      animation: 'spin 1s linear infinite',
                      mr: 1.5,
                      fontWeight: 'bold'
                    }} />
                    <Typography>Processing...</Typography>
                  </Box>
                ) : (
                  <Box sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center' 
                  }}>
                    <Typography sx={{ 
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      color: 'rgba(255, 255, 255, 0.95)',
                      textShadow: '0 0 6px rgba(255, 215, 0, 0.5)',
                      letterSpacing: '0.05em',
                      fontFamily: '"Noto Sans Devanagari", sans-serif',
                      position: 'relative',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: '-5px',
                        left: '-10px',
                        right: '-10px',
                        bottom: '-5px',
                        background: 'radial-gradient(circle, rgba(255, 215, 0, 0.15) 0%, rgba(255, 215, 0, 0) 70%)',
                        zIndex: -1,
                        borderRadius: '50%'
                      }
                    }}>
                      नक्षत्रयात्रा
                    </Typography>
                    
                  </Box>
                )}
              </Button>
              
              <Typography 
                variant="caption" 
                component="p" 
                sx={{ 
                  textAlign: 'center', 
                  mt: 1, 
                  color: 'rgba(255, 255, 255, 0.45)', 
                  fontSize: '0.7rem'
                }}
              >
                Your data is used only for this reading and is never stored.
              </Typography>
            </Box>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
};

export default BirthDataForm; 