declare module 'react-svg-radar-chart' {
  import { ReactNode } from 'react';

  export interface RadarChartProps {
    data: Array<{
      data: {
        [key: string]: number;
      };
      meta?: {
        color?: string;
        [key: string]: any;
      };
    }>;
    captions: {
      [key: string]: string;
    };
    options?: {
      scales?: number;
      captionProps?: () => React.SVGAttributes<SVGTextElement>;
      scaleProps?: () => React.SVGAttributes<SVGCircleElement>;
      axisProps?: () => React.SVGAttributes<SVGLineElement>;
      shapeProps?: () => React.SVGAttributes<SVGPathElement>;
      dotProps?: () => React.SVGAttributes<SVGCircleElement>;
      size?: number;
    };
    size?: number;
    className?: string;
  }

  export const RadarChart: React.FC<RadarChartProps>;
  export default RadarChart;
} 