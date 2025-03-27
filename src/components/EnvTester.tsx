import { useState, useEffect } from 'react';

/**
 * Component to test environment variable access
 */
const EnvTester: React.FC = () => {
  const [envVars, setEnvVars] = useState<{[key: string]: string | undefined}>({});
  
  useEffect(() => {
    // Collect environment variables
    const vars = {
      // Vite exposes env vars via import.meta.env
      clientIdViaImportMeta: import.meta.env.VITE_PROKERALA_CLIENT_ID,
      clientSecretViaImportMeta: import.meta.env.VITE_PROKERALA_CLIENT_SECRET,
      
      // Also check the process.env format (should work if vite.config.ts is set up correctly)
      clientIdViaProcess: process.env.VITE_PROKERALA_CLIENT_ID,
      clientSecretViaProcess: process.env.VITE_PROKERALA_CLIENT_SECRET,
      
      // Check if NODE_ENV is set
      nodeEnv: import.meta.env.MODE
    };
    
    setEnvVars(vars);
  }, []);
  
  return (
    <div className="p-4 bg-gray-100 rounded-lg mb-4">
      <h3 className="text-lg font-semibold mb-2">Environment Variables Test</h3>
      
      <div className="grid grid-cols-2 gap-2">
        <div className="font-medium">Client ID via import.meta.env:</div>
        <div>
          {envVars.clientIdViaImportMeta ? 
            `${envVars.clientIdViaImportMeta.substring(0, 8)}...` : 
            <span className="text-red-500">Not set</span>}
        </div>
        
        <div className="font-medium">Client Secret via import.meta.env:</div>
        <div>
          {envVars.clientSecretViaImportMeta ? 
            `${envVars.clientSecretViaImportMeta.substring(0, 8)}...` : 
            <span className="text-red-500">Not set</span>}
        </div>
        
        <div className="font-medium">Client ID via process.env:</div>
        <div>
          {envVars.clientIdViaProcess ? 
            `${envVars.clientIdViaProcess.substring(0, 8)}...` : 
            <span className="text-red-500">Not set</span>}
        </div>
        
        <div className="font-medium">Client Secret via process.env:</div>
        <div>
          {envVars.clientSecretViaProcess ? 
            `${envVars.clientSecretViaProcess.substring(0, 8)}...` : 
            <span className="text-red-500">Not set</span>}
        </div>
        
        <div className="font-medium">NODE_ENV:</div>
        <div>{envVars.nodeEnv || 'Not set'}</div>
      </div>
      
      <div className="mt-4 p-2 bg-yellow-100 rounded text-sm">
        Note: For security, only showing the first 8 characters of credentials
      </div>
    </div>
  );
};

export default EnvTester; 