// Color theme configuration that works in both development and production
// In production, we'll use a simple string-based approach instead of the colors library

interface ColorFunction {
    (text: string): string;
    bold: (text: string) => string;
}

interface ColorTheme {
    primary: ColorFunction;
    secondary: ColorFunction;
    success: ColorFunction;
    danger: ColorFunction;
    warning: ColorFunction;
    info: ColorFunction;
    light: ColorFunction;
    dark: ColorFunction;
}

// Simple color implementation for production
const simpleColors = {
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
};

// Helper function to create color functions with bold support
const createColorFunction = (color: string): ColorFunction => {
    const fn = ((text: string) => `${color}${text}${simpleColors.reset}`) as ColorFunction;
    fn.bold = (text: string) => `${simpleColors.bold}${color}${text}${simpleColors.reset}`;
    return fn;
};

// Try to use the colors library if available (development), otherwise use simple colors
let colorTheme: ColorTheme;

try {
    // Dynamic import to avoid issues in production
    const colors = require('colors');
    colorTheme = {
        primary: colors.blue,
        secondary: colors.yellow,
        success: colors.green,
        danger: colors.red,
        warning: colors.yellow,
        info: colors.cyan,
        light: colors.white,
        dark: colors.gray,
    };
} catch (error) {
    // Fallback for production environment
    colorTheme = {
        primary: createColorFunction(simpleColors.blue),
        secondary: createColorFunction(simpleColors.yellow),
        success: createColorFunction(simpleColors.green),
        danger: createColorFunction(simpleColors.red),
        warning: createColorFunction(simpleColors.yellow),
        info: createColorFunction(simpleColors.cyan),
        light: createColorFunction(simpleColors.white),
        dark: createColorFunction(simpleColors.gray),
    };
}

export { colorTheme };
