import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LoginComponent } from './login/login.component';
import { HomeComponent } from './home/home.component';
import { AdminComponent } from './admin/admin.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, LoginComponent, HomeComponent, AdminComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = "PRODIGI"
  username: string | null = localStorage.getItem('username');
  adminMode = false;

  // chiamato quando LoginComponent emette loggedIn
  onLoggedIn() {
    this.username = localStorage.getItem('username');
    this.adminMode = false;
  }

  logout() {
    // opzionale: rimuove username ma mantiene deviceId e logs
    localStorage.removeItem('username');
    localStorage.removeItem('blockUntil');
    localStorage.removeItem('sessionStart');
    this.username = null;
  }

  onAdminLoggedIn() {
    this.username = null;
    this.adminMode = true;
  }

  onAdminLoggedOut() {
    this.username = null;
    this.adminMode = false;
  }

}