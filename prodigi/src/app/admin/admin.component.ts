import { Component, OnInit, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';


@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  logs: any[] = [];
  private http = inject(HttpClient);

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs() {
    this.http.get<any[]>('http://localhost:3000/getLogs')
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
    this.exitAdmin.emit();
  }
}
