import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

interface ScratchGame {
  id: number;
  title: string;
  projectUrl: string;
  completed: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {

  games: ScratchGame[] = [
    {
      id: 1,
      title: 'Mini-Gioco 1',
      projectUrl: 'https://scratch.mit.edu/projects/1132654424/embed',
      completed: false
    },
    {
      id: 2,
      title: 'Mini-Gioco 2',
      projectUrl: 'https://scratch.mit.edu/projects/1132519814/embed',
      completed: false
    },
    {
      id: 3,
      title: 'Mini-Gioco 3',
      projectUrl: 'https://scratch.mit.edu/projects/1135240206/embed',
      completed: false
    }
  ];

  currentIndex = 0;

  constructor(private sanitizer: DomSanitizer) {}

  get currentGame(): ScratchGame {
    return this.games[this.currentIndex];
  }

  get safeUrl(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.currentGame.projectUrl);
  }

  markAsCompleted() {
    this.games[this.currentIndex].completed = true;
  }

  goToNextGame() {
    if (this.games[this.currentIndex].completed && this.currentIndex < this.games.length - 1) {
      this.currentIndex++;
    } else {
      alert('Completa questo gioco prima di passare al prossimo!');
    }
  }
}
