import { Component } from '@angular/core';
import { LexicalAnalyzerService } from '../../services/lexical-analyzer.service';
import { Token, ErrorLexico, ResultadoAnalisis } from '../../models/token.model';

//  Interfaz local para distribución (no requiere cambio en models) 
interface DistribucionTipo {
  tipo: string;
  cantidad: number;
  porcentaje: number;
  color: string;
}

interface PieSlice extends DistribucionTipo {
  path: string;          // SVG arc path del donut
  midAngle: number;      // Ángulo central (para el efecto hover translate)
  tx: number;            // Desplazamiento X en hover
  ty: number;            // Desplazamiento Y en hover
}

@Component({
  selector: 'app-lexical-analyzer',
  templateUrl: './lexical-analyzer.component.html',
  styleUrls: ['./lexical-analyzer.component.css']
})
export class LexicalAnalyzerComponent {

  //  Estado principal 
  codigoFuente: string = '';
  tokens: Token[] = [];
  errores: ErrorLexico[] = [];
  totalLineas: number = 0;
  analisisRealizado: boolean = false;
  analizando: boolean = false;
  currentYear: number = new Date().getFullYear();

  logs: string[] = [
    '[SYSTEM] Terminal inicializada.',
    '[SYSTEM] Esperando código fuente para el análisis léxico...'
  ];

  //  Filtro de tokens 
  tokensFiltrados: Token[] = [];
  filtroTexto: string = '';
  filtroTipo: string = 'TODOS';

  get tiposDisponibles(): string[] {
    const tipos = [...new Set(this.tokens.map(t => t.tipo))].sort();
    return ['TODOS', ...tipos];
  }

  aplicarFiltro(): void {
    this.tokensFiltrados = this.tokens.filter(t => {
      const matchTipo = this.filtroTipo === 'TODOS' || t.tipo === this.filtroTipo;
      const matchTexto =
        !this.filtroTexto ||
        t.lexema.toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        t.tipo.toLowerCase().includes(this.filtroTexto.toLowerCase());
      return matchTipo && matchTexto;
    });
  }

  resetFiltro(): void {
    this.filtroTexto = '';
    this.filtroTipo = 'TODOS';
    this.aplicarFiltro();
  }

  //  Contador de caracteres / posición cursor 
  private _cursorPos = { linea: 1, columna: 1 };

  get totalCaracteres(): number { return this.codigoFuente.length; }

  get totalPalabras(): number {
    const t = this.codigoFuente.trim();
    return t ? t.split(/\s+/).length : 0;
  }

  get posicionCursor(): { linea: number; columna: number } {
    return this._cursorPos;
  }

  onCursorMove(event: Event): void {
    const ta = event.target as HTMLTextAreaElement;
    const texto = ta.value.substring(0, ta.selectionStart);
    const lineas = texto.split('\n');
    this._cursorPos = {
      linea: lineas.length,
      columna: lineas[lineas.length - 1].length + 1,
    };
  }

  //  Exportar JSON 
  exportarJSON(): void {
    const payload = {
      metadata: {
        fecha: new Date().toISOString(),
        totalTokens: this.tokens.length,
        totalErrores: this.errores.length,
        totalLineas: this.totalLineas,
      },
      tokens: this.tokens,
      errores: this.errores,
      distribucion: this.distribucionTokens,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tokens_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.logs.push('[SUCCESS] Resultados exportados como JSON correctamente.');
  }

  //  Modo comparación 
  modoComparacion: boolean = false;
  private _codigoAnterior: string = '';

  toggleComparacion(): void {
    this.modoComparacion = !this.modoComparacion;
  }

  get lineasComparacion(): Array<{ linea: number; original: string; anotada: string; tieneToken: boolean }> {
    if (!this._codigoAnterior) return [];
    return this._codigoAnterior.split('\n').map((linea, i) => {
      const lineNum = i + 1;
      const tokensEnLinea = this.tokens.filter(t => t.linea === lineNum);
      return {
        linea: lineNum,
        original: linea,
        anotada: tokensEnLinea.length > 0
          ? tokensEnLinea.map(t => `[${t.tipo}:${t.lexema}]`).join(' ')
          : '',
        tieneToken: tokensEnLinea.length > 0,
      };
    });
  }

  //  Distribución de tokens 
  private readonly COLORES_TIPO: Record<string, string> = {
    'PALABRA_RESERVADA': '#00ff88',
    'IDENTIFICADOR': '#4fc3f7',
    'ENTERO': '#ffb74d',
    'DECIMAL': '#ff8a65',
    'CIENTIFICO': '#ffd54f',
    'CADENA': '#ce93d8',
    'OP_ARITMETICO': '#f06292',
    'OP_RELACIONAL': '#ef9a9a',
    'OP_LOGICO': '#ef5350',
    'OP_ASIGNACION': '#ff5252',
    'DELIMITADOR': '#80cbc4',
  };

  get distribucionTokens(): DistribucionTipo[] {
    const conteo: Record<string, number> = {};
    for (const t of this.tokens) {
      conteo[t.tipo] = (conteo[t.tipo] ?? 0) + 1;
    }
    const total = this.tokens.length || 1;
    return Object.entries(conteo)
      .sort((a, b) => b[1] - a[1])
      .map(([tipo, cantidad]) => ({
        tipo,
        cantidad,
        porcentaje: Math.round((cantidad / total) * 100),
        color: this.COLORES_TIPO[tipo] ?? '#78909c',
      }));
  }

  hoveredSliceIndex: number | null = null;

  setHoveredSlice(i: number): void { this.hoveredSliceIndex = i; }
  clearHoveredSlice(): void { this.hoveredSliceIndex = null; }

  //  [PIE CHART] Interfaz extendida para cada rebanada 
  // (Puedes poner esta interface al inicio del archivo, fuera de la clase,
  //  junto a DistribucionTipo)



  //  [PIE CHART] Getter principal 
  get pieSlices(): Array<DistribucionTipo & {
    path: string;
    midAngle: number;
    tx: number;
    ty: number;
  }> {
    const cx = 150, cy = 150;
    const outerR = 108, innerR = 62;
    const hoverOffset = 10;  // px que se desplaza la rebanada al hacer hover

    const total = this.tokens.length || 1;
    let currentAngle = -Math.PI / 2;  // Empezar desde arriba (12 en punto)

    return this.distribucionTokens.map(dist => {
      const sliceAngle = (dist.cantidad / total) * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      const midAngle = (startAngle + endAngle) / 2;
      currentAngle = endAngle;

      const largeArc = sliceAngle > Math.PI ? 1 : 0;

      // Puntos del arco exterior
      const x1o = cx + outerR * Math.cos(startAngle);
      const y1o = cy + outerR * Math.sin(startAngle);
      const x2o = cx + outerR * Math.cos(endAngle);
      const y2o = cy + outerR * Math.sin(endAngle);

      // Puntos del arco interior (agujero del donut)
      const x1i = cx + innerR * Math.cos(endAngle);
      const y1i = cy + innerR * Math.sin(endAngle);
      const x2i = cx + innerR * Math.cos(startAngle);
      const y2i = cy + innerR * Math.sin(startAngle);

      // Path de forma de dona
      const path = [
        `M ${x1o.toFixed(2)} ${y1o.toFixed(2)}`,
        `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2o.toFixed(2)} ${y2o.toFixed(2)}`,
        `L ${x1i.toFixed(2)} ${y1i.toFixed(2)}`,
        `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2i.toFixed(2)} ${y2i.toFixed(2)}`,
        'Z'
      ].join(' ');

      // Vector de desplazamiento para el efecto hover
      const tx = Math.cos(midAngle) * hoverOffset;
      const ty = Math.sin(midAngle) * hoverOffset;

      return { ...dist, path, midAngle, tx, ty };
    });
  }

  //  Líneas de código (igual que antes) 
  get lineasDeCodigo(): number[] {
    const lineas = this.codigoFuente ? this.codigoFuente.split('\n').length : 1;
    return Array.from({ length: Math.max(lineas, 1) }, (_, i) => i + 1);
  }

  onScrollTextarea(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    const lineNumbers = document.getElementById('line-numbers');
    if (lineNumbers) lineNumbers.scrollTop = textarea.scrollTop;
  }

  cargarEjemplo(tipo: string): void {
    const ejemplos: { [key: string]: string } = {
      'factorial': `// Factorial de un número\nint factorial(int n) {\n    if (n <= 1) {\n        return 1;\n    } else {\n        return n * factorial(n - 1);\n    }\n}`,
      'variables': `// Operaciones y tipos de datos\nfloat radio = 5.5;\nfloat area = 3.1416 * radio * radio;\nstring msg = "Resultado final";\nboolean esMayor = area > 50.0;`,
      'error': `// Código con error léxico de alfabeto\nint total = 100;\nfloat valor = @50.5; // Carácter '@' inválido\nif (valor == total) {\n    return 0;\n}`
    };
    this.codigoFuente = ejemplos[tipo] || '';
    this.tokens = [];
    this.tokensFiltrados = [];
    this.errores = [];
    this.totalLineas = 0;
    this.analisisRealizado = false;
    this.modoComparacion = false;
    this.logs.push(`[SYSTEM] Plantilla '${tipo.toUpperCase()}' cargada correctamente.`);
  }

  constructor(private analizadorService: LexicalAnalyzerService) { }

  //  Análisis (llama al servicio igual que antes) 
  analizar(): void {
    if (!this.codigoFuente.trim()) return;

    this.analizando = true;
    this.modoComparacion = false;
    this.logs.push(`[SCAN] Iniciando análisis léxico...`);

    setTimeout(() => {
      this._codigoAnterior = this.codigoFuente;

      const resultado: ResultadoAnalisis = this.analizadorService.analizar(this.codigoFuente);
      this.tokens = resultado.tokens;
      this.errores = resultado.errores;
      this.totalLineas = resultado.totalLineas;
      this.analisisRealizado = true;
      this.analizando = false;

      // Inicializar filtro con todos los tokens
      this.tokensFiltrados = [...this.tokens];
      this.filtroTexto = '';
      this.filtroTipo = 'TODOS';

      if (this.errores.length > 0) {
        this.logs.push(`[ERROR] Análisis fallido. Encontrado carácter inesperado '${this.errores[0].caracter}' en línea ${this.errores[0].linea}.`);
      } else {
        this.logs.push(`[SUCCESS] Análisis léxico exitoso. Identificados ${this.tokens.length} tokens.`);
      }

      this.logs.push(`[SYSTEM] Distribución calculada: ${this.distribucionTokens.length} tipo(s) de token.`);
    }, 300);
  }

  //  Limpiar 
  limpiar(): void {
    this.codigoFuente = '';
    this.tokens = [];
    this.tokensFiltrados = [];
    this.errores = [];
    this.totalLineas = 0;
    this.analisisRealizado = false;
    this.modoComparacion = false;
    this.filtroTexto = '';
    this.filtroTipo = 'TODOS';
    this._codigoAnterior = '';
    this._cursorPos = { linea: 1, columna: 1 };
    this.logs.push('[SYSTEM] Editor y variables limpiados.');
  }

  //  Cargar archivo 
  cargarArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const archivo = input.files[0];
    const lector = new FileReader();
    lector.onload = (e) => {
      this.codigoFuente = e.target?.result as string;
      this.analisisRealizado = false;
      this.tokens = [];
      this.tokensFiltrados = [];
      this.errores = [];
      this.logs.push(`[SYSTEM] Archivo '${archivo.name}' cargado (${archivo.size} bytes).`);
    };
    lector.readAsText(archivo);
    input.value = '';
  }

  //  Clases de tipo (igual que antes, con tus tipos en español) 
  getClaseTipo(tipo: string): string {
    const clases: { [key: string]: string } = {
      'PALABRA_RESERVADA': 'bg-matrix-primary/10 border-matrix-primary/30 text-matrix-primary',
      'IDENTIFICADOR': 'bg-matrix-glow/10 border-matrix-glow/30 text-matrix-glow',
      'ENTERO': 'bg-matrix-light/10 border-matrix-light/30 text-matrix-light',
      'DECIMAL': 'bg-matrix-light/10 border-matrix-light/30 text-matrix-light',
      'CIENTIFICO': 'bg-matrix-light/10 border-matrix-light/30 text-matrix-light',
      'CADENA': 'bg-amber-400/10 border-amber-400/30 text-amber-300',
      'OP_ARITMETICO': 'bg-red-400/10 border-red-400/30 text-red-400',
      'OP_RELACIONAL': 'bg-red-400/10 border-red-400/30 text-red-400',
      'OP_LOGICO': 'bg-red-400/10 border-red-400/30 text-red-400',
      'OP_ASIGNACION': 'bg-red-400/10 border-red-400/30 text-red-400',
      'DELIMITADOR': 'bg-gray-400/10 border-gray-400/30 text-gray-300'
    };
    return clases[tipo] || 'bg-matrix-dark/20 border-matrix-dark/30 text-gray-400';
  }
}