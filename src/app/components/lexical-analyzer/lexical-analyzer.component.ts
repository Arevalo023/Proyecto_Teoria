import { Component } from '@angular/core';
import { LexicalAnalyzerService } from '../../services/lexical-analyzer.service';
import { Token, ErrorLexico, ResultadoAnalisis } from '../../models/token.model';

@Component({
  selector: 'app-lexical-analyzer',
  templateUrl: './lexical-analyzer.component.html',
  styleUrls: ['./lexical-analyzer.component.css']
})
export class LexicalAnalyzerComponent {

  // Aquí guardo el código que el usuario escribe en el textarea
  codigoFuente: string = '';

  // Estos guardan los resultados del análisis
  tokens: Token[] = [];
  errores: ErrorLexico[] = [];
  totalLineas: number = 0;

  // Para controlar si ya se analizó o no
  analisisRealizado: boolean = false;
  analizando: boolean = false;
  currentYear: number = new Date().getFullYear();

  // Logs interactivos de la terminal
  logs: string[] = [
    '[SYSTEM] Terminal inicializada.',
    '[SYSTEM] Esperando código fuente para el análisis léxico...'
  ];

  // Obtener arreglo dinámico de líneas
  get lineasDeCodigo(): number[] {
    const lineas = this.codigoFuente ? this.codigoFuente.split('\n').length : 1;
    return Array.from({ length: Math.max(lineas, 1) }, (_, i) => i + 1);
  }

  // Sincronizar scroll de números de línea con el textarea
  onScrollTextarea(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    const lineNumbers = document.getElementById('line-numbers');
    if (lineNumbers) {
      lineNumbers.scrollTop = textarea.scrollTop;
    }
  }

  // Cargar códigos de ejemplo predefinidos
  cargarEjemplo(tipo: string): void {
    const ejemplos: { [key: string]: string } = {
      'factorial': `// Factorial de un número\nint factorial(int n) {\n    if (n <= 1) {\n        return 1;\n    } else {\n        return n * factorial(n - 1);\n    }\n}`,
      'variables': `// Operaciones y tipos de datos\nfloat radio = 5.5;\nfloat area = 3.1416 * radio * radio;\nstring msg = "Resultado final";\nboolean esMayor = area > 50.0;`,
      'error': `// Código con error léxico de alfabeto\nint total = 100;\nfloat valor = @50.5; // Carácter '@' inválido\nif (valor == total) {\n    return 0;\n}`
    };
    this.codigoFuente = ejemplos[tipo] || '';
    this.tokens = [];
    this.errores = [];
    this.totalLineas = 0;
    this.analisisRealizado = false;
    this.logs.push(`[SYSTEM] Plantilla '${tipo.toUpperCase()}' cargada correctamente.`);
  }

  constructor(private analizadorService: LexicalAnalyzerService) {}

  // Esta función se llama cuando el usuario presiona "Analizar"
  analizar(): void {
    if (!this.codigoFuente.trim()) {
      return; // Si no hay código, no hago nada
    }

    this.analizando = true;
    this.logs.push(`[SCAN] Iniciando análisis léxico...`);

    // Llamo al servicio y guardo los resultados
    setTimeout(() => {
      const resultado: ResultadoAnalisis = this.analizadorService.analizar(this.codigoFuente);
      this.tokens = resultado.tokens;
      this.errores = resultado.errores;
      this.totalLineas = resultado.totalLineas;
      this.analisisRealizado = true;
      this.analizando = false;

      if (this.errores.length > 0) {
        this.logs.push(`[ERROR] Análisis fallido. Encontrado carácter inesperado '${this.errores[0].caracter}' en línea ${this.errores[0].linea}.`);
      } else {
        this.logs.push(`[SUCCESS] Análisis léxico exitoso. Identificados ${this.tokens.length} tokens.`);
      }
    }, 300); // Le pongo un pequeño delay para que se vea el efecto de "analizando"
  }

  // Esta función limpia todo para empezar de nuevo
  limpiar(): void {
    this.codigoFuente = '';
    this.tokens = [];
    this.errores = [];
    this.totalLineas = 0;
    this.analisisRealizado = false;
    this.logs.push('[SYSTEM] Editor y variables limpiados.');
  }

  // Esta función permite cargar un archivo de texto desde la computadora
  cargarArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const archivo = input.files[0];
    const lector = new FileReader();

    lector.onload = (e) => {
      // Cuando termina de leer, pongo el contenido en el textarea
      this.codigoFuente = e.target?.result as string;
      this.analisisRealizado = false;
      this.tokens = [];
      this.errores = [];
      this.logs.push(`[SYSTEM] Archivo '${archivo.name}' cargado (${archivo.size} bytes).`);
    };

    lector.readAsText(archivo);

    // Limpio el input para que se pueda volver a cargar el mismo archivo
    input.value = '';
  }

  // Función auxiliar para obtener un color según el tipo de token
  getClaseTipo(tipo: string): string {
    const clases: { [key: string]: string } = {
      'PALABRA_RESERVADA': 'bg-matrix-primary/10 border-matrix-primary/30 text-matrix-primary border-matrix-primary/30',
      'IDENTIFICADOR': 'bg-matrix-glow/10 border-matrix-glow/30 text-matrix-glow border-matrix-glow/30',
      'ENTERO': 'bg-matrix-light/10 border-matrix-light/30 text-matrix-light border-matrix-light/30',
      'DECIMAL': 'bg-matrix-light/10 border-matrix-light/30 text-matrix-light border-matrix-light/30',
      'CIENTIFICO': 'bg-matrix-light/10 border-matrix-light/30 text-matrix-light border-matrix-light/30',
      'CADENA': 'bg-amber-400/10 border-amber-400/30 text-amber-300 border-amber-400/30',
      'OP_ARITMETICO': 'bg-red-400/10 border-red-400/30 text-red-400 border-red-400/30',
      'OP_RELACIONAL': 'bg-red-400/10 border-red-400/30 text-red-400 border-red-400/30',
      'OP_LOGICO': 'bg-red-400/10 border-red-400/30 text-red-400 border-red-400/30',
      'OP_ASIGNACION': 'bg-red-400/10 border-red-400/30 text-red-400 border-red-400/30',
      'DELIMITADOR': 'bg-gray-400/10 border-gray-400/30 text-gray-300 border-gray-400/30'
    };
    return clases[tipo] || 'bg-matrix-dark/20 border-matrix-dark/30 text-gray-400 border-matrix-dark/30';
  }
}
