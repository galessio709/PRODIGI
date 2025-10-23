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

interface ScratchGame {
  id: number;
  title: string;
  projectUrl: string;
  steps: GameStep[];
  currentStepIndex: number;
  diario: string;
  sigillo: string;
}

interface GameStep {
  completedEnabled: boolean;
  nextGameEnabled: boolean;
  chatEnabled: boolean;
  blockedAnalog: boolean;
  description?: string;
  sigillo?: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ChatComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements AfterViewInit, OnDestroy {

  username: string | null = localStorage.getItem("username")

  usageLimitMinutes = 120;     // ⏱ tempo massimo d’uso (in mimnuti)
  cooldownLimitHours = 0.001;          // tempo di blocco dopo scadenza (in ore)
  blockedLimit = false;
  unblockLimitTime: string | null = null;

  analogCooldownMinutes = 0.1;  // ⏱ tempo di attivitò analogica (in mimnuti) da attendere prima di abilitare la chat
  unblockAnalogTime: string | null = null;

  currentBook = "/assets/diario.png"

  ngAfterViewInit() {
    console.log(this.username)
    this.loadProgress();
    this.checkUsage();
    setInterval(() => {
      this.checkUsage()
      // console.log("ogni secondo controllo limite di gioco")
    }, 10 * 1000); // ricontrolla ogni secondo 1000ms
    this.createIframeOnce(this.games[this.currentIndex].projectUrl); // crea l'iframe **una sola volta**
    this.handleStep();
  }

  private saveProgress() {
    const data = {
      currentIndexStorage: this.currentIndex,
      currentStepIndexStorage: this.currentGame.currentStepIndex,
      blockedLimitStorage: this.blockedLimit,
      unblockLimitTimeStorage: this.unblockLimitTime,
      blockedAnalogStorage: this.currentStep.blockedAnalog,
      unblockAnalogTimeStorage: this.unblockAnalogTime,
      chatEnabledStorage: this.currentStep.chatEnabled,
      currentBookStorage: this.currentBook,
      //achievements: this.achievements,
      //sessionStartTime: this.sessionStartTime
    };
    localStorage.setItem(`gameState_${this.username}`, JSON.stringify(data));
  }

  private loadProgress() {
    const raw = localStorage.getItem(`gameState_${this.username}`);
    if (!raw) return;

    try {
      const state = JSON.parse(raw);

      this.currentIndex = state.currentIndexStorage;
      this.currentGame.currentStepIndex = state.currentStepIndexStorage;
      this.blockedLimit = state.blockedLimitStorage;
      this.unblockLimitTime = state.unblockLimitTimeStorage;
      this.currentStep.blockedAnalog = state.blockedAnalogStorage;
      this.unblockAnalogTime = state.unblockAnalogTimeStorage;
      this.chatEnabled = state.chatEnabledStorage;
      this.currentBook = state.currentBookStorage;
      // Object.assign(this, state);

      // // Se esiste un blocco ancora valido, riapplichiamo overlay
      // if (this.blockedAnalog && Date.now() < this.unblockAnalogTime) {
      //   this.startAnalogCountdown();
      // } else {
      //   this.blockedAnalog = false;
      // }

      // if (this.chatUnlockTime && Date.now() < this.chatUnlockTime) {
      //   this.chatEnabled = false;
      //   this.scheduleChatUnlock();
      // } else {
      //   this.chatEnabled = true;
      // }

    } catch (err) {
      console.error('Errore nel caricamento stato utente', err);
    }
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

  games: ScratchGame[] = [
    {
      id: 1,
      title: 'Preambolo',
      currentStepIndex: 0,
      projectUrl: 'https://scratch.mit.edu/projects/1217184322/embed',
      steps: [
        { completedEnabled: false, nextGameEnabled: true, chatEnabled: false, blockedAnalog: false }
      ],
      diario: '/assets/diario.png',
      sigillo: "",
    },
    {
      id: 2,
      title: 'Mini-Gioco 1',
      currentStepIndex: 0,
      projectUrl: 'https://scratch.mit.edu/projects/1217522882/embed',
      steps: [
        { completedEnabled: true, nextGameEnabled: false, chatEnabled: false, blockedAnalog: false },
        { completedEnabled: false, nextGameEnabled: false, chatEnabled: false, blockedAnalog: true, description: "📖 Leggere il giornale e trovare una notizia positiva da raccontare." },
        { completedEnabled: false, nextGameEnabled: false, chatEnabled: true, blockedAnalog: false, description: "Che notizia hai scelto? E’ stato semplice trovare una notizia positiva?", sigillo: "Be True" },
        { completedEnabled: false, nextGameEnabled: true, chatEnabled: false, blockedAnalog: false }
      ],
      diario: '/assets/1.png',
      sigillo: "/assets/true.png"
    },
    {
      id: 3,
      title: 'Mini-Gioco 2',
      currentStepIndex: 0,
      projectUrl: 'https://scratch.mit.edu/projects/1217687029/embed',
      steps: [
        { completedEnabled: true, nextGameEnabled: false, chatEnabled: false, blockedAnalog: false },
        { completedEnabled: false, nextGameEnabled: false, chatEnabled: false, blockedAnalog: true, description: "🔴🟢🔵🟣 Giocare a Mastermind analogico con amici o familiari." },
        { completedEnabled: false, nextGameEnabled: false, chatEnabled: true, blockedAnalog: false, description: "Com’è stato giocare a mastermind?", sigillo: "Stay Safe" },
        { completedEnabled: false, nextGameEnabled: true, chatEnabled: false, blockedAnalog: false }
      ],
      diario: '/assets/2.png',
      sigillo: "/assets/safe.png"
    },
    {
      id: 4,
      title: 'Mini-Gioco 3',
      currentStepIndex: 0,
      projectUrl: 'https://scratch.mit.edu/projects/1220326187/embed',
      steps: [
        { completedEnabled: true, nextGameEnabled: false, chatEnabled: false, blockedAnalog: false },
        { completedEnabled: false, nextGameEnabled: false, chatEnabled: false, blockedAnalog: true, description: "💌 Scrivere una lettera o una cartolina gentile a un amico/familiare e spedirla per posta.." },
        { completedEnabled: false, nextGameEnabled: false, chatEnabled: true, blockedAnalog: false, description: "A chi hai deciso di scrivere la tua lettera? Com’è stato usare parole gentili e scriverle a mano?", sigillo: "Be Kind" },
        { completedEnabled: false, nextGameEnabled: true, chatEnabled: false, blockedAnalog: false }
      ],
      diario: '/assets/3.png',
      sigillo: "/assets/kind.png"
    },
    {
      id: 5,
      title: 'Mini-Gioco 4',
      currentStepIndex: 0,
      projectUrl: 'https://scratch.mit.edu/projects/1223097804/embed',
      steps: [
        { completedEnabled: true, nextGameEnabled: false, chatEnabled: false, blockedAnalog: false },
        { completedEnabled: false, nextGameEnabled: false, chatEnabled: false, blockedAnalog: true, description: "🫂 Scegliere una piccola abitudine positiva da fare nel mondo reale con un amico o familiare." },
        { completedEnabled: false, nextGameEnabled: false, chatEnabled: true, blockedAnalog: false, description: "Quale abitudine hai scelto di mettere in pratica? Com’è stato condividerla con qualcuno?", sigillo: "Good Habits" },
        { completedEnabled: false, nextGameEnabled: true, chatEnabled: false, blockedAnalog: false }
      ],
      diario: '/assets/4.png',
      sigillo: "/assets/habits.png"
    },
    {
      id: 6,
      title: 'Mini-Gioco 5',
      currentStepIndex: 0,
      projectUrl: 'https://scratch.mit.edu/projects/1225868605/embed',
      steps: [
        { completedEnabled: true, nextGameEnabled: false, chatEnabled: false, blockedAnalog: false },
        { completedEnabled: false, nextGameEnabled: false, chatEnabled: false, blockedAnalog: true, description: "🗣️ Raccontare a voce qualcosa a un amico o familiare." },
        { completedEnabled: false, nextGameEnabled: false, chatEnabled: true, blockedAnalog: false, description: "Com’è stato staccare per un po’ dai dispositivi tecnologici? Hai notato se il tempo sembrava scorrere più lentamente o più veloce?", sigillo: "Keep Calm" },
        { completedEnabled: false, nextGameEnabled: true, chatEnabled: false, blockedAnalog: false }
      ],
      diario: '/assets/5.png',
      sigillo: "/assets/calm.png"
    },
    {
      id: 7,
      title: 'Mini-Gioco 6',
      currentStepIndex: 0,
      projectUrl: 'https://scratch.mit.edu/projects/1228403027/embed',
      steps: [
        { completedEnabled: true, nextGameEnabled: false, chatEnabled: false, blockedAnalog: false },
        { completedEnabled: false, nextGameEnabled: false, chatEnabled: false, blockedAnalog: true, description: "🗓️ Scrivere un piccolo planner cartaceo per organizzare il tempo tra studio, gioco, sport e pause." },
        { completedEnabled: false, nextGameEnabled: false, chatEnabled: true, blockedAnalog: false, description: "Com’è stato creare il tuo piano giornaliero? Ti sei accorto di quanto tempo passi online durante la giornata?", sigillo: "Balance" },
        { completedEnabled: false, nextGameEnabled: true, chatEnabled: false, blockedAnalog: false }
      ],
      diario: '/assets/6.png',
      sigillo: "/assets/balance.png"
    },
    {
      id: 8,
      title: 'Gioco Finale',
      currentStepIndex: 0,
      projectUrl: 'https://scratch.mit.edu/projects/1226047444/embed',
      steps: [
        { completedEnabled: true, nextGameEnabled: false, chatEnabled: false, blockedAnalog: false },
        { completedEnabled: false, nextGameEnabled: false, chatEnabled: false, blockedAnalog: true, description: "🎮 Una volta raccolti i 6 sigilli, come tua ultima missione analogica condividi il gioco con i tuoi amici/familiari e poi raccontami cosa ne pensano del gioco." },
        { completedEnabled: false, nextGameEnabled: false, chatEnabled: true, blockedAnalog: false, description: "Hai condiviso il gioco amici e familiari? Cosa ne pensano? Vorrebbero giocarci anche loro", sigillo: "Harmony" },
        { completedEnabled: false, nextGameEnabled: false, chatEnabled: false, blockedAnalog: false }
      ],
      diario: '/assets/7.png', sigillo: "harmony.png"
    }
  ];

  currentIndex = 0;

  private iframeEl?: HTMLIFrameElement;
  private currentSrc = '';          // tiene traccia dell'url attuale applicato all'iframe
  private onLoadListener?: () => void;

  chatEnabled = false;
  showAchievement = false;

  constructor(private sanitizer: DomSanitizer,
    private renderer2: Renderer2,
    private router: Router) { }

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

  showBadge() {
    this.showAchievement = true;
  }

  onAnimationEnd() {
    this.showAchievement = false; // remove after fade out completes
  }

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
    this.saveProgress()
    this.handleStep()
  }

  handleStep() {
    console.log("onInit faccio handleStep")
    console.log(this.currentStep)
    const step = this.currentStep;

    // --- Gestione chat con cooldown ---
    if (step.blockedAnalog) {
      // chat abilitata solo dopo X minuti
      const unlockTime = Date.now() + this.analogCooldownMinutes * 60 * 1000;
      localStorage.setItem('chatUnlockTime', unlockTime.toString());
      this.unblockAnalogTime = unlockTime.toString()
      this.chatEnabled = false;

      // controlla periodicamente se il tempo è passato
      const interval = setInterval(() => {
        const unlock = parseInt(localStorage.getItem('chatUnlockTime') || '0');
        if (Date.now() >= unlock) {
          this.advanceStep()
          clearInterval(interval);
        }
      }, 1000); // ogni secondo, puoi aumentare a 10-30s per ottimizzare
    }

    if (step.chatEnabled) {
      const message = this.currentStep.description;  // domanda per valutare att. anaogica
      const sigillo = this.currentStep.sigillo;  // domanda per valutare att. anaogica
      console.log(`dentro step.chatEnabled ${message} - ${sigillo}`)
      if (this.chatRef) {
        console.log(`dentro chatRef ${this.chatRef}`)
        this.chatRef.initialMessage = message ?? undefined;
        this.chatRef.sigillo = sigillo ?? undefined;
        const interval = setInterval(() => {
          const unlock = this.chatRef.getLastResponse()
          console.log("ogni secondo controllo ultima risposta")
          if (unlock.includes("Puoi passare al prossimo gioco!")) {
            this.showBadge()
            this.currentBook = this.currentGame.diario
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
