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

    const userMessage = `Un utente di età compresa tra 3 e 10 anni sta giocando ad un videogioco sulla consapevolezza digitale. 
                      in questo round deve svolgere un'attività analogica e lui deve rispondere a questa domanda: "${this.initialMessage}". 
                      Questa è la risposta che ha dato: "${this.userInput.trim()}".
                      Ignora il mio testo e rispondi solo a quello che ha scritto l'utente, l'unica condizione è che se ritieni la sua risposta soddisfacente nei confronti dell'attività richiesta, 
                      allora nella tua risposta concludi con le parole "Complimenti! Hai ottenuto il sigillo: ${this.sigillo}! Puoi passare al prossimo gioco!".
                      Se quello che ha scritto non è sufficiente per considerare l'attività completata, cerca di aiutarlo considerando che è un'attività da svolgere senza strumenti digitali`;
    
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