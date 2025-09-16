import {
  Component,
  ElementRef,
  Renderer2,
  ViewChild,
  AfterViewInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ChatComponent } from '../chat/chat.component';


interface ScratchGame {
  id: number;
  title: string;
  projectUrl: string;
  completed: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ChatComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements AfterViewInit, OnDestroy {

  @ViewChild('iframeContainer', { static: true }) iframeContainer!: ElementRef<HTMLDivElement>;

  games: ScratchGame[] = [
    /*{
      id: 1,
      title: 'Preambolo',
      projectUrl: 'https://scratch.mit.edu/projects/1217184322/embed',
      completed: false
    },*/
    {
      id: 2,
      title: 'Mini-Gioco 1',
      projectUrl: 'https://scratch.mit.edu/projects/1132654424/embed',
      completed: false
    },
    {
      id: 3,
      title: 'Mini-Gioco 2',
      projectUrl: 'https://scratch.mit.edu/projects/1132519814/embed',
      completed: false
    },
    {
      id: 4,
      title: 'Mini-Gioco 3',
      projectUrl: 'https://scratch.mit.edu/projects/1135240206/embed',
      completed: false
    }
  ];

  currentIndex = 0;

  private iframeEl?: HTMLIFrameElement;
  private currentSrc = '';          // tiene traccia dell'url attuale applicato all'iframe
  private onLoadListener?: () => void;

  constructor(private sanitizer: DomSanitizer, private renderer2: Renderer2) {}

  ngAfterViewInit(): void {
    // crea l'iframe **una sola volta**
    this.createIframeOnce(this.games[this.currentIndex].projectUrl);
  }

  ngOnDestroy(): void {
    // pulizia listener se necessario
    if (this.iframeEl && this.onLoadListener) {
      this.iframeEl.removeEventListener('load', this.onLoadListener);
    }
  }


  get currentGame(): ScratchGame {
    return this.games[this.currentIndex];
  }

  get safeUrl(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.currentGame.projectUrl);
  }

  markAsCompleted() {
    this.games[this.currentIndex].completed = true;
  }

  goToNextGame(): void {
    if (!this.games[this.currentIndex].completed) {
      alert('Completa questo gioco prima di passare al prossimo!');
      return;
    }
    if (this.currentIndex >= this.games.length - 1) return;

    const nextIndex = this.currentIndex + 1;
    const nextUrl = this.games[nextIndex].projectUrl;

    // SOLO se l'url cambia realmente, aggiorna src (evita reset innecesari)
    if (this.currentSrc !== nextUrl) {
      this.updateIframeSrc(nextUrl);
    }

    this.currentIndex = nextIndex;
  }

  // crea l'iframe solo se non esiste ancora
  private createIframeOnce(url: string): void {
    if (this.iframeEl) return;

    // crea elemento iframe
    const iframe = this.renderer2.createElement('iframe') as HTMLIFrameElement;

    // attributi base (adattali secondo necessità e sicurezza)
    this.renderer2.setAttribute(iframe, 'width', '800');
    this.renderer2.setAttribute(iframe, 'height', '600');
    this.renderer2.setAttribute(iframe, 'frameborder', '0');
    this.renderer2.setAttribute(iframe, 'scrolling', 'no');
    this.renderer2.setAttribute(iframe, 'allowtransparency', 'true');
    this.renderer2.setAttribute(iframe, 'sandbox', 'allow-scripts allow-forms allow-same-origin'); // valuta allow-same-origin
    // non usare setProperty su src prima del controllo; useremo setAttribute
    this.renderer2.setAttribute(iframe, 'src', url);

    // listener di debug per capire caricamenti
    this.onLoadListener = () => {
      console.log('[HomeComponent] iframe loaded:', url);
    };
    iframe.addEventListener('load', this.onLoadListener);

    // append al DOM
    this.renderer2.appendChild(this.iframeContainer.nativeElement, iframe);

    // salva riferimento e src corrente
    this.iframeEl = iframe;
    this.currentSrc = url;

    console.log('[HomeComponent] iframe creato con src:', url);
  }

  // aggiorna solo la src dell'iframe esistente (non ricrea l'iframe)
  private updateIframeSrc(url: string): void {
    if (!this.iframeEl) {
      // caso limite: iframe non esiste (crealo)
      this.createIframeOnce(url);
      return;
    }

    if (this.currentSrc === url) {
      console.log('[HomeComponent] updateIframeSrc chiamato ma src già uguale, skip.');
      return;
    }

    console.log('[HomeComponent] updateIframeSrc: da', this.currentSrc, 'a', url);
    // Prima di cambiare src puoi rimuovere listener se vuoi, poi riaggiungerlo
    if (this.onLoadListener) {
      this.iframeEl.removeEventListener('load', this.onLoadListener);
    }

    // imposta la nuova src: questo ricaricherà l'iframe **una** volta
    this.iframeEl.setAttribute('src', url);

    // riattacca listener di load
    this.onLoadListener = () => {
      console.log('[HomeComponent] iframe loaded after src-change:', url);
    };
    this.iframeEl.addEventListener('load', this.onLoadListener);

    this.currentSrc = url;
  }
}
