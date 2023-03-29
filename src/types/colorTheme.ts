import colors from 'colors';

interface ColorTheme {
  primary: colors.Color,
  secondary: colors.Color,
  success: colors.Color,
  danger: colors.Color,
  warning: colors.Color,
  info: colors.Color,
  light: colors.Color,
  dark: colors.Color
}


export const colorTheme: ColorTheme = {
  primary: colors.blue,
  secondary: colors.yellow,
  success: colors.green,
  danger: colors.red,
  warning: colors.yellow,
  info: colors.cyan,
  light: colors.white,
  dark: colors.gray
};
