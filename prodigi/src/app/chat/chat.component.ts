import { Component } from '@angular/core';
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
export class ChatComponent {
  messages: { user: string; text: string }[] = [];
  userInput = '';
  loading = false;

  constructor(private aiService: GoogleAiService) {}

  sendMessage() {
    if (!this.userInput.trim()) return;

    const userMessage = this.userInput.trim();
    this.messages.push({ user: 'Tu', text: userMessage });
    this.userInput = '';
    this.loading = true;

    this.aiService.sendMessage(userMessage).subscribe({
      next: (res) => {
        this.messages.push({ user: 'AI', text: res.reply });
        this.loading = false;
      },
      error: () => {
        this.messages.push({ user: 'AI', text: 'Errore durante la risposta.' });
        this.loading = false;
      }
    });
  }
}
