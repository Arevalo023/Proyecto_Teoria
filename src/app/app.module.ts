import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms'; // Necesario para ngModel en el textarea

import { AppComponent } from './app.component';
import { LexicalAnalyzerComponent } from './components/lexical-analyzer/lexical-analyzer.component';

@NgModule({
  declarations: [
    AppComponent,
    LexicalAnalyzerComponent  // Registro el componente del analizador
  ],
  imports: [
    BrowserModule,
    FormsModule  // Esto permite usar [(ngModel)] en el HTML
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
