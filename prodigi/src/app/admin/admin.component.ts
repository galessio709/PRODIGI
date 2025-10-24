import { Component, OnInit, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  logs: any[] = [];
  private http = inject(HttpClient);
  
  adminKey: string = '';
  isAuthenticated: boolean = false;
  errorMessage: string = '';

  ngOnInit(): void {
    // Non caricare i log automaticamente
  }

  authenticate() {
    if (!this.adminKey.trim()) {
      this.errorMessage = 'Inserisci la chiave admin';
      return;
    }

    const headers = new HttpHeaders({
      'x-admin-key': this.adminKey
    });

    this.http.get<any[]>('http://localhost:3000/getLogs', { headers })
      .subscribe({
        next: (data) => {
          this.logs = data;
          this.isAuthenticated = true;
          this.errorMessage = '';
        },
        error: (err) => {
          this.errorMessage = 'Chiave admin non valida';
          this.isAuthenticated = false;
        }
      });
  }

  loadLogs() {
    if (!this.isAuthenticated) return;
    
    const headers = new HttpHeaders({
      'x-admin-key': this.adminKey
    });

    this.http.get<any[]>('http://localhost:3000/getLogs', { headers })
      .subscribe(data => this.logs = data);
  }

  exportCSV() {
    if (!this.logs.length) return;
    const csv = [
      ['Name','DeviceId','Date'],
      ...this.logs.map(l => [l.name,l.deviceId,l.date])
    ].map(e => e.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'accessLogs.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  @Output() exitAdmin = new EventEmitter<void>();

  logoutAdmin() {
    this.adminKey = '';
    this.isAuthenticated = false;
    this.logs = [];
    this.exitAdmin.emit();
  }
}