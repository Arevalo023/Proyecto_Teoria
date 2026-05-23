// Aquí defino cómo va a verse cada token que encuentre el analizador
export interface Token {
  linea: number;       // En qué línea del código apareció
  columna: number;     // En qué columna aproximada apareció
  lexema: string;      // El texto tal como aparece en el código
  tipo: string;        // El tipo de token (IDENTIFICADOR, ENTERO, etc.)
  descripcion: string; // Una descripción más clara del tipo
}

// Aquí defino cómo se va a guardar un error léxico cuando encuentre algo inválido
export interface ErrorLexico {
  linea: number;
  columna: number;
  caracter: string;  // El caracter o cadena que causó el error
  mensaje: string;   // Mensaje explicando qué estuvo mal
}

// Esto es lo que el servicio me va a regresar cuando analice el código
export interface ResultadoAnalisis {
  tokens: Token[];
  errores: ErrorLexico[];
  totalLineas: number;
}
