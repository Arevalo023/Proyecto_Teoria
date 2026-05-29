import { Injectable } from '@angular/core';
import { Token, ErrorLexico, ResultadoAnalisis } from '../models/token.model';

@Injectable({
  providedIn: 'root'
})
export class LexicalAnalyzerService {

  // aqui se guarda las palabras reservadas que va a reconocer el analizador
  private palabrasReservadas: string[] = [
    'int', 'float', 'double', 'char', 'string', 'boolean',
    'if', 'else', 'while', 'for', 'do', 'return',
    'true', 'false', 'void', 'class', 'public', 'private', 'static'
  ];

  // Este método inicia el análisis cuando el usuario presiona "Analizar"
  analizar(codigo: string): ResultadoAnalisis {
    const tokens: Token[] = [];
    const errores: ErrorLexico[] = [];

    let i = 0;          // Posición actual en el texto
    let linea = 1;      // Número de línea actual
    let columna = 1;    // Número de columna actual
    let totalLineas = 1;

    // Recorre el texto para ir separando los lexemas
    while (i < codigo.length) {
      const colInicio = columna;

      // Si se encuentra un salto de línea, se actualiza el contador de líneas
      if (codigo[i] === '\n') {
        linea++;
        columna = 1;
        totalLineas = linea;
        i++;
        continue;
      }

      // Si se encuentra un espacio o tabulación, se ignora
      if (codigo[i] === ' ' || codigo[i] === '\t' || codigo[i] === '\r') {
        columna++;
        i++;
        continue;
      }

      // Verifica si es un comentario de una línea (//)
      if (codigo[i] === '/' && codigo[i + 1] === '/') {
        while (i < codigo.length && codigo[i] !== '\n') {
          i++;
          columna++;
        }
        continue;
      }

      // Verifica si es un comentario de bloque (/* */)
      if (codigo[i] === '/' && codigo[i + 1] === '*') {
        i += 2;
        columna += 2;
        while (i < codigo.length) {
          if (codigo[i] === '\n') {
            linea++;
            columna = 1;
            totalLineas = linea;
          } else if (codigo[i] === '*' && codigo[i + 1] === '/') {
            i += 2;
            columna += 2;
            break;
          } else {
            columna++;
          }
          i++;
        }
        continue;
      }

      // Se intenta hacer match con cada tipo de token usando expresiones regulares
      // Se toma el texto desde la posición actual hasta el final
      const resto = codigo.substring(i);

      // Primero se checan los números en notación científica (antes que decimales y enteros)
      const matchCientifico = resto.match(/^[0-9]+(\.[0-9]+)?[eE][0-9]+/);
      if (matchCientifico) {
        const lexema = matchCientifico[0];
        tokens.push({
          linea,
          columna: colInicio,
          lexema,
          tipo: 'CIENTIFICO',
          descripcion: 'Número en notación científica'
        });
        i += lexema.length;
        columna += lexema.length;
        continue;
      }

      // Checa si es un número decimal (tiene punto)
      const matchDecimal = resto.match(/^[0-9]+\.[0-9]+/);
      if (matchDecimal) {
        const lexema = matchDecimal[0];
        tokens.push({
          linea,
          columna: colInicio,
          lexema,
          tipo: 'DECIMAL',
          descripcion: 'Número decimal'
        });
        i += lexema.length;
        columna += lexema.length;
        continue;
      }

      // Checa si es un número entero
      const matchEntero = resto.match(/^[0-9]+/);
      if (matchEntero) {
        const lexema = matchEntero[0];
        tokens.push({
          linea,
          columna: colInicio,
          lexema,
          tipo: 'ENTERO',
          descripcion: 'Número entero'
        });
        i += lexema.length;
        columna += lexema.length;
        continue;
      }

      // Checa si es una cadena de texto (entre comillas dobles)
      const matchCadena = resto.match(/^"[^"]*"/);
      if (matchCadena) {
        const lexema = matchCadena[0];
        tokens.push({
          linea,
          columna: colInicio,
          lexema,
          tipo: 'CADENA',
          descripcion: 'Cadena de texto'
        });
        i += lexema.length;
        columna += lexema.length;
        continue;
      }

      // Se checa si es una cadena sin cerrar (error léxico)
      if (codigo[i] === '"') {
        // Busco hasta el final de la línea para dar el error
        let startIdx = i;
        let j = i + 1;
        while (j < codigo.length && codigo[j] !== '\n' && codigo[j] !== '"') {
          j++;
        }
        const cadenaIncompleta = codigo.substring(startIdx, j + 1);
        errores.push({
          linea,
          columna: colInicio,
          caracter: cadenaIncompleta,
          mensaje: `Cadena de texto no cerrada correctamente en línea ${linea}, columna ${colInicio}`
        });
        // Se avanza más allá de la cadena problemática y continuamos
        const consumed = (j - startIdx) + 1;
        i = j + 1;
        columna = colInicio + consumed;
        continue;
      }

      // Se checa si es una palabra reservada o identificador
      // Los identificadores empiezan con letra o guion bajo
      const matchIdentificador = resto.match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
      if (matchIdentificador) {
        const lexema = matchIdentificador[0];
        // Se verifica si es una palabra reservada
        if (this.palabrasReservadas.includes(lexema)) {
          tokens.push({
            linea,
            columna: colInicio,
            lexema,
            tipo: 'PALABRA_RESERVADA',
            descripcion: `Palabra reservada: ${lexema}`
          });
        } else {
          tokens.push({
            linea,
            columna: colInicio,
            lexema,
            tipo: 'IDENTIFICADOR',
            descripcion: 'Identificador definido por el usuario'
          });
        }
        i += lexema.length;
        columna += lexema.length;
        continue;
      }

      // Se checan los operadores relacionales (primero los de dos caracteres)
      const operadoresRelacionales2 = ['>=', '<=', '==', '!='];
      const opRel2 = operadoresRelacionales2.find(op => resto.startsWith(op));
      if (opRel2) {
        tokens.push({
          linea,
          columna: colInicio,
          lexema: opRel2,
          tipo: 'OP_RELACIONAL',
          descripcion: `Operador relacional: ${opRel2}`
        });
        i += opRel2.length;
        columna += opRel2.length;
        continue;
      }

      // Se checan los operadores lógicos de dos caracteres
      const operadoresLogicos2 = ['&&', '||'];
      const opLog2 = operadoresLogicos2.find(op => resto.startsWith(op));
      if (opLog2) {
        tokens.push({
          linea,
          columna: colInicio,
          lexema: opLog2,
          tipo: 'OP_LOGICO',
          descripcion: `Operador lógico: ${opLog2}`
        });
        i += opLog2.length;
        columna += opLog2.length;
        continue;
      }

      // Se checa el caracter actual para operadores y delimitadores de un solo caracter
      const c = codigo[i];

      // Operadores aritméticos (el / ya fue cubierto por los comentarios,
      // pero si se llega aquí es porque NO era comentario)
      if (['+', '-', '*', '/', '%'].includes(c)) {
        tokens.push({
          linea,
          columna: colInicio,
          lexema: c,
          tipo: 'OP_ARITMETICO',
          descripcion: `Operador aritmético: ${c}`
        });
        i++;
        columna++;
        continue;
      }

      // Operadores relacionales de un solo caracter
      if (['>', '<'].includes(c)) {
        tokens.push({
          linea,
          columna: colInicio,
          lexema: c,
          tipo: 'OP_RELACIONAL',
          descripcion: `Operador relacional: ${c}`
        });
        i++;
        columna++;
        continue;
      }

      // Operador lógico de un caracter (negación)
      if (c === '!') {
        tokens.push({
          linea,
          columna: colInicio,
          lexema: c,
          tipo: 'OP_LOGICO',
          descripcion: 'Operador lógico: negación (!)'
        });
        i++;
        columna++;
        continue;
      }

      // Operador de asignación
      if (c === '=') {
        tokens.push({
          linea,
          columna: colInicio,
          lexema: c,
          tipo: 'OP_ASIGNACION',
          descripcion: 'Operador de asignación (=)'
        });
        i++;
        columna++;
        continue;
      }

      // Delimitadores y símbolos de agrupación
      if ([';', ',', '(', ')', '{', '}', '[', ']'].includes(c)) {
        tokens.push({
          linea,
          columna: colInicio,
          lexema: c,
          tipo: 'DELIMITADOR',
          descripcion: `Delimitador: ${c}`
        });
        i++;
        columna++;
        continue;
      }

      // Si el símbolo no existe en la gramática, lo mando como error
      errores.push({
        linea,
        columna: colInicio,
        caracter: c,
        mensaje: `Carácter inválido '${c}' en línea ${linea}, columna ${colInicio}. No pertenece al lenguaje.`
      });

      // Cuando hay un error léxico, continúo analizando el resto
      i++;
      columna++;
      continue;
    }

    return {
      tokens,
      errores,
      totalLineas
    };
  }
}
