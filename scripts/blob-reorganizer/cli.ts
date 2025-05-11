/**
 * Command-line interface utilities for the blob reorganization tool
 */
import { logger } from './logging';
import { CliOptions, FlagDefinition } from './types';

/**
 * Get default CLI options
 */
export function getDefaultOptions(): CliOptions {
  return {
    dryRun: false,
    outputDir: './blob-reorganization-reports',
    verbose: false,
    skipVerification: false,
  };
}

/**
 * Define all available command-line options
 */
export function createOptionDefinitions(): FlagDefinition[] {
  return [
    {
      fullName: '--dry-run',
      shortName: '-d',
      description: 'Preview changes without executing them',
      takesValue: false,
      handler: () => true,
    },
    {
      fullName: '--limit',
      shortName: '-l',
      description: 'Limit the number of assets to process',
      takesValue: true,
      handler: (value) => parseInt(value || '0', 10),
    },
    {
      fullName: '--prefix',
      shortName: '-p',
      description: 'Process only assets with this prefix',
      takesValue: true,
      handler: (value) => value || '',
    },
    {
      fullName: '--output',
      shortName: '-o',
      description: 'Directory for reports',
      takesValue: true,
      handler: (value) => value || './blob-reorganization-reports',
    },
    {
      fullName: '--verbose',
      shortName: '-v',
      description: 'Enable verbose logging',
      takesValue: false,
      handler: () => true,
    },
    {
      fullName: '--skip-verification',
      shortName: '-s',
      description: 'Skip verification after reorganization',
      takesValue: false,
      handler: () => true,
    },
    {
      fullName: '--help',
      shortName: '-h',
      description: 'Show help message',
      takesValue: false,
      handler: () => true, // The actual help rendering is handled separately
    },
  ];
}

/**
 * Print help and exit process
 */
export function printHelpAndExit(): never {
  printHelp();
  process.exit(0);
}

/**
 * Process a single command-line flag
 */
export function handleFlag(
  flag: string,
  nextArg: string | undefined
): { parsedValue: boolean | string | number | undefined; consumesNextArg: boolean } {
  const definitions = createOptionDefinitions();
  const definition = definitions.find((def) => def.fullName === flag || def.shortName === flag);

  if (!definition) {
    return { parsedValue: undefined, consumesNextArg: false };
  }

  if (definition.takesValue) {
    if (nextArg === undefined || nextArg.startsWith('-')) {
      logger.warn({
        msg: `Option ${flag} requires a value but none was provided. Using default.`,
      });
      return { parsedValue: definition.handler(), consumesNextArg: false };
    }
    return { parsedValue: definition.handler(nextArg), consumesNextArg: true };
  }

  return { parsedValue: definition.handler(), consumesNextArg: false };
}

/**
 * Maps flag names to their option property names
 */
const flagToOptionMap: Record<
  string,
  { property: keyof CliOptions; type: 'boolean' | 'string' | 'number' }
> = {
  '--dry-run': { property: 'dryRun', type: 'boolean' },
  '-d': { property: 'dryRun', type: 'boolean' },
  '--limit': { property: 'limit', type: 'number' },
  '-l': { property: 'limit', type: 'number' },
  '--prefix': { property: 'prefix', type: 'string' },
  '-p': { property: 'prefix', type: 'string' },
  '--output': { property: 'outputDir', type: 'string' },
  '-o': { property: 'outputDir', type: 'string' },
  '--verbose': { property: 'verbose', type: 'boolean' },
  '-v': { property: 'verbose', type: 'boolean' },
  '--skip-verification': { property: 'skipVerification', type: 'boolean' },
  '-s': { property: 'skipVerification', type: 'boolean' },
};

/**
 * Apply parsed flag value to the options object
 */
export function applyOptionValue(
  options: CliOptions,
  flag: string,
  value: boolean | string | number
): void {
  const mapping = flagToOptionMap[flag];
  if (mapping) {
    (options[mapping.property] as unknown) = value;
  }
}

/**
 * Parse a single flag and update options accordingly
 */
export function parseFlag(
  args: string[],
  index: number,
  options: CliOptions
): { newIndex: number } {
  const flag = args[index];
  const nextArg = index + 1 < args.length ? args[index + 1] : undefined;

  const { parsedValue, consumesNextArg } = handleFlag(flag, nextArg);

  if (parsedValue !== undefined) {
    applyOptionValue(options, flag, parsedValue);
  }

  return { newIndex: index + (consumesNextArg ? 1 : 0) };
}

/**
 * Parse command line arguments
 */
export function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options = getDefaultOptions();

  // Handle help flag early to exit immediately
  if (args.includes('--help') || args.includes('-h')) {
    printHelpAndExit();
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // Skip arguments that aren't flags
    if (!arg.startsWith('-')) {
      continue;
    }

    const result = parseFlag(args, i, options);
    i = result.newIndex;
  }

  return options;
}

/**
 * Print help information
 */
export function printHelp(): void {
  const definitions = createOptionDefinitions();

  // Generate options text from definitions
  const optionsText = definitions
    .map((def) => {
      const defaultValue =
        def.fullName === '--output' ? ' (default: ./blob-reorganization-reports)' : '';
      return `  ${def.fullName}, ${def.shortName}`.padEnd(25) + `${def.description}${defaultValue}`;
    })
    .join('\n');

  logger.info({
    msg: `
Blob Path Reorganization Tool

This script reorganizes assets within Vercel Blob to follow the new unified path structure.

Options:
${optionsText}
  `,
  });
}
