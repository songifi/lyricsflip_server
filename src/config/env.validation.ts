import { plainToInstance } from 'class-transformer';
import { IsNumber, IsString, validateSync } from 'class-validator';
import { Transform } from 'class-transformer';

class EnvVariables {
  @IsString()
  NODE_ENV!: string;

  @Transform(({ value }) => parseInt(value, 10)) // Convert to number
  @IsNumber()
  PORT!: number;

  @IsString()
  DATABASE_URL!: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Environment validation failed: ${JSON.stringify(errors)}`);
  }

  return validatedConfig;
}
