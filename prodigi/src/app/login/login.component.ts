import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username = '';

  @Output() loggedIn = new EventEmitter<void>();
  private http = inject(HttpClient);

  login() {
    const name = this.username.trim();
    if (!name) return;

    // genera deviceId se non esiste
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId && typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      deviceId = (crypto as any).randomUUID();
      localStorage.setItem('deviceId', (deviceId as string));
    } else if (!deviceId) {
      // fallback semplice
      deviceId = 'dev-' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem('deviceId', deviceId);
    }

    localStorage.setItem('username', name);

    // registra log di accesso
    this.http.post('/api/logAccess', { name, deviceId })
      .subscribe({
        next: () => console.log('Log inviato al server'),
        error: err => console.error('Errore invio log', err)
      });

    // notifica al genitore che il login è avvenuto
    this.loggedIn.emit();
  }

  @Output() adminLoggedIn = new EventEmitter<void>();

  loginAsAdmin() {
    this.adminLoggedIn.emit();
  }

}
