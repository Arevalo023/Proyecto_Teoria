import { Component } from '@angular/core';

// Componente raíz, solo muestra el analizador léxico
@Component({
  selector: 'app-root',
  template: '<app-lexical-analyzer></app-lexical-analyzer>',
  styles: []
})
export class AppComponent {
  title = 'analizador-lexico';
}
