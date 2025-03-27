import React, { useState } from 'react';
import { motion } from 'framer-motion';
import * as d3 from 'd3';
import { Planet, House } from '../../types';

interface BirthChartProps {
  ascendant: number;
  planets: Planet[];
  houses: House[];
}

// Constants
const ZODIAC_SIGNS = [
  { id: 1, name: 'Aries', symbol: '♈︎', element: 'fire' },
  { id: 2, name: 'Taurus', symbol: '♉︎', element: 'earth' },
  { id: 3, name: 'Gemini', symbol: '♊︎', element: 'air' },
  { id: 4, name: 'Cancer', symbol: '♋︎', element: 'water' },
  { id: 5, name: 'Leo', symbol: '♌︎', element: 'fire' },
  { id: 6, name: 'Virgo', symbol: '♍︎', element: 'earth' },
  { id: 7, name: 'Libra', symbol: '♎︎', element: 'air' },
  { id: 8, name: 'Scorpio', symbol: '♏︎', element: 'water' },
  { id: 9, name: 'Sagittarius', symbol: '♐︎', element: 'fire' },
  { id: 10, name: 'Capricorn', symbol: '♑︎', element: 'earth' },
  { id: 11, name: 'Aquarius', symbol: '♒︎', element: 'air' },
  { id: 12, name: 'Pisces', symbol: '♓︎', element: 'water' }
];

const PLANET_SYMBOLS = {
  'Sun': '☉',
  'Moon': '☽',
  'Mercury': '☿',
  'Venus': '♀',
  'Mars': '♂',
  'Jupiter': '♃',
  'Saturn': '♄',
  'Rahu': '☊',
  'Ketu': '☋'
};

// Get element class for styling
const getElementClass = (element: string) => {
  switch (element) {
    case 'fire': return 'text-red-500';
    case 'earth': return 'text-green-500';
    case 'air': return 'text-blue-400';
    case 'water': return 'text-cyan-400';
    default: return '';
  }
};

const BirthChart: React.FC<BirthChartProps> = ({ ascendant, planets, houses }) => {
  const [chartStyle, setChartStyle] = useState<'north' | 'south'>('north');
  const [selectedHouse, setSelectedHouse] = useState<number | null>(null);
  
  // Get planets in a specific house
  const getPlanetsInHouse = (houseNum: number) => {
    return planets.filter(planet => planet.house === houseNum);
  };

  // Get house details by number
  const getHouse = (houseNum: number) => {
    return houses.find(house => house.number === houseNum);
  };

  // Configure North Indian chart
  const renderNorthIndianChart = () => {
    // Calculate starting positions based on ascendant
    const houseOrder = Array.from({ length: 12 }, (_, i) => {
      // Adjust houses so ascendant is always in the first house position
      const houseNum = ((i + ascendant - 1) % 12) + 1;
      return houseNum;
    });

    return (
      <div className="grid grid-cols-4 grid-rows-3 gap-1 w-full max-w-xl mx-auto aspect-[4/3]">
        {/* Top row */}
        <div className={`house-box ${selectedHouse === houseOrder[11] ? 'ring-2 ring-astro-accent-primary' : ''}`} 
           onClick={() => setSelectedHouse(houseOrder[11])}>
          <div className="house-number">{houseOrder[11]}</div>
          <div className="house-sign">{ZODIAC_SIGNS[(houseOrder[11] - 1) % 12].symbol}</div>
          <div className="house-planets">
            {getPlanetsInHouse(houseOrder[11]).map(planet => (
              <span key={planet.id} style={{ color: planet.color }}>
                {PLANET_SYMBOLS[planet.name as keyof typeof PLANET_SYMBOLS]}
              </span>
            ))}
          </div>
        </div>
        <div className={`house-box ${selectedHouse === houseOrder[0] ? 'ring-2 ring-astro-accent-primary' : ''}`}
             onClick={() => setSelectedHouse(houseOrder[0])}>
          <div className="house-number">{houseOrder[0]}</div>
          <div className="house-sign">{ZODIAC_SIGNS[(houseOrder[0] - 1) % 12].symbol}</div>
          <div className="house-planets">
            {getPlanetsInHouse(houseOrder[0]).map(planet => (
              <span key={planet.id} style={{ color: planet.color }}>
                {PLANET_SYMBOLS[planet.name as keyof typeof PLANET_SYMBOLS]}
              </span>
            ))}
          </div>
        </div>
        <div className={`house-box ${selectedHouse === houseOrder[1] ? 'ring-2 ring-astro-accent-primary' : ''}`}
             onClick={() => setSelectedHouse(houseOrder[1])}>
          <div className="house-number">{houseOrder[1]}</div>
          <div className="house-sign">{ZODIAC_SIGNS[(houseOrder[1] - 1) % 12].symbol}</div>
          <div className="house-planets">
            {getPlanetsInHouse(houseOrder[1]).map(planet => (
              <span key={planet.id} style={{ color: planet.color }}>
                {PLANET_SYMBOLS[planet.name as keyof typeof PLANET_SYMBOLS]}
              </span>
            ))}
          </div>
        </div>
        <div className={`house-box ${selectedHouse === houseOrder[2] ? 'ring-2 ring-astro-accent-primary' : ''}`}
             onClick={() => setSelectedHouse(houseOrder[2])}>
          <div className="house-number">{houseOrder[2]}</div>
          <div className="house-sign">{ZODIAC_SIGNS[(houseOrder[2] - 1) % 12].symbol}</div>
          <div className="house-planets">
            {getPlanetsInHouse(houseOrder[2]).map(planet => (
              <span key={planet.id} style={{ color: planet.color }}>
                {PLANET_SYMBOLS[planet.name as keyof typeof PLANET_SYMBOLS]}
              </span>
            ))}
          </div>
        </div>

        {/* Middle rows */}
        <div className={`house-box ${selectedHouse === houseOrder[10] ? 'ring-2 ring-astro-accent-primary' : ''}`}
             onClick={() => setSelectedHouse(houseOrder[10])}>
          <div className="house-number">{houseOrder[10]}</div>
          <div className="house-sign">{ZODIAC_SIGNS[(houseOrder[10] - 1) % 12].symbol}</div>
          <div className="house-planets">
            {getPlanetsInHouse(houseOrder[10]).map(planet => (
              <span key={planet.id} style={{ color: planet.color }}>
                {PLANET_SYMBOLS[planet.name as keyof typeof PLANET_SYMBOLS]}
              </span>
            ))}
          </div>
        </div>
        <div className="col-span-2 row-span-1 flex items-center justify-center bg-astro-bg-accent/30 rounded-lg">
          <div className="text-center">
            <div className="text-astro-accent-primary text-xl font-medium mb-1 heading-accent">Rashi Chart</div>
            <div className="text-sm text-astro-text-secondary">Ascendant: {ZODIAC_SIGNS[ascendant - 1].name}</div>
          </div>
        </div>
        <div className={`house-box ${selectedHouse === houseOrder[3] ? 'ring-2 ring-astro-accent-primary' : ''}`}
             onClick={() => setSelectedHouse(houseOrder[3])}>
          <div className="house-number">{houseOrder[3]}</div>
          <div className="house-sign">{ZODIAC_SIGNS[(houseOrder[3] - 1) % 12].symbol}</div>
          <div className="house-planets">
            {getPlanetsInHouse(houseOrder[3]).map(planet => (
              <span key={planet.id} style={{ color: planet.color }}>
                {PLANET_SYMBOLS[planet.name as keyof typeof PLANET_SYMBOLS]}
              </span>
            ))}
          </div>
        </div>

        <div className={`house-box ${selectedHouse === houseOrder[9] ? 'ring-2 ring-astro-accent-primary' : ''}`}
             onClick={() => setSelectedHouse(houseOrder[9])}>
          <div className="house-number">{houseOrder[9]}</div>
          <div className="house-sign">{ZODIAC_SIGNS[(houseOrder[9] - 1) % 12].symbol}</div>
          <div className="house-planets">
            {getPlanetsInHouse(houseOrder[9]).map(planet => (
              <span key={planet.id} style={{ color: planet.color }}>
                {PLANET_SYMBOLS[planet.name as keyof typeof PLANET_SYMBOLS]}
              </span>
            ))}
          </div>
        </div>
        <div className="col-span-2 row-span-1 bg-astro-bg-accent/0"></div>
        <div className={`house-box ${selectedHouse === houseOrder[4] ? 'ring-2 ring-astro-accent-primary' : ''}`}
             onClick={() => setSelectedHouse(houseOrder[4])}>
          <div className="house-number">{houseOrder[4]}</div>
          <div className="house-sign">{ZODIAC_SIGNS[(houseOrder[4] - 1) % 12].symbol}</div>
          <div className="house-planets">
            {getPlanetsInHouse(houseOrder[4]).map(planet => (
              <span key={planet.id} style={{ color: planet.color }}>
                {PLANET_SYMBOLS[planet.name as keyof typeof PLANET_SYMBOLS]}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom row */}
        <div className={`house-box ${selectedHouse === houseOrder[8] ? 'ring-2 ring-astro-accent-primary' : ''}`}
             onClick={() => setSelectedHouse(houseOrder[8])}>
          <div className="house-number">{houseOrder[8]}</div>
          <div className="house-sign">{ZODIAC_SIGNS[(houseOrder[8] - 1) % 12].symbol}</div>
          <div className="house-planets">
            {getPlanetsInHouse(houseOrder[8]).map(planet => (
              <span key={planet.id} style={{ color: planet.color }}>
                {PLANET_SYMBOLS[planet.name as keyof typeof PLANET_SYMBOLS]}
              </span>
            ))}
          </div>
        </div>
        <div className={`house-box ${selectedHouse === houseOrder[7] ? 'ring-2 ring-astro-accent-primary' : ''}`}
             onClick={() => setSelectedHouse(houseOrder[7])}>
          <div className="house-number">{houseOrder[7]}</div>
          <div className="house-sign">{ZODIAC_SIGNS[(houseOrder[7] - 1) % 12].symbol}</div>
          <div className="house-planets">
            {getPlanetsInHouse(houseOrder[7]).map(planet => (
              <span key={planet.id} style={{ color: planet.color }}>
                {PLANET_SYMBOLS[planet.name as keyof typeof PLANET_SYMBOLS]}
              </span>
            ))}
          </div>
        </div>
        <div className={`house-box ${selectedHouse === houseOrder[6] ? 'ring-2 ring-astro-accent-primary' : ''}`}
             onClick={() => setSelectedHouse(houseOrder[6])}>
          <div className="house-number">{houseOrder[6]}</div>
          <div className="house-sign">{ZODIAC_SIGNS[(houseOrder[6] - 1) % 12].symbol}</div>
          <div className="house-planets">
            {getPlanetsInHouse(houseOrder[6]).map(planet => (
              <span key={planet.id} style={{ color: planet.color }}>
                {PLANET_SYMBOLS[planet.name as keyof typeof PLANET_SYMBOLS]}
              </span>
            ))}
          </div>
        </div>
        <div className={`house-box ${selectedHouse === houseOrder[5] ? 'ring-2 ring-astro-accent-primary' : ''}`}
             onClick={() => setSelectedHouse(houseOrder[5])}>
          <div className="house-number">{houseOrder[5]}</div>
          <div className="house-sign">{ZODIAC_SIGNS[(houseOrder[5] - 1) % 12].symbol}</div>
          <div className="house-planets">
            {getPlanetsInHouse(houseOrder[5]).map(planet => (
              <span key={planet.id} style={{ color: planet.color }}>
                {PLANET_SYMBOLS[planet.name as keyof typeof PLANET_SYMBOLS]}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // South Indian chart rendering
  const renderSouthIndianChart = () => {
    return (
      <div className="grid grid-cols-3 grid-rows-3 gap-1 w-full max-w-xl mx-auto aspect-square">
        {/* Top row */}
        <div className={`house-box ${selectedHouse === 4 ? 'ring-2 ring-astro-accent-primary' : ''}`}
             onClick={() => setSelectedHouse(4)}>
          <div className="house-number">4</div>
          <div className="house-sign">{ZODIAC_SIGNS[((ascendant + 3) % 12) || 12 - 1].symbol}</div>
          <div className="house-planets">
            {getPlanetsInHouse(4).map(planet => (
              <span key={planet.id} style={{ color: planet.color }}>
                {PLANET_SYMBOLS[planet.name as keyof typeof PLANET_SYMBOLS]}
              </span>
            ))}
          </div>
        </div>
        <div className={`house-box ${selectedHouse === 5 ? 'ring-2 ring-astro-accent-primary' : ''}`}
             onClick={() => setSelectedHouse(5)}>
          <div className="house-number">5</div>
          <div className="house-sign">{ZODIAC_SIGNS[((ascendant + 4) % 12) || 12 - 1].symbol}</div>
          <div className="house-planets">
            {getPlanetsInHouse(5).map(planet => (
              <span key={planet.id} style={{ color: planet.color }}>
                {PLANET_SYMBOLS[planet.name as keyof typeof PLANET_SYMBOLS]}
              </span>
            ))}
          </div>
        </div>
        <div className={`house-box ${selectedHouse === 6 ? 'ring-2 ring-astro-accent-primary' : ''}`}
             onClick={() => setSelectedHouse(6)}>
          <div className="house-number">6</div>
          <div className="house-sign">{ZODIAC_SIGNS[((ascendant + 5) % 12) || 12 - 1].symbol}</div>
          <div className="house-planets">
            {getPlanetsInHouse(6).map(planet => (
              <span key={planet.id} style={{ color: planet.color }}>
                {PLANET_SYMBOLS[planet.name as keyof typeof PLANET_SYMBOLS]}
              </span>
            ))}
          </div>
        </div>

        {/* Middle row */}
        <div className={`house-box ${selectedHouse === 3 ? 'ring-2 ring-astro-accent-primary' : ''}`}
             onClick={() => setSelectedHouse(3)}>
          <div className="house-number">3</div>
          <div className="house-sign">{ZODIAC_SIGNS[((ascendant + 2) % 12) || 12 - 1].symbol}</div>
          <div className="house-planets">
            {getPlanetsInHouse(3).map(planet => (
              <span key={planet.id} style={{ color: planet.color }}>
                {PLANET_SYMBOLS[planet.name as keyof typeof PLANET_SYMBOLS]}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center bg-astro-bg-accent/30 rounded-lg">
          <div className="text-center">
            <div className="text-astro-accent-primary text-lg font-medium mb-1 heading-accent">Rashi</div>
            <div className="text-sm text-astro-text-secondary">{ZODIAC_SIGNS[ascendant - 1].name}</div>
          </div>
        </div>
        <div className={`house-box ${selectedHouse === 7 ? 'ring-2 ring-astro-accent-primary' : ''}`}
             onClick={() => setSelectedHouse(7)}>
          <div className="house-number">7</div>
          <div className="house-sign">{ZODIAC_SIGNS[((ascendant + 6) % 12) || 12 - 1].symbol}</div>
          <div className="house-planets">
            {getPlanetsInHouse(7).map(planet => (
              <span key={planet.id} style={{ color: planet.color }}>
                {PLANET_SYMBOLS[planet.name as keyof typeof PLANET_SYMBOLS]}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom row */}
        <div className={`house-box ${selectedHouse === 2 ? 'ring-2 ring-astro-accent-primary' : ''}`}
             onClick={() => setSelectedHouse(2)}>
          <div className="house-number">2</div>
          <div className="house-sign">{ZODIAC_SIGNS[((ascendant + 1) % 12) || 12 - 1].symbol}</div>
          <div className="house-planets">
            {getPlanetsInHouse(2).map(planet => (
              <span key={planet.id} style={{ color: planet.color }}>
                {PLANET_SYMBOLS[planet.name as keyof typeof PLANET_SYMBOLS]}
              </span>
            ))}
          </div>
        </div>
        <div className={`house-box ${selectedHouse === 1 ? 'ring-2 ring-astro-accent-primary' : ''}`}
             onClick={() => setSelectedHouse(1)}>
          <div className="house-number">1</div>
          <div className="house-sign">{ZODIAC_SIGNS[ascendant - 1].symbol}</div>
          <div className="house-planets">
            {getPlanetsInHouse(1).map(planet => (
              <span key={planet.id} style={{ color: planet.color }}>
                {PLANET_SYMBOLS[planet.name as keyof typeof PLANET_SYMBOLS]}
              </span>
            ))}
          </div>
        </div>
        <div className={`house-box ${selectedHouse === 12 ? 'ring-2 ring-astro-accent-primary' : ''}`}
             onClick={() => setSelectedHouse(12)}>
          <div className="house-number">12</div>
          <div className="house-sign">{ZODIAC_SIGNS[((ascendant + 11) % 12) || 12 - 1].symbol}</div>
          <div className="house-planets">
            {getPlanetsInHouse(12).map(planet => (
              <span key={planet.id} style={{ color: planet.color }}>
                {PLANET_SYMBOLS[planet.name as keyof typeof PLANET_SYMBOLS]}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-center mb-4">
        <div className="bg-astro-bg-tertiary inline-flex items-center p-1 rounded-md">
          <button
            className={`px-4 py-1.5 text-sm font-medium rounded ${
              chartStyle === 'north' ? 'bg-astro-bg-card text-astro-accent-primary' : 'text-astro-text-secondary'
            }`}
            onClick={() => setChartStyle('north')}
          >
            North Indian
          </button>
          <button
            className={`px-4 py-1.5 text-sm font-medium rounded ${
              chartStyle === 'south' ? 'bg-astro-bg-card text-astro-accent-primary' : 'text-astro-text-secondary'
            }`}
            onClick={() => setChartStyle('south')}
          >
            South Indian
          </button>
        </div>
      </div>

      <div className="birth-chart-container">
        {chartStyle === 'north' ? renderNorthIndianChart() : renderSouthIndianChart()}
      </div>

      {selectedHouse && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-astro-bg-tertiary/50 rounded-lg border border-astro-border-light"
        >
          <h3 className="text-lg font-medium text-astro-accent-primary mb-2">
            House {selectedHouse} Details
          </h3>
          {getHouse(selectedHouse) && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <div>
                  <span className="text-astro-text-secondary">Sign:</span>{' '}
                  <span className="text-astro-text-primary">
                    {ZODIAC_SIGNS[getHouse(selectedHouse)!.sign - 1].name}
                  </span>
                </div>
                <div>
                  <span className="text-astro-text-secondary">Lord:</span>{' '}
                  <span className="text-astro-text-primary">{getHouse(selectedHouse)!.lord}</span>
                </div>
                <div>
                  <span className="text-astro-text-secondary">Strength:</span>{' '}
                  <span className={`
                    ${getHouse(selectedHouse)!.strength === 'strong' ? 'text-green-400' : 
                      getHouse(selectedHouse)!.strength === 'moderate' ? 'text-yellow-400' : 
                      'text-red-400'}
                  `}>{getHouse(selectedHouse)!.strength}</span>
                </div>
              </div>
              
              <div>
                <div className="text-astro-text-secondary mb-1">Planets:</div>
                <div className="flex flex-wrap gap-2">
                  {getPlanetsInHouse(selectedHouse).length > 0 ? 
                    getPlanetsInHouse(selectedHouse).map(planet => (
                      <div key={planet.id} className="inline-flex items-center px-2 py-1 bg-astro-bg-card rounded border border-astro-border-light">
                        <span style={{ color: planet.color }} className="mr-1">{PLANET_SYMBOLS[planet.name as keyof typeof PLANET_SYMBOLS]}</span>
                        <span className="text-sm">{planet.name}</span>
                        {planet.isRetrograde && <span className="ml-1 text-xs text-red-400">R</span>}
                      </div>
                    )) : 
                    <span className="text-astro-text-muted italic text-sm">No planets in this house</span>
                  }
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      <div className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <h3 className="text-lg font-medium text-astro-accent-primary mb-3">Planetary Positions</h3>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-astro-bg-card border-b border-astro-border-light">
                  <tr>
                    <th className="py-2 px-3 text-left">Planet</th>
                    <th className="py-2 px-3 text-left">Sign</th>
                    <th className="py-2 px-3 text-left">Degree</th>
                    <th className="py-2 px-3 text-left">House</th>
                    <th className="py-2 px-3 text-left">Nakshatra</th>
                    <th className="py-2 px-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {planets.map((planet) => (
                    <tr key={planet.id} className="border-b border-astro-border-light/50 hover:bg-astro-bg-tertiary/30">
                      <td className="py-2 px-3">
                        <div className="flex items-center">
                          <span style={{ color: planet.color }} className="mr-2">{PLANET_SYMBOLS[planet.name as keyof typeof PLANET_SYMBOLS]}</span>
                          {planet.name}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center">
                          <span className={`mr-1 ${getElementClass(ZODIAC_SIGNS[planet.sign - 1].element)}`}>
                            {ZODIAC_SIGNS[planet.sign - 1].symbol}
                          </span>
                          {ZODIAC_SIGNS[planet.sign - 1].name}
                        </div>
                      </td>
                      <td className="py-2 px-3">{planet.degree}°</td>
                      <td className="py-2 px-3">{planet.house}</td>
                      <td className="py-2 px-3">{planet.nakshatra}</td>
                      <td className="py-2 px-3">
                        {planet.isRetrograde && (
                          <span className="text-red-400">Retrograde</span>
                        )}
                        {!planet.isRetrograde && (
                          <span className="text-green-400">Direct</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-astro-accent-primary mb-3">Chart Information</h3>
            <div className="bg-astro-bg-tertiary/30 p-4 rounded-lg border border-astro-border-light">
              <div className="mb-3">
                <div className="text-astro-text-secondary mb-1">Ascendant (Lagna)</div>
                <div className="text-lg font-medium">
                  <span className={getElementClass(ZODIAC_SIGNS[ascendant - 1].element)}>
                    {ZODIAC_SIGNS[ascendant - 1].symbol}
                  </span>
                  {' '}{ZODIAC_SIGNS[ascendant - 1].name}
                </div>
              </div>
              
              <div className="mb-2">
                <div className="text-astro-text-secondary mb-1">Elements Distribution</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-astro-bg-card p-2 rounded text-center">
                    <div className="text-red-500 text-sm">Fire</div>
                    <div className="text-lg font-medium">
                      {planets.filter(p => ['fire'].includes(ZODIAC_SIGNS[p.sign - 1].element)).length}
                    </div>
                  </div>
                  <div className="bg-astro-bg-card p-2 rounded text-center">
                    <div className="text-green-500 text-sm">Earth</div>
                    <div className="text-lg font-medium">
                      {planets.filter(p => ['earth'].includes(ZODIAC_SIGNS[p.sign - 1].element)).length}
                    </div>
                  </div>
                  <div className="bg-astro-bg-card p-2 rounded text-center">
                    <div className="text-blue-400 text-sm">Air</div>
                    <div className="text-lg font-medium">
                      {planets.filter(p => ['air'].includes(ZODIAC_SIGNS[p.sign - 1].element)).length}
                    </div>
                  </div>
                  <div className="bg-astro-bg-card p-2 rounded text-center">
                    <div className="text-cyan-400 text-sm">Water</div>
                    <div className="text-lg font-medium">
                      {planets.filter(p => ['water'].includes(ZODIAC_SIGNS[p.sign - 1].element)).length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .house-box {
          background-color: rgba(30, 41, 59, 0.5);
          border: 1px solid var(--color-border-light);
          border-radius: 0.375rem;
          padding: 0.75rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .house-box:hover {
          background-color: rgba(51, 65, 85, 0.5);
        }
        
        .house-number {
          font-size: 1rem;
          font-weight: 500;
          color: var(--color-text-secondary);
        }
        
        .house-sign {
          font-size: 1.25rem;
          margin: 0.25rem 0;
        }
        
        .house-planets {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
          justify-content: center;
          font-size: 1rem;
        }
        
        .house-planets span {
          display: inline-block;
          margin: 0 2px;
        }
      `}</style>
    </div>
  );
};

export default BirthChart; 