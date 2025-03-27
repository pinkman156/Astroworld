import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Tabs from '@radix-ui/react-tabs';
import BirthChart from './BirthChart';
import DashaSystem from './DashaSystem';
import YogaDosha from './YogaDosha';
import { VedicChart } from '../../types';

interface VedicDashboardProps {
  vedicData: VedicChart;
}

const VedicDashboard: React.FC<VedicDashboardProps> = ({ vedicData }) => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-astro-accent-primary heading-accent mb-3">
          Cosmic Analysis Dashboard
        </h2>
        <p className="text-astro-text-secondary max-w-2xl mx-auto">
          Explore your complete Vedic astrological analysis with detailed insights into your birth chart,
          planetary periods, house positions, and auspicious/challenging combinations.
        </p>
      </div>

      <Tabs.Root 
        className="flex flex-col w-full" 
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <div className="border-b border-astro-border-light mb-6">
          <div className="container mx-auto">
            <Tabs.List className="flex -mb-px overflow-x-auto hide-scrollbar">
              <Tabs.Trigger 
                className={`px-6 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors duration-200
                  ${activeTab === 'overview' ? 
                    'border-astro-accent-primary text-astro-accent-primary' : 
                    'border-transparent text-astro-text-secondary hover:text-astro-text-primary hover:border-astro-border-light'
                  }`}
                value="overview"
              >
                Overview
              </Tabs.Trigger>
              <Tabs.Trigger 
                className={`px-6 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors duration-200
                  ${activeTab === 'birthchart' ? 
                    'border-astro-accent-primary text-astro-accent-primary' : 
                    'border-transparent text-astro-text-secondary hover:text-astro-text-primary hover:border-astro-border-light'
                  }`}
                value="birthchart"
              >
                Birth Chart
              </Tabs.Trigger>
              <Tabs.Trigger 
                className={`px-6 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors duration-200
                  ${activeTab === 'dashas' ? 
                    'border-astro-accent-primary text-astro-accent-primary' : 
                    'border-transparent text-astro-text-secondary hover:text-astro-text-primary hover:border-astro-border-light'
                  }`}
                value="dashas"
              >
                Dasha System
              </Tabs.Trigger>
              <Tabs.Trigger 
                className={`px-6 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors duration-200
                  ${activeTab === 'yogadosha' ? 
                    'border-astro-accent-primary text-astro-accent-primary' : 
                    'border-transparent text-astro-text-secondary hover:text-astro-text-primary hover:border-astro-border-light'
                  }`}
                value="yogadosha"
              >
                Yogas & Doshas
              </Tabs.Trigger>
            </Tabs.List>
          </div>
        </div>

        <div className="container mx-auto">
          <AnimatePresence mode="wait">
            {/* Overview Tab Content */}
            <Tabs.Content value="overview" asChild>
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <div className="space-y-6">
                  {/* Birth Summary Card */}
                  <div className="p-5 bg-astro-bg-tertiary/30 rounded-lg border border-astro-border-light">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 rounded-full bg-astro-accent-primary/20 flex items-center justify-center mr-4">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
                            fill="#B28F4C" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-medium text-astro-accent-primary mb-1">Birth Chart Summary</h3>
                        <p className="text-astro-text-secondary">Key insights from your Vedic birth chart</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Basic Info */}
                      <div className="p-4 bg-astro-bg-card rounded-lg border border-astro-border-light">
                        <h4 className="text-base font-medium text-astro-text-primary mb-3">Ascendant Sign</h4>
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-astro-bg-tertiary/50 flex items-center justify-center mr-3">
                            <span className="text-xl">
                              {['♈︎', '♉︎', '♊︎', '♋︎', '♌︎', '♍︎', '♎︎', '♏︎', '♐︎', '♑︎', '♒︎', '♓︎'][vedicData.birthChart.ascendant - 1]}
                            </span>
                          </div>
                          <div>
                            <div className="text-base font-medium">
                              {['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'][vedicData.birthChart.ascendant - 1]}
                            </div>
                            <div className="text-sm text-astro-text-secondary">
                              Rising Sign
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Current Dasha */}
                      <div className="p-4 bg-astro-bg-card rounded-lg border border-astro-border-light">
                        <h4 className="text-base font-medium text-astro-text-primary mb-3">Current Period</h4>
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-astro-bg-tertiary/50 flex items-center justify-center mr-3">
                            <span className="text-xl text-astro-accent-primary">
                              {vedicData.dashas.currentMahadasha.planet.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="text-base font-medium">
                              {vedicData.dashas.currentMahadasha.planet} - {vedicData.dashas.currentAntardasha.planet}
                            </div>
                            <div className="text-sm text-astro-text-secondary">
                              Mahadasha - Antardasha
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Key Yogas/Doshas */}
                      <div className="p-4 bg-astro-bg-card rounded-lg border border-astro-border-light">
                        <h4 className="text-base font-medium text-astro-text-primary mb-3">Combinations</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Yogas:</span>
                            <span className="text-sm font-medium text-astro-accent-primary">{vedicData.yogas.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Doshas:</span>
                            <span className="text-sm font-medium text-red-400">{vedicData.doshas.length}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mini Sections */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Mini Birth Chart */}
                    <div 
                      className="p-5 bg-astro-bg-tertiary/30 rounded-lg border border-astro-border-light cursor-pointer hover:shadow-astro-md transition-shadow duration-200"
                      onClick={() => setActiveTab('birthchart')}
                    >
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-astro-accent-primary">Birth Chart</h3>
                        <button className="text-xs bg-astro-bg-card px-2 py-1 rounded text-astro-text-secondary">
                          View Full Chart
                        </button>
                      </div>
                      <div className="flex justify-center">
                        <div className="w-48 h-48 relative">
                          <svg viewBox="0 0 100 100" className="w-full h-full">
                            {/* Outer circle */}
                            <circle cx="50" cy="50" r="45" fill="transparent" stroke="#334155" strokeWidth="1" />

                            {/* House divisions */}
                            {[...Array(12)].map((_, i) => (
                              <line 
                                key={i}
                                x1="50" 
                                y1="50" 
                                x2={50 + 45 * Math.cos(2 * Math.PI * i / 12)} 
                                y2={50 + 45 * Math.sin(2 * Math.PI * i / 12)} 
                                stroke="#334155" 
                                strokeWidth="1" 
                              />
                            ))}

                            {/* Planets */}
                            {vedicData.birthChart.planets.map((planet, i) => {
                              // Calculate position in circle based on house and a small offset
                              const houseCenter = (planet.house - 1) * 30 + 15;
                              const radius = 30; // Inside the circle
                              const angle = (houseCenter * Math.PI) / 180;
                              const x = 50 + radius * Math.cos(angle);
                              const y = 50 + radius * Math.sin(angle);

                              return (
                                <circle 
                                  key={i}
                                  cx={x} 
                                  cy={y} 
                                  r="3" 
                                  fill={planet.color} 
                                />
                              );
                            })}
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Mini Dasha Timeline */}
                    <div 
                      className="p-5 bg-astro-bg-tertiary/30 rounded-lg border border-astro-border-light cursor-pointer hover:shadow-astro-md transition-shadow duration-200"
                      onClick={() => setActiveTab('dashas')}
                    >
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-astro-accent-primary">Dasha Timeline</h3>
                        <button className="text-xs bg-astro-bg-card px-2 py-1 rounded text-astro-text-secondary">
                          View All Periods
                        </button>
                      </div>
                      <div className="space-y-3">
                        {vedicData.dashas.sequence.slice(0, 5).map((dasha, index) => (
                          <div 
                            key={index} 
                            className={`flex items-center justify-between p-2 rounded border ${
                              dasha.planet === vedicData.dashas.currentMahadasha.planet 
                                ? 'border-astro-accent-primary bg-astro-bg-tertiary/50' 
                                : 'border-astro-border-light bg-astro-bg-card'
                            }`}
                          >
                            <div className="flex items-center">
                              <div className="w-6 h-6 rounded-full bg-astro-bg-tertiary/50 flex items-center justify-center mr-2">
                                <span className="text-sm">{dasha.planet.charAt(0)}</span>
                              </div>
                              <span className="text-sm">{dasha.planet}</span>
                            </div>
                            <div className="text-xs text-astro-text-secondary">
                              {new Date(dasha.startDate).getFullYear()} - {new Date(dasha.endDate).getFullYear()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Quick Links */}
                  <div className="p-5 bg-astro-bg-tertiary/30 rounded-lg border border-astro-border-light">
                    <h3 className="text-lg font-medium text-astro-accent-primary mb-4">Explore Your Chart</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <button 
                        className="p-4 bg-astro-bg-card rounded-lg border border-astro-border-light hover:bg-astro-bg-tertiary/50 hover:border-astro-accent-primary/50 transition-colors duration-200"
                        onClick={() => setActiveTab('birthchart')}
                      >
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-astro-bg-tertiary/50 mb-2">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="12" cy="12" r="10" stroke="#B28F4C" strokeWidth="1.5"/>
                              <path d="M12 2V22M2 12H22M3.93 3.93L20.07 20.07M3.93 20.07L20.07 3.93" stroke="#B28F4C" strokeWidth="1.5"/>
                            </svg>
                          </div>
                          <div className="text-sm font-medium">Birth Chart</div>
                          <div className="text-xs text-astro-text-secondary">Planetary Positions</div>
                        </div>
                      </button>
                      
                      <button 
                        className="p-4 bg-astro-bg-card rounded-lg border border-astro-border-light hover:bg-astro-bg-tertiary/50 hover:border-astro-accent-primary/50 transition-colors duration-200"
                        onClick={() => setActiveTab('dashas')}
                      >
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-astro-bg-tertiary/50 mb-2">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M3 10H21M3 14H21M3 18H21M3 6H21M7 6V18M17 6V18" stroke="#B28F4C" strokeWidth="1.5"/>
                            </svg>
                          </div>
                          <div className="text-sm font-medium">Dasha System</div>
                          <div className="text-xs text-astro-text-secondary">Planetary Periods</div>
                        </div>
                      </button>
                      
                      <button 
                        className="p-4 bg-astro-bg-card rounded-lg border border-astro-border-light hover:bg-astro-bg-tertiary/50 hover:border-astro-accent-primary/50 transition-colors duration-200"
                        onClick={() => setActiveTab('yogadosha')}
                      >
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-astro-bg-tertiary/50 mb-2">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M8 12H16M12 4V20" stroke="#B28F4C" strokeWidth="1.5"/>
                              <circle cx="12" cy="12" r="10" stroke="#B28F4C" strokeWidth="1.5"/>
                            </svg>
                          </div>
                          <div className="text-sm font-medium">Yogas & Doshas</div>
                          <div className="text-xs text-astro-text-secondary">Combinations & Influences</div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Tabs.Content>

            {/* Birth Chart Tab Content */}
            <Tabs.Content value="birthchart" asChild>
              <motion.div
                key="birthchart"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <BirthChart 
                  ascendant={vedicData.birthChart.ascendant}
                  planets={vedicData.birthChart.planets}
                  houses={vedicData.birthChart.houses}
                />
              </motion.div>
            </Tabs.Content>

            {/* Dasha System Tab Content */}
            <Tabs.Content value="dashas" asChild>
              <motion.div
                key="dashas"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <DashaSystem 
                  currentMahadasha={vedicData.dashas.currentMahadasha}
                  currentAntardasha={vedicData.dashas.currentAntardasha}
                  sequence={vedicData.dashas.sequence}
                />
              </motion.div>
            </Tabs.Content>

            {/* Yogas & Doshas Tab Content */}
            <Tabs.Content value="yogadosha" asChild>
              <motion.div
                key="yogadosha"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <YogaDosha 
                  yogas={vedicData.yogas}
                  doshas={vedicData.doshas}
                />
              </motion.div>
            </Tabs.Content>
          </AnimatePresence>
        </div>
      </Tabs.Root>

      <div className="hide-scrollbar-styles">
        <style>
          {`
            .hide-scrollbar::-webkit-scrollbar {
              display: none;
            }
            .hide-scrollbar {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}
        </style>
      </div>
    </div>
  );
};

export default VedicDashboard; 