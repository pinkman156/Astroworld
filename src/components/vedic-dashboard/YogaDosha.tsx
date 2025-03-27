import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Yoga, Dosha } from '../../types';

interface YogaDoshaProps {
  yogas: Yoga[];
  doshas: Dosha[];
}

const YogaDosha: React.FC<YogaDoshaProps> = ({ yogas, doshas }) => {
  const [activeTab, setActiveTab] = useState<'yogas' | 'doshas'>('yogas');
  const [selectedYoga, setSelectedYoga] = useState<Yoga | null>(null);
  const [selectedDosha, setSelectedDosha] = useState<Dosha | null>(null);

  // Get color for strength indicator
  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'weak':
        return 'from-yellow-500/40 to-yellow-600/40';
      case 'moderate':
        return 'from-orange-500/40 to-orange-600/40';
      case 'strong':
        return 'from-green-500/40 to-green-600/40';
      case 'very strong':
        return 'from-blue-500/40 to-blue-600/40';
      default:
        return 'from-gray-500/40 to-gray-600/40';
    }
  };

  // Get color for severity indicator
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'mild':
        return 'from-yellow-500/40 to-yellow-600/40';
      case 'moderate':
        return 'from-orange-500/40 to-orange-600/40';
      case 'severe':
        return 'from-red-500/40 to-red-600/40';
      default:
        return 'from-gray-500/40 to-gray-600/40';
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex justify-center">
        <div className="bg-astro-bg-tertiary inline-flex p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('yogas')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              activeTab === 'yogas'
                ? 'bg-astro-bg-card text-astro-accent-primary'
                : 'text-astro-text-secondary hover:text-astro-text-primary'
            }`}
          >
            Auspicious Yogas
          </button>
          <button
            onClick={() => setActiveTab('doshas')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              activeTab === 'doshas'
                ? 'bg-astro-bg-card text-astro-accent-primary'
                : 'text-astro-text-secondary hover:text-astro-text-primary'
            }`}
          >
            Challenging Doshas
          </button>
        </div>
      </div>

      {/* Content for Yogas */}
      {activeTab === 'yogas' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Yoga Cards Grid */}
          <div className="bg-astro-bg-tertiary/30 p-5 rounded-lg border border-astro-border-light">
            <h3 className="text-lg font-medium text-astro-accent-primary mb-4">Auspicious Yogas in Your Chart</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {yogas.map((yoga, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-astro-md 
                    ${selectedYoga?.name === yoga.name 
                      ? 'border-astro-accent-primary bg-astro-bg-tertiary/50' 
                      : 'border-astro-border-light bg-astro-bg-accent hover:bg-astro-bg-tertiary/30'
                    }`}
                  onClick={() => setSelectedYoga(yoga)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-base font-medium text-astro-text-primary">{yoga.name}</h4>
                    <div className={`
                      text-xs px-2 py-1 rounded-full bg-gradient-to-r ${getStrengthColor(yoga.strength)}
                    `}>
                      {yoga.strength}
                    </div>
                  </div>
                  <p className="text-sm text-astro-text-secondary line-clamp-2 mb-3">
                    {yoga.description.length > 80 
                      ? yoga.description.substring(0, 80) + '...' 
                      : yoga.description
                    }
                  </p>
                  
                  <div className="text-xs text-astro-text-muted flex items-center">
                    <span className="mr-2">Planets:</span>
                    <div className="flex flex-wrap gap-1">
                      {yoga.planets.map((planet, i) => (
                        <span key={i} className="bg-astro-bg-tertiary/50 px-1.5 py-0.5 rounded">
                          {planet}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Yoga Details */}
          {selectedYoga && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-astro-bg-tertiary/30 p-5 rounded-lg border border-astro-border-light"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-medium text-astro-accent-primary">{selectedYoga.name}</h3>
                <div className={`
                  text-sm px-3 py-1 rounded-full bg-gradient-to-r ${getStrengthColor(selectedYoga.strength)}
                `}>
                  {selectedYoga.strength}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-base font-medium text-astro-text-primary mb-3">Description</h4>
                  <p className="text-sm text-astro-text-secondary leading-relaxed mb-4">
                    {selectedYoga.description}
                  </p>
                  
                  <h4 className="text-base font-medium text-astro-text-primary mb-2">Traditional Indications</h4>
                  <ul className="space-y-2 text-sm text-astro-text-secondary">
                    <li className="flex items-start">
                      <div className="w-1.5 h-1.5 rounded-full bg-astro-accent-primary mt-1.5 mr-2 flex-shrink-0"></div>
                      <span>Supports manifestation of life purpose and dharma</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-1.5 h-1.5 rounded-full bg-astro-accent-primary mt-1.5 mr-2 flex-shrink-0"></div>
                      <span>Promotes spiritual advancement and material success</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-1.5 h-1.5 rounded-full bg-astro-accent-primary mt-1.5 mr-2 flex-shrink-0"></div>
                      <span>Bestows wealth, fame, and fortune based on strength and planetary positions</span>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <div className="mb-5">
                    <h4 className="text-base font-medium text-astro-text-primary mb-3">Planetary Influences</h4>
                    <div className="bg-astro-bg-card p-3 rounded-lg border border-astro-border-light">
                      <div className="grid grid-cols-2 gap-3">
                        {selectedYoga.planets.map((planet, i) => (
                          <div key={i} className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-astro-accent-primary mr-2"></div>
                            <span className="text-sm">{planet}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-base font-medium text-astro-text-primary mb-3">Houses Influenced</h4>
                    <div className="bg-astro-bg-card p-3 rounded-lg border border-astro-border-light">
                      <div className="grid grid-cols-4 gap-2">
                        {selectedYoga.houses.map((house, i) => (
                          <div key={i} className="text-center">
                            <div className="w-8 h-8 rounded-full bg-astro-bg-tertiary/50 flex items-center justify-center mx-auto mb-1">
                              <span className="text-sm">{house}</span>
                            </div>
                            <div className="text-xs text-astro-text-secondary">House {house}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Content for Doshas */}
      {activeTab === 'doshas' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Dosha Cards Grid */}
          <div className="bg-astro-bg-tertiary/30 p-5 rounded-lg border border-astro-border-light">
            <h3 className="text-lg font-medium text-astro-accent-primary mb-4">Challenging Doshas in Your Chart</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {doshas.map((dosha, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-astro-md
                    ${selectedDosha?.name === dosha.name 
                      ? 'border-astro-accent-primary bg-astro-bg-tertiary/50' 
                      : 'border-astro-border-light bg-astro-bg-accent hover:bg-astro-bg-tertiary/30'
                    }`}
                  onClick={() => setSelectedDosha(dosha)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-base font-medium text-astro-text-primary">{dosha.name}</h4>
                    <div className={`
                      text-xs px-2 py-1 rounded-full bg-gradient-to-r ${getSeverityColor(dosha.severity)}
                    `}>
                      {dosha.severity}
                    </div>
                  </div>
                  <p className="text-sm text-astro-text-secondary line-clamp-2 mb-3">
                    {dosha.description.length > 80 
                      ? dosha.description.substring(0, 80) + '...' 
                      : dosha.description
                    }
                  </p>
                  
                  <div className="text-xs text-astro-text-muted flex items-center">
                    <span className="mr-2">Affects:</span>
                    <div className="flex flex-wrap gap-1">
                      {dosha.affectedAreas.slice(0, 2).map((area, i) => (
                        <span key={i} className="bg-astro-bg-tertiary/50 px-1.5 py-0.5 rounded">
                          {area}
                        </span>
                      ))}
                      {dosha.affectedAreas.length > 2 && (
                        <span className="bg-astro-bg-tertiary/50 px-1.5 py-0.5 rounded">
                          +{dosha.affectedAreas.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Dosha Details */}
          {selectedDosha && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-astro-bg-tertiary/30 p-5 rounded-lg border border-astro-border-light"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-medium text-astro-accent-primary">{selectedDosha.name}</h3>
                <div className={`
                  text-sm px-3 py-1 rounded-full bg-gradient-to-r ${getSeverityColor(selectedDosha.severity)}
                `}>
                  {selectedDosha.severity}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-base font-medium text-astro-text-primary mb-3">Description</h4>
                  <p className="text-sm text-astro-text-secondary leading-relaxed mb-4">
                    {selectedDosha.description}
                  </p>
                  
                  <h4 className="text-base font-medium text-astro-text-primary mb-3">Affected Life Areas</h4>
                  <div className="flex flex-wrap gap-2 mb-5">
                    {selectedDosha.affectedAreas.map((area, i) => (
                      <div key={i} className="bg-astro-bg-card px-3 py-1.5 rounded-full text-sm">
                        {area}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-base font-medium text-astro-text-primary mb-3">Remedial Measures</h4>
                  <div className="space-y-3">
                    {selectedDosha.remedies.map((remedy, i) => (
                      <div key={i} className="bg-astro-bg-card p-3 rounded-lg border border-astro-border-light">
                        <div className="flex items-start">
                          <div className="w-5 h-5 rounded-full bg-astro-accent-primary/20 flex items-center justify-center text-astro-accent-primary mr-2 mt-0.5 flex-shrink-0">
                            {i + 1}
                          </div>
                          <p className="text-sm text-astro-text-secondary">
                            {remedy}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default YogaDosha; 