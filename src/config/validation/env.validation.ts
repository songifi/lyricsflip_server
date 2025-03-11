import { plainToInstance } from 'class-transformer';
import { IsNumber, IsString, validateSync } from 'class-validator';

class EnvVariables {
  @IsString()
  NODE_ENV!: string;

  @IsNumber()
  PORT!: number;

  @IsString()
  DATABASE_URL!: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvVariables, config, {
    enableImplicitConversion: true, // Converts string values to expected types
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Environment validation failed: ${JSON.stringify(errors)}`);
  }

  return validatedConfig;
}
