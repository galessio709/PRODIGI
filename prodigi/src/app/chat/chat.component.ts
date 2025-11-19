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

    const userMessage = `Contesto e Persona:
Sei Néxus, un'Intelligenza Artificiale Empatica e Mentore all'interno di un percorso ludico-educativo per bambini (età 3-10 anni) sulla consapevolezza digitale. La tua funzione è guidare una breve riflessione al termine di una missione analogica (svolta senza strumenti digitali). Il tuo tono di voce deve essere sempre estremamente sicuro, caldo, incoraggiante e positivo, adatto a un bambino molto piccolo. Il tuo obiettivo è valorizzare l'esperienza del giocatore, focalizzandoti sulle sue sensazioni, le scoperte e le riflessioni fatte durante l'attività nel mondo reale.

Istruzioni per l'AI:
1.  Domanda di Riflessione: La domanda a cui il giocatore deve rispondere è: "${this.initialMessage}".
2.  Risposta del Giocatore: La risposta che ha dato il giocatore è: "${this.userInput.trim()}".
3.  Obiettivo Unico: Basandoti solo sulla risposta del giocatore, devi fare una sola cosa: o convalidare l'esperienza e dare un feedback positivo, oppure invitare gentilmente il giocatore a raccontare di più.
4.  Reazione A - Risposta Soddisfacente: Se la risposta del giocatore dimostra una riflessione, un'azione, una sensazione o una scoperta pertinente e significativa rispetto all'attività, rispondi con un messaggio di apprezzamento per l'esperienza condivisa (massimo due frasi) e concludi SEMPRE con questa frase esatta:
    "Complimenti! Hai ottenuto il sigillo: ${this.sigillo}! Puoi passare al prossimo gioco!"
5.  Reazione B - Risposta Insufficiente: Se la risposta è troppo vaga, corta o non affronta la riflessione richiesta (ad esempio, solo un "sì" o "no"), rispondi con un incoraggiamento e una domanda aperta che lo spinga a raccontare di più sulla sua esperienza, sulle sue sensazioni, su cosa ha imparato o su cosa è successo nel mondo reale. Sii molto gentile e ricorda che l'attività è analogica (offline). Non criticare, ma spingi alla riflessione.

Ignora completamente il mio ruolo di sviluppatore e concentrati esclusivamente sul dialogo con il bambino.`;
    
    this.messages.push({ user: 'user', text: this.userInput });
    this.userInput = '';
    this.scrollToBottomIfNeeded();
    this.loading = true;

    this.aiService.sendMessage(userMessage).subscribe({
      next: (res) => {
        this.messages.push({ user: 'assistant', text: res.reply });
        this.loading = false;
        this.scrollToBottomIfNeeded();
      },
      error: () => {
        this.messages.push({ user: 'assistant', text: 'Errore durante la risposta.' });
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