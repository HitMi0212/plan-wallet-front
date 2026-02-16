import React from 'react';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

type TabIconName =
  | 'home'
  | 'transactions'
  | 'assetFlows'
  | 'totalWealth'
  | 'stats'
  | 'categories'
  | 'settings';

export function TabIcon({
  name,
  color,
  size,
}: {
  name: TabIconName;
  color: string;
  size: number;
}) {
  const strokeWidth = 1.9;
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' ? (
        <>
          <Path d="M4 10.5L12 4l8 6.5" {...common} />
          <Path d="M6.5 10v9h11v-9" {...common} />
        </>
      ) : null}

      {name === 'transactions' ? (
        <>
          <Rect x={3.5} y={5.5} width={17} height={15} rx={2.5} {...common} />
          <Line x1={3.5} y1={9} x2={20.5} y2={9} {...common} />
          <Line x1={8} y1={3.5} x2={8} y2={7} {...common} />
          <Line x1={16} y1={3.5} x2={16} y2={7} {...common} />
        </>
      ) : null}

      {name === 'assetFlows' ? (
        <>
          <Rect x={2.8} y={6.5} width={18.4} height={11} rx={2.4} {...common} />
          <Circle cx={12} cy={12} r={2.2} {...common} />
          <Line x1={5.5} y1={12} x2={8} y2={12} {...common} />
          <Line x1={16} y1={12} x2={18.5} y2={12} {...common} />
        </>
      ) : null}

      {name === 'totalWealth' ? (
        <>
          <Path d="M3 9.5L12 4l9 5.5" {...common} />
          <Line x1={4.5} y1={19.5} x2={19.5} y2={19.5} {...common} />
          <Line x1={6.5} y1={10.5} x2={6.5} y2={18} {...common} />
          <Line x1={10.5} y1={10.5} x2={10.5} y2={18} {...common} />
          <Line x1={14.5} y1={10.5} x2={14.5} y2={18} {...common} />
          <Line x1={18} y1={10.5} x2={18} y2={18} {...common} />
        </>
      ) : null}

      {name === 'stats' ? (
        <>
          <Line x1={4} y1={5} x2={4} y2={19} {...common} />
          <Line x1={4} y1={19} x2={20} y2={19} {...common} />
          <Polyline points="6.5,15 10,11.5 13.5,13 18,8" {...common} />
        </>
      ) : null}

      {name === 'categories' ? (
        <>
          <Rect x={4} y={4} width={6.5} height={6.5} rx={1} {...common} />
          <Rect x={13.5} y={4} width={6.5} height={6.5} rx={1} {...common} />
          <Rect x={4} y={13.5} width={6.5} height={6.5} rx={1} {...common} />
          <Rect x={13.5} y={13.5} width={6.5} height={6.5} rx={1} {...common} />
        </>
      ) : null}

      {name === 'settings' ? (
        <>
          <Circle cx={12} cy={12} r={3} {...common} />
          <Path d="M12 4.5v2.2M12 17.3v2.2M4.5 12h2.2M17.3 12h2.2M6.7 6.7l1.6 1.6M15.7 15.7l1.6 1.6M17.3 6.7l-1.6 1.6M8.3 15.7l-1.6 1.6" {...common} />
        </>
      ) : null}
    </Svg>
  );
}
