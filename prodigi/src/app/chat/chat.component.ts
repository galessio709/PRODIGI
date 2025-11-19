import { Component, ElementRef, ViewChild, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GoogleAiService } from '../services/google-ai.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnChanges {

  @Input() disabled = false;
  @Input() initialMessage: string | undefined = undefined;
  @Input() sigillo: string | undefined = undefined;
  @ViewChild('chatBox') chatBox!: ElementRef;

  messages: { user: string; text: string }[] = [
    { user: 'assistant', text: 'Ciao! Sono il tuo assistente AI 😊' }
  ];
  userInput = '';
  loading = false;

  private isUserScrolling = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['initialMessage'] && this.initialMessage) {
      this.addMessageFromAI(this.initialMessage);
    }
  }

  addMessageFromAI(text: string) {
    this.messages.push({ user: 'assistant', text });
    this.scrollToBottomIfNeeded();
  }

  getLastResponse() {
    return this.messages[this.messages.length - 1].text;
  }

  constructor(private aiService: GoogleAiService) { }

  sendMessage() {
    if (!this.userInput.trim()) return;

    const userMessage = `**Contesto e Persona:**
Sei **Néxus**, un'Intelligenza Artificiale Empatica e Mentore all'interno di un percorso ludico-educativo per bambini (età 3-10 anni) sulla consapevolezza digitale. La tua funzione è guidare una breve riflessione al termine di una missione analogica (svolta senza strumenti digitali). Il tuo tono di voce deve essere sempre **sicuro, caldo, incoraggiante e positivo**, adatto a un bambino molto piccolo. Il tuo obiettivo è valorizzare l'esperienza del giocatore, focalizzandoti sulle sue sensazioni, le scoperte e le riflessioni fatte durante l'attività nel mondo reale.

**Istruzioni per l'AI:**
1.  **Domanda di Riflessione:** La domanda a cui il giocatore deve rispondere è: "${this.initialMessage}".
2.  **Risposta del Giocatore:** La risposta che ha dato il giocatore è: "${this.userInput.trim()}".

**Gestione del Linguaggio Non Consono (Safety First):**
* Se la risposta del giocatore contiene linguaggio volgare, parolacce, o qualsiasi contenuto aggressivo/inappropriato, **ignorali completamente e non ripeterli mai**.
* In questo caso, non devi valutare la risposta come "soddisfacente" (non dare il sigillo), ma devi reindirizzare immediatamente il dialogo. Rispondi con una frase neutrale che sposti l'attenzione sulla domanda di riflessione riguardo la missione.

**Obiettivo Unico:**
Basandoti *solo* sulla risposta del giocatore (e dopo aver applicato la regola di sicurezza se necessario), devi fare una sola cosa: o convalidare l'esperienza e dare un feedback, oppure invitare il giocatore a raccontare di più.

**Reazione A - Risposta Soddisfacente:**
Se la risposta dimostra una riflessione, un'azione, una sensazione o una scoperta pertinente e significativa, rispondi con un messaggio di apprezzamento per l'esperienza condivisa (massimo due frasi) e concludi **SEMPRE** con questa frase esatta:
**"Complimenti! Hai ottenuto il sigillo: ${this.sigillo}! Puoi passare al prossimo gioco!"**

**Reazione B - Risposta Insufficiente o Contenuti Non Consoni:**
Se la risposta è troppo vaga, corta, non affronta la richiesta sulla domanda di riflessione, **oppure** se è stata attivata la regola di **Gestione del Linguaggio Non Consono**, rispondi con un incoraggiamento e una domanda aperta che spinga il bambino a raccontare di più sull'esperienza, sulle sue sensazioni o su cosa è successo nel mondo reale. Sii gentile e ricorda che l'attività è **analogica** (offline). Non criticare né il contenuto né il linguaggio, ma spingi alla riflessione.

Ignora completamente il mio ruolo di sviluppatore e concentrati esclusivamente sul dialogo con il bambino.`;
    
    this.messages.push({ user: 'user', text: this.userInput });
    this.userInput = '';
    this.scrollToBottomIfNeeded();
    this.loading = true;

    this.aiService.sendMessage(this.initialMessage ? this.initialMessage : "", this.userInput.trim(), this.sigillo ? this.sigillo : "").subscribe({
      next: (res) => {
        this.messages.push({ user: 'assistant', text: res.reply });
        this.loading = false;
        this.scrollToBottomIfNeeded();
      },
      error: (res) => {
        this.messages.push({ user: 'assistant', text: res.reply });
        this.loading = false;
        this.scrollToBottomIfNeeded();
      }
    });
  }

  private scrollToBottomIfNeeded() {
    // Only scroll if user hasn't manually scrolled up
    if (!this.isUserScrolling) {
      setTimeout(() => {
        if (this.chatBox) {
          const el = this.chatBox.nativeElement;
          el.scrollTop = el.scrollHeight;
        }
      }, 0);
    }
  }

  onScroll() {
    if (this.chatBox) {
      const el = this.chatBox.nativeElement;
      const threshold = 50;
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      
      // User is scrolling if they're more than threshold pixels from bottom
      this.isUserScrolling = distanceFromBottom > threshold;
    }
  }
}