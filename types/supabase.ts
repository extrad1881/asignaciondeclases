export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Reemplaza este archivo con `npm run supabase:types` cuando Supabase local esté activo.
// Se deja como tipo permisivo para que el proyecto compile antes de generar tipos reales.
export type Database = any;
