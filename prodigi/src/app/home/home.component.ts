import {
  Component,
  ElementRef,
  Renderer2,
  ViewChild,
  OnInit,
  AfterViewInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ChatComponent } from '../chat/chat.component';
import { Router } from '@angular/router';


// interface ScratchGame {
//   id: number;
//   title: string;
//   projectUrl: string;
//   completed: boolean;
//   nextGame: boolean;
//   analogDescription: string;
//   startConversation: string;
// }

interface ScratchGame {
  id: number;
  title: string;
  projectUrl: string;
  steps: GameStep[];
  currentStepIndex: number;
}

interface GameStep {
  completedEnabled: boolean;
  nextGameEnabled: boolean;
  chatEnabled: boolean;
  blockedAnalog: boolean;
  description?: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ChatComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements AfterViewInit, OnDestroy {

  usageLimitMinutes = 120;     // ⏱ tempo massimo d’uso (in mimnuti)
  cooldownLimitHours = 0.001;          // tempo di blocco dopo scadenza (in ore)
  blockedLimit = false;
  unblockLimitTime: string | null = null;

  analogActMinutes = 0.01;     // ⏱ tempo di attivitò analogica (in mimnuti)
  blockedAnalog = false;
  unblockAnalogTime: string | null = null;

  analogCooldownMinutes = 0.5;  // ⏱ tempo di attivitò analogica (in mimnuti) da attendere prima di abilitare la chat

  ngOnInit() {
    this.checkUsage();
    setInterval(() => this.checkUsage(), 1 * 1000); // ricontrolla ogni minuto
    //this.checkAnalog();
    //setInterval(() => this.checkAnalog(), 1 * 1000); // ricontrolla ogni minuto
  }

  private checkUsage() {
    const now = Date.now();
    const blockUntil = localStorage.getItem('blockUntil');
    const sessionStart = localStorage.getItem('sessionStart');

    if (blockUntil && now < parseInt(blockUntil)) {
      this.blockedLimit = true;
      this.unblockLimitTime = this.formatTime(parseInt(blockUntil)); // ⏰ mostra orario
      return;
    }

    if (!sessionStart) {
      localStorage.setItem('sessionStart', now.toString());
      this.blockedLimit = false;
      this.unblockLimitTime = null;
      return;
    }

    const elapsed = now - parseInt(sessionStart);
    const limit = this.usageLimitMinutes * 60 * 1000;

    if (elapsed >= limit) {
      const unblockAt = now + this.cooldownLimitHours * 60 * 60 * 1000;
      localStorage.setItem('blockUntil', unblockAt.toString());
      localStorage.removeItem('sessionStart');
      this.blockedLimit = true;
      this.unblockLimitTime = this.formatTime(unblockAt); // ⏰
    } else {
      this.blockedLimit = false;
      this.unblockLimitTime = null;
    }
  }

  private formatTime(timestamp: number): string {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  @ViewChild('iframeContainer', { static: true }) iframeContainer!: ElementRef<HTMLDivElement>;
  @ViewChild(ChatComponent) chatRef!: ChatComponent;


  // games: ScratchGame[] = [
  //   {
  //     id: 1,
  //     title: 'Preambolo',
  //     projectUrl: 'https://scratch.mit.edu/projects/1217184322/embed',
  //     completed: true,
  //     nextGame: true,
  //     analogDescription: "",
  //     startConversation: "",
  //   },
  //   {
  //     id: 2,
  //     title: 'Mini-Gioco 1',
  //     projectUrl: 'https://scratch.mit.edu/projects/1217522882/embed',
  //     completed: false,
  //     nextGame: false,
  //     analogDescription: "📖 Leggere il giornale e capire quali notizie sono vere o false. Trovare una notizia positiva e raccontarla a un amico/genitore",
  //     startConversation: "Che notizia hai scelto? E’ stato semplice trovare una notizia positiva sul giornale?"
  //   },
  //   {
  //     id: 3,
  //     title: 'Mini-Gioco 2',
  //     projectUrl: 'https://scratch.mit.edu/projects/1217687029/embed',
  //     completed: false,
  //     nextGame: true,
  //     analogDescription: "",
  //     startConversation: "",
  //   },
  //   {
  //     id: 4,
  //     title: 'Mini-Gioco 3',
  //     projectUrl: 'https://scratch.mit.edu/projects/1220326187/embed',
  //     completed: false,
  //     nextGame: true,
  //     analogDescription: "",
  //     startConversation: "",
  //   },
  //   {
  //     id: 5,
  //     title: 'Mini-Gioco 4',
  //     projectUrl: 'https://scratch.mit.edu/projects/1223097804/embed',
  //     completed: false,
  //     nextGame: true,
  //     analogDescription: "",
  //     startConversation: "",
  //   },
  //   {
  //     id: 6,
  //     title: 'Mini-Gioco 5',
  //     projectUrl: 'https://scratch.mit.edu/projects/1225868605/embed',
  //     completed: false,
  //     nextGame: true,
  //     analogDescription: "",
  //     startConversation: "",
  //   }, 
  //   {
  //     id: 7,
  //     title: 'Mini-Gioco 6',
  //     projectUrl: 'https://scratch.mit.edu/projects/1228403027/embed',
  //     completed: false,
  //     nextGame: true,
  //     analogDescription: "",
  //     startConversation: "",
  //   }, 
  //   {
  //     id: 8,
  //     title: 'Prologo Finale',
  //     projectUrl: 'https://scratch.mit.edu/projects/1226047444/embed',
  //     completed: false,
  //     nextGame: true,
  //     analogDescription: "",
  //     startConversation: "",
  //   }
  // ];

  games: ScratchGame[] = [
    {
      id: 1,
      title: 'Preambolo',
      currentStepIndex: 0,
      projectUrl: 'https://scratch.mit.edu/projects/1217184322/embed',
      steps: [
        { completedEnabled: false, nextGameEnabled: true, chatEnabled: false, blockedAnalog: false }
      ]
    },
    {
      id: 2,
      title: 'Mini-Gioco 1',
      currentStepIndex: 0,
      projectUrl: 'https://scratch.mit.edu/projects/1217522882/embed',
      steps: [
        { completedEnabled: true, nextGameEnabled: false, chatEnabled: false, blockedAnalog: false },
        { completedEnabled: false, nextGameEnabled: false, chatEnabled: false, blockedAnalog: true, description: "📖 Leggere il giornale e trovare una notizia positiva da raccontare." },
        { completedEnabled: false, nextGameEnabled: false, chatEnabled: true, blockedAnalog: false, description: "Che notizia hai scelto? E’ stato semplice trovare una notizia positiva?" },
        { completedEnabled: false, nextGameEnabled: true, chatEnabled: false, blockedAnalog: false }
      ]
    },
    {
      id: 2,
      title: 'Mini-Gioco 2',
      currentStepIndex: 0,
      projectUrl: 'https://scratch.mit.edu/projects/1217687029/embed',
      steps: [
        { completedEnabled: true, nextGameEnabled: false, chatEnabled: false, blockedAnalog: false },
        { completedEnabled: false, nextGameEnabled: false, chatEnabled: false, blockedAnalog: true, description: "🔴🟢🔵🟣 Giocare a Mastermind analogico con amici o familiari." },
        { completedEnabled: false, nextGameEnabled: false, chatEnabled: true, blockedAnalog: false, description: "Com’è stato giocare a mastermind?" },
        { completedEnabled: false, nextGameEnabled: true, chatEnabled: false, blockedAnalog: false }
      ]
    },
    // altri giochi seguono lo stesso schema...
  ];

  currentIndex = 0;

  private iframeEl?: HTMLIFrameElement;
  private currentSrc = '';          // tiene traccia dell'url attuale applicato all'iframe
  private onLoadListener?: () => void;

  chatEnabled = false;

  constructor(private sanitizer: DomSanitizer,
    private renderer2: Renderer2,
    private router: Router) { }

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

  get currentStep(): GameStep {
    return this.currentGame.steps[this.currentGame.currentStepIndex];
  }

  get safeUrl(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.currentGame.projectUrl);
  }

  /*
  analogActMinutes = 0.01;     // ⏱ tempo di attivitò analogica (in mimnuti)
  blockedAnalog = false;
  unblockAnalogTime: string | null = null;
  */
  setAnalog() {
    const now = Date.now();
    const unblockAt = now + this.analogActMinutes * 60 * 60 * 1000;
    localStorage.setItem('blockAnalogUntil', unblockAt.toString());
    const blockAnalogUntil = localStorage.getItem('blockAnalogUntil');
    //const sessionStart = localStorage.getItem('sessionStart');

    if (blockAnalogUntil && now < parseInt(blockAnalogUntil)) {
      this.blockedAnalog = true;
      this.unblockAnalogTime = this.formatTime(parseInt(blockAnalogUntil)); // ⏰ mostra orario
      return;
    }
  }

  checkAnalog() {
    const blockAnalogUntil = localStorage.getItem('blockAnalogUntil');
    /*
    if (!sessionStart) {
      localStorage.setItem('sessionStart', now.toString());
      this.blockedLimit = false;
      this.unblockLimitTime = null;
      return;
    }
    */

    if (!blockAnalogUntil) {
      return;
    }

    const now = Date.now();
    const elapsed = now - parseInt(blockAnalogUntil);
    const limit = this.analogActMinutes * 60 * 1000;

    if (elapsed >= limit) {
      const unblockAt = now + this.analogActMinutes * 60 * 60 * 1000;
      localStorage.setItem('blockedAnalog', unblockAt.toString());
      //localStorage.removeItem('sessionStart');
      this.blockedAnalog = true;
      this.unblockAnalogTime = this.formatTime(unblockAt); // ⏰
    } else {
      this.blockedAnalog = false;
      this.unblockAnalogTime = null;

      this.chatEnabled = true; // abilita AI per conversazione dopo attività
      //this.chat.startConversation(this.games[this.currentIndex].startConversation)
    }
  }

  // markAsCompleted() {
  //   this.games[this.currentIndex].completed = true;
  //   this.setAnalog()
  //   this.blockedAnalog = true
  //   //this.chatEnabled = true;
  // }

  // goToNextGame(): void {
  //   if (!this.games[this.currentIndex].completed) {
  //     alert('Completa questo gioco prima di passare al prossimo!');
  //     return;
  //   }
  //   if (this.currentIndex >= this.games.length - 1) return;

  //   const nextIndex = this.currentIndex + 1;
  //   const nextUrl = this.games[nextIndex].projectUrl;

  //   // SOLO se l'url cambia realmente, aggiorna src (evita reset innecesari)
  //   if (this.currentSrc !== nextUrl) {
  //     this.updateIframeSrc(nextUrl);
  //   }

  //   this.chatEnabled = false;
  //   this.currentIndex = nextIndex;
  // }

  // // crea l'iframe solo se non esiste ancora
  // private createIframeOnce(url: string): void {
  //   if (this.iframeEl) return;

  //   // crea elemento iframe
  //   const iframe = this.renderer2.createElement('iframe') as HTMLIFrameElement;

  //   // attributi base (adattali secondo necessità e sicurezza)
  //   //this.renderer2.setAttribute(iframe, 'width', '800');
  //   //this.renderer2.setAttribute(iframe, 'height', '600');
  //   this.renderer2.setAttribute(iframe, 'frameborder', '0');
  //   this.renderer2.setAttribute(iframe, 'scrolling', 'no');
  //   this.renderer2.setAttribute(iframe, 'allowtransparency', 'true');
  //   this.renderer2.setAttribute(iframe, 'sandbox', 'allow-scripts allow-forms allow-same-origin'); // valuta allow-same-origin
  //   // non usare setProperty su src prima del controllo; useremo setAttribute
  //   this.renderer2.setAttribute(iframe, 'src', url);

  //   // listener di debug per capire caricamenti
  //   this.onLoadListener = () => {
  //     console.log('[HomeComponent] iframe loaded:', url);
  //   };
  //   iframe.addEventListener('load', this.onLoadListener);

  //   // append al DOM
  //   this.renderer2.appendChild(this.iframeContainer.nativeElement, iframe);

  //   // salva riferimento e src corrente
  //   this.iframeEl = iframe;
  //   this.currentSrc = url;

  //   console.log('[HomeComponent] iframe creato con src:', url);
  // }

  // // aggiorna solo la src dell'iframe esistente (non ricrea l'iframe)
  // private updateIframeSrc(url: string): void {
  //   if (!this.iframeEl) {
  //     // caso limite: iframe non esiste (crealo)
  //     this.createIframeOnce(url);
  //     return;
  //   }

  //   if (this.currentSrc === url) {
  //     console.log('[HomeComponent] updateIframeSrc chiamato ma src già uguale, skip.');
  //     return;
  //   }

  //   console.log('[HomeComponent] updateIframeSrc: da', this.currentSrc, 'a', url);
  //   // Prima di cambiare src puoi rimuovere listener se vuoi, poi riaggiungerlo
  //   if (this.onLoadListener) {
  //     this.iframeEl.removeEventListener('load', this.onLoadListener);
  //   }

  //   // imposta la nuova src: questo ricaricherà l'iframe **una** volta
  //   this.iframeEl.setAttribute('src', url);

  //   // riattacca listener di load
  //   this.onLoadListener = () => {
  //     console.log('[HomeComponent] iframe loaded after src-change:', url);
  //   };
  //   this.iframeEl.addEventListener('load', this.onLoadListener);

  //   this.currentSrc = url;
  // }

  // --- Avanza tra step ---
  markStepCompleted() {
    if (this.currentStep.completedEnabled) {
      // this.currentStep.completedEnabled = false;
      this.advanceStep();
    }
  }

  goToNextGameStep() {
    this.advanceStep();
  }

  private advanceStep() {
    const game = this.currentGame;

    if (game.currentStepIndex < game.steps.length - 1) {
      game.currentStepIndex++;
    } else if (this.currentIndex < this.games.length - 1) {
      this.currentIndex++;
      this.games[this.currentIndex].currentStepIndex = 0;
      this.updateIframeSrc(this.currentGame.projectUrl);
    }

    // --- Gestione chat con cooldown ---
    const step = this.currentStep;
    if (step.blockedAnalog) {
      // chat abilitata solo dopo X minuti
      const unlockTime = Date.now() + this.analogCooldownMinutes * 60 * 1000;
      localStorage.setItem('chatUnlockTime', unlockTime.toString());
      this.chatEnabled = false;

      // controlla periodicamente se il tempo è passato
      const interval = setInterval(() => {
        const unlock = parseInt(localStorage.getItem('chatUnlockTime') || '0');
        if (Date.now() >= unlock) {
          // this.chatEnabled = true;
          this.advanceStep()
          clearInterval(interval);
        }
      }, 1000); // ogni secondo, puoi aumentare a 10-30s per ottimizzare
    }

    if (step.chatEnabled) {
      const message = this.currentStep.description;  // o qualunque testo decidi
      if (this.chatRef) {
        this.chatRef.initialMessage = message ?? undefined;
        const interval = setInterval(() => {
          const unlock = this.chatRef.getLastResponse()
          console.log(unlock)
          if (unlock.includes("Complimenti! Puoi passare al prossimo gioco!")) {
            
            this.advanceStep()
            clearInterval(interval);
          }
        }, 1000); // ogni secondo, puoi aumentare a 10-30s per ottimizzare
      }
    }
  }

  // --- Creazione e aggiornamento iframe ---
  private createIframeOnce(url: string): void {
    if (this.iframeEl) return;

    const iframe = this.renderer2.createElement('iframe') as HTMLIFrameElement;

    this.renderer2.setAttribute(iframe, 'frameborder', '0');
    this.renderer2.setAttribute(iframe, 'scrolling', 'no');
    this.renderer2.setAttribute(iframe, 'allowtransparency', 'true');
    this.renderer2.setAttribute(iframe, 'sandbox', 'allow-scripts allow-forms allow-same-origin');
    this.renderer2.setAttribute(iframe, 'src', url);

    this.onLoadListener = () => {
      console.log('[HomeComponent] iframe loaded:', url);
    };
    iframe.addEventListener('load', this.onLoadListener);

    this.renderer2.appendChild(this.iframeContainer.nativeElement, iframe);

    this.iframeEl = iframe;
    this.currentSrc = url;
  }

  private updateIframeSrc(url: string): void {
    if (!this.iframeEl) {
      this.createIframeOnce(url);
      return;
    }

    if (this.currentSrc === url) return;

    if (this.onLoadListener) {
      this.iframeEl.removeEventListener('load', this.onLoadListener);
    }

    this.iframeEl.setAttribute('src', url);

    this.onLoadListener = () => {
      console.log('[HomeComponent] iframe loaded after src-change:', url);
    };
    this.iframeEl.addEventListener('load', this.onLoadListener);

    this.currentSrc = url;
  }
}
