import { valueFormatter } from 'powerbi-visuals-utils-formattingutils';

export const formatter = (format: string) => valueFormatter.create({ format });

export const defaultFormat = '#,0.00';

export const defaultFormatter = formatter(defaultFormat);
