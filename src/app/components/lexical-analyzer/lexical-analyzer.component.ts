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

  constructor(private analizadorService: LexicalAnalyzerService) {}

  // Esta función se llama cuando el usuario presiona "Analizar"
  analizar(): void {
    if (!this.codigoFuente.trim()) {
      return; // Si no hay código, no hago nada
    }

    this.analizando = true;

    // Llamo al servicio y guardo los resultados
    setTimeout(() => {
      const resultado: ResultadoAnalisis = this.analizadorService.analizar(this.codigoFuente);
      this.tokens = resultado.tokens;
      this.errores = resultado.errores;
      this.totalLineas = resultado.totalLineas;
      this.analisisRealizado = true;
      this.analizando = false;
    }, 300); // Le pongo un pequeño delay para que se vea el efecto de "analizando"
  }

  // Esta función limpia todo para empezar de nuevo
  limpiar(): void {
    this.codigoFuente = '';
    this.tokens = [];
    this.errores = [];
    this.totalLineas = 0;
    this.analisisRealizado = false;
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
    };

    lector.readAsText(archivo);

    // Limpio el input para que se pueda volver a cargar el mismo archivo
    input.value = '';
  }

  // Función auxiliar para obtener un color según el tipo de token
  getClaseTipo(tipo: string): string {
    const clases: { [key: string]: string } = {
      'PALABRA_RESERVADA': 'badge-reservada',
      'IDENTIFICADOR': 'badge-identificador',
      'ENTERO': 'badge-numero',
      'DECIMAL': 'badge-numero',
      'CIENTIFICO': 'badge-numero',
      'CADENA': 'badge-cadena',
      'OP_ARITMETICO': 'badge-operador',
      'OP_RELACIONAL': 'badge-operador',
      'OP_LOGICO': 'badge-operador',
      'OP_ASIGNACION': 'badge-operador',
      'DELIMITADOR': 'badge-delimitador'
    };
    return clases[tipo] || 'badge-default';
  }
}
