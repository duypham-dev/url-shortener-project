import { z } from 'zod';

export const shortCodeSchema = z.string()
  .min(1, 'Shortcode is not allowed to be empty')
  .max(15, 'Shortcode is not allowed to exceed 15 characters')
  .regex(/^[0-9a-zA-Z]+$/, 'Shortcode is only allowed to contain alphanumeric characters');