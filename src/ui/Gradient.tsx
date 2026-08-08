/**
 * Gradient fill, drawn with react-native-svg.
 *
 * Uses the SVG already in the dependency list rather than adding expo-linear-gradient:
 * one fewer package, and the repo's postinstall iOS toolchain patch currently fails
 * against the installed react-native, so avoiding an install avoids that entirely.
 *
 * Absolutely positioned behind its siblings, so a parent just needs `overflow: hidden`
 * and a border radius.
 */

import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

let gradientSeq = 0;

export function Gradient({
  colors,
  /** 0 = horizontal, 1 = diagonal, 2 = vertical. */
  direction = 1,
  style,
  children,
}: {
  colors: [string, string] | [string, string, string];
  direction?: 0 | 1 | 2;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  // SVG gradient ids are document-global: two gradients sharing an id silently render
  // the same fill. A per-instance id is the only reliable way to keep them distinct.
  const id = React.useMemo(() => `grad${(gradientSeq += 1)}`, []);

  const [x2, y2] = direction === 0 ? ['100%', '0%'] : direction === 2 ? ['0%', '100%'] : ['100%', '100%'];

  return (
    <View style={style}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0%" y1="0%" x2={x2} y2={y2}>
            {colors.map((color, index) => (
              <Stop
                key={color + index}
                offset={`${(index / (colors.length - 1)) * 100}%`}
                stopColor={color}
                stopOpacity={1}
              />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
      {children}
    </View>
  );
}
