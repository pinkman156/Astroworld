import { useState, useEffect } from 'react';

/**
 * Component to test environment variable access
 */
const EnvTester: React.FC = () => {
  const [envVars, setEnvVars] = useState<{[key: string]: string | undefined}>({});
  const [buildInfo, setBuildInfo] = useState<{[key: string]: any}>({});
  
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
      nodeEnv: import.meta.env.MODE,
      
      // Add all import.meta.env keys for debugging
      allKeys: Object.keys(import.meta.env).join(', ')
    };
    
    // Collect build information
    const info = {
      buildTime: new Date().toISOString(),
      isDev: import.meta.env.DEV,
      isProd: import.meta.env.PROD,
      baseUrl: import.meta.env.BASE_URL
    };
    
    setEnvVars(vars);
    setBuildInfo(info);
  }, []);
  
  // Helper to safely display credential snippets
  const displayCredential = (value: string | undefined) => {
    if (!value) return <span className="text-red-500">Not set</span>;
    if (value.startsWith('${')) return <span className="text-orange-500">Unresolved placeholder: {value}</span>;
    return `${value.substring(0, 8)}...`;
  };
  
  return (
    <div className="p-4 bg-gray-100 rounded-lg mb-4">
      <h3 className="text-lg font-semibold mb-2">Environment Variables Test</h3>
      
      <div className="grid grid-cols-2 gap-2">
        <div className="font-medium">Client ID via import.meta.env:</div>
        <div>
          {displayCredential(envVars.clientIdViaImportMeta)}
        </div>
        
        <div className="font-medium">Client Secret via import.meta.env:</div>
        <div>
          {displayCredential(envVars.clientSecretViaImportMeta)}
        </div>
        
        <div className="font-medium">Client ID via process.env:</div>
        <div>
          {displayCredential(envVars.clientIdViaProcess)}
        </div>
        
        <div className="font-medium">Client Secret via process.env:</div>
        <div>
          {displayCredential(envVars.clientSecretViaProcess)}
        </div>
        
        <div className="font-medium">NODE_ENV:</div>
        <div>{envVars.nodeEnv || 'Not set'}</div>
        
        <div className="font-medium">All env keys:</div>
        <div className="text-xs break-all">{envVars.allKeys || 'None'}</div>
      </div>
      
      <div className="mt-4">
        <h4 className="font-medium mb-1">Build Info:</h4>
        <div className="grid grid-cols-2 gap-1 text-sm">
          <div>Build time:</div>
          <div>{buildInfo.buildTime}</div>
          
          <div>DEV mode:</div>
          <div>{buildInfo.isDev?.toString()}</div>
          
          <div>PROD mode:</div>
          <div>{buildInfo.isProd?.toString()}</div>
          
          <div>Base URL:</div>
          <div>{buildInfo.baseUrl}</div>
        </div>
      </div>
      
      <div className="mt-4 p-2 bg-yellow-100 rounded text-sm">
        <p className="mb-1"><strong>Troubleshooting:</strong></p>
        <ol className="list-decimal list-inside">
          <li>Check that environment variables are set in Vercel project settings</li>
          <li>Make sure all environment variables start with VITE_</li>
          <li>Rebuild and redeploy after making any changes</li>
        </ol>
      </div>
    </div>
  );
};

export default EnvTester; 