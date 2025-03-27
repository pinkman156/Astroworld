export default function handler(req, res) {
  // Set a test variable to validate environment access
  process.env.TEST_VARIABLE = 'This is accessible';
  
  try {
    // Get a list of environment variables (redacted for security)
    const envVars = Object.keys(process.env)
      .filter(key => key.includes('PROKERALA') || key.includes('VITE_') || key.includes('TEST_'))
      .reduce((obj, key) => {
        const value = process.env[key];
        // Redact actual values for security
        obj[key] = {
          exists: !!value,
          length: value ? value.length : 0,
          prefix: value ? value.substring(0, 4) + '...' : 'null',
          isUUID: value ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) : false
        };
        return obj;
      }, {});
    
    // Try to access Prokerala credentials in different formats
    const prokeralaCredentials = {
      clientId: {
        VITE_PROKERALA_CLIENT_ID: {
          exists: !!process.env.VITE_PROKERALA_CLIENT_ID,
          isUUID: process.env.VITE_PROKERALA_CLIENT_ID ? 
                  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(process.env.VITE_PROKERALA_CLIENT_ID) : 
                  false
        },
        PROKERALA_CLIENT_ID: {
          exists: !!process.env.PROKERALA_CLIENT_ID,
          isUUID: process.env.PROKERALA_CLIENT_ID ? 
                  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(process.env.PROKERALA_CLIENT_ID) : 
                  false
        }
      },
      clientSecret: {
        VITE_PROKERALA_CLIENT_SECRET: {
          exists: !!process.env.VITE_PROKERALA_CLIENT_SECRET,
          length: process.env.VITE_PROKERALA_CLIENT_SECRET ? process.env.VITE_PROKERALA_CLIENT_SECRET.length : 0
        },
        PROKERALA_CLIENT_SECRET: {
          exists: !!process.env.PROKERALA_CLIENT_SECRET,
          length: process.env.PROKERALA_CLIENT_SECRET ? process.env.PROKERALA_CLIENT_SECRET.length : 0
        }
      }
    };

    // Return environment information
    res.status(200).json({
      message: 'Environment variables check',
      environment: process.env.NODE_ENV || 'Not set',
      runtime: process.env.VERCEL ? 'Vercel' : 'Other',
      variables: envVars,
      prokeralaCredentials,
      allEnvKeys: Object.keys(process.env).length,
      vercelSpecific: {
        isVercel: !!process.env.VERCEL,
        vercelEnv: process.env.VERCEL_ENV || 'Not set',
        region: process.env.VERCEL_REGION || 'Not set'
      },
      recommendation: `If you're seeing issues with credentials, make sure to set them in the Vercel dashboard
        under Settings > Environment Variables as VITE_PROKERALA_CLIENT_ID and VITE_PROKERALA_CLIENT_SECRET.
        The client ID must be a valid UUID format.`
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error checking environment variables',
      message: error.message
    });
  }
} 