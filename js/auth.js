/* MP Health Procurement — Authentication (Login / Signup) */

/** All roles shown in signup (prototype catalogue). Only demo roles can complete registration. */
const AUTH_ROLE_OPTIONS = [
  'Admin',
  'Vendor',
  'Budget Officer',
  'Procurement Officer',
  'Stores / Warehouse Manager',
  'Inspection / Quality Officer',
  'Tender Evaluation Committee',
  'District CMO / Administrative Officer',
  'NHM Programme Officer',
  'Audit / Compliance Officer',
  'Indenting Department HOD',
  'System Administrator'
];

const AUTH_DEMO_ROLES = ['Admin', 'Vendor', 'Budget Officer'];

const AUTH_USERS = [
  {
    id: 'gov-001',
    role: 'gov',
    username: 'Admin',
    name: 'Admin',
    email: 'gov.admin@mphp.gov.in',
    phone: '9876543210',
    password: 'Admin',
    avatar: 'AD',
    title: 'Admin'
  },
  {
    id: 'gov-002',
    role: 'gov',
    username: 'Budget',
    name: 'Budget',
    email: 'budget@mphp.gov.in',
    phone: '9876543211',
    password: 'Budget',
    avatar: 'BO',
    title: 'Budget Officer'
  },
  {
    id: 'vnd-001',
    role: 'vendor',
    username: 'Vendor',
    name: 'Vendor',
    organization: 'MediSupply India Pvt Ltd',
    email: 'vendor@medisupply.in',
    phone: '9123456780',
    password: 'Vendor',
    avatar: 'VN',
    title: 'Vendor',
    vendorId: 'VND-MP-000123'
  }
];

let authView = 'login';
let authPending = null;
let authSession = null;
let otpResendTimer = null;
let otpResendSeconds = 0;
let landingHeroIndex = 0;
let landingHeroTimer = null;

function roleLabelToKey(label) {
  if (label === 'Vendor' || label === 'Vendor / Bidder') return 'vendor';
  if (label === 'Admin' || label === 'Resource Manager' || label === 'Budget Officer' || label === 'Finance / Budget Officer') return 'gov';
  return 'vendor';
}

function isDemoSignupRole(label) {
  return AUTH_DEMO_ROLES.includes(label);
}

function getRegisteredUsers() {
  try {
    return JSON.parse(sessionStorage.getItem('mph_registered_users') || '[]');
  } catch {
    return [];
  }
}

function saveRegisteredUser(user) {
  const users = getRegisteredUsers();
  users.push(user);
  sessionStorage.setItem('mph_registered_users', JSON.stringify(users));
}

function getAllUsers() {
  return [...AUTH_USERS, ...getRegisteredUsers()];
}

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function findUserByUsername(username) {
  const key = normalizeUsername(username);
  if (!key) return null;
  return getAllUsers().find(u => normalizeUsername(u.username) === key);
}

function getAuthSession() {
  return authSession;
}

function clearAuthSession() {
  authSession = null;
  authPending = null;
  authView = 'login';
  stopOtpTimer();
}

function completePortalLogin(user) {
  authSession = { ...user };
  const role = user.role;
  authPending = null;
  stopOtpTimer();
  if (typeof stopLandingHeroCarousel === 'function') stopLandingHeroCarousel();

  const authPage = document.getElementById('authPage');
  if (authPage) {
    authPage.style.display = 'none';
    authPage.classList.add('is-hidden');
  }
  if (typeof completeAuthLogin === 'function') {
    completeAuthLogin(role, authSession);
  }
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '').slice(-10);
}

function maskPhone(phone) {
  const p = normalizePhone(phone);
  if (p.length < 4) return phone || '—';
  return `+91 ******${p.slice(-4)}`;
}

const DEMO_EMAIL_OTP = '123456';
const DEMO_PHONE_OTP = '789012';

function initAuth() {
  renderAuthUI();
  bindAuthEvents();
  initLandingInteractions();
}

function renderAuthUI() {
  const page = document.getElementById('authPage');
  if (!page) return;

  page.innerHTML = `
    <header class="landing-header" id="landing-home">
      <div class="landing-header-wrap">
        <div class="landing-header-top">
          <a class="landing-brand" href="#landing-home" data-landing-scroll="landing-home">
            <img src="assets/banner_in_login.png" alt="MPPHSCL" class="landing-brand-logo">
            <div class="landing-brand-text">
              <strong>MPPHSCL</strong>
              <span>Madhya Pradesh Public Health <em>Services</em> Corporation Limited</span>
            </div>
          </a>
          <nav class="landing-nav" id="landingNav" aria-label="Landing page">
            <a href="#landing-home" data-landing-scroll="landing-home">Home</a>
            <a href="#landing-services" data-landing-scroll="landing-services">Services</a>
            <a href="#landing-gallery" data-landing-scroll="landing-gallery">Gallery</a>
            <a href="#landing-contact" data-landing-scroll="landing-contact">Contact</a>
          </nav>
          <img src="assets/mp_admin.png" alt="Government of Madhya Pradesh" class="landing-emblem">
          <button type="button" class="landing-nav-toggle" id="landingNavToggle" aria-label="Open menu" aria-expanded="false">
            <i class="fa-solid fa-bars"></i>
          </button>
        </div>
      </div>
    </header>

    <section class="landing-hero" aria-label="Portal introduction">
      <div class="landing-hero-main">
        <div class="landing-hero-slides" id="landingHeroSlides">
          <article class="landing-hero-slide is-active" data-slide="0">
            <h2>Drug and Vaccine Supply Chain Management <span>(DVDMS)</span></h2>
            <p>i-MCS (integrated Medical Corporation System) is a software platform to automate various activities of Madhya Pradesh Public Health Services Corporation Limited (MPPHSCL). It comprises of Drug and Vaccine Supply Chain Management, Equipment Maintenance and Management. e-Aushadhi deals with Purchase Order, Inventory Management &amp; Distribution of various drugs etc. EMMS manages equipment and its maintenance.</p>
            <div class="landing-hero-art-frame">
              <img src="assets/drugs-distribution.png" alt="Drug and vaccine supply chain warehouse illustration" class="landing-hero-art">
            </div>
          </article>
          <article class="landing-hero-slide" data-slide="1">
            <h2>Equipment Maintenance and Management System <span>(EMMS)</span></h2>
            <p>i-MCS (integrated Medical Corporation System) is a software platform to automate various activities of Madhya Pradesh Public Health Services Corporation Limited (MPPHSCL). It comprises of Drug and Vaccine Supply Chain Management, Equipment Maintenance and Management. e-Aushadhi deals with Purchase Order, Inventory Management &amp; Distribution of various drugs etc. EMMS manages equipment and its maintenance.</p>
            <div class="landing-hero-art-frame">
              <img src="assets/emms.png" alt="Equipment maintenance and clinical environment" class="landing-hero-art landing-hero-art--photo">
            </div>
          </article>
        </div>
        <div class="landing-hero-dots" role="tablist" aria-label="Hero slides">
          <button type="button" class="landing-hero-dot is-active" data-hero-dot="0" aria-label="DVDMS slide"></button>
          <button type="button" class="landing-hero-dot" data-hero-dot="1" aria-label="EMMS slide"></button>
        </div>
      </div>

      <aside class="landing-login-col" id="landing-signin" aria-label="Sign in">
        <div class="auth-card">
          <nav class="auth-steps" id="authSteps" aria-label="Authentication progress">
            <div class="auth-step auth-step--done" data-step="1">
              <span class="auth-step-num">1</span>
              <span class="auth-step-label">Credentials</span>
            </div>
            <div class="auth-step-line"></div>
            <div class="auth-step" data-step="2">
              <span class="auth-step-num">2</span>
              <span class="auth-step-label">OTP Verification</span>
            </div>
          </nav>

          <div class="auth-tabs" id="authTabs" role="tablist">
            <button type="button" class="auth-tab ${authView === 'login' ? 'active' : ''}" data-tab="login" role="tab" aria-selected="${authView === 'login'}">Sign In</button>
            <button type="button" class="auth-tab ${authView === 'signup' ? 'active' : ''}" data-tab="signup" role="tab" aria-selected="${authView === 'signup'}">Create Account</button>
          </div>

          <div id="authAlert" class="auth-alert hidden" role="alert"></div>
          <div class="auth-form-body" id="authFormBody"></div>
        </div>
      </aside>
    </section>

    <section class="landing-services" id="landing-services">
      <div class="landing-section-inner">
        <header class="landing-section-head">
          <h2>Our Services</h2>
          <p>End-to-end digital support across procurement, quality, logistics, and reporting for public health supply chains.</p>
        </header>
        <div class="landing-service-grid">
          <article class="landing-service-card">
            <div class="landing-service-icon landing-service-icon--it"><i class="fa-solid fa-laptop-code"></i></div>
            <h3>IT</h3>
            <p>Statistical maintenance of data digitally</p>
          </article>
          <article class="landing-service-card">
            <div class="landing-service-icon landing-service-icon--finance"><i class="fa-solid fa-indian-rupee-sign"></i></div>
            <h3>Finance</h3>
            <p>Financial management</p>
          </article>
          <article class="landing-service-card">
            <div class="landing-service-icon landing-service-icon--quality"><i class="fa-solid fa-flask-vial"></i></div>
            <h3>Quality</h3>
            <p>To carry out quality checks for drugs, surgical &amp; reagents</p>
          </article>
          <article class="landing-service-card">
            <div class="landing-service-icon landing-service-icon--procurement"><i class="fa-solid fa-cart-shopping"></i></div>
            <h3>Procurement</h3>
            <p>To facilitate the procurement of medicines that meet prescribed safety and health standards</p>
          </article>
          <article class="landing-service-card">
            <div class="landing-service-icon landing-service-icon--logistics"><i class="fa-solid fa-truck"></i></div>
            <h3>Logistics</h3>
            <p>Plans the efficient flow and storage of drugs</p>
          </article>
          <article class="landing-service-card">
            <div class="landing-service-icon landing-service-icon--reports"><i class="fa-solid fa-chart-column"></i></div>
            <h3>Reports Section</h3>
            <p>To generate reports based on user requirements</p>
          </article>
        </div>
      </div>
    </section>

    <section class="landing-gallery" id="landing-gallery">
      <div class="landing-section-inner">
        <header class="landing-section-head landing-section-head--row">
          <div>
            <h2>Our Gallery</h2>
            <p>Facilities and supply-chain operations across Madhya Pradesh.</p>
          </div>
          <div class="landing-gallery-nav">
            <button type="button" class="landing-gallery-btn" id="landingGalleryPrev" aria-label="Previous gallery images">prev</button>
            <button type="button" class="landing-gallery-btn" id="landingGalleryNext" aria-label="Next gallery images">next</button>
          </div>
        </header>
        <div class="landing-gallery-track" id="landingGalleryTrack">
          <figure class="landing-gallery-item"><img src="assets/img1.jpg" alt="Jai Prakash Hospital exterior"></figure>
          <figure class="landing-gallery-item"><img src="assets/img2.jpg" alt="Patients waiting at a public health gynecology clinic"></figure>
          <figure class="landing-gallery-item"><img src="assets/img3.jpg" alt="Drug warehouse storage racks"></figure>
          <figure class="landing-gallery-item"><img src="assets/img4.jpg" alt="Janani Express ambulance at Community Health Center Indri, Sehore"></figure>
          <figure class="landing-gallery-item"><img src="assets/img5.jpg" alt="Community Health Center Deori Kalan, Sagar"></figure>
        </div>
      </div>
    </section>

    <footer class="landing-footer" id="landing-contact">
      <div class="landing-footer-inner">
        <div class="landing-footer-col">
          <h3>Schemes</h3>
          <a href="https://www.nhm.gov.in/" target="_blank" rel="noopener noreferrer">Sardar Vallabh Bhai Patel Nishulk Aushadhi Vitaran Yojna</a>
          <a href="https://www.nhm.gov.in/" target="_blank" rel="noopener noreferrer">सरदार वल्लभभाई पटेल नि:शुल्क औषधि वितरण योजना</a>
        </div>
        <div class="landing-footer-col">
          <h3>Contact Us</h3>
          <a href="tel:07552578911"><i class="fa-solid fa-phone"></i> Telephone No. — 0755-2578911, 4045264</a>
          <a href="mailto:itcell-mpphscl@mp.gov.in"><i class="fa-solid fa-envelope"></i> itcell-mpphscl[AT]mp[DOT]gov[DOT]in</a>
        </div>
        <div class="landing-footer-col landing-footer-col--brand">
          <h3>Designed &amp; Developed by</h3>
          <img src="assets/cdaclogo.png" alt="C-DAC — Centre for Development of Advanced Computing" class="landing-cdac">
        </div>
      </div>
      <div class="landing-footer-bar">
        <span>© ${new Date().getFullYear()} MPPHSCL · MP Health Procurement Prototype</span>
        <span>GFR 2017 Compliant</span>
      </div>
    </footer>
  `;

  updateAuthContent();
}

function setLandingHeroSlide(index) {
  const slides = document.querySelectorAll('#landingHeroSlides .landing-hero-slide');
  const dots = document.querySelectorAll('[data-hero-dot]');
  if (!slides.length) return;
  const next = ((index % slides.length) + slides.length) % slides.length;
  if (next === landingHeroIndex && slides[next]?.classList.contains('is-active')) {
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === next));
    return;
  }
  const prev = landingHeroIndex;
  landingHeroIndex = next;
  slides.forEach((slide, i) => {
    slide.classList.remove('is-exit');
    if (i === prev && prev !== next) slide.classList.add('is-exit');
    slide.classList.toggle('is-active', i === next);
  });
  dots.forEach((dot, i) => dot.classList.toggle('is-active', i === next));
  // Clear exit class after transition so inactive slides stay clean
  window.clearTimeout(setLandingHeroSlide._exitTimer);
  setLandingHeroSlide._exitTimer = window.setTimeout(() => {
    slides.forEach(slide => slide.classList.remove('is-exit'));
  }, 780);
}

function startLandingHeroCarousel() {
  stopLandingHeroCarousel();
  landingHeroTimer = setInterval(() => setLandingHeroSlide(landingHeroIndex + 1), 7000);
}

function stopLandingHeroCarousel() {
  if (landingHeroTimer) {
    clearInterval(landingHeroTimer);
    landingHeroTimer = null;
  }
}

function initLandingInteractions() {
  const page = document.getElementById('authPage');
  if (!page) return;

  if (page.dataset.landingBound === '1') {
    setLandingHeroSlide(0);
    startLandingHeroCarousel();
    return;
  }
  page.dataset.landingBound = '1';

  page.addEventListener('click', e => {
    const scrollLink = e.target.closest('[data-landing-scroll]');
    if (scrollLink) {
      e.preventDefault();
      const id = scrollLink.getAttribute('data-landing-scroll');
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      document.getElementById('landingNav')?.classList.remove('is-open');
      document.getElementById('landingNavToggle')?.setAttribute('aria-expanded', 'false');
      return;
    }

    const heroDot = e.target.closest('[data-hero-dot]');
    if (heroDot) {
      setLandingHeroSlide(Number(heroDot.getAttribute('data-hero-dot')) || 0);
      startLandingHeroCarousel();
      return;
    }

    if (e.target.closest('#landingNavToggle')) {
      const nav = document.getElementById('landingNav');
      const open = !nav?.classList.contains('is-open');
      nav?.classList.toggle('is-open', open);
      document.getElementById('landingNavToggle')?.setAttribute('aria-expanded', open ? 'true' : 'false');
      return;
    }

    if (e.target.closest('#landingGalleryPrev')) {
      const track = document.getElementById('landingGalleryTrack');
      track?.scrollBy({ left: -320, behavior: 'smooth' });
      return;
    }
    if (e.target.closest('#landingGalleryNext')) {
      const track = document.getElementById('landingGalleryTrack');
      track?.scrollBy({ left: 320, behavior: 'smooth' });
    }
  });

  setLandingHeroSlide(0);
  startLandingHeroCarousel();
}

function updateAuthContent() {
  const body = document.getElementById('authFormBody');
  const steps = document.getElementById('authSteps');
  const tabs = document.getElementById('authTabs');

  if (body) body.innerHTML = renderAuthView();

  const isOtp = authView === 'otp';
  steps?.classList.toggle('visible', isOtp);
  tabs?.classList.toggle('hidden', isOtp);

  if (!isOtp && tabs) {
    tabs.querySelectorAll('.auth-tab').forEach(btn => {
      const active = btn.dataset.tab === authView;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active);
    });
  }

  if (typeof initCustomSelects === 'function') initCustomSelects();

  if (isOtp) {
    steps?.querySelectorAll('.auth-step').forEach((el, i) => {
      el.classList.toggle('auth-step--done', i === 0);
      el.classList.toggle('auth-step--active', i === 1);
    });
    initOtpInputs();
    startOtpTimer();
  }
}

function renderAuthView() {
  if (authView === 'otp') return renderOtpView();
  if (authView === 'signup') return renderSignupView();
  return renderLoginView();
}

function renderLoginView() {
  return `
    <div class="auth-intro">
      <h2>Welcome back</h2>
      <p>Sign in with your username and password.</p>
    </div>
    <form id="authLoginForm" class="auth-form" novalidate>
      ${customSelectHTML('Account Role', 'loginRole', AUTH_ROLE_OPTIONS, 'Vendor')}
      <div class="form-group">
        <label for="loginUsername">Username</label>
        <div class="auth-field">
          <i class="fa-solid fa-user"></i>
          <input type="text" id="loginUsername" name="username" placeholder="Enter username" autocomplete="username" required>
        </div>
      </div>
      <div class="form-group">
        <label for="loginPassword">Password</label>
        <div class="auth-field">
          <i class="fa-solid fa-lock"></i>
          <input type="password" id="loginPassword" name="password" placeholder="Enter your password" autocomplete="current-password" required>
          <button type="button" class="auth-toggle-pw" data-target="loginPassword" aria-label="Show password"><i class="fa-solid fa-eye"></i></button>
        </div>
      </div>
      <div class="auth-form-row">
        <label class="auth-check"><input type="checkbox" id="loginRemember"> <span>Keep me signed in</span></label>
        <button type="button" class="auth-text-btn" id="btnForgotPassword">Forgot password?</button>
      </div>
      <button type="submit" class="btn-auth-submit">
        Sign In
        <i class="fa-solid fa-arrow-right"></i>
      </button>
    </form>
    <div class="auth-demo-creds">
      <table class="auth-demo-table">
        <thead><tr><th>Role</th><th>Username</th><th>Password</th></tr></thead>
        <tbody>
          <tr><td>Admin</td><td><code>Admin</code></td><td><code>Admin</code></td></tr>
          <tr><td>Vendor</td><td><code>Vendor</code></td><td><code>Vendor</code></td></tr>
          <tr><td>Budget Officer</td><td><code>Budget</code></td><td><code>Budget</code></td></tr>
        </tbody>
      </table>
    </div>
    <p class="auth-switch-hint">New to the platform? <button type="button" class="auth-text-btn" data-tab="signup">Create an account</button></p>
  `;
}

function renderSignupView() {
  return `
    <div class="auth-intro">
      <h2>Create your account</h2>
      <p>Choose a role, then set a username and password. Demo access: Admin, Vendor, and Budget Officer.</p>
    </div>
    <form id="authSignupForm" class="auth-form" novalidate>
      ${customSelectHTML('Account Role', 'signupRole', AUTH_ROLE_OPTIONS, 'Vendor')}
      <div class="form-group">
        <label for="signupUsername">Username</label>
        <div class="auth-field">
          <i class="fa-solid fa-user"></i>
          <input type="text" id="signupUsername" name="username" placeholder="Choose a username" autocomplete="username" required>
        </div>
      </div>
      <div class="auth-form-split">
        <div class="form-group">
          <label for="signupPassword">Password</label>
          <div class="auth-field">
            <i class="fa-solid fa-lock"></i>
            <input type="password" id="signupPassword" name="password" placeholder="Enter password" autocomplete="new-password" required>
            <button type="button" class="auth-toggle-pw" data-target="signupPassword" aria-label="Show password"><i class="fa-solid fa-eye"></i></button>
          </div>
        </div>
        <div class="form-group">
          <label for="signupConfirm">Confirm Password</label>
          <div class="auth-field">
            <i class="fa-solid fa-lock"></i>
            <input type="password" id="signupConfirm" name="confirm" placeholder="Re-enter password" autocomplete="new-password" required>
          </div>
        </div>
      </div>
      <label class="auth-check auth-check--block">
        <input type="checkbox" id="signupTerms" required>
        <span>I confirm the information is accurate and agree to the platform terms, privacy policy, and GFR 2017 guidelines.</span>
      </label>
      <button type="submit" class="btn-auth-submit">
        Create Account
        <i class="fa-solid fa-arrow-right"></i>
      </button>
    </form>
    <p class="auth-switch-hint">Already registered? <button type="button" class="auth-text-btn" data-tab="login">Sign in instead</button></p>
  `;
}

function renderOtpView() {
  const pending = authPending || {};
  const roleLabel = pending.title || (pending.role === 'gov' ? 'Admin' : 'Vendor');

  return `
    <div class="auth-intro">
      <button type="button" class="auth-back-btn" id="btnOtpBack"><i class="fa-solid fa-arrow-left"></i> Back</button>
      <h2>Verify OTP</h2>
      <p>Enter the 6-digit codes sent to your email and mobile to complete authentication.</p>
    </div>

    <div class="auth-otp-profile">
      <div class="auth-otp-avatar auth-otp-avatar--${pending.role || 'vendor'}">
        <i class="fa-solid ${pending.role === 'gov' ? 'fa-landmark' : 'fa-building'}"></i>
      </div>
      <div class="auth-otp-profile-text">
        <strong>${pending.name || 'User'}</strong>
        <span>${pending.organization ? `${pending.organization} · ${roleLabel}` : roleLabel}</span>
      </div>
    </div>

    <div class="auth-otp-channels">
      <div class="auth-otp-channel">
        <i class="fa-solid fa-envelope"></i>
        <div>
          <span class="auth-otp-channel-label">Email</span>
          <span class="auth-otp-channel-value">${maskEmail(pending.email || '')}</span>
        </div>
      </div>
      <div class="auth-otp-channel">
        <i class="fa-solid fa-mobile-screen"></i>
        <div>
          <span class="auth-otp-channel-label">Mobile</span>
          <span class="auth-otp-channel-value">${maskPhone(pending.phone || '')}</span>
        </div>
      </div>
    </div>

    <form id="authOtpForm" class="auth-form auth-form--otp" novalidate>
      <div class="auth-otp-block">
        <label>Email OTP</label>
        <p class="auth-otp-sub">6-digit code from your inbox</p>
        <div class="auth-otp-inputs">
          ${[0, 1, 2, 3, 4, 5].map(i => `<input type="text" class="auth-otp-digit" maxlength="1" inputmode="numeric" pattern="[0-9]" data-otp="email" data-index="${i}" aria-label="Email OTP digit ${i + 1}">`).join('')}
        </div>
      </div>
      <div class="auth-otp-block">
        <label>Mobile OTP</label>
        <p class="auth-otp-sub">6-digit code from SMS</p>
        <div class="auth-otp-inputs">
          ${[0, 1, 2, 3, 4, 5].map(i => `<input type="text" class="auth-otp-digit" maxlength="1" inputmode="numeric" pattern="[0-9]" data-otp="phone" data-index="${i}" aria-label="Phone OTP digit ${i + 1}">`).join('')}
        </div>
      </div>
      <div class="auth-otp-resend">
        <span>Didn't receive the code?</span>
        <button type="button" class="auth-text-btn" id="btnResendOtp" disabled>Resend in <span id="otpTimer">30</span>s</button>
      </div>
      <button type="submit" class="btn-auth-submit">
        Verify &amp; Access Portal
        <i class="fa-solid fa-shield-halved"></i>
      </button>
    </form>
  `;
}

function bindAuthEvents() {
  if (window.__mphAuthBound) return;
  window.__mphAuthBound = true;

  document.addEventListener('click', e => {
    if (!e.target.closest('#authPage')) return;

    const tab = e.target.closest('[data-tab]');
    if (tab && (tab.classList.contains('auth-tab') || tab.classList.contains('auth-text-btn'))) {
      e.preventDefault();
      switchAuthTab(tab.dataset.tab);
      return;
    }

    const togglePw = e.target.closest('.auth-toggle-pw');
    if (togglePw) {
      const input = document.getElementById(togglePw.dataset.target);
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      togglePw.innerHTML = show ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
      return;
    }

    if (e.target.closest('#btnForgotPassword')) {
      showAuthAlert('Password reset is handled by your department administrator. Contact the help desk for assistance.', 'info');
      return;
    }

    if (e.target.closest('#btnOtpBack')) {
      authView = authPending?.source || 'login';
      authPending = null;
      stopOtpTimer();
      updateAuthContent();
      return;
    }

    if (e.target.closest('#btnResendOtp') && !document.getElementById('btnResendOtp')?.disabled) {
      startOtpTimer();
      showAuthAlert('New verification codes have been sent to your email and mobile.', 'success');
    }
  });

  document.addEventListener('submit', e => {
    if (!e.target.closest('#authPage')) return;
    if (e.target.id === 'authLoginForm') {
      e.preventDefault();
      handleLoginSubmit();
    }
    if (e.target.id === 'authSignupForm') {
      e.preventDefault();
      handleSignupSubmit();
    }
    if (e.target.id === 'authOtpForm') {
      e.preventDefault();
      handleOtpSubmit();
    }
  });

  document.addEventListener('input', e => {
    if (!e.target.closest('#authPage')) return;
    if (e.target.classList.contains('auth-otp-digit')) {
      handleOtpDigitInput(e.target);
    }
  });

  document.addEventListener('keydown', e => {
    if (!e.target.closest('#authPage')) return;
    if (e.target.classList.contains('auth-otp-digit') && e.key === 'Backspace') {
      handleOtpDigitBackspace(e.target, e);
    }
  });
}

function switchAuthTab(tab) {
  authView = tab === 'signup' ? 'signup' : 'login';
  authPending = null;
  stopOtpTimer();
  hideAuthAlert();
  updateAuthContent();
}

function showAuthAlert(message, type = 'error') {
  const el = document.getElementById('authAlert');
  if (!el) return;
  el.className = `auth-alert auth-alert--${type}`;
  el.innerHTML = `<i class="fa-solid fa-${type === 'success' ? 'circle-check' : type === 'info' ? 'circle-info' : 'circle-exclamation'}"></i><span>${message}</span>`;
  el.classList.remove('hidden');
}

function hideAuthAlert() {
  document.getElementById('authAlert')?.classList.add('hidden');
}

function handleLoginSubmit() {
  hideAuthAlert();
  const username = document.getElementById('loginUsername')?.value.trim();
  const password = document.getElementById('loginPassword')?.value;
  const roleLabel = typeof getCustomSelectValue === 'function'
    ? getCustomSelectValue('loginRole')
    : 'Vendor';

  if (!username || !password) {
    showAuthAlert('Please enter your username and password.');
    return;
  }

  const user = findUserByUsername(username);
  if (!user || user.password !== password) {
    showAuthAlert('Invalid username or password. Please try again.');
    return;
  }

  if (roleLabel && user.title && roleLabel !== user.title) {
    showAuthAlert(`This username belongs to <strong>${user.title}</strong>. Select that role and try again.`);
    return;
  }

  completePortalLogin({ ...user, isNewSignup: false });
}

function handleSignupSubmit() {
  hideAuthAlert();
  const username = document.getElementById('signupUsername')?.value.trim();
  const password = document.getElementById('signupPassword')?.value;
  const confirm = document.getElementById('signupConfirm')?.value;
  const roleLabel = typeof getCustomSelectValue === 'function'
    ? getCustomSelectValue('signupRole')
    : 'Vendor';
  const terms = document.getElementById('signupTerms')?.checked;

  if (!username || !password || !confirm) {
    showAuthAlert('Please enter username, password, and confirm password.');
    return;
  }
  if (!roleLabel || !AUTH_ROLE_OPTIONS.includes(roleLabel)) {
    showAuthAlert('Please select a valid account role.');
    return;
  }
  if (!isDemoSignupRole(roleLabel)) {
    showAuthAlert(`${roleLabel} is listed for this prototype. Demo signup is currently available for Admin, Vendor, and Budget Officer only.`);
    return;
  }
  if (username.length < 3) {
    showAuthAlert('Username must be at least 3 characters.');
    return;
  }
  if (password.length < 5) {
    showAuthAlert('Password must be at least 5 characters long.');
    return;
  }
  if (password !== confirm) {
    showAuthAlert('Passwords do not match. Please re-enter.');
    return;
  }
  if (!terms) {
    showAuthAlert('Please accept the terms to continue.');
    return;
  }

  if (findUserByUsername(username)) {
    showAuthAlert('This username is already taken. Please choose another or sign in.');
    return;
  }

  const role = roleLabelToKey(roleLabel);
  const displayName = username;
  const initials = username.slice(0, 2).toUpperCase();
  const newUser = {
    id: `usr-${Date.now()}`,
    role,
    username,
    name: displayName,
    organization: role === 'vendor' ? `${username} Organization` : 'MP Health',
    email: `${normalizeUsername(username)}@demo.mphp.gov.in`,
    phone: '9000000000',
    password,
    avatar: initials,
    title: roleLabel,
    vendorId: role === 'vendor' ? `VND-MP-${String(Math.floor(Math.random() * 900000) + 100000)}` : undefined,
    isNewAccount: true,
    isNewSignup: true
  };

  saveRegisteredUser({
    id: newUser.id,
    role: newUser.role,
    username: newUser.username,
    name: newUser.name,
    organization: newUser.organization,
    email: newUser.email,
    phone: newUser.phone,
    password: newUser.password,
    avatar: newUser.avatar,
    title: newUser.title,
    vendorId: newUser.vendorId,
    isNewAccount: true
  });

  completePortalLogin(newUser);
}

function getOtpValue(group) {
  return Array.from(document.querySelectorAll(`.auth-otp-digit[data-otp="${group}"]`))
    .map(el => el.value)
    .join('');
}

function handleOtpSubmit() {
  hideAuthAlert();
  const emailOtp = getOtpValue('email');
  const phoneOtp = getOtpValue('phone');

  if (emailOtp.length !== 6 || phoneOtp.length !== 6) {
    showAuthAlert('Please enter the complete 6-digit code for both email and mobile.');
    return;
  }
  if (emailOtp !== DEMO_EMAIL_OTP || phoneOtp !== DEMO_PHONE_OTP) {
    showAuthAlert('The verification code is incorrect. Please check your email and SMS and try again.');
    return;
  }

  if (!authPending) {
    showAuthAlert('Your session has expired. Please sign in again.');
    authView = 'login';
    updateAuthContent();
    return;
  }

  if (authPending.isNewSignup) {
    saveRegisteredUser({
      id: authPending.id,
      role: authPending.role,
      name: authPending.name,
      organization: authPending.organization,
      email: authPending.email,
      phone: authPending.phone,
      password: authPending.password,
      avatar: authPending.avatar,
      title: authPending.title,
      vendorId: authPending.vendorId,
      isNewAccount: true
    });
  }

  completePortalLogin(authPending);
}

function initOtpInputs() {
  document.querySelector('.auth-otp-digit[data-otp="email"][data-index="0"]')?.focus();
}

function handleOtpDigitInput(input) {
  input.value = input.value.replace(/\D/g, '').slice(0, 1);
  if (input.value) {
    const next = input.nextElementSibling;
    if (next?.classList.contains('auth-otp-digit')) next.focus();
  }
}

function handleOtpDigitBackspace(input, e) {
  if (!input.value && input.previousElementSibling?.classList.contains('auth-otp-digit')) {
    e.preventDefault();
    input.previousElementSibling.focus();
    input.previousElementSibling.value = '';
  }
}

function startOtpTimer() {
  stopOtpTimer();
  otpResendSeconds = 30;
  const btn = document.getElementById('btnResendOtp');
  if (!btn) return;

  btn.disabled = true;
  btn.innerHTML = `Resend in <span id="otpTimer">30</span>s`;
  otpResendTimer = setInterval(() => {
    otpResendSeconds -= 1;
    const timerEl = document.getElementById('otpTimer');
    if (timerEl) timerEl.textContent = String(otpResendSeconds);
    if (otpResendSeconds <= 0) {
      stopOtpTimer();
      btn.disabled = false;
      btn.textContent = 'Resend OTP';
    }
  }, 1000);
}

function stopOtpTimer() {
  if (otpResendTimer) {
    clearInterval(otpResendTimer);
    otpResendTimer = null;
  }
}
