/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#3F7564';
const tintColorDark = '#7EB9A4';

export const Colors = {
  light: {
    text: '#26312D',
    background: '#F7F8F5',
    tint: tintColorLight,
    icon: '#68756F',
    tabIconDefault: '#7B8781',
    tabIconSelected: tintColorLight,
    surface: '#FFFFFF',
    surfaceMuted: '#EEF2EE',
    border: '#DCE4DE',
    mutedText: '#6C7973',
    primary: '#3F7564',
    primaryContrast: '#FFFFFF',
    coin: '#E8A935',
    coinDeep: '#A86C0F',
    jarGlass: '#DDEFF0',
    jarOutline: '#587B7E',
    jarLid: '#D7A05B',
  },
  dark: {
    text: '#F0F3F0',
    background: '#171A19',
    tint: tintColorDark,
    icon: '#AAB5B0',
    tabIconDefault: '#89958F',
    tabIconSelected: tintColorDark,
    surface: '#222725',
    surfaceMuted: '#2A302D',
    border: '#3A4540',
    mutedText: '#AAB5B0',
    primary: '#7EB9A4',
    primaryContrast: '#142018',
    coin: '#F2BE55',
    coinDeep: '#C88B24',
    jarGlass: '#294044',
    jarOutline: '#91B9BA',
    jarLid: '#B9844D',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
