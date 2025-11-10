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

  usageLimitMinutes = 1;     // ⏱ tempo massimo d'uso (in minuti)
  cooldownLimitHours = 0.0833333; // 5 minuti tempo di blocco dopo scadenza (in ore) 
  blockedLimit = false;
  unblockLimitTime: string | null = null;

  analogCooldownMinutes = 5;  // ⏱ tempo di attività analogica (in minuti) da attendere prima di abilitare la chat
  unblockAnalogTime: string | null = null;

  currentBook = "/assets/diario.png"

  // Interval references to clean up properly
  private usageLimitInterval?: any;
  private analogCooldownInterval?: any;
  private chatCheckInterval?: any;

  ngAfterViewInit() {
    console.log(this.username)
    this.loadProgress();
    this.checkUsage();
    
    // Check usage limit every 10 seconds
    this.usageLimitInterval = setInterval(() => {
      this.checkUsage()
    }, 10 * 1000);
    
    this.createIframeOnce(this.games[this.currentIndex].projectUrl);
    this.handleStep();
  }

  ngOnDestroy(): void {
    // Clean up all intervals
    if (this.usageLimitInterval) clearInterval(this.usageLimitInterval);
    if (this.analogCooldownInterval) clearInterval(this.analogCooldownInterval);
    if (this.chatCheckInterval) clearInterval(this.chatCheckInterval);
    
    // Clean up iframe listener
    if (this.iframeEl && this.onLoadListener) {
      this.iframeEl.removeEventListener('load', this.onLoadListener);
    }
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
      sessionStartStorage: localStorage.getItem(`sessionStart_${this.username}`),
      blockUntilStorage: localStorage.getItem(`blockUntil_${this.username}`),
      chatUnlockTimeStorage: localStorage.getItem(`chatUnlockTime_${this.username}`),
    };
    localStorage.setItem(`gameState_${this.username}`, JSON.stringify(data));
  }

  private loadProgress() {
    const raw = localStorage.getItem(`gameState_${this.username}`);
    if (!raw) return;

    try {
      const state = JSON.parse(raw);

      this.currentIndex = state.currentIndexStorage ?? 0;
      this.currentGame.currentStepIndex = state.currentStepIndexStorage ?? 0;
      this.blockedLimit = state.blockedLimitStorage ?? false;
      this.unblockLimitTime = state.unblockLimitTimeStorage ?? null;
      this.currentStep.blockedAnalog = state.blockedAnalogStorage ?? false;
      this.unblockAnalogTime = state.unblockAnalogTimeStorage ?? null;
      this.chatEnabled = state.chatEnabledStorage ?? false;
      this.currentBook = state.currentBookStorage ?? "/assets/diario.png";
      
      if (state.blockUntilStorage) {
        localStorage.setItem(`blockUntil_${this.username}`, state.blockUntilStorage);
      }
      if (state.sessionStartStorage) {
        localStorage.setItem(`sessionStart_${this.username}`, state.sessionStartStorage);
      }
      if (state.chatUnlockTimeStorage) {
        localStorage.setItem(`chatUnlockTime_${this.username}`, state.chatUnlockTimeStorage);
      }

    } catch (err) {
      console.error('Errore nel caricamento stato utente', err);
    }
  }

  private checkUsage() {
    const now = Date.now();
    const blockUntil = localStorage.getItem(`blockUntil_${this.username}`);
    const sessionStart = localStorage.getItem(`sessionStart_${this.username}`);

    // Check if user is currently blocked
    if (blockUntil && now < parseInt(blockUntil)) {
      this.blockedLimit = true;
      this.unblockLimitTime = this.formatTime(parseInt(blockUntil));
      return;
    }

    // If block period has ended, clear and start fresh session
    if (blockUntil && now >= parseInt(blockUntil)) {
      localStorage.removeItem(`blockUntil_${this.username}`);
      localStorage.removeItem(`sessionStart_${this.username}`);
      this.blockedLimit = false;
      this.unblockLimitTime = null;
      localStorage.setItem(`sessionStart_${this.username}`, now.toString());
      this.saveProgress();
      return;
    }

    // Start new session if none exists
    if (!sessionStart) {
      localStorage.setItem(`sessionStart_${this.username}`, now.toString());
      this.blockedLimit = false;
      this.unblockLimitTime = null;
      this.saveProgress();
      return;
    }

    // Check if usage limit exceeded
    const elapsed = now - parseInt(sessionStart);
    const limit = this.usageLimitMinutes * 60 * 1000;

    if (elapsed >= limit) {
      const unblockAt = now + this.cooldownLimitHours * 60 * 60 * 1000;
      localStorage.setItem(`blockUntil_${this.username}`, unblockAt.toString());
      localStorage.removeItem(`sessionStart_${this.username}`);
      this.blockedLimit = true;
      this.unblockLimitTime = this.formatTime(unblockAt);
      this.saveProgress();
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
        { completedEnabled: false, nextGameEnabled: false, chatEnabled: true, blockedAnalog: false, description: "Che notizia hai scelto? E' stato semplice trovare una notizia positiva?", sigillo: "Be True" },
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
        { completedEnabled: false, nextGameEnabled: false, chatEnabled: true, blockedAnalog: false, description: "Com'è stato giocare a mastermind?", sigillo: "Stay Safe" },
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
        { completedEnabled: false, nextGameEnabled: false, chatEnabled: true, blockedAnalog: false, description: "A chi hai deciso di scrivere la tua lettera? Com'è stato usare parole gentili e scriverle a mano?", sigillo: "Be Kind" },
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
        { completedEnabled: false, nextGameEnabled: false, chatEnabled: true, blockedAnalog: false, description: "Quale abitudine hai scelto di mettere in pratica? Com'è stato condividerla con qualcuno?", sigillo: "Good Habits" },
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
        { completedEnabled: false, nextGameEnabled: false, chatEnabled: true, blockedAnalog: false, description: "Com'è stato staccare per un po' dai dispositivi tecnologici? Hai notato se il tempo sembrava scorrere più lentamente o più veloce?", sigillo: "Keep Calm" },
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
        { completedEnabled: false, nextGameEnabled: false, chatEnabled: true, blockedAnalog: false, description: "Com'è stato creare il tuo piano giornaliero? Ti sei accorto di quanto tempo passi online durante la giornata?", sigillo: "Balance" },
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
      diario: '/assets/7.png', 
      sigillo: "/assets/harmony.png"
    }
  ];

  currentIndex = 0;

  private iframeEl?: HTMLIFrameElement;
  private currentSrc = '';
  private onLoadListener?: () => void;

  chatEnabled = false;
  showAchievement = false;

  constructor(
    private sanitizer: DomSanitizer,
    private renderer2: Renderer2,
    private router: Router
  ) { }

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
    this.showAchievement = false;
  }

  markStepCompleted() {
    if (this.currentStep.completedEnabled) {
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
    this.saveProgress();
    this.handleStep();
  }

  handleStep() {
    console.log("handleStep chiamato", this.currentStep);
    
    // Clear any existing intervals first
    if (this.analogCooldownInterval) {
      clearInterval(this.analogCooldownInterval);
      this.analogCooldownInterval = undefined;
    }
    if (this.chatCheckInterval) {
      clearInterval(this.chatCheckInterval);
      this.chatCheckInterval = undefined;
    }

    const step = this.currentStep;

    // --- Gestione attività analogica con cooldown ---
    if (step.blockedAnalog) {
      const now = Date.now();
      const storedUnlockTime = localStorage.getItem(`chatUnlockTime_${this.username}`);
      
      let unlockTime: number;
      
      // Check if there's already a cooldown in progress
      if (storedUnlockTime && parseInt(storedUnlockTime) > now) {
        unlockTime = parseInt(storedUnlockTime);
        console.log("Ripristino cooldown analogico esistente");
      } else {
        // Start new cooldown
        unlockTime = now + this.analogCooldownMinutes * 60 * 1000;
        localStorage.setItem(`chatUnlockTime_${this.username}`, unlockTime.toString());
        console.log("Nuovo cooldown analogico avviato");
      }
      
      this.unblockAnalogTime = this.formatTime(unlockTime);
      this.chatEnabled = false;
      this.saveProgress();

      // Check periodically if time has passed
      this.analogCooldownInterval = setInterval(() => {
        const unlock = parseInt(localStorage.getItem(`chatUnlockTime_${this.username}`) || '0');
        const remaining = unlock - Date.now();
        
        if (remaining <= 0) {
          console.log("Cooldown analogico completato");
          localStorage.removeItem(`chatUnlockTime_${this.username}`);
          this.unblockAnalogTime = null;
          clearInterval(this.analogCooldownInterval);
          this.analogCooldownInterval = undefined;
          this.advanceStep();
        } else {
          // Update displayed time
          this.unblockAnalogTime = this.formatTime(unlock);
        }
      }, 1000);
    }

    // --- Gestione chat con verifica risposta ---
    if (step.chatEnabled) {
      const message = this.currentStep.description;
      const sigillo = this.currentStep.sigillo;
      console.log(`Chat abilitata: ${message} - ${sigillo}`);
      
      if (this.chatRef) {
        this.chatRef.initialMessage = message ?? undefined;
        this.chatRef.sigillo = sigillo ?? undefined;
        
        // Check chat response periodically
        this.chatCheckInterval = setInterval(() => {
          const lastResponse = this.chatRef.getLastResponse();
          console.log("Controllo risposta chat");
          
          if (lastResponse.includes("Puoi passare al prossimo gioco!")) {
            console.log("Badge sbloccato!");
            this.showBadge();
            this.currentBook = this.currentGame.diario;
            clearInterval(this.chatCheckInterval);
            this.chatCheckInterval = undefined;
            this.advanceStep();
          }
        }, 1000);
      }
    }
  }

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