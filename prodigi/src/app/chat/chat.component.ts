import { Component, ElementRef, ViewChild, AfterViewChecked, Input  } from '@angular/core';
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
export class ChatComponent implements AfterViewChecked {

  @Input() disabled = false;
  @ViewChild('chatBox') chatBox!: ElementRef;

  messages: { user: string; text: string }[] = [
    { user: 'assistant', text: 'Ciao! Sono il tuo assistente AI 😊' }
  ];
  userInput = '';
  loading = false;

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  constructor(private aiService: GoogleAiService) {}

  sendMessage() {
    if (!this.userInput.trim()) return;

    const userMessage = this.userInput.trim();
    this.messages.push({ user: 'user', text: this.userInput });
    this.userInput = '';
    this.loading = true;

    this.aiService.sendMessage(userMessage).subscribe({
      next: (res) => {
        this.messages.push({ user: 'assistant', text: res.reply });
        this.loading = false;
      },
      error: () => {
        this.messages.push({ user: 'assistant', text: 'Errore durante la risposta.' });
        this.loading = false;
      }
    });

    this.userInput = '';
  }

  private scrollToBottom() {
    if (this.chatBox) {
      const el = this.chatBox.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }
}
