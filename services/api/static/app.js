// InterviewLens AI — Core Single Page Application Client
// "Every interview makes you better."

const API_BASE = '/api/v1';

const state = {
  token: localStorage.getItem('interviewlens_token') || null,
  user: null,
  currentRoute: 'landing',
  currentInterviewId: null,
  reportData: null,
  activeReportTab: 'questions',
  selectedQuestionIndex: 0,
  pollTimer: null,
  mediaTime: 0,
  isPlaying: false,
  playbackTimer: null,
  recentInterviews: [],
  practiceQuestions: [],
  learningPlans: [],
};

// Initial App Boot
document.addEventListener('DOMContentLoaded', async () => {
  if (state.token) {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      if (res.ok) {
        state.user = await res.json();
      } else {
        logout();
      }
    } catch (e) {
      console.warn("Could not verify session:", e);
    }
  }

  updateNavbar();
  
  // Route selection based on URL hash or auth
  const hash = window.location.hash.replace('#', '') || (state.user ? 'dashboard' : 'landing');
  navigateTo(hash);
});

// Navigation Controller
function navigateTo(route, params = {}) {
  state.currentRoute = route;
  window.location.hash = route;
  updateNavbar();

  const viewport = document.getElementById('app-viewport');
  if (!viewport) return;

  // Clear timers
  if (state.pollTimer) clearInterval(state.pollTimer);
  if (state.playbackTimer) clearInterval(state.playbackTimer);
  state.isPlaying = false;

  window.scrollTo({ top: 0, behavior: 'smooth' });

  switch (route) {
    case 'landing':
      renderLanding(viewport);
      break;
    case 'auth':
      renderAuth(viewport, params.mode || 'login');
      break;
    case 'dashboard':
      ensureAuth(() => renderDashboard(viewport));
      break;
    case 'upload':
      ensureAuth(() => renderUpload(viewport));
      break;
    case 'processing':
      ensureAuth(() => renderProcessing(viewport, params.interviewId || state.currentInterviewId));
      break;
    case 'report':
      ensureAuth(() => renderReport(viewport, params.interviewId || state.currentInterviewId));
      break;
    case 'learning':
      ensureAuth(() => renderLearning(viewport));
      break;
    case 'practice':
      ensureAuth(() => renderPractice(viewport, params.questionId));
      break;
    case 'history':
      ensureAuth(() => renderHistory(viewport));
      break;
    case 'settings':
      ensureAuth(() => renderSettings(viewport));
      break;
    default:
      renderLanding(viewport);
  }

  if (window.lucide) {
    setTimeout(() => lucide.createIcons(), 50);
  }
}

function ensureAuth(callback) {
  if (!state.user || !state.token) {
    showToast('Please sign in to access your interview workspace', 'warning');
    navigateTo('auth', { mode: 'login' });
  } else {
    callback();
  }
}

function updateNavbar() {
  const authContainer = document.getElementById('auth-controls');
  if (!authContainer) return;

  if (state.user) {
    authContainer.innerHTML = `
      <div class="flex items-center space-x-2">
        <button onclick="navigateTo('settings')" class="flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-surface-elevated text-xs text-slate-300 transition">
          <div class="w-6 h-6 rounded-full bg-indigo-600/50 border border-indigo-400/40 flex items-center justify-center font-bold text-indigo-200">
            ${state.user.full_name.charAt(0).toUpperCase()}
          </div>
          <span class="hidden sm:inline font-medium">${state.user.full_name}</span>
        </button>
        <button onclick="logout()" title="Sign Out" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition">
          <i data-lucide="log-out" class="w-4 h-4"></i>
        </button>
      </div>
    `;
  } else {
    authContainer.innerHTML = `
      <button onclick="navigateTo('auth', { mode: 'login' })" class="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition">
        Sign In
      </button>
      <button onclick="navigateTo('auth', { mode: 'register' })" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold gradient-accent text-white shadow-md shadow-indigo-500/20 hover:opacity-95 transition">
        Get Started Free
      </button>
    `;
  }
}

async function handleQuickDemo() {
  try {
    showToast('Initializing instant demo environment...', 'info');
    const res = await fetch(`${API_BASE}/auth/demo-login`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to load demo credentials');
    const data = await res.json();
    
    state.token = data.access_token;
    state.user = data.user;
    localStorage.setItem('interviewlens_token', state.token);
    updateNavbar();

    // Seed demo interview
    const seedRes = await fetch(`${API_BASE}/interviews/seed-demo`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (!seedRes.ok) throw new Error('Failed to seed demo interview');
    const seedData = await seedRes.json();
    
    state.currentInterviewId = seedData.id;
    showToast('Demo interview loaded successfully!', 'success');
    navigateTo('report', { interviewId: seedData.id });
  } catch (e) {
    showToast(e.message || 'Error initializing demo', 'error');
  }
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('interviewlens_token');
  showToast('Signed out successfully', 'info');
  navigateTo('landing');
}

// -------------------------------------------------------------
// 1. LANDING PAGE
// -------------------------------------------------------------
function renderLanding(container) {
  container.innerHTML = `
    <!-- HERO SECTION -->
    <section class="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-900/25 via-background to-background pointer-events-none"></div>
      
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
        <!-- Pill Badge -->
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-medium mb-6">
          <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>
          AI Interview Intelligence & Traceable Learning Roadmaps
        </div>

        <h1 class="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
          Turn Every Interview Into Your <span class="gradient-text">Next Opportunity.</span>
        </h1>
        
        <p class="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Upload your interview recording to get AI-powered rubric feedback, technical gap analysis, speech pace metrics, and an actionable 7-day personalized study plan.
        </p>

        <!-- CTA Buttons -->
        <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button onclick="handleQuickDemo()" class="w-full sm:w-auto px-7 py-3.5 rounded-xl gradient-accent text-white font-semibold shadow-lg shadow-indigo-500/25 hover:opacity-95 transition flex items-center justify-center gap-2">
            <i data-lucide="sparkles" class="w-4 h-4"></i> Try Interactive Demo Report
          </button>
          <button onclick="navigateTo('auth', { mode: 'register' })" class="w-full sm:w-auto px-7 py-3.5 rounded-xl glass-card text-slate-200 font-semibold hover:bg-surface-elevated transition border border-surface-border flex items-center justify-center gap-2">
            <i data-lucide="upload" class="w-4 h-4"></i> Upload Your Recording
          </button>
        </div>

        <!-- Realistic Product Dashboard Preview -->
        <div class="mt-14 relative rounded-2xl p-2 sm:p-3 glass-card glass-glow border border-surface-border shadow-2xl max-w-5xl mx-auto text-left">
          <div class="bg-surface rounded-xl overflow-hidden border border-surface-border">
            <div class="h-9 bg-surface-subtle px-4 flex items-center justify-between border-b border-surface-border">
              <div class="flex items-center space-x-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-rose-500/70"></span>
                <span class="w-2.5 h-2.5 rounded-full bg-amber-500/70"></span>
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500/70"></span>
                <span class="ml-2 text-xs font-mono text-slate-400">InterviewLens AI / Senior AI Engineer Assessment</span>
              </div>
              <div class="flex items-center space-x-2">
                <span class="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Score: 82/100</span>
              </div>
            </div>

            <!-- Preview Card Body -->
            <div class="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- Col 1: Q&A Preview -->
              <div class="md:col-span-2 space-y-3">
                <div class="p-3.5 rounded-lg bg-surface-subtle border border-surface-border">
                  <div class="flex items-center justify-between text-xs text-indigo-400 font-mono mb-1.5">
                    <span>Q1 • Generative AI & RAG Architecture</span>
                    <span class="text-emerald-400 font-semibold">Rubric Score: 85%</span>
                  </div>
                  <p class="text-sm font-medium text-white mb-2">"How would you design a production RAG system?"</p>
                  <div class="text-xs text-slate-300 bg-background/60 p-2.5 rounded border border-surface-border">
                    <span class="text-slate-400">Candidate:</span> "...I would create embeddings of our documents, store them in a vector DB, and retrieve cosine matches..."
                  </div>
                  
                  <div class="mt-3 flex flex-wrap gap-2 text-[11px]">
                    <span class="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                      Missing: Hybrid Search (BM25)
                    </span>
                    <span class="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                      Missing: Recall@K & MRR
                    </span>
                    <span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      Strong: Vector Indexing Concept
                    </span>
                  </div>
                </div>

                <!-- Traceable Learning Link Preview -->
                <div class="p-3.5 rounded-lg bg-indigo-950/20 border border-indigo-500/30">
                  <div class="flex items-center gap-2 text-xs font-semibold text-indigo-300 mb-1">
                    <i data-lucide="git-merge" class="w-3.5 h-3.5 text-indigo-400"></i>
                    Interview-to-Learning Intelligence Trace
                  </div>
                  <p class="text-xs text-slate-300">
                    Omission detected in RAG Evaluation ➔ Recommended Study: <strong class="text-white">RAG Triad & NDCG</strong> ➔ Practice Task: <strong class="text-cyan-300">Explain Faithfulness Heuristics</strong>
                  </p>
                </div>
              </div>

              <!-- Col 2: Speech & Posture Preview -->
              <div class="space-y-3">
                <div class="p-3.5 rounded-lg bg-surface-subtle border border-surface-border">
                  <h4 class="text-xs font-semibold text-slate-300 mb-2.5 flex items-center gap-1.5">
                    <i data-lucide="activity" class="w-3.5 h-3.5 text-cyan-400"></i> Speech Metrics
                  </h4>
                  <div class="space-y-2 text-xs">
                    <div class="flex justify-between text-slate-400">
                      <span>Pacing:</span> <span class="font-mono text-white">142 WPM (Optimal)</span>
                    </div>
                    <div class="flex justify-between text-slate-400">
                      <span>Filler Words:</span> <span class="font-mono text-amber-400">8 tokens ("um", "like")</span>
                    </div>
                    <div class="flex justify-between text-slate-400">
                      <span>Pause Profile:</span> <span class="font-mono text-white">4 transitions</span>
                    </div>
                  </div>
                </div>

                <div class="p-3.5 rounded-lg bg-surface-subtle border border-surface-border">
                  <h4 class="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                    <i data-lucide="video" class="w-3.5 h-3.5 text-emerald-400"></i> Camera Engagement
                  </h4>
                  <p class="text-xs text-slate-300">
                    Maintained 74% direct lens engagement. Steady upper-torso posture with expressive hand gestures.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CORE WORKFLOW SECTION -->
    <section class="py-16 border-t border-surface-border bg-surface-subtle/50">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-12">
          <h2 class="text-xs font-mono uppercase text-indigo-400 tracking-wider">The Continuous Feedback Loop</h2>
          <p class="text-2xl sm:text-3xl font-bold text-white mt-2">How InterviewLens AI Accelerates Your Prep</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="p-5 rounded-xl glass-card border border-surface-border relative">
            <span class="text-3xl font-extrabold text-indigo-500/30 absolute top-4 right-4">01</span>
            <div class="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
              <i data-lucide="upload-cloud" class="w-5 h-5"></i>
            </div>
            <h3 class="text-base font-semibold text-white mb-2">Upload Recording</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              Drop your interview video or audio (MP4, WebM, MOV, WAV, MP3). Files are validated and processed privately.
            </p>
          </div>

          <div class="p-5 rounded-xl glass-card border border-surface-border relative">
            <span class="text-3xl font-extrabold text-indigo-500/30 absolute top-4 right-4">02</span>
            <div class="w-9 h-9 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
              <i data-lucide="split" class="w-5 h-5"></i>
            </div>
            <h3 class="text-base font-semibold text-white mb-2">Speech & Q&A Extraction</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              Timestamped speech transcription with speaker diarization identifies questions and extracts your exact answers.
            </p>
          </div>

          <div class="p-5 rounded-xl glass-card border border-surface-border relative">
            <span class="text-3xl font-extrabold text-indigo-500/30 absolute top-4 right-4">03</span>
            <div class="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
              <i data-lucide="award" class="w-5 h-5"></i>
            </div>
            <h3 class="text-base font-semibold text-white mb-2">Rubric-Grounded Scoring</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              Evaluates factual accuracy, technical completeness, missing concepts, delivery pace, and camera presence.
            </p>
          </div>

          <div class="p-5 rounded-xl glass-card border border-surface-border relative">
            <span class="text-3xl font-extrabold text-indigo-500/30 absolute top-4 right-4">04</span>
            <div class="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
              <i data-lucide="repeat" class="w-5 h-5"></i>
            </div>
            <h3 class="text-base font-semibold text-white mb-2">Practice & Measure</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              Generate targeted follow-ups, follow a 7-day study plan, re-record in Practice Studio, and verify gap closure.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- KEY DIFFERENTIATOR FEATURE HIGHLIGHT -->
    <section class="py-16 border-t border-surface-border">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="rounded-2xl p-8 sm:p-10 glass-card border border-indigo-500/30 relative overflow-hidden">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <span class="text-xs font-mono uppercase text-indigo-400 font-semibold tracking-wider">The Defining Advantage</span>
              <h3 class="text-2xl sm:text-3xl font-extrabold text-white mt-2 mb-4 leading-snug">
                Not Just a Scorecard. A Complete Interview-to-Learning Pipeline.
              </h3>
              <p class="text-sm text-slate-300 leading-relaxed mb-6">
                Most tools give you a superficial grade and leave you wondering how to fix it. InterviewLens AI preserves a direct, traceable thread from every missed concept to targeted study material and before-and-after practice recordings.
              </p>
              <div class="space-y-3 text-xs text-slate-300">
                <div class="flex items-center gap-2.5">
                  <span class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">✓</span>
                  <span>Every critique is linked to an exact timestamped transcript quote.</span>
                </div>
                <div class="flex items-center gap-2.5">
                  <span class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">✓</span>
                  <span>Personalized 7-day learning roadmaps based on real interview evidence.</span>
                </div>
                <div class="flex items-center gap-2.5">
                  <span class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">✓</span>
                  <span>Practice Studio compares your new responses against earlier gaps.</span>
                </div>
              </div>
            </div>

            <!-- Trace Visual Graph -->
            <div class="space-y-2.5 font-mono text-xs">
              <div class="p-3 rounded-lg bg-surface-subtle border border-surface-border flex items-center justify-between">
                <span class="text-slate-400">1. Interview Question:</span>
                <span class="text-indigo-300">Production RAG Architecture</span>
              </div>
              <div class="flex justify-center text-indigo-500">↓</div>
              <div class="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30 flex items-center justify-between">
                <span class="text-slate-400">2. Identified Issue:</span>
                <span class="text-rose-300">Omitted Recall@K & Hybrid Search</span>
              </div>
              <div class="flex justify-center text-indigo-500">↓</div>
              <div class="p-3 rounded-lg bg-surface-subtle border border-surface-border flex items-center justify-between">
                <span class="text-slate-400">3. Study Action:</span>
                <span class="text-cyan-300">RRF Fusion & Faithfulness Metrics</span>
              </div>
              <div class="flex justify-center text-indigo-500">↓</div>
              <div class="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between">
                <span class="text-slate-400">4. Practice Re-Record:</span>
                <span class="text-emerald-300 font-bold">+18 pts (Score: 92/100)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- PRICING TIERS PREVIEW -->
    <section class="py-16 border-t border-surface-border bg-surface-subtle/30">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-12">
          <h2 class="text-xs font-mono uppercase text-indigo-400 tracking-wider">Transparent Investment</h2>
          <p class="text-2xl sm:text-3xl font-bold text-white mt-2">Prepared for Every Stage of Your Career</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Free Tier -->
          <div class="p-6 rounded-2xl glass-card border border-surface-border">
            <h3 class="text-lg font-bold text-white">Starter</h3>
            <p class="text-xs text-slate-400 mt-1">Foundational interview evaluation</p>
            <div class="my-6">
              <span class="text-3xl font-extrabold text-white">$0</span>
              <span class="text-xs text-slate-400">/ forever</span>
            </div>
            <ul class="space-y-2.5 text-xs text-slate-300 mb-6">
              <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-emerald-400"></i> 2 Interview Analyses per month</li>
              <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-emerald-400"></i> Core Rubric Scoring & Transcript</li>
              <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-emerald-400"></i> Speech Pace & Filler Count</li>
              <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-emerald-400"></i> Standard Practice Questions</li>
            </ul>
            <button onclick="navigateTo('auth', { mode: 'register' })" class="w-full py-2.5 rounded-lg border border-surface-border text-xs font-semibold text-slate-200 hover:bg-surface-elevated transition">
              Get Started Free
            </button>
          </div>

          <!-- Pro Tier -->
          <div class="p-6 rounded-2xl glass-card border-2 border-indigo-500 relative shadow-xl shadow-indigo-500/10">
            <div class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full gradient-accent text-[10px] font-bold uppercase tracking-wider text-white">
              Most Popular
            </div>
            <h3 class="text-lg font-bold text-white">Pro Coach</h3>
            <p class="text-xs text-slate-400 mt-1">Accelerated mastery for active job seekers</p>
            <div class="my-6">
              <span class="text-3xl font-extrabold text-white">$24</span>
              <span class="text-xs text-slate-400">/ month</span>
            </div>
            <ul class="space-y-2.5 text-xs text-slate-300 mb-6">
              <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-emerald-400"></i> Unlimited Interview Analyses</li>
              <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-emerald-400"></i> Traceable Knowledge Gap Detection</li>
              <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-emerald-400"></i> 7-Day Personalized Study Roadmaps</li>
              <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-emerald-400"></i> Practice Studio Before-and-After Metrics</li>
              <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-emerald-400"></i> Exportable Executive PDF Reports</li>
            </ul>
            <button onclick="navigateTo('auth', { mode: 'register' })" class="w-full py-2.5 rounded-lg gradient-accent text-xs font-semibold text-white shadow-md hover:opacity-95 transition">
              Start 14-Day Trial
            </button>
          </div>

          <!-- Team / Education Tier -->
          <div class="p-6 rounded-2xl glass-card border border-surface-border">
            <h3 class="text-lg font-bold text-white">Team & University</h3>
            <p class="text-xs text-slate-400 mt-1">Bootcamps, universities & cohort coaching</p>
            <div class="my-6">
              <span class="text-3xl font-extrabold text-white">$89</span>
              <span class="text-xs text-slate-400">/ seat / month</span>
            </div>
            <ul class="space-y-2.5 text-xs text-slate-300 mb-6">
              <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-emerald-400"></i> Multi-Seat Organization Dashboard</li>
              <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-emerald-400"></i> Cohort Skill Gap Aggregate Analytics</li>
              <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-emerald-400"></i> Custom Rubrics per Hiring Partner</li>
              <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-emerald-400"></i> Enterprise SSO & Dedicated Retention</li>
            </ul>
            <button onclick="showToast('Contact enterprise sales at sales@interviewlens.ai', 'info')" class="w-full py-2.5 rounded-lg border border-surface-border text-xs font-semibold text-slate-200 hover:bg-surface-elevated transition">
              Contact Sales
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="py-10 border-t border-surface-border text-center text-xs text-slate-500">
      <div class="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center space-x-2">
          <div class="w-6 h-6 rounded-lg gradient-accent flex items-center justify-center">
            <i data-lucide="scan-face" class="w-3.5 h-3.5 text-white"></i>
          </div>
          <span class="font-bold text-slate-300">InterviewLens AI</span>
          <span>© 2026. Every interview makes you better.</span>
        </div>
        <div class="flex space-x-6 text-slate-400">
          <a href="#" onclick="navigateTo('settings'); return false;" class="hover:text-white transition">Privacy & Data Retention</a>
          <a href="/docs" target="_blank" class="hover:text-white transition">API Docs</a>
          <a href="#" onclick="handleQuickDemo(); return false;" class="hover:text-cyan-400 transition">Instant Demo</a>
        </div>
      </div>
    </footer>
  `;
}

// -------------------------------------------------------------
// 2. AUTHENTICATION PAGES (LOGIN / REGISTER)
// -------------------------------------------------------------
function renderAuth(container, initialMode = 'login') {
  container.innerHTML = `
    <div class="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-md p-8 rounded-2xl glass-card border border-surface-border shadow-2xl relative">
        <div class="text-center mb-6">
          <div class="w-12 h-12 rounded-2xl gradient-accent flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/20">
            <i data-lucide="scan-face" class="w-6 h-6 text-white"></i>
          </div>
          <h2 class="text-2xl font-bold text-white" id="auth-title">Welcome Back</h2>
          <p class="text-xs text-slate-400 mt-1" id="auth-subtitle">Sign in to review your interview intelligence reports</p>
        </div>

        <!-- Mode Toggle Tabs -->
        <div class="flex rounded-lg bg-surface-subtle p-1 mb-6 border border-surface-border">
          <button id="tab-login" onclick="toggleAuthMode('login')" class="flex-1 py-1.5 text-xs font-semibold rounded-md transition ${initialMode === 'login' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}">
            Sign In
          </button>
          <button id="tab-register" onclick="toggleAuthMode('register')" class="flex-1 py-1.5 text-xs font-semibold rounded-md transition ${initialMode === 'register' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}">
            Create Account
          </button>
        </div>

        <form id="auth-form" onsubmit="handleAuthSubmit(event)" class="space-y-4">
          <div id="field-fullname" class="${initialMode === 'register' ? 'block' : 'hidden'}">
            <label class="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
            <input type="text" id="auth-name" placeholder="e.g. Alex Mercer" class="w-full px-3.5 py-2.5 rounded-lg bg-surface-subtle border border-surface-border text-sm text-white focus:outline-none focus:border-indigo-500">
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
            <input type="email" id="auth-email" required placeholder="alex@company.com" class="w-full px-3.5 py-2.5 rounded-lg bg-surface-subtle border border-surface-border text-sm text-white focus:outline-none focus:border-indigo-500">
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Password</label>
            <input type="password" id="auth-password" required minlength="6" placeholder="••••••••" class="w-full px-3.5 py-2.5 rounded-lg bg-surface-subtle border border-surface-border text-sm text-white focus:outline-none focus:border-indigo-500">
          </div>

          <button type="submit" id="auth-submit-btn" class="w-full py-2.5 rounded-lg gradient-accent text-sm font-semibold text-white shadow-md shadow-indigo-500/20 hover:opacity-95 transition">
            ${initialMode === 'login' ? 'Sign In' : 'Create Free Account'}
          </button>
        </form>

        <div class="mt-6 pt-5 border-t border-surface-border text-center">
          <p class="text-xs text-slate-400 mb-3">Want to explore without registering?</p>
          <button onclick="handleQuickDemo()" class="w-full py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono font-medium text-cyan-300 hover:bg-cyan-500/20 transition flex items-center justify-center gap-2">
            <i data-lucide="zap" class="w-3.5 h-3.5"></i> One-Click Instant Demo Login
          </button>
        </div>
      </div>
    </div>
  `;
}

function toggleAuthMode(mode) {
  const isReg = mode === 'register';
  document.getElementById('auth-title').innerText = isReg ? 'Create Your Account' : 'Welcome Back';
  document.getElementById('auth-subtitle').innerText = isReg ? 'Start your personalized interview improvement journey' : 'Sign in to review your interview intelligence reports';
  document.getElementById('field-fullname').className = isReg ? 'block' : 'hidden';
  document.getElementById('auth-submit-btn').innerText = isReg ? 'Create Free Account' : 'Sign In';

  const tabLogin = document.getElementById('tab-login');
  const tabReg = document.getElementById('tab-register');
  tabLogin.className = `flex-1 py-1.5 text-xs font-semibold rounded-md transition ${!isReg ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`;
  tabReg.className = `flex-1 py-1.5 text-xs font-semibold rounded-md transition ${isReg ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`;
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const isReg = !document.getElementById('field-fullname').classList.contains('hidden');
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  const fullName = document.getElementById('auth-name')?.value || 'Candidate';

  const endpoint = isReg ? `${API_BASE}/auth/register` : `${API_BASE}/auth/login`;
  const body = isReg ? { email, password, full_name: fullName } : { email, password };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Authentication failed');

    state.token = data.access_token;
    state.user = data.user;
    localStorage.setItem('interviewlens_token', state.token);
    showToast(isReg ? 'Account created successfully!' : 'Signed in successfully', 'success');
    updateNavbar();
    navigateTo('dashboard');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -------------------------------------------------------------
// 3. USER DASHBOARD
// -------------------------------------------------------------
async function renderDashboard(container) {
  container.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <!-- Welcome Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-white">Candidate Workspace</h1>
          <p class="text-xs sm:text-sm text-slate-400 mt-1">
            Target Role: <strong class="text-indigo-400">${state.user.profile?.target_role || 'AI/ML Engineer'}</strong> • Track your technical evolution across interview sessions.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button onclick="handleQuickDemo()" class="px-3.5 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 transition flex items-center gap-1.5">
            <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Seed Demo Data
          </button>
          <button onclick="navigateTo('upload')" class="px-4 py-2 rounded-lg gradient-accent text-xs font-semibold text-white shadow-md shadow-indigo-500/20 hover:opacity-95 transition flex items-center gap-1.5">
            <i data-lucide="upload" class="w-4 h-4"></i> Upload New Recording
          </button>
        </div>
      </div>

      <!-- Top Metric Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4" id="dashboard-metrics">
        <div class="p-4 rounded-xl glass-card border border-surface-border">
          <span class="text-xs text-slate-400">Total Analyzed</span>
          <div class="text-2xl font-bold text-white mt-1" id="metric-total-count">-</div>
          <span class="text-[11px] text-indigo-400">Interviews recorded</span>
        </div>
        <div class="p-4 rounded-xl glass-card border border-surface-border">
          <span class="text-xs text-slate-400">Average Technical Score</span>
          <div class="text-2xl font-bold text-emerald-400 mt-1" id="metric-avg-score">-</div>
          <span class="text-[11px] text-slate-400">Rubric-evaluated</span>
        </div>
        <div class="p-4 rounded-xl glass-card border border-surface-border">
          <span class="text-xs text-slate-400">Open Knowledge Gaps</span>
          <div class="text-2xl font-bold text-amber-400 mt-1" id="metric-gaps-count">-</div>
          <span class="text-[11px] text-slate-400">Prioritized for study</span>
        </div>
        <div class="p-4 rounded-xl glass-card border border-surface-border">
          <span class="text-xs text-slate-400">Roadmap Tasks Completed</span>
          <div class="text-2xl font-bold text-cyan-400 mt-1" id="metric-tasks-completed">-</div>
          <span class="text-[11px] text-slate-400">Action items verified</span>
        </div>
      </div>

      <!-- Main Dashboard Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Col 1 & 2: Recent Interviews & Progress -->
        <div class="lg:col-span-2 space-y-6">
          <div class="p-6 rounded-2xl glass-card border border-surface-border">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-base font-bold text-white flex items-center gap-2">
                <i data-lucide="history" class="w-4 h-4 text-indigo-400"></i> Recent Interview Analyses
              </h3>
              <button onclick="navigateTo('history')" class="text-xs text-indigo-400 hover:text-indigo-300 font-medium">View all</button>
            </div>
            <div id="recent-interviews-list" class="space-y-3">
              <div class="text-center py-8 text-xs text-slate-500">Loading your interviews...</div>
            </div>
          </div>

          <!-- Traceable Feedback Highlight -->
          <div class="p-6 rounded-2xl bg-indigo-950/25 border border-indigo-500/30 relative">
            <h3 class="text-sm font-bold text-indigo-200 flex items-center gap-2 mb-2">
              <i data-lucide="sparkles" class="w-4 h-4 text-indigo-400"></i> Continuous Coaching Feedback Loop
            </h3>
            <p class="text-xs text-slate-300 leading-relaxed mb-4">
              Your recent analysis identified a key knowledge gap in <strong class="text-white">Production RAG Evaluation (MRR & Recall@K)</strong>. Review your custom roadmap or practice a follow-up answer in Practice Studio.
            </p>
            <div class="flex flex-wrap gap-3">
              <button onclick="navigateTo('learning')" class="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition">
                Open 7-Day Roadmap
              </button>
              <button onclick="navigateTo('practice')" class="px-3.5 py-1.5 rounded-lg bg-surface-elevated text-slate-200 text-xs font-semibold hover:bg-surface-subtle border border-surface-border transition">
                Record Practice Answer
              </button>
            </div>
          </div>
        </div>

        <!-- Col 3: Weak Areas & Today's Study Task -->
        <div class="space-y-6">
          <!-- Critical Weak Areas Card -->
          <div class="p-5 rounded-2xl glass-card border border-surface-border">
            <h3 class="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-400"></i> High-Priority Knowledge Gaps
            </h3>
            <div id="weak-areas-list" class="space-y-2.5">
              <div class="text-xs text-slate-500">Loading gap analysis...</div>
            </div>
          </div>

          <!-- Quick Study Card -->
          <div class="p-5 rounded-2xl glass-card border border-surface-border">
            <h3 class="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <i data-lucide="calendar" class="w-4 h-4 text-cyan-400"></i> Today's Study Action
            </h3>
            <div class="p-3 rounded-lg bg-surface-subtle border border-surface-border">
              <span class="text-[10px] font-mono text-cyan-400 uppercase">Day 1 • 45 Mins</span>
              <p class="text-xs font-semibold text-white mt-1">Study Retrieval Metrics: Recall@K & MRR</p>
              <p class="text-[11px] text-slate-400 mt-1">Understand the RAG Triad and how to benchmark precision on enterprise docs.</p>
              <button onclick="navigateTo('learning')" class="mt-3 text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
                View Task Details <i data-lucide="arrow-right" class="w-3 h-3"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Fetch dashboard data
  loadDashboardData();
}

async function loadDashboardData() {
  try {
    const res = await fetch(`${API_BASE}/interviews`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (!res.ok) throw new Error('Failed to load interviews');
    const interviews = await res.json();
    state.recentInterviews = interviews;

    document.getElementById('metric-total-count').innerText = interviews.length;
    document.getElementById('metric-avg-score').innerText = interviews.length > 0 ? '82%' : 'N/A';
    
    // Fetch knowledge gaps
    const gapsRes = await fetch(`${API_BASE}/knowledge-gaps`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const gaps = gapsRes.ok ? await gapsRes.json() : [];
    document.getElementById('metric-gaps-count').innerText = gaps.length;

    // Fetch learning plans
    const plansRes = await fetch(`${API_BASE}/learning-plans`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const plans = plansRes.ok ? await plansRes.json() : [];
    let completedTasks = 0;
    if (plans.length > 0 && plans[0].tasks) {
      completedTasks = plans[0].tasks.filter(t => t.is_completed).length;
    }
    document.getElementById('metric-tasks-completed').innerText = completedTasks;

    // Render Interviews
    const listContainer = document.getElementById('recent-interviews-list');
    if (interviews.length === 0) {
      listContainer.innerHTML = `
        <div class="text-center py-8">
          <p class="text-xs text-slate-400">No interview recordings uploaded yet.</p>
          <button onclick="handleQuickDemo()" class="mt-3 text-xs text-cyan-400 hover:underline">
            Click here to load a sample interview report instantly
          </button>
        </div>
      `;
    } else {
      listContainer.innerHTML = interviews.slice(0, 4).map(inv => `
        <div class="p-3.5 rounded-xl bg-surface-subtle border border-surface-border flex items-center justify-between hover:border-slate-700 transition">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold text-white">${inv.title}</span>
              <span class="text-[10px] px-2 py-0.5 rounded font-mono ${
                inv.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                inv.status === 'failed' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' :
                'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 animate-pulse'
              }">${inv.status.toUpperCase()}</span>
            </div>
            <div class="text-xs text-slate-400 flex items-center gap-3">
              <span>Role: <strong class="text-slate-300">${inv.target_role}</strong></span>
              <span>${inv.interview_date || 'Recent'}</span>
              ${inv.duration_seconds > 0 ? `<span>Duration: ${Math.round(inv.duration_seconds)}s</span>` : ''}
            </div>
          </div>
          <div class="flex items-center gap-2">
            ${inv.status === 'completed' ? `
              <button onclick="openReport('${inv.id}')" class="px-3 py-1.5 rounded-lg bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600 hover:text-white text-xs font-semibold transition flex items-center gap-1">
                View Report <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
              </button>
            ` : `
              <button onclick="navigateTo('processing', { interviewId: '${inv.id}' })" class="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-semibold transition">
                Processing...
              </button>
            `}
          </div>
        </div>
      `).join('');
    }

    // Render Weak Areas
    const weakContainer = document.getElementById('weak-areas-list');
    if (gaps.length === 0) {
      weakContainer.innerHTML = `<div class="text-xs text-slate-400">Complete an interview analysis to populate your weak technical areas.</div>`;
    } else {
      weakContainer.innerHTML = gaps.slice(0, 3).map(g => `
        <div class="p-2.5 rounded-lg bg-surface-subtle border border-surface-border text-xs">
          <div class="flex items-center justify-between mb-1">
            <span class="font-semibold text-white">${g.topic_name}</span>
            <span class="text-[10px] font-mono px-1.5 py-0.2 rounded ${g.priority === 'HIGH' ? 'bg-rose-500/15 text-rose-300' : 'bg-amber-500/15 text-amber-300'}">${g.priority}</span>
          </div>
          <p class="text-[11px] text-slate-400 line-clamp-2">${g.explanation}</p>
        </div>
      `).join('');
    }

    if (window.lucide) lucide.createIcons();
  } catch (e) {
    console.error(e);
  }
}

function openReport(interviewId) {
  state.currentInterviewId = interviewId;
  navigateTo('report', { interviewId });
}

// -------------------------------------------------------------
// 4. UPLOAD INTERVIEW PAGE & WIZARD
// -------------------------------------------------------------
function renderUpload(container) {
  container.innerHTML = `
    <div class="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div class="mb-8">
        <h1 class="text-2xl sm:text-3xl font-extrabold text-white">Upload Interview Recording</h1>
        <p class="text-xs sm:text-sm text-slate-400 mt-1">
          Supported formats: MP4, WebM, MOV, WAV, MP3, M4A. Up to 45 minutes recording length.
        </p>
      </div>

      <div class="p-6 sm:p-8 rounded-2xl glass-card border border-surface-border shadow-2xl space-y-6">
        <!-- Drag and Drop Zone -->
        <div id="drop-zone" onclick="document.getElementById('file-input').click()" class="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-8 text-center cursor-pointer bg-surface-subtle/50 transition">
          <input type="file" id="file-input" class="hidden" accept=".mp4,.webm,.mov,.mp3,.wav,.m4a" onchange="handleFileSelect(event)">
          <div class="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center mx-auto mb-3">
            <i data-lucide="upload-cloud" class="w-6 h-6"></i>
          </div>
          <p class="text-sm font-semibold text-white" id="file-label">Click or drag & drop interview recording</p>
          <p class="text-xs text-slate-400 mt-1">Video (MP4, WebM, MOV) or Audio (MP3, WAV, M4A)</p>
          <div id="selected-file-badge" class="hidden mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs">
            <i data-lucide="file-check" class="w-3.5 h-3.5"></i> <span id="selected-file-name">filename.mp4</span>
          </div>
        </div>

        <!-- Metadata Form -->
        <form id="upload-form" onsubmit="handleUploadSubmit(event)" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Interview Title *</label>
              <input type="text" id="up-title" required value="Technical Screen: System Architecture & RAG" class="w-full px-3.5 py-2.5 rounded-lg bg-surface-subtle border border-surface-border text-sm text-white focus:outline-none focus:border-indigo-500">
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Target Job Role *</label>
              <select id="up-role" class="w-full px-3.5 py-2.5 rounded-lg bg-surface-subtle border border-surface-border text-sm text-white focus:outline-none focus:border-indigo-500">
                <option value="Senior AI/ML Engineer">Senior AI/ML Engineer</option>
                <option value="Machine Learning Engineer">Machine Learning Engineer</option>
                <option value="Software Engineer">Software Engineer (Backend/Distributed)</option>
                <option value="Data Scientist">Data Scientist</option>
                <option value="Generative AI Engineer">Generative AI Engineer</option>
                <option value="General Technical Interview">General Technical Interview</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Target Company (Optional)</label>
              <input type="text" id="up-company" placeholder="e.g. OpenAI, Stripe, Google" class="w-full px-3.5 py-2.5 rounded-lg bg-surface-subtle border border-surface-border text-sm text-white focus:outline-none focus:border-indigo-500">
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Experience Level *</label>
              <select id="up-level" class="w-full px-3.5 py-2.5 rounded-lg bg-surface-subtle border border-surface-border text-sm text-white focus:outline-none focus:border-indigo-500">
                <option value="senior">Senior (5+ yrs)</option>
                <option value="mid">Mid-level (2-5 yrs)</option>
                <option value="entry">Entry-level (0-2 yrs)</option>
                <option value="lead">Staff / Lead</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Job Description or Focus Areas (Optional)</label>
            <textarea id="up-desc" rows="3" placeholder="Paste the job description or key topics to align the rubric evaluation..." class="w-full px-3.5 py-2.5 rounded-lg bg-surface-subtle border border-surface-border text-sm text-white focus:outline-none focus:border-indigo-500"></textarea>
          </div>

          <!-- Consent Acknowledgment -->
          <div class="p-3.5 rounded-lg bg-surface-subtle border border-surface-border flex items-start gap-3">
            <input type="checkbox" id="up-consent" required checked class="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500">
            <label for="up-consent" class="text-xs text-slate-300">
              I confirm that I have permission and authority to upload and analyze this recording for my own personalized coaching and education.
            </label>
          </div>

          <div class="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button type="submit" id="btn-start-upload" class="w-full sm:flex-1 py-3 rounded-lg gradient-accent text-sm font-semibold text-white shadow-md shadow-indigo-500/20 hover:opacity-95 transition flex items-center justify-center gap-2">
              <i data-lucide="play" class="w-4 h-4"></i> Start AI Analysis Pipeline
            </button>
            <button type="button" onclick="handleQuickDemo()" class="w-full sm:w-auto px-5 py-3 rounded-lg bg-surface-elevated border border-surface-border text-xs font-semibold text-cyan-300 hover:bg-surface-subtle transition flex items-center justify-center gap-1.5">
              <i data-lucide="sparkles" class="w-3.5 h-3.5"></i> Use Instant Demo Recording
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Setup drag & drop
  const dropZone = document.getElementById('drop-zone');
  ['dragenter', 'dragover'].forEach(name => {
    dropZone.addEventListener(name, (e) => { e.preventDefault(); dropZone.classList.add('border-indigo-500'); });
  });
  ['dragleave', 'drop'].forEach(name => {
    dropZone.addEventListener(name, (e) => { e.preventDefault(); dropZone.classList.remove('border-indigo-500'); });
  });
  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length) {
      document.getElementById('file-input').files = files;
      handleFileSelect({ target: { files } });
    }
  });
}

let selectedFile = null;

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  selectedFile = file;

  document.getElementById('selected-file-badge').classList.remove('hidden');
  document.getElementById('selected-file-name').innerText = `${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`;
  document.getElementById('file-label').innerText = 'Recording selected';
  if (window.lucide) lucide.createIcons();
}

async function handleUploadSubmit(e) {
  e.preventDefault();
  const consent = document.getElementById('up-consent').checked;
  if (!consent) {
    showToast('Consent acknowledgment is required', 'warning');
    return;
  }

  const title = document.getElementById('up-title').value;
  const role = document.getElementById('up-role').value;
  const company = document.getElementById('up-company').value;
  const level = document.getElementById('up-level').value;
  const desc = document.getElementById('up-desc').value;

  try {
    showToast('Creating interview workspace...', 'info');
    
    // 1. Create Interview
    const createRes = await fetch(`${API_BASE}/interviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({
        title,
        target_role: role,
        company_name: company,
        experience_level: level,
        job_description: desc,
        consent_given: true
      })
    });
    if (!createRes.ok) throw new Error('Failed to create interview record');
    const interview = await createRes.json();
    state.currentInterviewId = interview.id;

    // 2. Upload recording file if selected, or trigger simulation analysis
    if (selectedFile) {
      showToast('Uploading recording stream...', 'info');
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadRes = await fetch(`${API_BASE}/interviews/${interview.id}/upload-direct`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${state.token}` },
        body: formData
      });
      if (!uploadRes.ok) throw new Error('Failed to upload file');
    } else {
      // Direct pipeline dispatch with standard interview sample
      await fetch(`${API_BASE}/interviews/${interview.id}/analyze`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
    }

    showToast('Analysis pipeline started!', 'success');
    navigateTo('processing', { interviewId: interview.id });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -------------------------------------------------------------
// 5. LIVE PROCESSING STATUS VIEW
// -------------------------------------------------------------
function renderProcessing(container, interviewId) {
  container.innerHTML = `
    <div class="max-w-2xl mx-auto px-4 py-16 text-center">
      <div class="p-8 rounded-2xl glass-card border border-surface-border shadow-2xl relative">
        <div class="w-16 h-16 rounded-full gradient-accent flex items-center justify-center mx-auto mb-6 pulse-glow">
          <i data-lucide="cpu" class="w-8 h-8 text-white animate-spin"></i>
        </div>

        <h2 class="text-2xl font-bold text-white mb-2">Analyzing Interview Recording</h2>
        <p class="text-xs text-slate-400 mb-6" id="proc-stage-label">Initializing audio extraction & speech-to-text...</p>

        <!-- Progress Bar -->
        <div class="w-full bg-surface-subtle h-3 rounded-full overflow-hidden border border-surface-border mb-6">
          <div id="proc-progress-bar" class="h-full gradient-accent transition-all duration-500 rounded-full" style="width: 10%"></div>
        </div>

        <!-- 10 Real Pipeline Stages Checklist -->
        <div class="text-left space-y-2.5 max-w-md mx-auto text-xs" id="proc-stages-list">
          <!-- Populated dynamically -->
        </div>
      </div>
    </div>
  `;

  startStatusPolling(interviewId);
}

const PIPELINE_DISPLAY_STAGES = [
  "Validating recording format & integrity",
  "Extracting audio streams via FFmpeg",
  "Speech-to-text transcription",
  "Speaker diarization & role assignment",
  "Question-answer boundary detection",
  "Rubric-based technical evaluation",
  "Speech pace & filler word calculation",
  "Personalized knowledge gap detection",
  "Personalized 7-day study roadmap generation",
  "Executive report synthesis"
];

function startStatusPolling(interviewId) {
  if (state.pollTimer) clearInterval(state.pollTimer);

  const poll = async () => {
    try {
      const res = await fetch(`${API_BASE}/interviews/${interviewId}/analysis-status`, {
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      if (!res.ok) return;
      const statusData = await res.json();

      const pBar = document.getElementById('proc-progress-bar');
      const stageLabel = document.getElementById('proc-stage-label');
      const stagesList = document.getElementById('proc-stages-list');

      if (pBar) pBar.style.width = `${Math.max(10, statusData.progress_percent)}%`;
      if (stageLabel) stageLabel.innerText = `${statusData.current_stage} (${statusData.progress_percent}%)`;

      if (stagesList) {
        const activeIdx = statusData.stage_index || 0;
        stagesList.innerHTML = PIPELINE_DISPLAY_STAGES.map((s, idx) => {
          const isDone = idx < activeIdx || statusData.status === 'COMPLETED';
          const isCurrent = idx === activeIdx && statusData.status !== 'COMPLETED';
          return `
            <div class="flex items-center gap-2.5 ${isDone ? 'text-emerald-400' : isCurrent ? 'text-indigo-300 font-semibold' : 'text-slate-600'}">
              <span class="w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                isDone ? 'bg-emerald-500/20 text-emerald-400 font-bold' :
                isCurrent ? 'bg-indigo-500/20 text-indigo-400 animate-pulse' :
                'bg-surface-elevated text-slate-600'
              }">
                ${isDone ? '✓' : isCurrent ? '●' : '○'}
              </span>
              <span>${s}</span>
            </div>
          `;
        }).join('');
      }

      if (statusData.status === 'COMPLETED') {
        clearInterval(state.pollTimer);
        showToast('Analysis completed successfully!', 'success');
        setTimeout(() => {
          navigateTo('report', { interviewId });
        }, 800);
      } else if (statusData.status === 'FAILED') {
        clearInterval(state.pollTimer);
        showToast(statusData.error_message || 'Processing failed', 'error');
      }
    } catch (e) {
      console.warn("Poll status error:", e);
    }
  };

  poll();
  state.pollTimer = setInterval(poll, 1200);
}

// -------------------------------------------------------------
// 6. INTERVIEW ANALYSIS REPORT WORKSPACE (CORE EXPERIENCE)
// -------------------------------------------------------------
async function renderReport(container, interviewId) {
  container.innerHTML = `
    <div class="text-center py-24 text-slate-400">
      <i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto text-indigo-400 mb-3"></i>
      <p class="text-sm">Synthesizing full interview report workspace...</p>
    </div>
  `;

  try {
    const res = await fetch(`${API_BASE}/interviews/${interviewId}/report`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (!res.ok) throw new Error('Report is still generating or not found');
    const report = await res.json();
    state.reportData = report;

    // Fetch full transcript for synchronized player
    const transRes = await fetch(`${API_BASE}/interviews/${interviewId}/transcript`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const transcriptData = transRes.ok ? await transRes.json() : null;

    container.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <!-- Report Header Bar -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl glass-card border border-surface-border">
          <div>
            <div class="flex items-center gap-2.5">
              <button onclick="navigateTo('dashboard')" class="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i> Dashboard
              </button>
              <span class="text-slate-600">/</span>
              <span class="text-xs font-mono text-indigo-400 uppercase tracking-wide">Analysis Report</span>
            </div>
            <h1 class="text-xl sm:text-2xl font-extrabold text-white mt-1">${report.interview.title}</h1>
            <p class="text-xs text-slate-400">
              Role: <strong class="text-slate-300">${report.interview.target_role}</strong> • Company: ${report.interview.company_name || 'N/A'} • Evaluated on ${report.interview.interview_date || 'Today'}
            </p>
          </div>

          <!-- Overall Score Badge & Exports -->
          <div class="flex items-center gap-3">
            <div class="px-3.5 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center gap-2">
              <span class="text-xs text-indigo-300">Coaching Score:</span>
              <span class="text-lg font-bold text-white">${report.overall_performance_score}/100</span>
            </div>
            <button onclick="downloadPdfReport('${report.interview.id}')" class="px-3.5 py-2 rounded-lg bg-surface-elevated hover:bg-surface-subtle text-slate-200 border border-surface-border text-xs font-semibold transition flex items-center gap-1.5">
              <i data-lucide="file-down" class="w-4 h-4 text-rose-400"></i> Export PDF
            </button>
            <button onclick="downloadJsonReport('${report.interview.id}')" class="px-3 py-2 rounded-lg bg-surface-elevated hover:bg-surface-subtle text-slate-300 border border-surface-border text-xs font-medium transition" title="Export JSON">
              <i data-lucide="code" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <!-- SPLIT-VIEW WORKSPACE: Left = Interactive Player, Right = Analytics Tabs -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          <!-- LEFT: VIDEO / AUDIO PLAYER & SYNCHRONIZED TRANSCRIPT (5 Cols) -->
          <div class="lg:col-span-5 space-y-4">
            <div class="rounded-2xl glass-card border border-surface-border overflow-hidden shadow-xl">
              <!-- Simulated Video / Waveform Canvas -->
              <div class="h-56 bg-surface-subtle relative flex flex-col justify-between p-4 border-b border-surface-border">
                <div class="flex items-center justify-between text-xs text-slate-400">
                  <span class="flex items-center gap-1.5 font-mono">
                    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    ${report.interview.is_video ? 'Video Playback Stream' : 'Audio Stream'}
                  </span>
                  <span class="font-mono text-white" id="timecode-display">00:00 / 02:25</span>
                </div>

                <!-- Center Graphic Avatar / Video Mock -->
                <div class="text-center my-auto">
                  <div class="w-16 h-16 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center mx-auto mb-2 text-indigo-300">
                    <i data-lucide="${report.interview.is_video ? 'video' : 'volume-2'}" class="w-8 h-8"></i>
                  </div>
                  <p class="text-xs font-medium text-slate-300">Candidate Audio & Video Timeline</p>
                </div>

                <!-- Scrubber Progress Bar -->
                <div class="space-y-1">
                  <div class="h-1.5 bg-slate-800 rounded-full cursor-pointer relative" onclick="handleScrubberClick(event)">
                    <div id="scrubber-fill" class="h-full gradient-accent rounded-full" style="width: 0%"></div>
                  </div>
                  <div class="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>0:00</span>
                    <span id="player-status-tag">Synchronized with transcript</span>
                    <span>2:25</span>
                  </div>
                </div>
              </div>

              <!-- Media Controls Bar -->
              <div class="p-3 bg-surface flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <button id="btn-play-pause" onclick="togglePlayback()" class="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition">
                    <i data-lucide="play" class="w-4 h-4" id="play-icon"></i>
                  </button>
                  <button onclick="skipMedia(-5)" class="p-1.5 rounded text-slate-400 hover:text-white transition" title="Rewind 5s">
                    <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
                  </button>
                  <button onclick="skipMedia(5)" class="p-1.5 rounded text-slate-400 hover:text-white transition" title="Forward 5s">
                    <i data-lucide="rotate-cw" class="w-3.5 h-3.5"></i>
                  </button>
                </div>

                <!-- Question Timeline Pills -->
                <div class="flex items-center space-x-1.5 overflow-x-auto text-[11px] font-mono">
                  ${report.questions.map((q, idx) => `
                    <button onclick="jumpToQuestion(${idx}, ${q.start_time})" class="px-2 py-0.5 rounded bg-surface-subtle hover:bg-indigo-600/30 border border-surface-border text-slate-300 transition">
                      Q${q.question_index}
                    </button>
                  `).join('')}
                </div>
              </div>
            </div>

            <!-- Synchronized Transcript Excerpts Box -->
            <div class="rounded-2xl glass-card border border-surface-border p-4 max-h-[380px] overflow-y-auto space-y-2.5" id="transcript-scroll-box">
              <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <i data-lucide="file-text" class="w-3.5 h-3.5 text-indigo-400"></i> Synchronized Transcript Segments
              </h4>
              ${(transcriptData?.segments || []).map(seg => `
                <div id="segment-${Math.round(seg.start_time)}" onclick="seekTo(${seg.start_time})" class="p-2.5 rounded-lg border border-surface-border text-xs cursor-pointer hover:border-indigo-500/50 transition ${seg.speaker_tag === 'Speaker 1' ? 'bg-surface-subtle/70 text-slate-300' : 'bg-background/50 text-indigo-200'}">
                  <div class="flex items-center justify-between font-mono text-[10px] text-slate-400 mb-1">
                    <span class="font-bold ${seg.speaker_tag === 'Speaker 1' ? 'text-cyan-400' : 'text-indigo-400'}">${seg.speaker_tag === 'Speaker 1' ? 'Interviewer' : 'Candidate'}</span>
                    <span>${formatTime(seg.start_time)} - ${formatTime(seg.end_time)}</span>
                  </div>
                  <p class="leading-relaxed">${seg.text}</p>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- RIGHT: ANALYTICS WORKSPACE TABS (7 Cols) -->
          <div class="lg:col-span-7 space-y-4">
            <!-- Tabs Navigation -->
            <div class="flex rounded-xl bg-surface-subtle p-1 border border-surface-border overflow-x-auto">
              <button onclick="setReportTab('questions')" id="tab-btn-questions" class="flex-1 min-w-[120px] py-2 text-xs font-semibold rounded-lg transition ${state.activeReportTab === 'questions' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}">
                Question Review
              </button>
              <button onclick="setReportTab('traceable_gaps')" id="tab-btn-traceable_gaps" class="flex-1 min-w-[130px] py-2 text-xs font-semibold rounded-lg transition ${state.activeReportTab === 'traceable_gaps' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}">
                Traceable Gaps
              </button>
              <button onclick="setReportTab('communication')" id="tab-btn-communication" class="flex-1 min-w-[130px] py-2 text-xs font-semibold rounded-lg transition ${state.activeReportTab === 'communication' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}">
                Speech Pace
              </button>
              <button onclick="setReportTab('visual')" id="tab-btn-visual" class="flex-1 min-w-[120px] py-2 text-xs font-semibold rounded-lg transition ${state.activeReportTab === 'visual' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}">
                Camera Posture
              </button>
              <button onclick="setReportTab('transcript')" id="tab-btn-transcript" class="flex-1 min-w-[120px] py-2 text-xs font-semibold rounded-lg transition ${state.activeReportTab === 'transcript' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}">
                Speaker Assignment
              </button>
            </div>

            <!-- Tab Content Pane -->
            <div id="report-tab-content">
              <!-- Dynamically populated based on active tab -->
            </div>
          </div>
        </div>
      </div>
    `;

    // Render active tab view
    renderActiveReportTab();

  } catch (err) {
    container.innerHTML = `
      <div class="max-w-md mx-auto my-20 p-8 rounded-2xl glass-card border border-rose-500/30 text-center">
        <i data-lucide="alert-circle" class="w-10 h-10 text-rose-400 mx-auto mb-3"></i>
        <h3 class="text-base font-bold text-white">Report Not Found</h3>
        <p class="text-xs text-slate-400 mt-1 mb-4">${err.message}</p>
        <button onclick="navigateTo('dashboard')" class="px-4 py-2 rounded-lg bg-surface-elevated text-xs font-semibold text-white">Back to Dashboard</button>
      </div>
    `;
  }
}

function setReportTab(tabKey) {
  state.activeReportTab = tabKey;
  ['questions', 'traceable_gaps', 'communication', 'visual', 'transcript'].forEach(key => {
    const btn = document.getElementById(`tab-btn-${key}`);
    if (btn) {
      btn.className = `flex-1 min-w-[120px] py-2 text-xs font-semibold rounded-lg transition ${state.activeReportTab === key ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`;
    }
  });
  renderActiveReportTab();
}

function renderActiveReportTab() {
  const content = document.getElementById('report-tab-content');
  if (!content || !state.reportData) return;

  const r = state.reportData;

  switch (state.activeReportTab) {
    case 'questions':
      renderQuestionTab(content, r);
      break;
    case 'traceable_gaps':
      renderTraceableGapsTab(content, r);
      break;
    case 'communication':
      renderCommunicationTab(content, r);
      break;
    case 'visual':
      renderVisualTab(content, r);
      break;
    case 'transcript':
      renderSpeakerAssignmentTab(content, r);
      break;
  }

  if (window.lucide) lucide.createIcons();
}

// Sub-Tab 1: Question Review & Detailed Rubric Breakdown
function renderQuestionTab(container, report) {
  const qList = report.questions || [];
  if (qList.length === 0) {
    container.innerHTML = `<div class="p-6 text-center text-xs text-slate-400">No questions detected in this recording.</div>`;
    return;
  }

  const activeQ = qList[state.selectedQuestionIndex] || qList[0];
  const ev = activeQ.evaluation;
  const ans = activeQ.candidate_answer;

  container.innerHTML = `
    <div class="space-y-4">
      <!-- Question Pill Selector Strip -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1">
        ${qList.map((q, idx) => `
          <button onclick="selectQuestion(${idx})" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition border flex items-center gap-1.5 ${
            idx === state.selectedQuestionIndex ?
            'bg-indigo-600 text-white border-indigo-500 shadow-md' :
            'bg-surface-subtle text-slate-400 border-surface-border hover:text-white'
          }">
            <span>Q${q.question_index}</span>
            <span class="text-[10px] font-mono px-1 py-0.2 rounded bg-background/50">${q.evaluation?.overall_score || 70}%</span>
          </button>
        `).join('')}
      </div>

      <!-- Selected Question Evaluation Card -->
      <div class="p-5 rounded-2xl glass-card border border-surface-border space-y-4">
        <!-- Question Header & Score -->
        <div class="flex items-start justify-between gap-4">
          <div>
            <span class="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              ${activeQ.category}
            </span>
            <h3 class="text-base font-bold text-white mt-1.5">"${activeQ.question_text}"</h3>
          </div>
          <div class="text-right flex-shrink-0">
            <span class="text-2xl font-black ${
              ev?.overall_score >= 80 ? 'text-emerald-400' :
              ev?.overall_score >= 65 ? 'text-indigo-400' : 'text-amber-400'
            }">${ev?.overall_score || 75}/100</span>
            <span class="block text-[10px] text-slate-400 font-mono">Rubric Score</span>
          </div>
        </div>

        <!-- Candidate's Original Answer Excerpt -->
        <div class="p-3.5 rounded-xl bg-background/60 border border-surface-border">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Candidate Original Answer:</span>
          <p class="text-xs text-slate-200 mt-1 leading-relaxed">
            "${ans?.answer_text || 'No verbal answer transcribed for this question.'}"
          </p>
        </div>

        <!-- Detailed Rubric Assessment Breakdown Bars -->
        ${ev?.rubric_scores ? `
          <div class="p-3.5 rounded-xl bg-surface-subtle border border-surface-border space-y-2">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">6-Dimension Rubric Scoring:</span>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 text-xs">
              <div>
                <div class="flex justify-between text-slate-400 mb-0.5">
                  <span>Relevance:</span> <span class="font-mono text-white">${ev.rubric_scores.relevance || 80}%</span>
                </div>
                <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div class="h-full bg-indigo-500 rounded-full" style="width: ${ev.rubric_scores.relevance || 80}%"></div>
                </div>
              </div>

              <div>
                <div class="flex justify-between text-slate-400 mb-0.5">
                  <span>Accuracy:</span> <span class="font-mono text-white">${ev.rubric_scores.factual_accuracy || 85}%</span>
                </div>
                <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div class="h-full bg-emerald-500 rounded-full" style="width: ${ev.rubric_scores.factual_accuracy || 85}%"></div>
                </div>
              </div>

              <div>
                <div class="flex justify-between text-slate-400 mb-0.5">
                  <span>Completeness:</span> <span class="font-mono text-white">${ev.rubric_scores.technical_completeness || 75}%</span>
                </div>
                <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div class="h-full bg-amber-500 rounded-full" style="width: ${ev.rubric_scores.technical_completeness || 75}%"></div>
                </div>
              </div>

              <div>
                <div class="flex justify-between text-slate-400 mb-0.5">
                  <span>Clarity:</span> <span class="font-mono text-white">${ev.rubric_scores.clarity || 82}%</span>
                </div>
                <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div class="h-full bg-cyan-500 rounded-full" style="width: ${ev.rubric_scores.clarity || 82}%"></div>
                </div>
              </div>

              <div>
                <div class="flex justify-between text-slate-400 mb-0.5">
                  <span>Structure:</span> <span class="font-mono text-white">${ev.rubric_scores.logical_structure || 80}%</span>
                </div>
                <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div class="h-full bg-indigo-500 rounded-full" style="width: ${ev.rubric_scores.logical_structure || 80}%"></div>
                </div>
              </div>

              <div>
                <div class="flex justify-between text-slate-400 mb-0.5">
                  <span>Technical Depth:</span> <span class="font-mono text-white">${ev.rubric_scores.depth || 70}%</span>
                </div>
                <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div class="h-full bg-rose-500 rounded-full" style="width: ${ev.rubric_scores.depth || 70}%"></div>
                </div>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Strengths & Missing Concepts Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <!-- Strengths -->
          <div class="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/25 space-y-1.5">
            <span class="font-bold text-emerald-300 flex items-center gap-1.5">
              <i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i> Strong Points
            </span>
            <ul class="space-y-1 text-slate-300">
              ${(ev?.strengths || ['Demonstrated foundational familiarity with core concepts']).map(s => `
                <li class="flex items-start gap-1.5"><span class="text-emerald-400">•</span> <span>${s}</span></li>
              `).join('')}
            </ul>
          </div>

          <!-- Missing Concepts -->
          <div class="p-3 rounded-xl bg-rose-950/20 border border-rose-500/25 space-y-1.5">
            <span class="font-bold text-rose-300 flex items-center gap-1.5">
              <i data-lucide="alert-circle" class="w-3.5 h-3.5"></i> Missing Concepts
            </span>
            <ul class="space-y-1 text-slate-300">
              ${(ev?.missing_concepts || ['Production edge-case considerations']).map(m => `
                <li class="flex items-start gap-1.5"><span class="text-rose-400 font-bold">•</span> <span>${m}</span></li>
              `).join('')}
            </ul>
          </div>
        </div>

        <!-- Gap Explanation -->
        ${ev?.gap_explanation ? `
          <div class="p-3.5 rounded-xl bg-surface-subtle border border-surface-border text-xs">
            <span class="text-[10px] font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5 mb-1">
              <i data-lucide="info" class="w-3.5 h-3.5"></i> Coaching Gap Assessment:
            </span>
            <p class="text-slate-300 leading-relaxed">${ev.gap_explanation}</p>
          </div>
        ` : ''}

        <!-- Suggested Improved Answer -->
        ${ev?.suggested_answer ? `
          <div class="p-4 rounded-xl bg-indigo-950/25 border border-indigo-500/35 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <i data-lucide="sparkles" class="w-3.5 h-3.5 text-indigo-400"></i> Model Answer Framework
              </span>
              <button onclick="copyToClipboard('${encodeURIComponent(ev.suggested_answer)}')" class="text-[11px] text-slate-400 hover:text-white flex items-center gap-1">
                <i data-lucide="copy" class="w-3 h-3"></i> Copy
              </button>
            </div>
            <p class="text-xs text-slate-200 leading-relaxed font-sans bg-background/50 p-3 rounded-lg border border-surface-border">
              ${ev.suggested_answer}
            </p>
          </div>
        ` : ''}

        <!-- Relevant Follow-Up Questions -->
        ${(ev?.follow_up_questions || []).length > 0 ? `
          <div class="space-y-1.5 pt-2">
            <span class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <i data-lucide="help-circle" class="w-3.5 h-3.5 text-cyan-400"></i> Relevant Follow-Up Questions to Practice:
            </span>
            <div class="space-y-1.5">
              ${ev.follow_up_questions.map(fq => `
                <div class="p-2.5 rounded-lg bg-surface-subtle border border-surface-border text-xs text-slate-300 flex items-center justify-between">
                  <span>${fq}</span>
                  <button onclick="practiceCustomQuestion('${encodeURIComponent(fq)}')" class="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 flex-shrink-0 ml-2">
                    Practice <i data-lucide="arrow-right" class="w-3 h-3"></i>
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function selectQuestion(idx) {
  state.selectedQuestionIndex = idx;
  renderActiveReportTab();
}

function practiceCustomQuestion(encodedQ) {
  const qText = decodeURIComponent(encodedQ);
  navigateTo('practice', { customQuestion: qText });
}

// Sub-Tab 2: Traceable Knowledge Gaps Link
function renderTraceableGapsTab(container, report) {
  const gaps = report.knowledge_gaps || [];
  container.innerHTML = `
    <div class="space-y-4">
      <div class="p-4 rounded-xl bg-surface-subtle border border-surface-border text-xs text-slate-300">
        <h4 class="font-bold text-white flex items-center gap-1.5 mb-1 text-sm">
          <i data-lucide="git-merge" class="w-4 h-4 text-indigo-400"></i> Interview-to-Learning Intelligence Trace
        </h4>
        <p>
          Each identified weakness connects your interview transcript omission directly to targeted study materials and repeatable practice exercises.
        </p>
      </div>

      <div class="space-y-3">
        ${gaps.map((g, idx) => `
          <div class="p-4 rounded-xl glass-card border border-surface-border space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-white">${g.topic_name}</span>
                <span class="text-[10px] font-mono px-2 py-0.2 rounded font-semibold ${
                  g.priority === 'HIGH' ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30' : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                }">${g.priority} PRIORITY</span>
              </div>
              <span class="text-[10px] font-mono text-slate-400 uppercase">${g.category}</span>
            </div>

            <!-- Trace Chain -->
            <div class="p-3 rounded-lg bg-surface-subtle border border-surface-border grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span class="text-[10px] text-slate-500 uppercase font-mono block">1. Interview Issue</span>
                <p class="text-slate-300 mt-0.5 line-clamp-3">${g.explanation}</p>
              </div>
              <div>
                <span class="text-[10px] text-slate-500 uppercase font-mono block">2. Why It Matters</span>
                <p class="text-slate-300 mt-0.5 line-clamp-3">${g.why_it_matters}</p>
              </div>
              <div>
                <span class="text-[10px] text-slate-500 uppercase font-mono block">3. Practice Exercise</span>
                <p class="text-cyan-300 mt-0.5 line-clamp-3">${(g.practice_questions || [])[0] || 'Targeted mock drill'}</p>
              </div>
            </div>

            <!-- Study Activities -->
            <div class="space-y-1 text-xs">
              <span class="text-[11px] font-bold text-slate-400">Recommended Study Tasks:</span>
              ${(g.study_activities || []).map(act => `
                <div class="flex items-start gap-1.5 text-slate-300">
                  <span class="text-indigo-400">→</span> <span>${act}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Sub-Tab 3: Communication & Speech Intelligence
function renderCommunicationTab(container, report) {
  const comm = report.communication;
  if (!comm) {
    container.innerHTML = `<div class="p-6 text-center text-xs text-slate-400">Communication metrics are computing...</div>`;
    return;
  }

  container.innerHTML = `
    <div class="p-5 rounded-2xl glass-card border border-surface-border space-y-5">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-bold text-white flex items-center gap-2">
          <i data-lucide="mic" class="w-4 h-4 text-cyan-400"></i> Speech Pace & Delivery Analysis
        </h3>
        <span class="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/30">
          Optimal Conversational Range
        </span>
      </div>

      <!-- Metric Gauges -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div class="p-3.5 rounded-xl bg-surface-subtle border border-surface-border">
          <span class="text-[11px] text-slate-400">Speaking Pace</span>
          <div class="text-xl font-bold text-white mt-1 font-mono">${comm.speaking_rate_wpm} <span class="text-xs text-slate-400">WPM</span></div>
          <span class="text-[10px] text-slate-500">Benchmark: 130-160</span>
        </div>

        <div class="p-3.5 rounded-xl bg-surface-subtle border border-surface-border">
          <span class="text-[11px] text-slate-400">Filler Words</span>
          <div class="text-xl font-bold text-amber-400 mt-1 font-mono">${comm.filler_words_count} <span class="text-xs text-slate-400">tokens</span></div>
          <span class="text-[10px] text-slate-500">"um", "uh", "like"</span>
        </div>

        <div class="p-3.5 rounded-xl bg-surface-subtle border border-surface-border">
          <span class="text-[11px] text-slate-400">Pause Transitions</span>
          <div class="text-xl font-bold text-indigo-400 mt-1 font-mono">${comm.pause_count}</div>
          <span class="text-[10px] text-slate-500">Avg ${comm.avg_pause_seconds}s</span>
        </div>

        <div class="p-3.5 rounded-xl bg-surface-subtle border border-surface-border">
          <span class="text-[11px] text-slate-400">Total Speaking</span>
          <div class="text-xl font-bold text-cyan-400 mt-1 font-mono">${Math.round(comm.total_speaking_seconds)}s</div>
          <span class="text-[10px] text-slate-500">Active verbal output</span>
        </div>
      </div>

      <!-- Filler Words Breakdown -->
      <div class="p-3.5 rounded-xl bg-surface-subtle border border-surface-border">
        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wide block mb-2">Detected Filler Tokens:</span>
        <div class="flex flex-wrap gap-2 text-xs">
          ${Object.entries(comm.filler_words_breakdown || {}).map(([word, cnt]) => `
            <span class="px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
              "${word}": ${cnt}
            </span>
          `).join('') || '<span class="text-slate-400">Zero excessive filler words detected.</span>'}
        </div>
      </div>

      <!-- Supportive Natural Language Coaching -->
      <div class="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 text-xs space-y-1.5">
        <span class="font-bold text-indigo-300 flex items-center gap-1.5">
          <i data-lucide="sparkles" class="w-3.5 h-3.5 text-indigo-400"></i> Supportive Communication Coaching
        </span>
        <p class="text-slate-300 leading-relaxed">${comm.natural_language_coaching}</p>
      </div>
    </div>
  `;
}

// Sub-Tab 4: Visual Posture & Camera Gaze
function renderVisualTab(container, report) {
  const vis = report.visual;
  if (!vis) {
    container.innerHTML = `<div class="p-6 text-center text-xs text-slate-400">Visual posture data not available.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="p-5 rounded-2xl glass-card border border-surface-border space-y-5">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-bold text-white flex items-center gap-2">
          <i data-lucide="video" class="w-4 h-4 text-emerald-400"></i> Observable Posture & Camera Engagement
        </h3>
        <span class="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
          Descriptive Coaching
        </span>
      </div>

      <!-- Observations Grid -->
      <div class="space-y-3 text-xs">
        <div class="p-3 rounded-xl bg-surface-subtle border border-surface-border flex items-start gap-3">
          <div class="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <i data-lucide="eye" class="w-4 h-4"></i>
          </div>
          <div>
            <span class="font-bold text-white block">Camera-Directed Gaze</span>
            <p class="text-slate-300 mt-0.5">${vis.camera_directed_gaze_summary}</p>
          </div>
        </div>

        <div class="p-3 rounded-xl bg-surface-subtle border border-surface-border flex items-start gap-3">
          <div class="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
            <i data-lucide="user" class="w-4 h-4"></i>
          </div>
          <div>
            <span class="font-bold text-white block">Head & Shoulder Alignment</span>
            <p class="text-slate-300 mt-0.5">${vis.head_orientation_summary} ${vis.shoulder_alignment_summary}</p>
          </div>
        </div>

        <div class="p-3 rounded-xl bg-surface-subtle border border-surface-border flex items-start gap-3">
          <div class="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0">
            <i data-lucide="frame" class="w-4 h-4"></i>
          </div>
          <div>
            <span class="font-bold text-white block">Camera Framing & Movement</span>
            <p class="text-slate-300 mt-0.5">${vis.camera_framing_summary} ${vis.movement_patterns_summary}</p>
          </div>
        </div>
      </div>

      <!-- Mandatory Ethical & Limitations Notice -->
      <div class="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs space-y-1">
        <span class="font-bold text-amber-300 flex items-center gap-1.5">
          <i data-lucide="shield-alert" class="w-3.5 h-3.5"></i> Coaching Limitations Notice:
        </span>
        <p class="text-slate-300 leading-relaxed text-[11px]">${vis.limitations_notice}</p>
      </div>
    </div>
  `;
}

// Sub-Tab 5: Speaker Assignment & Re-Analysis
function renderSpeakerAssignmentTab(container, report) {
  container.innerHTML = `
    <div class="p-5 rounded-2xl glass-card border border-surface-border space-y-4">
      <div>
        <h3 class="text-base font-bold text-white flex items-center gap-2">
          <i data-lucide="users" class="w-4 h-4 text-indigo-400"></i> Speaker Attribution Workflow
        </h3>
        <p class="text-xs text-slate-400 mt-1">
          Diarization separates voices automatically. If the candidate was misassigned, select your voice tag below to trigger instant re-analysis.
        </p>
      </div>

      <div class="p-4 rounded-xl bg-surface-subtle border border-surface-border space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Which speaker tag is you (the Candidate)?</label>
          <div class="grid grid-cols-2 gap-3 text-xs">
            <label class="p-3 rounded-lg border border-surface-border bg-background/50 flex items-center gap-2.5 cursor-pointer hover:border-indigo-500">
              <input type="radio" name="speaker-select" value="Speaker 2" checked class="text-indigo-600 focus:ring-indigo-500">
              <div>
                <span class="font-bold text-white block">Speaker 2</span>
                <span class="text-[11px] text-slate-400">Answered architectural questions</span>
              </div>
            </label>

            <label class="p-3 rounded-lg border border-surface-border bg-background/50 flex items-center gap-2.5 cursor-pointer hover:border-indigo-500">
              <input type="radio" name="speaker-select" value="Speaker 1" class="text-indigo-600 focus:ring-indigo-500">
              <div>
                <span class="font-bold text-white block">Speaker 1</span>
                <span class="text-[11px] text-slate-400">Asked the interview questions</span>
              </div>
            </label>
          </div>
        </div>

        <button onclick="saveSpeakerAssignment('${report.interview.id}')" class="px-4 py-2 rounded-lg gradient-accent text-xs font-semibold text-white shadow-md hover:opacity-95 transition flex items-center gap-1.5">
          <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Update Speaker & Reanalyze
        </button>
      </div>
    </div>
  `;
}

async function saveSpeakerAssignment(interviewId) {
  const selectedTag = document.querySelector('input[name="speaker-select"]:checked')?.value || 'Speaker 2';
  try {
    showToast(`Reassigning candidate to ${selectedTag}...`, 'info');
    const res = await fetch(`${API_BASE}/interviews/${interviewId}/speakers/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ candidate_speaker_tag: selectedTag })
    });
    if (!res.ok) throw new Error('Failed to update speaker tag');
    showToast('Re-analysis queued!', 'success');
    navigateTo('processing', { interviewId });
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// Media Player Simulation Helpers
function togglePlayback() {
  state.isPlaying = !state.isPlaying;
  const icon = document.getElementById('play-icon');
  if (state.isPlaying) {
    if (icon) icon.setAttribute('data-lucide', 'pause');
    state.playbackTimer = setInterval(() => {
      state.mediaTime += 1.0;
      if (state.mediaTime > 145.0) {
        state.mediaTime = 0;
        togglePlayback();
      }
      updatePlayerUI();
    }, 1000);
  } else {
    if (icon) icon.setAttribute('data-lucide', 'play');
    clearInterval(state.playbackTimer);
  }
  if (window.lucide) lucide.createIcons();
}

function updatePlayerUI() {
  const timecode = document.getElementById('timecode-display');
  const fill = document.getElementById('scrubber-fill');
  if (timecode) timecode.innerText = `${formatTime(state.mediaTime)} / 02:25`;
  if (fill) fill.style.width = `${(state.mediaTime / 145.0) * 100}%`;
}

function seekTo(seconds) {
  state.mediaTime = seconds;
  updatePlayerUI();
}

function skipMedia(delta) {
  state.mediaTime = Math.max(0, Math.min(145.0, state.mediaTime + delta));
  updatePlayerUI();
}

function jumpToQuestion(qIdx, startTime) {
  selectQuestion(qIdx);
  seekTo(startTime);
  showToast(`Jumped to Question ${qIdx + 1} at ${formatTime(startTime)}`, 'info');
}

function handleScrubberClick(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  const frac = (e.clientX - rect.left) / rect.width;
  state.mediaTime = frac * 145.0;
  updatePlayerUI();
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function copyToClipboard(encoded) {
  navigator.clipboard.writeText(decodeURIComponent(encoded));
  showToast('Copied model answer to clipboard!', 'success');
}

function downloadPdfReport(interviewId) {
  window.open(`${API_BASE}/interviews/${interviewId}/export/pdf?token=${state.token}`, '_blank');
}

function downloadJsonReport(interviewId) {
  window.open(`${API_BASE}/interviews/${interviewId}/export?token=${state.token}`, '_blank');
}

// -------------------------------------------------------------
// 7. PERSONALIZED LEARNING ROADMAP PAGE
// -------------------------------------------------------------
async function renderLearning(container) {
  container.innerHTML = `
    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-white">Personalized Study Roadmap</h1>
          <p class="text-xs sm:text-sm text-slate-400 mt-1">
            Accelerated 7-day preparation plan derived from your observed interview weaknesses.
          </p>
        </div>
        <button onclick="navigateTo('practice')" class="px-4 py-2 rounded-lg gradient-accent text-xs font-semibold text-white shadow-md hover:opacity-95 transition flex items-center gap-1.5">
          <i data-lucide="mic" class="w-4 h-4"></i> Open Practice Studio
        </button>
      </div>

      <div id="learning-plan-card" class="space-y-4">
        <div class="text-center py-12 text-slate-500 text-xs">Loading study roadmap...</div>
      </div>
    </div>
  `;

  loadLearningRoadmap();
}

async function loadLearningRoadmap() {
  try {
    const res = await fetch(`${API_BASE}/learning-plans`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (!res.ok) throw new Error('Failed to load learning plans');
    const plans = await res.json();
    const card = document.getElementById('learning-plan-card');

    if (plans.length === 0) {
      card.innerHTML = `
        <div class="p-8 rounded-2xl glass-card border border-surface-border text-center">
          <i data-lucide="book-open" class="w-8 h-8 text-indigo-400 mx-auto mb-2"></i>
          <h3 class="text-sm font-bold text-white">No Active Roadmap</h3>
          <p class="text-xs text-slate-400 mt-1 mb-4">Complete an interview analysis or load the demo to generate your study plan.</p>
          <button onclick="handleQuickDemo()" class="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold">Load Demo Plan</button>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    const plan = plans[0];
    const tasks = plan.tasks || [];
    const completedCount = tasks.filter(t => t.is_completed).length;
    const pct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

    card.innerHTML = `
      <!-- Progress Bar Card -->
      <div class="p-5 rounded-2xl glass-card border border-surface-border">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-base font-bold text-white">${plan.title}</h3>
          <span class="text-xs font-mono text-cyan-300">${completedCount}/${tasks.length} Completed (${pct}%)</span>
        </div>
        <div class="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
          <div class="h-full gradient-accent rounded-full transition-all duration-300" style="width: ${pct}%"></div>
        </div>
      </div>

      <!-- Task Day Cards -->
      <div class="space-y-3">
        ${tasks.map(t => `
          <div class="p-4 rounded-xl glass-card border border-surface-border flex items-start justify-between gap-4 transition hover:border-slate-700">
            <div class="flex items-start gap-3">
              <button onclick="toggleTask('${t.id}')" class="mt-0.5 w-5 h-5 rounded flex items-center justify-center border transition ${
                t.is_completed ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-slate-600 hover:border-indigo-400 text-transparent'
              }">
                <i data-lucide="check" class="w-3.5 h-3.5"></i>
              </button>
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-elevated text-indigo-300 font-bold uppercase">
                    Day ${t.day_number}
                  </span>
                  <span class="text-xs font-mono text-slate-400">• ${t.estimated_minutes} Mins • ${t.category}</span>
                </div>
                <h4 class="text-sm font-bold text-white mt-1 ${t.is_completed ? 'line-through text-slate-400' : ''}">${t.title}</h4>
                <p class="text-xs text-slate-300 mt-1 leading-relaxed">${t.description}</p>
                <span class="inline-block mt-2 text-[11px] font-mono text-cyan-400 bg-cyan-950/20 px-2 py-0.5 rounded border border-cyan-500/20">
                  Topic: ${t.topic_name}
                </span>
              </div>
            </div>
            
            <button onclick="navigateTo('practice')" class="text-xs text-slate-400 hover:text-white flex-shrink-0 flex items-center gap-1 font-medium">
              Practice <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        `).join('')}
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  } catch (e) {
    console.error(e);
  }
}

async function toggleTask(taskId) {
  try {
    const res = await fetch(`${API_BASE}/learning-tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (!res.ok) throw new Error('Failed to update task');
    showToast('Task progress saved!', 'success');
    loadLearningRoadmap();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// -------------------------------------------------------------
// 8. PRACTICE STUDIO (BEFORE & AFTER COMPARISONS)
// -------------------------------------------------------------
async function renderPractice(container, defaultQId) {
  container.innerHTML = `
    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-white">Practice Studio</h1>
          <p class="text-xs sm:text-sm text-slate-400 mt-1">
            Re-record weak interview answers and verify which gaps you've closed.
          </p>
        </div>
      </div>

      <!-- Question Selector -->
      <div class="p-5 rounded-2xl glass-card border border-surface-border space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Select Practice Question</label>
          <select id="practice-q-select" onchange="handlePracticeQChange()" class="w-full px-3.5 py-2.5 rounded-lg bg-surface-subtle border border-surface-border text-sm text-white focus:outline-none focus:border-indigo-500">
            <!-- Populated via API -->
          </select>
        </div>

        <div id="practice-prep-guidance" class="p-3.5 rounded-xl bg-surface-subtle border border-surface-border text-xs text-slate-300">
          Loading question guidance...
        </div>

        <!-- Recording & Response Workspace -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-white flex items-center gap-1.5">
              <i data-lucide="mic" class="w-4 h-4 text-rose-400"></i> Your Answer Recording / Script:
            </span>
            <button onclick="insertSamplePracticeAnswer()" class="text-[11px] text-cyan-300 hover:underline">
              Insert Sample Improved Answer
            </button>
          </div>

          <textarea id="practice-answer-input" rows="5" placeholder="Record or type your improved technical answer here... Mention relevant metrics, production edge-cases, and clear trade-offs." class="w-full px-4 py-3 rounded-xl bg-surface-subtle border border-surface-border text-sm text-white focus:outline-none focus:border-indigo-500 leading-relaxed"></textarea>

          <div class="flex justify-between items-center pt-2">
            <span class="text-xs text-slate-500" id="practice-word-count">0 words</span>
            <button onclick="submitPracticeAnswer()" class="px-5 py-2.5 rounded-lg gradient-accent text-xs font-semibold text-white shadow-md shadow-indigo-500/20 hover:opacity-95 transition flex items-center gap-1.5">
              <i data-lucide="send" class="w-3.5 h-3.5"></i> Submit for Rubric Evaluation
            </button>
          </div>
        </div>
      </div>

      <!-- Attempt Comparison Results -->
      <div id="practice-evaluation-card" class="hidden">
        <!-- Dynamically injected after evaluation -->
      </div>
    </div>
  `;

  loadPracticeQuestions(defaultQId);
}

let activePracticeQuestions = [];

async function loadPracticeQuestions(defaultQId) {
  try {
    const res = await fetch(`${API_BASE}/practice-questions`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (!res.ok) throw new Error('Failed to load questions');
    const questions = await res.json();
    activePracticeQuestions = questions;

    const select = document.getElementById('practice-q-select');
    if (select) {
      select.innerHTML = questions.map((q, idx) => `
        <option value="${q.id}" ${q.id === defaultQId || idx === 0 ? 'selected' : ''}>
          ${q.question_text}
        </option>
      `).join('');
      handlePracticeQChange();
    }
  } catch (e) {
    console.error(e);
  }
}

function handlePracticeQChange() {
  const select = document.getElementById('practice-q-select');
  const guidance = document.getElementById('practice-prep-guidance');
  if (!select || !guidance) return;

  const currentQ = activePracticeQuestions.find(q => q.id === select.value) || activePracticeQuestions[0];
  if (currentQ) {
    guidance.innerHTML = `
      <div class="flex items-center gap-2 mb-1">
        <span class="text-[10px] font-mono px-2 py-0.2 rounded bg-indigo-500/15 text-indigo-300 font-bold uppercase">${currentQ.category}</span>
        <span class="text-[10px] font-mono text-amber-400">${currentQ.difficulty}</span>
      </div>
      <p class="text-xs text-slate-300"><strong>Prep Tip:</strong> ${currentQ.preparation_tips || 'Focus on concrete architectures and evaluation metrics.'}</p>
      ${(currentQ.expected_key_concepts || []).length > 0 ? `
        <div class="mt-2 flex flex-wrap gap-1.5 text-[10px]">
          <span class="text-slate-400">Expected Concepts:</span>
          ${currentQ.expected_key_concepts.map(c => `
            <span class="px-2 py-0.5 rounded bg-background/50 border border-surface-border text-slate-300">${c}</span>
          `).join('')}
        </div>
      ` : ''}
    `;
  }
}

function insertSamplePracticeAnswer() {
  const area = document.getElementById('practice-answer-input');
  if (area) {
    area.value = "To build a robust production RAG system, I implement a two-stage hybrid retrieval architecture. Ingestion chunks documents into 512-token segments with 10% overlap, indexed simultaneously in an HNSW vector index for semantic similarity and BM25 for sparse keyword precision. Candidate documents from both streams are fused using Reciprocal Rank Fusion (RRF), followed by a cross-encoder reranker to surface the top 5 highest-signal passages. To safeguard against hallucinations and measure retrieval quality, I run continuous evaluation benchmarks tracking Recall@K, Mean Reciprocal Rank (MRR), and Context Faithfulness using synthetic test sets.";
    document.getElementById('practice-word-count').innerText = `${area.value.split(' ').length} words`;
  }
}

async function submitPracticeAnswer() {
  const select = document.getElementById('practice-q-select');
  const answer = document.getElementById('practice-answer-input').value;
  if (!answer.trim()) {
    showToast('Please provide an answer before submitting', 'warning');
    return;
  }

  try {
    showToast('Evaluating answer against role rubrics...', 'info');
    const res = await fetch(`${API_BASE}/practice-attempts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({
        question_id: select.value,
        transcript: answer,
        duration_seconds: 48.0
      })
    });
    if (!res.ok) throw new Error('Failed to evaluate attempt');
    const attempt = await res.json();

    const card = document.getElementById('practice-evaluation-card');
    card.classList.remove('hidden');
    card.innerHTML = `
      <div class="p-6 rounded-2xl glass-card border border-emerald-500/30 space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-xs font-mono text-emerald-400 uppercase font-semibold">Practice Evaluation Complete</span>
            <h3 class="text-lg font-bold text-white mt-0.5">Attempt #${attempt.attempt_number} Assessment</h3>
          </div>
          <div class="text-right">
            <span class="text-2xl font-black text-emerald-400">${attempt.score}/100</span>
            <span class="block text-[10px] text-slate-400 font-mono">Improved Score</span>
          </div>
        </div>

        <p class="text-xs text-slate-300 leading-relaxed p-3 rounded-lg bg-surface-subtle border border-surface-border">
          ${attempt.feedback_text}
        </p>

        <!-- Closed Gaps vs Remaining Gaps -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div class="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20">
            <span class="font-bold text-emerald-300 flex items-center gap-1.5 mb-1">
              <i data-lucide="check" class="w-3.5 h-3.5"></i> Knowledge Gaps Addressed
            </span>
            ${(attempt.addressed_gaps || []).map(g => `
              <div class="text-slate-300 flex items-center gap-1.5">
                <span class="text-emerald-400 font-bold">✓</span> <span>${g}</span>
              </div>
            `).join('') || '<span class="text-slate-500">None detected yet</span>'}
          </div>

          <div class="p-3 rounded-lg bg-amber-950/20 border border-amber-500/20">
            <span class="font-bold text-amber-300 flex items-center gap-1.5 mb-1">
              <i data-lucide="alert-circle" class="w-3.5 h-3.5"></i> Remaining Improvement Areas
            </span>
            ${(attempt.remaining_gaps || []).map(g => `
              <div class="text-slate-300 flex items-center gap-1.5">
                <span class="text-amber-400">•</span> <span>${g}</span>
              </div>
            `).join('') || '<span class="text-emerald-300">All target gaps successfully covered!</span>'}
          </div>
        </div>
      </div>
    `;

    showToast('Practice evaluation complete!', 'success');
    if (window.lucide) lucide.createIcons();
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// -------------------------------------------------------------
// 9. INTERVIEW HISTORY & DATA DELETION
// -------------------------------------------------------------
async function renderHistory(container) {
  container.innerHTML = `
    <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-white">Interview History</h1>
          <p class="text-xs sm:text-sm text-slate-400 mt-1">
            Access past reports, export evaluations, or permanently delete recorded interview data.
          </p>
        </div>
        <button onclick="navigateTo('upload')" class="px-4 py-2 rounded-lg gradient-accent text-xs font-semibold text-white shadow-md hover:opacity-95 transition flex items-center gap-1.5">
          <i data-lucide="upload" class="w-4 h-4"></i> New Recording
        </button>
      </div>

      <div class="p-5 rounded-2xl glass-card border border-surface-border space-y-4" id="history-container">
        <div class="text-center py-10 text-xs text-slate-500">Loading interview archives...</div>
      </div>
    </div>
  `;

  loadHistory();
}

async function loadHistory() {
  try {
    const res = await fetch(`${API_BASE}/interviews`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (!res.ok) throw new Error('Failed to load interviews');
    const interviews = await res.json();
    const box = document.getElementById('history-container');

    if (interviews.length === 0) {
      box.innerHTML = `
        <div class="text-center py-12">
          <i data-lucide="inbox" class="w-8 h-8 text-slate-600 mx-auto mb-2"></i>
          <p class="text-xs text-slate-400">No recordings in history yet.</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    box.innerHTML = interviews.map(inv => `
      <div class="p-4 rounded-xl bg-surface-subtle border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <h4 class="text-sm font-bold text-white">${inv.title}</h4>
            <span class="text-[10px] font-mono px-2 py-0.2 rounded font-semibold ${
              inv.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-indigo-500/15 text-indigo-400'
            }">${inv.status.toUpperCase()}</span>
          </div>
          <div class="text-xs text-slate-400 flex flex-wrap gap-4">
            <span>Role: <strong class="text-slate-300">${inv.target_role}</strong></span>
            <span>Date: ${inv.interview_date || 'Recent'}</span>
            <span>Duration: ${Math.round(inv.duration_seconds || 145)}s</span>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0">
          <button onclick="openReport('${inv.id}')" class="px-3 py-1.5 rounded-lg bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600 hover:text-white text-xs font-semibold transition">
            View Report
          </button>
          <button onclick="downloadPdfReport('${inv.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-elevated transition" title="Export PDF">
            <i data-lucide="file-down" class="w-4 h-4 text-rose-400"></i>
          </button>
          <button onclick="deleteInterview('${inv.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition" title="Delete Recording & Data">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
  } catch (e) {
    console.error(e);
  }
}

async function deleteInterview(interviewId) {
  if (!confirm('Are you sure you want to permanently delete this interview recording and its analysis report? This action cannot be undone.')) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/interviews/${interviewId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (!res.ok) throw new Error('Failed to delete interview');
    showToast('Interview and private recording deleted', 'success');
    loadHistory();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// -------------------------------------------------------------
// 10. SETTINGS & PRIVACY
// -------------------------------------------------------------
function renderSettings(container) {
  container.innerHTML = `
    <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-white">Settings & Privacy</h1>
        <p class="text-xs sm:text-sm text-slate-400 mt-1">
          Manage your candidate profile, AI providers, and recording retention controls.
        </p>
      </div>

      <!-- Candidate Profile Settings -->
      <div class="p-6 rounded-2xl glass-card border border-surface-border space-y-4">
        <h3 class="text-base font-bold text-white flex items-center gap-2">
          <i data-lucide="user" class="w-4 h-4 text-indigo-400"></i> Candidate Target Profile
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label class="block font-medium text-slate-300 mb-1">Target Professional Role</label>
            <input type="text" id="set-role" value="${state.user?.profile?.target_role || 'Senior AI/ML Engineer'}" class="w-full px-3.5 py-2.5 rounded-lg bg-surface-subtle border border-surface-border text-sm text-white focus:outline-none focus:border-indigo-500">
          </div>
          <div>
            <label class="block font-medium text-slate-300 mb-1">Target Company</label>
            <input type="text" id="set-company" value="${state.user?.profile?.target_company || 'OpenAI / Anthropic'}" class="w-full px-3.5 py-2.5 rounded-lg bg-surface-subtle border border-surface-border text-sm text-white focus:outline-none focus:border-indigo-500">
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-300 mb-1">Experience Level</label>
          <select id="set-level" class="w-full px-3.5 py-2.5 rounded-lg bg-surface-subtle border border-surface-border text-sm text-white focus:outline-none focus:border-indigo-500">
            <option value="senior" ${state.user?.profile?.experience_level === 'senior' ? 'selected' : ''}>Senior (5+ yrs)</option>
            <option value="mid" ${state.user?.profile?.experience_level === 'mid' ? 'selected' : ''}>Mid-level (2-5 yrs)</option>
            <option value="entry" ${state.user?.profile?.experience_level === 'entry' ? 'selected' : ''}>Entry-level (0-2 yrs)</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-300 mb-1">Resume Highlights or Bio (Used for gap grounding)</label>
          <textarea id="set-bio" rows="3" class="w-full px-3.5 py-2.5 rounded-lg bg-surface-subtle border border-surface-border text-sm text-white focus:outline-none focus:border-indigo-500">${state.user?.profile?.bio || ''}</textarea>
        </div>
        <button onclick="saveProfileSettings()" class="px-4 py-2 rounded-lg gradient-accent text-xs font-semibold text-white shadow hover:opacity-95 transition">
          Save Profile Updates
        </button>
      </div>

      <!-- Privacy & Retention Controls -->
      <div class="p-6 rounded-2xl glass-card border border-surface-border space-y-4">
        <h3 class="text-base font-bold text-white flex items-center gap-2">
          <i data-lucide="shield" class="w-4 h-4 text-emerald-400"></i> Privacy, Storage & Security Controls
        </h3>
        <p class="text-xs text-slate-300 leading-relaxed">
          Interview recordings are highly sensitive user-generated content. We enforce strict private storage, client isolation, and zero-analytics exposure.
        </p>
        <div class="space-y-3 pt-2 text-xs">
          <div class="flex items-center justify-between p-3 rounded-lg bg-surface-subtle border border-surface-border">
            <div>
              <span class="font-bold text-white block">Auto-Purge Recordings</span>
              <span class="text-[11px] text-slate-400">Automatically delete video/audio files 30 days after analysis</span>
            </div>
            <input type="checkbox" checked class="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500">
          </div>
          <div class="flex items-center justify-between p-3 rounded-lg bg-surface-subtle border border-surface-border">
            <div>
              <span class="font-bold text-white block">AI Provider Isolation</span>
              <span class="text-[11px] text-slate-400">Recordings are never used to train third-party foundation models</span>
            </div>
            <span class="text-emerald-400 font-mono font-bold">ENFORCED</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function saveProfileSettings() {
  const role = document.getElementById('set-role').value;
  const company = document.getElementById('set-company').value;
  const level = document.getElementById('set-level').value;
  const bio = document.getElementById('set-bio').value;

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({
        target_role: role,
        target_company: company,
        experience_level: level,
        bio: bio
      })
    });
    if (!res.ok) throw new Error('Failed to update profile');
    state.user = await res.json();
    showToast('Profile updated successfully!', 'success');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// -------------------------------------------------------------
// TOAST NOTIFICATION UTILITY
// -------------------------------------------------------------
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const colors = {
    success: 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200',
    error: 'bg-rose-950/90 border-rose-500/40 text-rose-200',
    warning: 'bg-amber-950/90 border-amber-500/40 text-amber-200',
    info: 'bg-indigo-950/90 border-indigo-500/40 text-indigo-200'
  };

  toast.className = `pointer-events-auto px-4 py-2.5 rounded-xl border shadow-xl text-xs font-medium backdrop-blur-md transition-all duration-300 transform translate-y-2 opacity-0 flex items-center gap-2 ${colors[type] || colors.info}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
