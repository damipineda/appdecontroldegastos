const SUPABASE_URL = 'https://lqjkethzsdzvhmeytvlh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxamtldGh6c2R6dmhtZXl0dmxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MjExNjEsImV4cCI6MjA4MTM5NzE2MX0.dJ0K7WTWd3ipwrMbBYL15VhC2_Qr-TKXqn4bFtw-uuA';

const IS_MOBILE = Boolean(window.__IS_MOBILE_APP_MODE) || Boolean(window.Capacitor?.isNativePlatform?.());
const capSocialLoginPlugin = window.Capacitor?.Plugins?.SocialLogin;
const GOOGLE_WEB_CLIENT_ID = String(
    document.querySelector('meta[name="google-web-client-id"]')?.content || ''
).trim();

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let socialLoginInicializado = false;

function destino() {
    const params = IS_MOBILE ? '?mobile_app=1' : '';
    return `index.html${params}`;
}

function setError(msg) {
    const el = document.getElementById('loginError');
    el.textContent = msg;
    el.classList.remove('d-none');
}

function clearError() {
    document.getElementById('loginError').classList.add('d-none');
}

function traducirError(msg) {
    if (msg.includes('Anonymous sign-ins are disabled')) return 'Por favor ingresa un correo y contraseña válidos.';
    if (msg.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.';
    if (msg.includes('User already registered')) return 'Este correo ya está registrado.';
    if (msg.includes('Password should be at least')) return 'La contraseña es muy corta.';
    return msg;
}

function traducirErrorGoogle(err) {
    const msg = String(err?.message || err || '');
    if (msg.includes('GOOGLE_WEB_CLIENT_ID_NOT_CONFIGURED')) return 'Falta configurar Google nativo en la app móvil.';
    if (msg.includes('GOOGLE_NATIVE_PLUGIN_NOT_AVAILABLE')) return 'Google nativo no está disponible. Actualiza la APK.';
    if (msg.includes('NO_GOOGLE_ID_TOKEN')) return 'Google no devolvió un token válido. Intenta de nuevo.';
    if (msg.includes('12501') || msg.toLowerCase().includes('cancel')) return 'Inicio de sesión cancelado.';
    if (msg.includes('popup_closed_by_user')) return 'Cerraste la ventana de Google antes de completar.';
    return 'Error al iniciar con Google. Intenta de nuevo.';
}

async function inicializarGoogleNativo() {
    if (!IS_MOBILE) return;
    if (!capSocialLoginPlugin?.initialize) throw new Error('GOOGLE_NATIVE_PLUGIN_NOT_AVAILABLE');
    if (socialLoginInicializado) return;
    if (!GOOGLE_WEB_CLIENT_ID) throw new Error('GOOGLE_WEB_CLIENT_ID_NOT_CONFIGURED');
    await capSocialLoginPlugin.initialize({ google: { webClientId: GOOGLE_WEB_CLIENT_ID } });
    socialLoginInicializado = true;
}

function obtenerIdToken(respuesta) {
    const candidatos = [
        respuesta?.result?.idToken,
        respuesta?.result?.authentication?.idToken,
        respuesta?.idToken
    ];
    return candidatos.find(t => typeof t === 'string' && t.length > 0) || null;
}

// Configurar UI para modo móvil
function configurarParaMovil() {
    if (!IS_MOBILE) return;
    const btnFb = document.getElementById('btnLoginFacebook');
    if (btnFb) {
        btnFb.disabled = true;
        btnFb.classList.add('disabled');
    }
    const hint = document.getElementById('socialLoginHint');
    if (hint) {
        hint.textContent = 'Google funciona dentro de la app. Facebook no está habilitado en móvil.';
        hint.classList.remove('d-none');
    }
    const backLink = document.getElementById('backToLanding');
    if (backLink) backLink.classList.add('d-none');
}

// Verificar sesión existente al cargar
async function verificarSesion() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            window.location.replace(destino());
        }
    } catch (e) {
        console.warn('No se pudo verificar sesión:', e);
    }
}

// Eventos del formulario
document.getElementById('formLogin').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPassword').value.trim();
    if (!email || !pass) { setError('Por favor completa el correo y la contraseña.'); return; }

    const btn = document.getElementById('btnLogin');
    btn.disabled = true;
    try {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
    } catch (err) {
        setError(traducirError(err.message || String(err)));
        btn.disabled = false;
    }
});

document.getElementById('btnRegister').addEventListener('click', async () => {
    clearError();
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPassword').value.trim();
    if (!email || !pass) { setError('Por favor completa el correo y la contraseña.'); return; }
    if (pass.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }

    try {
        const { error } = await supabaseClient.auth.signUp({ email, password: pass });
        if (error) throw error;
        document.getElementById('loginSuccess').classList.remove('d-none');
    } catch (err) {
        setError(traducirError(err.message || String(err)));
    }
});

document.getElementById('btnLoginGoogle').addEventListener('click', async () => {
    clearError();
    try {
        if (IS_MOBILE) {
            await inicializarGoogleNativo();
            const loginNativo = await capSocialLoginPlugin.login({
                provider: 'google',
                options: { style: 'standard', filterByAuthorizedAccounts: false }
            });
            const idToken = obtenerIdToken(loginNativo);
            if (!idToken) throw new Error('NO_GOOGLE_ID_TOKEN');
            const { error } = await supabaseClient.auth.signInWithIdToken({ provider: 'google', token: idToken });
            if (error) throw error;
        } else {
            const { error } = await supabaseClient.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin + '/' }
            });
            if (error) throw error;
        }
    } catch (err) {
        setError(traducirErrorGoogle(err));
    }
});

document.getElementById('btnLoginFacebook').addEventListener('click', async () => {
    if (IS_MOBILE) { setError('Facebook no está habilitado en la app móvil.'); return; }
    clearError();
    try {
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'facebook',
            options: { redirectTo: window.location.origin + '/' }
        });
        if (error) throw error;
    } catch (err) {
        setError('Error al iniciar con Facebook. Verifica la configuración en Supabase.');
    }
});

// Escuchar cambio de sesión → redirigir al app
supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
        window.location.replace(destino());
    }
});

configurarParaMovil();
verificarSesion();
