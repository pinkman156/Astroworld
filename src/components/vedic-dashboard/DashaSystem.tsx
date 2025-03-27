import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Chart from 'react-apexcharts';
import { DashaPeriod } from '../../types';

interface DashaSystemProps {
  currentMahadasha: DashaPeriod;
  currentAntardasha: DashaPeriod;
  sequence: DashaPeriod[];
}

// Planet color mapping
const PLANET_COLORS = {
  'Sun': '#E8A87C',
  'Moon': '#D0D6DE',
  'Mars': '#E27D60',
  'Mercury': '#85CDCA',
  'Jupiter': '#E8DE92',
  'Venus': '#C38DD9',
  'Saturn': '#4056A1',
  'Rahu': '#6CA6C1',
  'Ketu': '#FE5F55'
};

// Helper function to format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Calculate time remaining in current dasha
const calculateTimeRemaining = (endDate: string): string => {
  const end = new Date(endDate).getTime();
  const now = new Date().getTime();
  
  // If end date is in the past
  if (now > end) return "Completed";
  
  const diffTime = Math.abs(end - now);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const years = Math.floor(diffDays / 365);
  const months = Math.floor((diffDays % 365) / 30);
  const days = Math.floor((diffDays % 365) % 30);
  
  return `${years > 0 ? `${years}y ` : ''}${months > 0 ? `${months}m ` : ''}${days}d`;
};

// Calculate dasha duration in years
const calculateDuration = (startDate: string, endDate: string): number => {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return parseFloat((diffDays / 365).toFixed(1));
};

const DashaSystem: React.FC<DashaSystemProps> = ({ 
  currentMahadasha, 
  currentAntardasha, 
  sequence 
}) => {
  const [selectedDasha, setSelectedDasha] = useState<DashaPeriod | null>(null);
  const [expandedDasha, setExpandedDasha] = useState<string | null>(currentMahadasha.planet);

  // Chart options for timeline
  const chartOptions = {
    chart: {
      type: 'rangeBar' as const,
      toolbar: {
        show: false
      },
      background: 'transparent'
    },
    plotOptions: {
      bar: {
        horizontal: true,
        distributed: true,
        dataLabels: {
          hideOverflowingLabels: false,
        },
        borderRadius: 4
      }
    },
    dataLabels: {
      enabled: true,
      formatter: function(val: any, opts: any) {
        const planet = opts.w.globals.labels[opts.dataPointIndex];
        return planet;
      },
      style: {
        fontSize: '12px',
        fontWeight: 500,
        colors: ['#fff']
      },
    },
    xaxis: {
      type: 'datetime' as const,
      labels: {
        style: {
          colors: '#CBD5E1'
        },
        datetimeFormatter: {
          year: 'yyyy',
          month: 'MMM yyyy'
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: '#CBD5E1'
        }
      }
    },
    grid: {
      borderColor: '#334155',
      strokeDashArray: 4,
      xaxis: {
        lines: {
          show: true
        }
      },
      yaxis: {
        lines: {
          show: false
        }
      }
    },
    tooltip: {
      theme: 'dark',
      x: {
        formatter: function(val: number) {
          return new Date(val).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric'
          });
        }
      },
      y: {
        title: {
          formatter: function(seriesName: string) {
            return '';
          }
        }
      }
    },
    legend: {
      show: false
    },
    colors: sequence.map(dash => PLANET_COLORS[dash.planet as keyof typeof PLANET_COLORS] || '#B28F4C')
  };

  // Prepare data for timeline chart
  const chartSeries = [{
    data: sequence.map(dash => ({
      x: dash.planet,
      y: [
        new Date(dash.startDate).getTime(),
        new Date(dash.endDate).getTime()
      ],
      fillColor: PLANET_COLORS[dash.planet as keyof typeof PLANET_COLORS] || '#B28F4C'
    }))
  }];

  // Toggle expanded dasha
  const toggleExpandDasha = (planet: string) => {
    if (expandedDasha === planet) {
      setExpandedDasha(null);
    } else {
      setExpandedDasha(planet);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Mahadasha Card */}
        <div className="col-span-1 bg-astro-bg-tertiary/30 rounded-lg border border-astro-border-light p-4">
          <h3 className="text-lg font-medium text-astro-accent-primary mb-3">Current Mahadasha</h3>
          <div className="bg-astro-bg-accent rounded-lg p-4 border border-astro-border-light">
            <div className="flex items-center mb-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center mr-3"
                style={{ backgroundColor: `${PLANET_COLORS[currentMahadasha.planet as keyof typeof PLANET_COLORS]}30` }}
              >
                <span 
                  className="text-xl"
                  style={{ color: PLANET_COLORS[currentMahadasha.planet as keyof typeof PLANET_COLORS] }}
                >
                  {currentMahadasha.planet.charAt(0)}
                </span>
              </div>
              <div>
                <div className="text-lg font-medium text-astro-text-primary">{currentMahadasha.planet}</div>
                <div className="text-sm text-astro-text-secondary">Mahadasha</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div>
                <div className="text-xs text-astro-text-secondary">From</div>
                <div className="text-sm font-medium">{formatDate(currentMahadasha.startDate)}</div>
              </div>
              <div>
                <div className="text-xs text-astro-text-secondary">To</div>
                <div className="text-sm font-medium">{formatDate(currentMahadasha.endDate)}</div>
              </div>
            </div>
            <div className="bg-astro-bg-tertiary/50 rounded p-2">
              <div className="text-xs text-astro-text-secondary mb-1">Time Remaining</div>
              <div className="text-sm font-medium">{calculateTimeRemaining(currentMahadasha.endDate)}</div>
            </div>
          </div>
        </div>

        {/* Current Antardasha Card */}
        <div className="col-span-1 bg-astro-bg-tertiary/30 rounded-lg border border-astro-border-light p-4">
          <h3 className="text-lg font-medium text-astro-accent-primary mb-3">Current Antardasha</h3>
          <div className="bg-astro-bg-accent rounded-lg p-4 border border-astro-border-light">
            <div className="flex items-center mb-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center mr-3"
                style={{ backgroundColor: `${PLANET_COLORS[currentAntardasha.planet as keyof typeof PLANET_COLORS]}30` }}
              >
                <span 
                  className="text-xl"
                  style={{ color: PLANET_COLORS[currentAntardasha.planet as keyof typeof PLANET_COLORS] }}
                >
                  {currentAntardasha.planet.charAt(0)}
                </span>
              </div>
              <div>
                <div className="text-lg font-medium text-astro-text-primary">{currentAntardasha.planet}</div>
                <div className="text-sm text-astro-text-secondary">Antardasha</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div>
                <div className="text-xs text-astro-text-secondary">From</div>
                <div className="text-sm font-medium">{formatDate(currentAntardasha.startDate)}</div>
              </div>
              <div>
                <div className="text-xs text-astro-text-secondary">To</div>
                <div className="text-sm font-medium">{formatDate(currentAntardasha.endDate)}</div>
              </div>
            </div>
            <div className="bg-astro-bg-tertiary/50 rounded p-2">
              <div className="text-xs text-astro-text-secondary mb-1">Time Remaining</div>
              <div className="text-sm font-medium">{calculateTimeRemaining(currentAntardasha.endDate)}</div>
            </div>
          </div>
        </div>

        {/* Major Life Stages Card */}
        <div className="col-span-1 bg-astro-bg-tertiary/30 rounded-lg border border-astro-border-light p-4">
          <h3 className="text-lg font-medium text-astro-accent-primary mb-3">Major Life Stages</h3>
          <div className="bg-astro-bg-accent rounded-lg p-4 border border-astro-border-light h-[calc(100%-2rem)]">
            <div className="space-y-3">
              {sequence.slice(0, 5).map((dasha, index) => (
                <div 
                  key={index} 
                  className="flex justify-between items-center py-1 border-b border-astro-border-light/50 last:border-0"
                >
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: PLANET_COLORS[dasha.planet as keyof typeof PLANET_COLORS] }}
                    ></div>
                    <span className="text-sm">{dasha.planet}</span>
                  </div>
                  <div className="text-xs text-astro-text-secondary">
                    {calculateDuration(dasha.startDate, dasha.endDate)} years
                  </div>
                </div>
              ))}
              {sequence.length > 5 && (
                <div className="text-center text-xs text-astro-text-muted mt-2">
                  + {sequence.length - 5} more periods
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dasha Timeline Chart */}
      <div className="bg-astro-bg-tertiary/30 rounded-lg border border-astro-border-light p-4">
        <h3 className="text-lg font-medium text-astro-accent-primary mb-4">Dasha Timeline</h3>
        <div className="h-[250px]">
          <Chart
            options={chartOptions}
            series={chartSeries}
            type="rangeBar"
            height="100%"
          />
        </div>
      </div>

      {/* Detailed Dasha Table */}
      <div className="bg-astro-bg-tertiary/30 rounded-lg border border-astro-border-light p-4">
        <h3 className="text-lg font-medium text-astro-accent-primary mb-4">Vimshottari Dasha Sequence</h3>
        <div className="overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-astro-bg-card">
              <tr>
                <th className="py-2 px-4 text-left border-b border-astro-border-light">Planet</th>
                <th className="py-2 px-4 text-left border-b border-astro-border-light">From</th>
                <th className="py-2 px-4 text-left border-b border-astro-border-light">To</th>
                <th className="py-2 px-4 text-left border-b border-astro-border-light">Duration</th>
                <th className="py-2 px-4 text-left border-b border-astro-border-light">Status</th>
                <th className="py-2 px-4 text-left border-b border-astro-border-light">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sequence.map((dasha, index) => (
                <React.Fragment key={index}>
                  <tr 
                    className={`border-b border-astro-border-light/50 hover:bg-astro-bg-tertiary/30 ${
                      dasha.planet === currentMahadasha.planet ? 'bg-astro-bg-tertiary/30' : ''
                    }`}
                  >
                    <td className="py-2 px-4">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: PLANET_COLORS[dasha.planet as keyof typeof PLANET_COLORS] }}
                        ></div>
                        <span>{dasha.planet}</span>
                      </div>
                    </td>
                    <td className="py-2 px-4">{formatDate(dasha.startDate)}</td>
                    <td className="py-2 px-4">{formatDate(dasha.endDate)}</td>
                    <td className="py-2 px-4">{calculateDuration(dasha.startDate, dasha.endDate)} years</td>
                    <td className="py-2 px-4">
                      {new Date() >= new Date(dasha.startDate) && new Date() <= new Date(dasha.endDate) ? (
                        <span className="text-green-400">Current</span>
                      ) : new Date() < new Date(dasha.startDate) ? (
                        <span className="text-astro-text-muted">Future</span>
                      ) : (
                        <span className="text-astro-text-muted">Past</span>
                      )}
                    </td>
                    <td className="py-2 px-4">
                      {dasha.subPeriods && dasha.subPeriods.length > 0 && (
                        <button 
                          onClick={() => toggleExpandDasha(dasha.planet)}
                          className="px-2 py-1 bg-astro-bg-card border border-astro-border-light rounded text-xs hover:bg-astro-bg-tertiary"
                        >
                          {expandedDasha === dasha.planet ? 'Hide' : 'Show'} Antardashas
                        </button>
                      )}
                    </td>
                  </tr>
                  {/* Expanded Sub-periods */}
                  {expandedDasha === dasha.planet && dasha.subPeriods && (
                    <tr>
                      <td colSpan={6} className="py-2 px-4 bg-astro-bg-accent/30">
                        <div className="space-y-1 py-2">
                          <div className="grid grid-cols-4 gap-2 px-4 py-1 text-xs font-medium text-astro-text-secondary border-b border-astro-border-light/30">
                            <div>Antardasha</div>
                            <div>From</div>
                            <div>To</div>
                            <div>Duration</div>
                          </div>
                          {dasha.subPeriods.map((sub, subIndex) => (
                            <div 
                              key={subIndex} 
                              className={`grid grid-cols-4 gap-2 px-4 py-1.5 text-xs rounded ${
                                sub.planet === currentAntardasha.planet ? 'bg-astro-bg-tertiary/40' : ''
                              }`}
                            >
                              <div className="flex items-center">
                                <div 
                                  className="w-2 h-2 rounded-full mr-2"
                                  style={{ backgroundColor: PLANET_COLORS[sub.planet as keyof typeof PLANET_COLORS] }}
                                ></div>
                                {sub.planet}
                              </div>
                              <div>{formatDate(sub.startDate)}</div>
                              <div>{formatDate(sub.endDate)}</div>
                              <div>{calculateDuration(sub.startDate, sub.endDate)} years</div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashaSystem; 