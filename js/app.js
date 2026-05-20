
// --- CONFIGURACIÓN SUPABASE ---
window.__appBootstrapped = true;
const SUPABASE_URL = 'https://lqjkethzsdzvhmeytvlh.supabase.co'; // Tu URL (ya la detecté en el error)
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxamtldGh6c2R6dmhtZXl0dmxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MjExNjEsImV4cCI6MjA4MTM5NzE2MX0.dJ0K7WTWd3ipwrMbBYL15VhC2_Qr-TKXqn4bFtw-uuA'; // ⚠️ IMPORTANTE: Usa la clave "anon public" (empieza con "ey..."), NO la "service_role" (secret)

function mostrarErrorInicio(mensaje) {
    let alerta = document.getElementById('startupErrorAlert');
    if (!alerta) {
        alerta = document.createElement('div');
        alerta.id = 'startupErrorAlert';
        alerta.className = 'alert alert-warning text-center m-3';
        document.body.prepend(alerta);
    }
    alerta.textContent = mensaje;
}

function ocultarErrorInicio() {
    const alerta = document.getElementById('startupErrorAlert');
    if (alerta) alerta.remove();
}

async function obtenerSesionConTimeout(ms = 10000) {
    let timeoutId;
    try {
        const sessionPromise = supabaseClient.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('Timeout al consultar sesión')), ms);
        });
        return await Promise.race([sessionPromise, timeoutPromise]);
    } finally {
        clearTimeout(timeoutId);
    }
}


async function conTimeout(promesa, ms, mensaje) {
    let timeoutId;
    try {
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error(mensaje)), ms);
        });
        return await Promise.race([promesa, timeoutPromise]);
    } finally {
        clearTimeout(timeoutId);
    }
}

// Inicializar cliente
const supabaseClient = window.supabase?.createClient
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;
const IS_MOBILE_APP_MODE = Boolean(window.__IS_MOBILE_APP_MODE) || Boolean(window.Capacitor?.isNativePlatform?.());
const capAppPlugin = window.Capacitor?.Plugins?.App;
const capBrowserPlugin = window.Capacitor?.Plugins?.Browser;
const capLocalNotificationsPlugin = window.Capacitor?.Plugins?.LocalNotifications;
const capSocialLoginPlugin = window.Capacitor?.Plugins?.SocialLogin;
const REPO_OWNER = 'damipineda';
const REPO_NAME = 'appdecontroldegastos';
const FALLBACK_APK_FILENAME = 'finanzas-mobile-debug.apk';
const RELEASE_METADATA_URLS = (() => {
    const remoteUrls = [
        'https://appdecontroldegastos.vercel.app/asset/downloads/latest.json',
        `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/asset/downloads/latest.json`
    ];
    const localUrls = ['asset/downloads/latest.json'];
    const urls = IS_MOBILE_APP_MODE ? [...remoteUrls, ...localUrls] : [...localUrls, ...remoteUrls];
    return [...new Set(urls)];
})();
const GOOGLE_WEB_CLIENT_ID = String(
    window.__GOOGLE_WEB_CLIENT_ID
    || window.__APP_CONFIG__?.googleWebClientId
    || document.querySelector('meta[name="google-web-client-id"]')?.content
    || ''
).trim();
let socialLoginInicializado = false;
let releaseInfoActual = null;
let modalAppUpdate = null;
let ultimaVersionNotificada = null;
let ultimaVersionModalMostrada = null;


function obtenerIdTokenGoogleNativo(respuesta) {
    const candidatos = [
        respuesta?.result?.idToken,
        respuesta?.result?.authentication?.idToken,
        respuesta?.idToken
    ];
    return candidatos.find((token) => typeof token === 'string' && token.length > 0) || null;
}

function extraerMensajeError(err) {
    if (!err) return '';
    if (typeof err === 'string') return err;
    if (typeof err?.message === 'string') return err.message;
    if (typeof err?.error_description === 'string') return err.error_description;
    if (typeof err?.error === 'string') return err.error;
    return '';
}

async function inicializarGoogleNativoMovil() {
    if (!IS_MOBILE_APP_MODE) return;
    if (!capSocialLoginPlugin?.initialize) {
        throw new Error('GOOGLE_NATIVE_PLUGIN_NOT_AVAILABLE');
    }
    if (socialLoginInicializado) return;
    if (!GOOGLE_WEB_CLIENT_ID) {
        throw new Error('GOOGLE_WEB_CLIENT_ID_NOT_CONFIGURED');
    }

    await capSocialLoginPlugin.initialize({
        google: {
            webClientId: GOOGLE_WEB_CLIENT_ID
        }
    });
    socialLoginInicializado = true;
}

function traducirErrorLoginGoogle(err) {
    const mensaje = String(extraerMensajeError(err) || '');
    const normalizado = mensaje.toLowerCase();

    if (mensaje.includes('GOOGLE_WEB_CLIENT_ID_NOT_CONFIGURED')) {
        return 'Falta configurar Google nativo en la app móvil (webClientId).';
    }
    if (mensaje.includes('GOOGLE_NATIVE_PLUGIN_NOT_AVAILABLE')) {
        return 'Google nativo no está disponible en esta versión de la app. Actualiza la APK.';
    }
    if (mensaje.includes('NO_GOOGLE_ID_TOKEN')) {
        return 'Google no devolvió un token válido. Intenta de nuevo.';
    }
    if (normalizado.includes('unacceptable audience') || normalizado.includes('audience')) {
        return 'Google devolvió un token con audiencia inválida. Revisa Client ID web en Supabase y Google Cloud.';
    }
    if (normalizado.includes('developer_error') || normalizado.includes('12500') || normalizado.includes('10:')) {
        return 'Google rechazó la app (DEVELOPER_ERROR). Verifica package name y SHA-1/SHA-256 del cliente OAuth Android.';
    }
    if (normalizado.includes('no credentials available') || normalizado.includes('nocredential')) {
        return 'No hay credenciales de Google disponibles en este dispositivo/cuenta. Intenta elegir otra cuenta.';
    }
    if (mensaje) {
        return `Error Google: ${mensaje}`;
    }
    return 'Error al iniciar con Google. Verifica la configuración en Supabase y Google Cloud.';
}

function compararVersiones(versionA, versionB) {
    const a = String(versionA || '0.0.0').split('.').map((n) => Number(n) || 0);
    const b = String(versionB || '0.0.0').split('.').map((n) => Number(n) || 0);
    const maxLen = Math.max(a.length, b.length);

    for (let i = 0; i < maxLen; i++) {
        const va = a[i] || 0;
        const vb = b[i] || 0;
        if (va > vb) return 1;
        if (va < vb) return -1;
    }
    return 0;
}

function crearLayoutPlotly(base = {}) {
    const defaultLayout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: {
            color: '#A2A9CE',
            family: 'Inter, sans-serif',
            size: 11
        },
        margin: { t: 30, b: 40, l: 45, r: 15 },
        hoverlabel: {
            bgcolor: '#1E234F',
            bordercolor: '#4F46E5',
            font: { color: '#ffffff', family: 'Inter, sans-serif', size: 12 }
        },
        xaxis: {
            gridcolor: 'rgba(255, 255, 255, 0.03)',
            zerolinecolor: 'rgba(255, 255, 255, 0.08)',
            tickfont: { color: '#8B94B8', size: 10 },
            title: { font: { color: '#8B94B8', size: 11 } }
        },
        yaxis: {
            gridcolor: 'rgba(255, 255, 255, 0.03)',
            zerolinecolor: 'rgba(255, 255, 255, 0.08)',
            tickfont: { color: '#8B94B8', size: 10 },
            title: { font: { color: '#8B94B8', size: 11 } }
        }
    };

    const merge = (target, source) => {
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!target[key]) target[key] = {};
                merge(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
        return target;
    };

    return merge(defaultLayout, base);
}

function construirDownloadUrl(info) {
    if (info?.downloadUrl) return info.downloadUrl;
    if (info?.download_url) return info.download_url;
    const apk = info?.apk || FALLBACK_APK_FILENAME;
    return `https://github.com/${REPO_OWNER}/${REPO_NAME}/raw/main/asset/downloads/${apk}`;
}

async function obtenerReleaseInfo() {
    let mejorRelease = null;

    for (const url of RELEASE_METADATA_URLS) {
        try {
            const cacheBustedUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
            const response = await fetch(cacheBustedUrl, { cache: 'no-store' });
            if (!response.ok) continue;
            const data = await response.json();
            if (!data?.version) continue;
            const apkName = data.apk || FALLBACK_APK_FILENAME;
            const release = {
                version: data.version,
                apk: apkName,
                downloadUrl: construirDownloadUrl(data),
                updatedAt: data.updatedAt || null
            };

            if (!mejorRelease || compararVersiones(release.version, mejorRelease.version) > 0) {
                mejorRelease = release;
            }
        } catch (error) {
            console.warn(`No se pudo leer metadata desde ${url}:`, error);
        }
    }

    return mejorRelease;
}

function obtenerMensajeErrorOperacion(error, mensajePorDefecto) {
    const mensaje = String(extraerMensajeError(error) || '');
    if (mensaje.includes('AUTH_REQUIRED') || mensaje.includes('AUTH_USER_ERROR')) {
        return 'Tu sesión expiró o no está disponible. Inicia sesión nuevamente.';
    }
    return mensaje || mensajePorDefecto;
}

async function obtenerVersionInstalada() {
    if (!IS_MOBILE_APP_MODE) return null;
    if (!capAppPlugin?.getInfo) return null;
    try {
        const info = await capAppPlugin.getInfo();
        return info?.version || null;
    } catch (error) {
        console.warn('No se pudo obtener versión instalada:', error);
        return null;
    }
}

async function asegurarPermisoNotificaciones() {
    if (!IS_MOBILE_APP_MODE || !capLocalNotificationsPlugin?.checkPermissions) return false;

    try {
        const estado = await capLocalNotificationsPlugin.checkPermissions();
        if (estado?.display === 'granted') return true;

        if (!capLocalNotificationsPlugin.requestPermissions) return false;
        const permiso = await capLocalNotificationsPlugin.requestPermissions();
        return permiso?.display === 'granted';
    } catch (error) {
        console.warn('No se pudo solicitar permiso de notificaciones:', error);
        return false;
    }
}

async function notificarNuevaVersionDisponible(info) {
    if (!info?.version || ultimaVersionNotificada === info.version) return;

    const storageKey = `update_notified_${info.version}`;
    if (localStorage.getItem(storageKey)) {
        ultimaVersionNotificada = info.version;
        return;
    }

    const permitido = await asegurarPermisoNotificaciones();
    if (!permitido || !capLocalNotificationsPlugin?.schedule) return;

    try {
        await capLocalNotificationsPlugin.schedule({
            notifications: [{
                id: Number(String(info.version).replace(/\D/g, '').slice(-6) || Date.now().toString().slice(-6)),
                title: 'Nueva versión disponible',
                body: `Finanzas Personales ${info.version} ya está lista para descargar.`,
                schedule: { at: new Date(Date.now() + 1500) },
                smallIcon: 'ic_launcher',
                actionTypeId: '',
                extra: {
                    version: info.version,
                    url: info.downloadUrl || ''
                }
            }]
        });
        localStorage.setItem(storageKey, '1');
        ultimaVersionNotificada = info.version;
    } catch (error) {
        console.warn('No se pudo programar la notificación de actualización:', error);
    }
}

function refrescarEstadoBotonActualizacion(disponible) {
    const btnUpdate = document.getElementById('btnOpenUpdateModal');
    const label = document.getElementById('updateBadgeText');
    if (!btnUpdate) return;
    if (disponible?.version) {
        btnUpdate.classList.remove('d-none');
        if (label) label.textContent = `Nueva v${disponible.version}`;
    } else {
        btnUpdate.classList.add('d-none');
        if (label) label.textContent = 'Actualizar';
    }
}

function abrirModalActualizacion() {
    if (!modalAppUpdate) return;
    const versionLabel = document.getElementById('updateVersionLabel');
    if (versionLabel && releaseInfoActual?.version) {
        versionLabel.textContent = releaseInfoActual.version;
    }
    modalAppUpdate.show();
}

async function iniciarActualizacionApp() {
    const url = releaseInfoActual?.downloadUrl;
    if (!url) {
        mostrarErrorInicio('No se encontró enlace de actualización disponible.');
        return;
    }

    if (modalAppUpdate) modalAppUpdate.hide();

    if (IS_MOBILE_APP_MODE && capBrowserPlugin?.open) {
        await capBrowserPlugin.open({
            url,
            toolbarColor: '#047857'
        });
        return;
    }

    window.open(url, '_blank', 'noopener');
}

async function verificarActualizacionMovil() {
    if (!IS_MOBILE_APP_MODE) return;
    if (!releaseInfoActual?.version) return;

    const versionInstalada = await obtenerVersionInstalada();
    if (!versionInstalada) return;

    const hayNuevaVersion = compararVersiones(releaseInfoActual.version, versionInstalada) > 0;
    refrescarEstadoBotonActualizacion(hayNuevaVersion ? releaseInfoActual : null);
    if (!hayNuevaVersion) {
        ultimaVersionModalMostrada = null;
        return;
    }

    await notificarNuevaVersionDisponible(releaseInfoActual);
    if (ultimaVersionModalMostrada === releaseInfoActual.version) return;

    ultimaVersionModalMostrada = releaseInfoActual.version;
    abrirModalActualizacion();
}


async function cargarInfoVersionApk() {
    const btnDownload = document.getElementById('btnDownloadApk');
    const fileLabel = document.getElementById('apkFilenameLabel');
    releaseInfoActual = await obtenerReleaseInfo();
    if (!releaseInfoActual) {
        refrescarEstadoBotonActualizacion(null);
        return;
    }

    if (btnDownload) {
        btnDownload.href = releaseInfoActual.downloadUrl;
    }
    if (fileLabel) {
        fileLabel.textContent = `${releaseInfoActual.apk} (v${releaseInfoActual.version})`;
    }

    await verificarActualizacionMovil();
}

// --- CLASES (Modelo de Datos Local) ---
class Transaccion {
    constructor(concepto, monto, categoriaId, fecha, hora, recurrente, tipo) {
        this.concepto = concepto;
        this.monto = Number(monto);
        this.categoriaId = categoriaId;
        this.fecha = fecha; 
        this.hora = hora;
        this.recurrente = recurrente;
        this.tipo = tipo;
        // ID es manejado por la DB ahora, pero lo mantenemos para la UI
    }
}

class Store {
    // --- AUTH ---
    static async iniciarSesion(email, password) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });
        if (error) throw error;
        return data;
    }

    static async registrarse(email, password) {
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
        });
        if (error) throw error;
        return data;
    }

    static async iniciarSesionProvider(provider) {
        if (IS_MOBILE_APP_MODE && provider === 'google') {
            await inicializarGoogleNativoMovil();

            const loginNativo = await capSocialLoginPlugin.login({
                provider: 'google',
                options: {
                    style: 'standard',
                    filterByAuthorizedAccounts: false
                }
            });
            const idToken = obtenerIdTokenGoogleNativo(loginNativo);
            if (!idToken) throw new Error('NO_GOOGLE_ID_TOKEN');

            const { data, error } = await supabaseClient.auth.signInWithIdToken({
                provider: 'google',
                token: idToken
            });
            if (error) {
                throw new Error(`SUPABASE_GOOGLE_ID_TOKEN_ERROR: ${error.message || 'desconocido'}`);
            }
            return data;
        }

        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: window.location.href
            }
        });
        if (error) throw error;
        return data;
    }

    static async cerrarSesion() {
        if (IS_MOBILE_APP_MODE && capSocialLoginPlugin?.logout) {
            try {
                await capSocialLoginPlugin.logout({ provider: 'google' });
            } catch (error) {
                console.warn('No se pudo cerrar sesión nativa de Google:', error);
            }
        }

        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        location.reload();
    }

    static obtenerUsuario() {
        return supabaseClient.auth.getUser();
    }

    static async obtenerUsuarioAutenticado() {
        const { data, error } = await supabaseClient.auth.getUser();
        if (error) {
            throw new Error(`AUTH_USER_ERROR: ${error.message || 'No se pudo verificar la sesión.'}`);
        }
        if (!data?.user?.id) {
            throw new Error('AUTH_REQUIRED');
        }
        return data.user;
    }

    // --- TRANSACCIONES (Gastos e Ingresos) ---
    static obtenerRangoMes(mesStr) {
        // mesStr: 'YYYY-MM'
        const [anioStr, mesNumStr] = (mesStr || '').split('-');
        const anio = Number(anioStr);
        const mes = Number(mesNumStr);
        if (!anio || !mes) return null;

        const desde = `${anioStr}-${mesNumStr}-01`;
        const siguiente = new Date(anio, mes, 1); // mes es 1-12, Date espera 0-11; usando (anio, mes, 1) => siguiente mes
        const anioSig = siguiente.getFullYear();
        const mesSig = String(siguiente.getMonth() + 1).padStart(2, '0');
        const hasta = `${anioSig}-${mesSig}-01`;
        return { desde, hasta };
    }

    static async obtenerDatos(tipo, mesStr = null) {
        // Obtenemos transacciones filtradas por tipo desde la DB
        let query = supabaseClient
            .from('transactions')
            .select('*')
            .eq('tipo', tipo)
            .order('fecha', { ascending: false });

        const rango = mesStr ? Store.obtenerRangoMes(mesStr) : null;
        if (rango) {
            query = query.gte('fecha', rango.desde).lt('fecha', rango.hasta);
        }

        const { data, error } = await query;
        
        if (error) {
            console.error('Error fetching data:', error);
            return [];
        }
        
        // Mapeamos para que la UI lo entienda (snake_case DB -> camelCase JS)
        return data.map(d => ({
            id: d.id,
            concepto: d.concepto,
            monto: Number(d.monto),
            categoriaId: d.category_id,
            fecha: d.fecha,
            hora: d.hora,
            recurrente: d.recurrente,
            tipo: d.tipo,
            metodoPago: d.metodo_pago
        }));
    }

    static async obtenerDatoPorId(id, tipo) {
        const { data, error } = await supabaseClient
            .from('transactions')
            .select('*')
            .eq('id', id)
            .single();
            
        if (error) return null;
        
        return {
            id: data.id,
            concepto: data.concepto,
            monto: Number(data.monto),
            categoriaId: data.category_id,
            fecha: data.fecha,
            hora: data.hora,
            recurrente: data.recurrente,
            tipo: data.tipo,
            metodoPago: data.metodo_pago
        };
    }

    static async guardarDato(item, tipo) {
        const user = await Store.obtenerUsuarioAutenticado();

        // Mapeo JS -> DB
        const dbItem = {
            user_id: user.id,
            concepto: item.concepto,
            monto: item.monto,
            category_id: item.categoriaId,
            fecha: item.fecha,
            hora: item.hora,
            tipo: tipo,
            metodo_pago: item.metodoPago || null,
            recurrente: item.recurrente || false,
            debt_id: item.debtId || null
        };

        const { data, error } = await supabaseClient
            .from('transactions')
            .insert([dbItem])
            .select();

        if (error) throw error;
        return data[0];
    }

    static async actualizarDato(item, tipo) {
        const dbItem = {
            concepto: item.concepto,
            monto: item.monto,
            category_id: item.categoriaId,
            fecha: item.fecha,
            hora: item.hora,
            tipo: tipo,
            metodo_pago: item.metodoPago || null,
            recurrente: item.recurrente || false
        };

        const { error } = await supabaseClient
            .from('transactions')
            .update(dbItem)
            .eq('id', item.id);

        if (error) throw error;
    }

    static async eliminarDato(id) {
        const { error } = await supabaseClient
            .from('transactions')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
    }

    // --- CATEGORÍAS ---
    static async obtenerCategorias(tipo) {
        // Obtener categorías del usuario
        const { data, error } = await supabaseClient
            .from('categories')
            .select('*')
            .eq('tipo', tipo);

        if (error) return [];
        
        // Si no tiene categorías (usuario nuevo), crear por defecto
        if (data.length === 0) {
            await Store.crearCategoriasPorDefecto(tipo);
            return Store.obtenerCategorias(tipo); // Reintentar
        }

        return data;
    }

    static async crearCategoriasPorDefecto(tipo) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        const defaults = tipo === 'gasto' ? [
            { user_id: user.id, nombre: 'Alimentación', emoji: '🍔', color: '#ffc107', tipo: 'gasto' },
            { user_id: user.id, nombre: 'Transporte', emoji: '🚌', color: '#0dcaf0', tipo: 'gasto' },
            { user_id: user.id, nombre: 'Vivienda', emoji: '🏠', color: '#6610f2', tipo: 'gasto' },
            { user_id: user.id, nombre: 'Servicios', emoji: '💡', color: '#fd7e14', tipo: 'gasto' }
        ] : [
            { user_id: user.id, nombre: 'Salario', emoji: '💰', color: '#198754', tipo: 'ingreso' },
            { user_id: user.id, nombre: 'Inversiones', emoji: '📈', color: '#0d6efd', tipo: 'ingreso' }
        ];

        const { error } = await supabaseClient.from('categories').insert(defaults);
        if (error) console.error('Error creando defaults:', error);
    }

    static async agregarCategoria(cat) {
        const user = await Store.obtenerUsuarioAutenticado();
        
        const { error } = await supabaseClient.from('categories').insert([{
            user_id: user.id,
            nombre: cat.nombre,
            emoji: cat.emoji,
            color: cat.color,
            tipo: cat.tipo
        }]);
        if (error) throw error;
    }

    static async actualizarCategoria(cat) {
        const { error } = await supabaseClient
            .from('categories')
            .update({
                nombre: cat.nombre,
                emoji: cat.emoji,
                color: cat.color
            })
            .eq('id', cat.id);
        if (error) throw error;
    }

    static async eliminarCategoria(id) {
        // Verificar si tiene transacciones asociadas
        const { count, error: countError } = await supabaseClient
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', id);

        if (countError) throw countError;
        if (count > 0) throw new Error('No se puede eliminar esta categoría porque tiene transacciones asociadas.');

        const { error } = await supabaseClient
            .from('categories')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
    }

    static async obtenerCategoriaPorId(id) {
        // En una app real, idealmente tendríamos un caché de categorías para no consultar por cada fila
        // Por simplicidad, aquí asumiremos que UI.categoriasCache tiene los datos cargados
        return UI.categoriasCache.find(c => c.id === id) || { nombre: 'Desconocido', emoji: '❓', color: '#ccc' };
    }

    // --- PRESUPUESTOS ---
    static async obtenerPresupuestos() {
        const { data, error } = await supabaseClient.from('budgets').select('*');
        if (error) return {};
        
        // Convertir array a objeto { category_id: monto }
        const map = {};
        data.forEach(b => map[b.category_id] = b.monto);
        return map;
    }

    static async guardarPresupuesto(categoriaId, monto) {
        const user = await Store.obtenerUsuarioAutenticado();

        const { error } = await supabaseClient
            .from('budgets')
            .upsert({ user_id: user.id, category_id: categoriaId, monto: monto }, { onConflict: 'user_id,category_id' });
        
        if (error) throw error;
    }

    // --- RECURRENTES ---
    static async obtenerRecurrentes() {
        const { data, error } = await supabaseClient.from('recurrent_templates').select('*');
        if (error) return [];
        return data;
    }

    static async guardarRecurrente(item) {
        const user = await Store.obtenerUsuarioAutenticado();
        const payload = {
            user_id: user.id,
            concepto: item.concepto,
            monto: item.monto || null,
            emoji: item.emoji || '📝',
            category_id: item.categoriaId,
            dia_vencimiento: item.dia || null
        };

        if (item.id) {
            const { error } = await supabaseClient.from('recurrent_templates').update(payload).eq('id', item.id);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient.from('recurrent_templates').insert([payload]);
            if (error) throw error;
        }
    }

    static async eliminarRecurrente(id) {
        const { error } = await supabaseClient.from('recurrent_templates').delete().eq('id', id);
        if (error) throw error;
    }

    static async obtenerRecurrentePorId(id) {
        const { data, error } = await supabaseClient.from('recurrent_templates').select('*').eq('id', id).single();
        if (error) return null;
        return data;
    }

    // --- DEUDAS ---
    static async obtenerDeudas() {
        const { data, error } = await supabaseClient.from('debts').select('*');
        if (error) return [];
        return data;
    }

    static async guardarDeuda(item) {
        const user = await Store.obtenerUsuarioAutenticado();
        const payload = {
            user_id: user.id,
            concepto: item.concepto,
            emoji: item.emoji || '💳',
            monto_total: item.monto,
            cuota_monto: item.cuotaMonto || null,
            total_cuotas: item.cuotas,
            cuotas_pagadas: item.pagadas,
            fecha_inicio: item.fechaInicio || null
        };

        if (item.id) {
            const { error } = await supabaseClient.from('debts').update(payload).eq('id', item.id);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient.from('debts').insert([payload]);
            if (error) throw error;
        }
    }

    static async obtenerDeudaPorId(id) {
        const { data, error } = await supabaseClient.from('debts').select('*').eq('id', id).single();
        if (error) return null;
        return data;
    }

    static async actualizarProgresoDeuda(id, pagadoExtra = 1) {
        // Incrementa cuotas pagadas (simple)
        // En una app real, verificaríamos que no pase el total
        const { error } = await supabaseClient.rpc('increment_debt_progress', { debt_id: id });
        // Como no tengo RPC, lo hago manual:
        const { data: deuda } = await supabaseClient.from('debts').select('*').eq('id', id).single();
        if(deuda) {
            await supabaseClient.from('debts').update({ cuotas_pagadas: deuda.cuotas_pagadas + 1 }).eq('id', id);
        }
    }
    
    static async eliminarDeuda(id) {
        const { error } = await supabaseClient.from('debts').delete().eq('id', id);
        if (error) throw error;
    }
}

class UI {
    static chartGastos = null;
    static chartBalance = null;
    static categoriasCache = []; // Caché para no consultar DB repetidamente

    static formatearMoneda(cantidad) {
        return new Intl.NumberFormat('es-PY').format(cantidad) + ' Gs.';
    }

    static initPicker() {
        if (UI.pickerEmoji) return;

        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.zIndex = '1060'; // Encima de modales
        container.style.display = 'none';
        document.body.appendChild(container);
        
        UI.pickerEmoji = picmo.createPicker({ rootElement: container, showPreview: false });
        UI.pickerEmojiContainer = container;

        // Cerrar al click fuera
        document.addEventListener('click', (e) => {
            if (container.style.display === 'block' && 
                !container.contains(e.target) && 
                !e.target.classList.contains('btn-emoji-trigger')) {
                UI.pickerEmojiContainer.style.display = 'none';
            }
        });

        // Cerrar al scrollear (Solo si el scroll ocurre FUERA del picker)
        window.addEventListener('scroll', (e) => {
             if(UI.pickerEmojiContainer.style.display === 'block') {
                 // Si el scroll viene de dentro del picker, NO cerrar
                 if (UI.pickerEmojiContainer.contains(e.target)) return;
                 
                 UI.pickerEmojiContainer.style.display = 'none';
             }
        }, { capture: true, passive: true });
    }

    static abrirPicker(btn, callback) {
        if (!UI.pickerEmoji) UI.initPicker();

        const rect = btn.getBoundingClientRect();
        UI.pickerEmojiContainer.style.top = (rect.bottom + window.scrollY) + 'px';
        UI.pickerEmojiContainer.style.left = rect.left + 'px';
        UI.pickerEmojiContainer.style.display = 'block';

        // Limpiar listener anterior
        if (UI.pickerEmojiContainer.currentHandler) {
            UI.pickerEmoji.removeEventListener('emoji:select', UI.pickerEmojiContainer.currentHandler);
        }

        // Nuevo handler
        const handler = (selection) => {
            callback(selection);
            UI.pickerEmojiContainer.style.display = 'none';
        };

        UI.pickerEmojiContainer.currentHandler = handler;
        UI.pickerEmoji.addEventListener('emoji:select', handler);
    }


    static limpiarEstadoModal() {
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('padding-right');
        document.body.style.removeProperty('overflow');
    }

    static cerrarModal(modalId) {
        const modalEl = document.getElementById(modalId);
        if (!modalEl) return;

        // Intentar obtener instancia existente o crear una nueva para ocultar
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        
        // 1. Ocultar vía Bootstrap
        modal.hide();

        // 2. Limpieza forzada después de un tiempo prudencial
        // Esto asegura que si el evento hidden.bs.modal falla, limpiamos igual
        setTimeout(() => {
            UI.limpiarEstadoModal();
            
            // Asegurar que el modal esté oculto visualmente
            modalEl.classList.remove('show');
            modalEl.style.display = 'none';
            modalEl.setAttribute('aria-hidden', 'true');
            modalEl.removeAttribute('aria-modal');
            modalEl.removeAttribute('role');
        }, 300);
    }

    static async cargarTodo() {
        // 1. Cargar Categorías (Paralelo)
        const [catGastos, catIngresos] = await Promise.all([
            Store.obtenerCategorias('gasto'),
            Store.obtenerCategorias('ingreso')
        ]);
        
        UI.categoriasCache = [...catGastos, ...catIngresos];

        // Llenar selects
        UI.llenarSelectCategorias('gasto', catGastos);
        UI.llenarSelectCategorias('ingreso', catIngresos);
        UI.llenarSelectCategorias('presupuesto', catGastos);

        // 2. Cargar Datos y Planificación (Paralelo)
        await Promise.all([
            UI.renderizarListas(),
            UI.renderizarDeudas(),
            UI.renderizarRecurrentes()
        ]);
        
        // 3. Ocultar loader después de cargar todo
        UI.toggleLoader(false);
    }

    static llenarSelectCategorias(tipo, datos) {
        // Si es presupuesto, usamos los datos de gastos pasados
        const categorias = tipo === 'presupuesto' ? datos : datos; 
        
        const selector = tipo === 'gasto' ? '#gastoCategoria' : (tipo === 'ingreso' ? '#ingresoCategoria' : '#presupuestoCategoria');
        const select = document.querySelector(selector);
        
        if (!select) return;

        select.innerHTML = '<option value="" selected disabled>Seleccione...</option>';
        categorias.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = `${cat.emoji} ${cat.nombre}`;
            select.appendChild(option);
        });
    }

    static setLoadingButton(btnId, isLoading, defaultText = 'Guardar') {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        
        if (isLoading) {
            btn.disabled = true;
            if(!btn.dataset.originalText) btn.dataset.originalText = btn.textContent;
            btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...`;
        } else {
            btn.disabled = false;
            btn.textContent = btn.dataset.originalText || defaultText;
        }
    }

    static toggleLoader(mostrar) {
        const loader = document.getElementById('globalLoader');
        if (!loader) return;
        
        if (mostrar) {
            loader.classList.remove('d-none');
            loader.style.display = 'flex';
        } else {
            loader.classList.add('d-none');
            loader.style.display = 'none';
        }
    }

    static formatearFecha(fechaStr) {
        // Recibe YYYY-MM-DD y retorna DD/MM/YYYY sin conversión de zona horaria
        if (!fechaStr) return '';
        const [anio, mes, dia] = fechaStr.split('-');
        return `${dia}/${mes}/${anio}`;
    }

    static async renderizarDeudas() {
        const deudas = await Store.obtenerDeudas();
        const listaDeudas = document.querySelector('#listaDeudas');
        const noDeudas = document.querySelector('#noDeudas');
        if (!listaDeudas) return;
        
        listaDeudas.innerHTML = '';

        const deudasOrdenadas = [...deudas].sort((a, b) => {
            const restanteA = (a.total_cuotas || 0) - (a.cuotas_pagadas || 0);
            const restanteB = (b.total_cuotas || 0) - (b.cuotas_pagadas || 0);
            return restanteB - restanteA;
        });
        const deudasPendientes = deudasOrdenadas.filter(d => (d.cuotas_pagadas || 0) < (d.total_cuotas || 0));
        const deudasPagadas = deudasOrdenadas.filter(d => (d.cuotas_pagadas || 0) >= (d.total_cuotas || 0));

        // Stats
        const elTotalDeudas = document.getElementById('planTotalDeudas');
        if (elTotalDeudas) elTotalDeudas.textContent = deudasPendientes.length;
        
        const elSaldadas = document.getElementById('deudasSaldadasCount');
        if (elSaldadas) elSaldadas.textContent = deudasPagadas.length;
        
        const totalPendiente = deudasPendientes.reduce((sum, d) => {
            const restante = (d.total_cuotas || 0) - (d.cuotas_pagadas || 0);
            return sum + (d.cuota_monto ? d.cuota_monto * restante : 0);
        }, 0);
        const elTotalPendiente = document.getElementById('deudasTotalPendiente');
        if (elTotalPendiente) elTotalPendiente.textContent = UI.formatearMoneda(totalPendiente);

        if (deudasPendientes.length === 0) {
            noDeudas.style.display = 'block';
        } else {
            noDeudas.style.display = 'none';

            deudasPendientes.forEach(d => {
                const totalCuotas = Math.max(Number(d.total_cuotas || 0), 1);
                const cuotasPagadas = Math.min(Number(d.cuotas_pagadas || 0), totalCuotas);
                const cuotasRestantes = Math.max(totalCuotas - cuotasPagadas, 0);
                const progreso = Math.min((cuotasPagadas / totalCuotas) * 100, 100);
                const isEndingSoon = cuotasRestantes <= 3 && cuotasRestantes > 0;

                let fechaFin = '-';
                if (d.fecha_inicio) {
                    const parts = d.fecha_inicio.split('-');
                    const fecha = new Date(parts[0], parts[1] - 1, parts[2]);
                    fecha.setMonth(fecha.getMonth() + totalCuotas);
                    fechaFin = fecha.toLocaleDateString('es-PY', { month: 'short', year: 'numeric' });
                }

                const montoPagado = d.cuota_monto
                    ? d.cuota_monto * cuotasPagadas
                    : Math.round(d.monto_total * progreso / 100);
                const montoRestante = d.cuota_monto
                    ? d.cuota_monto * cuotasRestantes
                    : Math.round(d.monto_total * (100 - progreso) / 100);

                const div = document.createElement('div');
                div.className = 'deuda-card' + (isEndingSoon ? ' ending' : '');
                div.innerHTML = `
                    <div class="deuda-card-main">
                        <div class="deuda-card-left">
                            <div class="deuda-emoji-box">${d.emoji || '💳'}</div>
                            <div class="deuda-name-group">
                                <h4 class="deuda-name">${d.concepto}</h4>
                                <span class="deuda-status-badge ${isEndingSoon ? 'ending' : ''}">
                                    ${isEndingSoon ? '⏳ Por terminar' : '🔄 Activa'}
                                </span>
                            </div>
                        </div>
                        <div class="deuda-card-numbers">
                            <div class="deuda-num-block">
                                <span class="deuda-num-label">Total</span>
                                <span class="deuda-num-val">${UI.formatearMoneda(d.monto_total)}</span>
                            </div>
                            <div class="deuda-num-block deuda-num-paid">
                                <span class="deuda-num-label">Pagado</span>
                                <span class="deuda-num-val">${UI.formatearMoneda(montoPagado)}</span>
                            </div>
                            <div class="deuda-num-block deuda-num-pending">
                                <span class="deuda-num-label">Pendiente</span>
                                <span class="deuda-num-val">${UI.formatearMoneda(montoRestante)}</span>
                            </div>
                            <div class="deuda-num-block deuda-num-cuotas">
                                <span class="deuda-num-label">Cuotas</span>
                                <span class="deuda-num-val">${cuotasPagadas}<span style="color:var(--text-tertiary);font-weight:500;font-size:0.75rem"> / ${totalCuotas}</span></span>
                            </div>
                        </div>
                        <div class="deuda-card-controls">
                            <button class="btn btn-sm btn-outline-secondary btn-edit-deuda" data-id="${d.id}" title="Editar"><i class="bi bi-pencil"></i></button>
                            <button class="btn btn-sm btn-outline-danger btn-del-deuda" data-id="${d.id}" title="Eliminar"><i class="bi bi-trash"></i></button>
                        </div>
                    </div>
                    <div class="deuda-card-bar-row">
                        <div class="deuda-bar-track">
                            <div class="deuda-bar-fill-new" style="width: ${progreso}%"></div>
                        </div>
                        <div class="deuda-bar-meta">
                            <span class="deuda-bar-pct">${Math.round(progreso)}%</span>
                            ${fechaFin !== '-' ? '<span class="deuda-bar-fin">· hasta ' + fechaFin + '</span>' : ''}
                        </div>
                    </div>
                `;
                listaDeudas.appendChild(div);
            });

            listaDeudas.querySelectorAll('.btn-del-deuda').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if(confirm('¿Eliminar registro de deuda?')) {
                        await Store.eliminarDeuda(btn.dataset.id);
                        UI.renderizarDeudas();
                    }
                });
            });

            listaDeudas.querySelectorAll('.btn-edit-deuda').forEach(btn => {
                btn.addEventListener('click', async () => {
                    try {
                        const item = await Store.obtenerDeudaPorId(btn.dataset.id);
                        if (!item) throw new Error('No se encontró la deuda');
                        document.querySelector('#deudaIdEdit').value = item.id;
                        document.querySelector('#deudaConcepto').value = item.concepto;
                        document.querySelector('#deudaMonto').value = item.monto_total;
                        document.querySelector('#deudaCuotas').value = item.total_cuotas;
                        document.querySelector('#deudaPagadas').value = item.cuotas_pagadas;
                        document.querySelector('#deudaCuotaMonto').value = item.cuota_monto;
                        document.querySelector('#deudaFechaInicio').value = item.fecha_inicio;
                        document.querySelector('#btnEmojiDeuda').textContent = item.emoji || '💳';
                        document.querySelector('#modalDeudaTitle').textContent = 'Editar Deuda';
                        const modalEl = document.getElementById('modalDeuda');
                        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
                        modal.show();
                    } catch (err) {
                        console.error(err);
                        alert('Error al cargar la deuda.');
                    }
                });
            });
        }

        // Historial de deudas saldadas
        const historialContainer = document.getElementById('deudasHistorial');
        const historialList = document.getElementById('listaDeudasHistorial');
        const historialCount = document.getElementById('deudasHistorialCount');
        const btnTogglehistorial = document.getElementById('btnToggleHistorial');

        if (deudasPagadas.length > 0) {
            historialContainer.style.display = 'block';
            historialCount.textContent = deudasPagadas.length;
            historialList.innerHTML = '';

            deudasPagadas.forEach(d => {
                const item = document.createElement('div');
                item.className = 'deuda-historial-item';
                item.innerHTML = `
                    <div class="deuda-historial-item-info">
                        <span class="deuda-historial-item-emoji">${d.emoji || '💳'}</span>
                        <span class="deuda-historial-item-name">${d.concepto}</span>
                        <span class="deuda-historial-item-badge"><i class="bi bi-check-circle-fill me-1"></i>Saldada</span>
                    </div>
                    <span class="deuda-historial-item-amount">${UI.formatearMoneda(d.monto_total)}</span>
                    <div class="deuda-historial-item-actions">
                        <button class="btn btn-sm btn-outline-secondary btn-edit-deuda" data-id="${d.id}" title="Ver detalle"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-outline-danger btn-del-deuda" data-id="${d.id}" title="Eliminar"><i class="bi bi-trash"></i></button>
                    </div>
                `;
                historialList.appendChild(item);
            });

            historialList.querySelectorAll('.btn-del-deuda').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if(confirm('¿Eliminar este registro de deuda saldada?')) {
                        await Store.eliminarDeuda(btn.dataset.id);
                        UI.renderizarDeudas();
                    }
                });
            });

            historialList.querySelectorAll('.btn-edit-deuda').forEach(btn => {
                btn.addEventListener('click', async () => {
                    try {
                        const item = await Store.obtenerDeudaPorId(btn.dataset.id);
                        if (!item) throw new Error('No se encontró la deuda');
                        document.querySelector('#deudaIdEdit').value = item.id;
                        document.querySelector('#deudaConcepto').value = item.concepto;
                        document.querySelector('#deudaMonto').value = item.monto_total;
                        document.querySelector('#deudaCuotas').value = item.total_cuotas;
                        document.querySelector('#deudaPagadas').value = item.cuotas_pagadas;
                        document.querySelector('#deudaCuotaMonto').value = item.cuota_monto;
                        document.querySelector('#deudaFechaInicio').value = item.fecha_inicio;
                        document.querySelector('#btnEmojiDeuda').textContent = item.emoji || '💳';
                        document.querySelector('#modalDeudaTitle').textContent = 'Editar Deuda';
                        const modalEl = document.getElementById('modalDeuda');
                        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
                        modal.show();
                    } catch (err) {
                        console.error(err);
                        alert('Error al cargar la deuda.');
                    }
                });
            });

            btnTogglehistorial.onclick = () => {
                const isOpen = historialList.classList.contains('is-open');
                if (isOpen) {
                    historialList.classList.remove('is-open');
                    btnTogglehistorial.classList.remove('is-open');
                    btnTogglehistorial.setAttribute('aria-expanded', 'false');
                } else {
                    historialList.classList.add('is-open');
                    btnTogglehistorial.classList.add('is-open');
                    btnTogglehistorial.setAttribute('aria-expanded', 'true');
                }
            };
        } else {
            historialContainer.style.display = 'none';
            historialList.innerHTML = '';
            historialList.classList.remove('is-open');
        }
    }

    static async renderizarRecurrentes() {
        const recurrentes = await Store.obtenerRecurrentes();
        const listaRecurrentes = document.querySelector('#listaRecurrentes');
        const noRecurrentes = document.querySelector('#noRecurrentes');
        if (!listaRecurrentes) return;
        
        listaRecurrentes.innerHTML = '';

        if (recurrentes.length === 0) {
            noRecurrentes.style.display = 'block';
        } else {
            noRecurrentes.style.display = 'none';

            recurrentes.forEach(r => {
                // Calculate days until due this month
                let daysLabel = '';
                let daysClass = 'ok';
                if (r.dia_vencimiento) {
                    const today = new Date();
                    const dueThisMonth = new Date(today.getFullYear(), today.getMonth(), r.dia_vencimiento);
                    let diff = Math.ceil((dueThisMonth - today) / (1000 * 60 * 60 * 24));
                    if (diff < 0) {
                        const dueNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, r.dia_vencimiento);
                        diff = Math.ceil((dueNextMonth - today) / (1000 * 60 * 60 * 24));
                    }
                    if (diff === 0) { daysClass = 'past'; daysLabel = 'Hoy'; }
                    else if (diff < 0) { daysClass = 'past'; daysLabel = 'Vencido'; }
                    else if (diff <= 5) { daysClass = 'soon'; daysLabel = `${diff}d`; }
                    else { daysClass = 'ok'; daysLabel = `${diff}d`; }
                }

                const div = document.createElement('div');
                div.className = 'rec-card';
                div.innerHTML = `
                    <div class="rec-card-top">
                        <div class="rec-card-icon">${r.emoji || '🔄'}</div>
                        <div class="rec-card-badges">
                            ${r.dia_vencimiento ? '<span class="rec-day-chip"><i class="bi bi-calendar2 me-1"></i>Día ' + r.dia_vencimiento + '</span>' : '<span class="rec-day-chip">Sin fecha</span>'}
                            ${daysLabel ? '<span class="rec-days-chip ' + daysClass + '">'+daysLabel+'</span>' : ''}
                        </div>
                    </div>
                    <h4 class="rec-card-title">${r.concepto}</h4>
                    <div class="rec-card-footer-v2">
                        <span class="rec-card-amount">${r.monto ? UI.formatearMoneda(r.monto) : 'Variable'}</span>
                        <div class="rec-footer-right">
                            <button class="btn-usar-rec btn-usar-plantilla" data-id="${r.id}" title="Usar plantilla en gastos"><i class="bi bi-arrow-right-circle me-1"></i>Usar</button>
                            <button class="btn btn-sm btn-outline-secondary btn-edit-rec" data-id="${r.id}" title="Editar"><i class="bi bi-pencil"></i></button>
                            <button class="btn btn-sm btn-outline-danger btn-del-rec" data-id="${r.id}" title="Eliminar"><i class="bi bi-trash"></i></button>
                        </div>
                    </div>
                `;
                listaRecurrentes.appendChild(div);
            });

            listaRecurrentes.querySelectorAll('.btn-del-rec').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if(confirm('¿Eliminar esta plantilla recurrente?')) {
                        await Store.eliminarRecurrente(btn.dataset.id);
                        UI.renderizarRecurrentes();
                    }
                });
            });

            listaRecurrentes.querySelectorAll('.btn-edit-rec').forEach(btn => {
                btn.addEventListener('click', async () => {
                    try {
                        const item = await Store.obtenerRecurrentePorId(btn.dataset.id);
                        if (!item) throw new Error('No se encontró el recurrente');
                        document.querySelector('#recIdEdit').value = item.id;
                        document.querySelector('#recConcepto').value = item.concepto;
                        document.querySelector('#recMonto').value = item.monto;
                        document.querySelector('#recDia').value = item.dia_vencimiento;
                        document.querySelector('#btnEmojiRec').textContent = item.emoji || '🔄';
                        document.querySelector('#modalRecurrenteTitle').textContent = 'Editar Plantilla';
                        const modalEl = document.getElementById('modalRecurrente');
                        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
                        modal.show();
                    } catch (err) {
                        console.error(err);
                        alert('Error al cargar los datos para editar.');
                    }
                });
            });

            listaRecurrentes.querySelectorAll('.btn-usar-plantilla').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.dataset.id;
                    const select = document.querySelector('#gastoPlantilla');
                    if (!select) return;
                    select.value = id;
                    select.dispatchEvent(new Event('change'));
                    const gastosTabBtn = document.getElementById('gastos-tab');
                    if (gastosTabBtn) activarTab(gastosTabBtn, { scrollTop: true });
                });
            });
        }
    }

    static async renderizarListas() {
        let filtroMes = document.querySelector('#filtroMes').value;
        if (!filtroMes) {
            const hoy = new Date();
            filtroMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
            document.querySelector('#filtroMes').value = filtroMes;
        }

        const topPeriodTitle = document.getElementById('topPeriodTitle');
        if (topPeriodTitle && filtroMes) {
            const [anio, mes] = filtroMes.split('-');
            const fechaTitulo = new Date(Number(anio), Number(mes) - 1, 1);
            topPeriodTitle.textContent = fechaTitulo.toLocaleDateString('es-PY', { month: 'long', year: 'numeric' });
        }

        // Update greeting
        const appGreeting = document.getElementById('appGreeting');
        if (appGreeting) {
            const hora = new Date().getHours();
            let saludo = 'Buenas noches';
            if (hora < 12) saludo = 'Buenos días';
            else if (hora < 18) saludo = 'Buenas tardes';
            appGreeting.textContent = saludo;
        }

        // Obtener datos DB ya filtrados por mes (Paralelo)
        const [gastos, ingresos] = await Promise.all([
            Store.obtenerDatos('gasto', filtroMes),
            Store.obtenerDatos('ingreso', filtroMes)
        ]);

        // Ordenar por string (YYYY-MM-DD funciona correctamente alfabetica y cronologicamente)
        // Nota: ya viene ordenado desde la DB, pero mantenemos para consistencia.
        gastos.sort((a, b) => b.fecha.localeCompare(a.fecha));
        ingresos.sort((a, b) => b.fecha.localeCompare(a.fecha));

        // --- Render GASTOS ---
        const listaGastos = document.querySelector('#listaGastos');
        listaGastos.innerHTML = '';
        
        if (gastos.length === 0) {
            document.querySelector('#noGastos').style.display = 'block';
        } else {
            document.querySelector('#noGastos').style.display = 'none';
            for (const g of gastos) {
                const cat = await Store.obtenerCategoriaPorId(g.categoriaId);
                const item = document.createElement('article');
                item.className = 'activity-item';
                item.innerHTML = `
                    <div class="activity-item-main">
                        <div class="activity-item-icon expense">
                            <span>${cat.emoji || '💸'}</span>
                        </div>
                        <div class="activity-item-copy">
                            <h3>${g.concepto}</h3>
                            <p>${cat.nombre} · ${UI.formatearFecha(g.fecha)} · ${g.hora || '--:--'}</p>
                            <small>Método: ${g.metodoPago || 'No definido'}</small>
                        </div>
                    </div>
                    <div class="activity-item-meta">
                        <strong class="expense">- ${UI.formatearMoneda(g.monto)}</strong>
                        <div class="activity-item-actions">
                            <button class="btn btn-outline-secondary btn-sm edit" data-id="${g.id}" data-tipo="gasto" aria-label="Editar gasto">Editar</button>
                            <button class="btn btn-outline-danger btn-sm delete" data-id="${g.id}" data-tipo="gasto" aria-label="Eliminar gasto">Eliminar</button>
                        </div>
                    </div>
                `;
                listaGastos.appendChild(item);
            }
        }

        // --- Render INGRESOS ---
        const listaIngresos = document.querySelector('#listaIngresos');
        listaIngresos.innerHTML = '';

        if (ingresos.length === 0) {
            document.querySelector('#noIngresos').style.display = 'block';
        } else {
            document.querySelector('#noIngresos').style.display = 'none';
            for (const i of ingresos) {
                const cat = await Store.obtenerCategoriaPorId(i.categoriaId);
                const item = document.createElement('article');
                item.className = 'activity-item';
                item.innerHTML = `
                    <div class="activity-item-main">
                        <div class="activity-item-icon income">
                            <span>${cat.emoji || '💰'}</span>
                        </div>
                        <div class="activity-item-copy">
                            <h3>${i.concepto}</h3>
                            <p>${cat.nombre} · ${UI.formatearFecha(i.fecha)} · ${i.hora || '--:--'}</p>
                            <small>Ingreso registrado</small>
                        </div>
                    </div>
                    <div class="activity-item-meta">
                        <strong class="income">+ ${UI.formatearMoneda(i.monto)}</strong>
                        <div class="activity-item-actions">
                            <button class="btn btn-outline-secondary btn-sm edit" data-id="${i.id}" data-tipo="ingreso" aria-label="Editar ingreso">Editar</button>
                            <button class="btn btn-outline-danger btn-sm delete" data-id="${i.id}" data-tipo="ingreso" aria-label="Eliminar ingreso">Eliminar</button>
                        </div>
                    </div>
                `;
                listaIngresos.appendChild(item);
            }
        }

        UI.actualizarDashboard(ingresos, gastos);
        await UI.renderizarPresupuestos(gastos);
        
        // Actualizar selects de gastos (presupuestos, deudas, recurrentes)
        await UI.renderizarOpcionesGasto();
        
        // Renderizar tabs independientes
        await UI.renderizarDeudas();
        await UI.renderizarRecurrentes();
    }

    static async renderizarOpcionesGasto() {
        // 1. Llenar Select de Plantillas
        const recurrentes = await Store.obtenerRecurrentes();
        const selectPlantilla = document.querySelector('#gastoPlantilla');
        selectPlantilla.innerHTML = '<option value="" selected>-- Seleccionar (Opcional) --</option>';
        recurrentes.forEach(r => {
            const opt = document.createElement('option');
            opt.value = JSON.stringify(r); // Guardamos todo el objeto
            opt.textContent = `${r.concepto} (${r.monto ? UI.formatearMoneda(r.monto) : 'Variable'})`;
            selectPlantilla.appendChild(opt);
        });

        // 2. Llenar Select de Deudas
        const deudas = await Store.obtenerDeudas();
        const selectDeuda = document.querySelector('#gastoDeuda');
        selectDeuda.innerHTML = '<option value="" selected>-- Ninguna --</option>';
        deudas.forEach(d => {
            if (d.cuotas_pagadas < d.total_cuotas) {
                const opt = document.createElement('option');
                opt.value = d.id;
                opt.textContent = `${d.concepto} (Cuota ${d.cuotas_pagadas + 1}/${d.total_cuotas})`;
                selectDeuda.appendChild(opt);
            }
        });
    }

    static actualizarDashboard(ingresos, gastos) {
        const totalIngresos = ingresos.reduce((sum, i) => sum + i.monto, 0);
        const totalGastos   = gastos.reduce((sum, g) => sum + g.monto, 0);
        const balance       = totalIngresos - totalGastos;
        const pctAhorro     = totalIngresos > 0 ? ((balance / totalIngresos) * 100).toFixed(1) : 0;
        const pctGasto      = totalIngresos > 0 ? Math.min((totalGastos / totalIngresos) * 100, 100) : 0;

        // Valores
        document.querySelector('#dashBalance').textContent   = UI.formatearMoneda(balance);
        document.querySelector('#dashIngresos').textContent  = UI.formatearMoneda(totalIngresos);
        document.querySelector('#dashGastos').textContent    = UI.formatearMoneda(totalGastos);
        document.querySelector('#dashAhorro').textContent    = UI.formatearMoneda(balance);
        document.querySelector('#dashAhorroPct').textContent = `${pctGasto.toFixed(1)}% del ingreso en gastos`;

        // Barra de gastos vs ingresos
        const barGastos = document.getElementById('dashGastosBar');
        if (barGastos) barGastos.style.width = pctGasto + '%';

        // Chip de balance
        const chip = document.querySelector('#dashBalanceChip');
        if (chip) {
            chip.textContent = balance >= 0 ? 'Positivo' : 'Negativo';
            chip.className = 'dash-kpi-chip' + (balance < 0 ? ' negative' : '');
        }

        UI.renderizarGraficos(ingresos, gastos);
        UI.renderizarPanelRecurrentes();
    }

    static async renderizarGraficos(ingresos, gastos) {
        // --- 1. Gráfico de Gastos (Dona) ---
        const gastosPorCat = {};
        for (const g of gastos) {
            const cat = await Store.obtenerCategoriaPorId(g.categoriaId);
            if (!gastosPorCat[cat.nombre]) {
                gastosPorCat[cat.nombre] = { monto: 0, color: cat.color, emoji: cat.emoji };
            }
            gastosPorCat[cat.nombre].monto += g.monto;
        }

        const labels = Object.keys(gastosPorCat);
        const values = Object.values(gastosPorCat).map(d => d.monto);
        const colors = Object.values(gastosPorCat).map(d => d.color);

        const dataGastos = [{
            values: values,
            labels: labels,
            type: 'pie',
            hole: 0.65,
            marker: { colors: colors, line: { color: '#0c0e27', width: 2 } },
            textinfo: 'none',
            hoverinfo: 'label+value+percent',
            hovertemplate: '<b>%{label}</b><br>%{value:,.0f} Gs. (%{percent})<extra></extra>'
        }];

        const layoutGastos = crearLayoutPlotly({
            height: 350,
            margin: { t: 10, b: 10, l: 10, r: 10 },
            showlegend: true,
            legend: { orientation: 'h', y: -0.15, font: { size: 10 } }
        });

        Plotly.newPlot('chartGastos', dataGastos, layoutGastos, {displayModeBar: false});

        // --- 2. Gráfico Balance (Barras) ---
        const totalIngresos = ingresos.reduce((sum, i) => sum + i.monto, 0);
        const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0);
        
        const dataBalance = [{
            x: ['Ingresos', 'Gastos'],
            y: [totalIngresos, totalGastos],
            type: 'bar',
            width: [0.45, 0.45],
            marker: {
                color: ['#10B981', '#F43F5E'],
                line: { color: ['rgba(16, 185, 129, 0.2)', 'rgba(244, 63, 94, 0.2)'], width: 1 }
            },
            text: [UI.formatearMoneda(totalIngresos), UI.formatearMoneda(totalGastos)],
            textposition: 'auto',
            textfont: { family: 'Inter', weight: 'bold', color: '#ffffff' },
            hovertemplate: '<b>%{x}</b><br>%{y:,.0f} Gs.<extra></extra>'
        }];

        const layoutBalance = crearLayoutPlotly({
            height: 350,
            margin: { t: 20, b: 30, l: 45, r: 15 },
            xaxis: { fixedrange: true },
            yaxis: { fixedrange: true, title: 'Guaraníes' }
        });

        Plotly.newPlot('chartBalance', dataBalance, layoutBalance, {displayModeBar: false});

        // --- 3. Ranking de Categorías ---
        const rankingContainer = document.querySelector('#rankingCategorias');
        rankingContainer.innerHTML = '';
        const sortedCats = Object.entries(gastosPorCat)
            .sort(([,a], [,b]) => b.monto - a.monto)
            .slice(0, 6);
        if (sortedCats.length === 0) {
            rankingContainer.innerHTML = '<div class="dash-payments-empty"><i class="bi bi-bar-chart"></i><span>Sin gastos este periodo</span></div>';
        } else {
            sortedCats.forEach(([nombre, data], index) => {
                const porcentaje = ((data.monto / totalGastos) * 100).toFixed(0);
                const item = document.createElement('div');
                item.className = 'dash-ranking-item';
                item.innerHTML = `
                    <span class="dash-ranking-pos">#${index + 1}</span>
                    <span class="dash-ranking-emoji">${data.emoji}</span>
                    <span class="dash-ranking-name">${nombre}</span>
                    <span class="dash-ranking-pct">${porcentaje}%</span>
                    <span class="dash-ranking-monto">${UI.formatearMoneda(data.monto)}</span>
                `;
                rankingContainer.appendChild(item);
            });
        }

        // --- 4. Análisis de Gastos Diarios (Línea) ---
        const gastosPorDia = {};
        gastos.forEach(g => {
            // Usar split para obtener el día real sin problemas de zona horaria
            const dia = parseInt(g.fecha.split('-')[2]);
            gastosPorDia[dia] = (gastosPorDia[dia] || 0) + g.monto;
        });

        // Llenar huecos de días (1 al 31)
        const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate(); // Aprox
        const xDays = [];
        const yMontos = [];
        let maxGastoDia = 0;
        let diaMax = '-';

        for (let i = 1; i <= daysInMonth; i++) {
            xDays.push(i);
            const monto = gastosPorDia[i] || 0;
            yMontos.push(monto);
            
            if (monto > maxGastoDia) {
                maxGastoDia = monto;
                diaMax = `Día ${i} (${UI.formatearMoneda(monto)})`;
            }
        }

        document.querySelector('#diaMayorGasto').textContent = maxGastoDia > 0 ? diaMax : '-';

        const traceDiario = {
            x: xDays,
            y: yMontos,
            type: 'scatter',
            mode: 'lines+markers',
            fill: 'tozeroy',
            fillcolor: 'rgba(99,102,241,0.08)',
            line: { color: '#6366F1', width: 2.5, shape: 'spline' },
            marker: { size: 5, color: '#6366F1', line: { color: '#4F46E5', width: 1.5 } },
            hovertemplate: '<b>Día %{x}</b><br>%{y:,.0f} Gs.<extra></extra>'
        };

        const layoutDiario = crearLayoutPlotly({
            height: 220,
            margin: { t: 10, b: 32, l: 52, r: 16 },
            xaxis: { title: '', tickfont: { size: 10 }, fixedrange: true },
            yaxis: { title: '', tickfont: { size: 10 }, fixedrange: true, gridcolor: 'rgba(255,255,255,0.04)' }
        });

        Plotly.newPlot('chartGastosDiarios', [traceDiario], layoutDiario, {displayModeBar: false, responsive: true});
    }


    static async renderizarPanelRecurrentes() {
        const container = document.getElementById('dashPaymentsList');
        const subLabel  = document.getElementById('dashRightSub');
        if (!container) return;

        const recurrentes = await Store.obtenerRecurrentes();
        if (recurrentes.length === 0) {
            container.innerHTML = '<div class="dash-payments-empty"><i class="bi bi-calendar2-check"></i><span>Sin recurrentes configurados</span></div>';
            return;
        }

        const today = new Date();
        const todayDay = today.getDate();

        const items = recurrentes.map(r => {
            let diff = null;
            let statusClass = 'ok';
            let whenLabel = 'Sin fecha';

            if (r.dia_vencimiento) {
                const dueThis = new Date(today.getFullYear(), today.getMonth(), r.dia_vencimiento);
                diff = Math.ceil((dueThis - today) / (1000 * 60 * 60 * 24));
                if (diff < 0) {
                    const dueNext = new Date(today.getFullYear(), today.getMonth() + 1, r.dia_vencimiento);
                    diff = Math.ceil((dueNext - today) / (1000 * 60 * 60 * 24));
                }
                if (diff === 0)       { statusClass = 'today';   whenLabel = 'Hoy'; }
                else if (diff < 0)    { statusClass = 'overdue';  whenLabel = 'Vencido'; }
                else if (diff <= 5)   { statusClass = 'soon';     whenLabel = `En ${diff} días`; }
                else                  { statusClass = 'ok';       whenLabel = `Día ${r.dia_vencimiento}`; }
            }
            return { ...r, diff: diff ?? 999, statusClass, whenLabel };
        }).sort((a, b) => a.diff - b.diff);

        if (subLabel) subLabel.textContent = `${recurrentes.length} pago${recurrentes.length !== 1 ? 's' : ''} configurado${recurrentes.length !== 1 ? 's' : ''}`;

        container.innerHTML = '';
        items.forEach(r => {
            const el = document.createElement('div');
            el.className = 'dash-payment-item ' + r.statusClass;
            el.innerHTML = `
                <div class="dash-payment-indicator"></div>
                <div class="dash-payment-emoji">${r.emoji || '🔄'}</div>
                <div class="dash-payment-info">
                    <span class="dash-payment-name">${r.concepto}</span>
                    <span class="dash-payment-when">${r.whenLabel}</span>
                </div>
                <div class="dash-payment-right">
                    <span class="dash-payment-amount">${r.monto ? UI.formatearMoneda(r.monto) : '—'}</span>
                    <span class="dash-payment-days">${r.diff < 999 && r.diff > 0 ? r.diff + 'd' : ''}</span>
                </div>
            `;
            el.addEventListener('click', () => {
                const select = document.querySelector('#gastoPlantilla');
                if (select) { select.value = r.id; select.dispatchEvent(new Event('change')); }
                const gastosTabBtn = document.getElementById('gastos-tab');
                if (gastosTabBtn) activarTab(gastosTabBtn, { scrollTop: true });
            });
            container.appendChild(el);
        });
    }

    static async renderizarPresupuestos(gastosMes) {
        const container = document.querySelector('#listaPresupuestos');
        const presupuestos = await Store.obtenerPresupuestos(); // Async
        container.innerHTML = '';

        if (Object.keys(presupuestos).length === 0) {
            container.innerHTML = '<p class="text-muted text-center">No hay presupuestos configurados.</p>';
            return;
        }

        // Agrupar gastos actuales por categoría
        const gastoReal = {};
        gastosMes.forEach(g => {
            gastoReal[g.categoriaId] = (gastoReal[g.categoriaId] || 0) + g.monto;
        });

        for (const catId of Object.keys(presupuestos)) {
            const cat = await Store.obtenerCategoriaPorId(catId);
            const limite = presupuestos[catId];
            const gastado = gastoReal[catId] || 0;
            const porcentaje = Math.min((gastado / limite) * 100, 100);
            let colorBarra = 'success';
            if (porcentaje > 75) colorBarra = 'warning';
            if (porcentaje >= 100) colorBarra = 'danger';

            const item = document.createElement('div');
            item.className = 'mb-3';
            item.innerHTML = `
                <div class="d-flex justify-content-between mb-1">
                    <span class="fw-bold">${cat.emoji} ${cat.nombre}</span>
                    <small>${UI.formatearMoneda(gastado)} / ${UI.formatearMoneda(limite)}</small>
                </div>
                <div class="progress" style="height: 20px;">
                    <div class="progress-bar bg-${colorBarra}" role="progressbar" style="width: ${porcentaje}%"></div>
                </div>
            `;
            container.appendChild(item);
        }
    }

    // ... (abrirModalCategoria se mantiene igual, pickers igual) ...
    static abrirModalCategoria(tipo) {
        document.querySelector('#catTipo').value = tipo;
        document.querySelector('#catIdEdit').value = ''; // Reset ID
        document.querySelector('#modalCategoriaTitle').textContent = 'Nueva Categoría';
        document.querySelector('#formCategoria').reset();
        document.querySelector('#catColor').value = '#059669';
        document.querySelector('#colorPreview').style.backgroundColor = '#059669';

        const modalEl = document.getElementById('modalCategoria');
        const modal = new bootstrap.Modal(modalEl);
        
        // Pickers Logic
        if (!UI.pickerColor) {
            const parent = document.querySelector('#colorPreview');
            UI.pickerColor = new Picker(parent);
            UI.pickerColor.onChange = function(color) {
                parent.style.backgroundColor = color.rgbaString;
                document.querySelector('#catColor').value = color.hex.substring(0, 7);
            };
        }

        const colorPreview = document.querySelector('#colorPreview');
        if (colorPreview && !colorPreview.dataset.keyboardBound) {
            colorPreview.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    colorPreview.click();
                }
            });
            colorPreview.dataset.keyboardBound = 'true';
        }
        
        // Emoji Picker (Unified)
        const trigger = document.querySelector('#btnEmojiPicker');
        const input = document.querySelector('#catEmoji');
        trigger.classList.add('btn-emoji-trigger');
        
        // Remove old listeners (clone node trick or just addEventListener safely if we handle it in abrirPicker)
        // Since UI.abrirPicker handles listener cleanup on the picker itself, we just need to bind the click.
        // But we must avoid adding multiple click listeners to the button if this function is called multiple times.
        // Simple fix: use onclick property or check flag.
        trigger.onclick = (e) => {
            e.preventDefault();
            UI.abrirPicker(trigger, (selection) => {
                input.value = selection.emoji;
                trigger.textContent = selection.emoji;
            });
        };
        
        modal.show();
    }

    static async abrirGestorCategorias(tipo) {
        const cats = await Store.obtenerCategorias(tipo);
        const lista = document.querySelector('#listaGestorCategorias');
        lista.innerHTML = '';

        cats.forEach(c => {
            const item = document.createElement('article');
            item.className = 'category-manager-card';
            item.innerHTML = `
                <div class="category-manager-main">
                    <div class="category-manager-icon" style="background-color: ${c.color}22;">
                        <span>${c.emoji}</span>
                    </div>
                    <div>
                        <h3>${c.nombre}</h3>
                        <p>${c.tipo === 'gasto' ? 'Gasto' : 'Ingreso'}</p>
                    </div>
                </div>
                <div class="category-manager-actions">
                    <button class="btn btn-outline-primary btn-sm btn-edit-cat" data-id="${c.id}" data-nombre="${c.nombre}" data-emoji="${c.emoji}" data-color="${c.color}" data-tipo="${c.tipo}" aria-label="Editar categoría">Editar</button>
                    <button class="btn btn-outline-danger btn-sm btn-del-cat" data-id="${c.id}" aria-label="Eliminar categoría">Eliminar</button>
                </div>
            `;
            lista.appendChild(item);
        });

        const modal = new bootstrap.Modal(document.getElementById('modalGestorCategorias'));
        modal.show();

        // Eventos dentro del modal
        lista.onclick = async (e) => {
            const btnEdit = e.target.closest('.btn-edit-cat');
            const btnDel = e.target.closest('.btn-del-cat');

            if (btnEdit) {
                // Cerrar gestor y abrir modal edición
                bootstrap.Modal.getInstance(document.getElementById('modalGestorCategorias')).hide();
                UI.abrirModalCategoriaEdicion(btnEdit.dataset);
            }

            if (btnDel) {
                if (confirm('¿Eliminar categoría? Si tiene gastos asociados no se podrá eliminar.')) {
                    try {
                        await Store.eliminarCategoria(btnDel.dataset.id);
                        // Recargar lista
                        bootstrap.Modal.getInstance(document.getElementById('modalGestorCategorias')).hide();
                        UI.abrirGestorCategorias(tipo);
                        // Recargar selects en background
                        const nuevasCats = await Store.obtenerCategorias(tipo);
                        UI.llenarSelectCategorias(tipo, nuevasCats);
                    } catch (err) {
                        alert(err.message);
                    }
                }
            }
        };
    }

    static abrirModalCategoriaEdicion(dataset) {
        UI.abrirModalCategoria(dataset.tipo);
        document.querySelector('#modalCategoriaTitle').textContent = 'Editar Categoría';
        document.querySelector('#catIdEdit').value = dataset.id;
        document.querySelector('#catNombre').value = dataset.nombre;
        document.querySelector('#catEmoji').value = dataset.emoji;
        document.querySelector('#btnEmojiPicker').textContent = dataset.emoji;
        document.querySelector('#catColor').value = dataset.color;
        document.querySelector('#colorPreview').style.backgroundColor = dataset.color;
    }

    static async cargarDatosEdicion(id, tipo) {
        const item = await Store.obtenerDatoPorId(id, tipo); // Async
        if (!item) return;

        if (tipo === 'gasto') {
            document.querySelector('#gastoIdEdit').value = item.id;
            document.querySelector('#gastoConcepto').value = item.concepto;
            document.querySelector('#gastoMonto').value = item.monto;
            document.querySelector('#gastoFecha').value = item.fecha;
            document.querySelector('#gastoHora').value = item.hora;
            document.querySelector('#gastoCategoria').value = item.categoriaId;
            document.querySelector('#gastoMetodo').value = item.metodoPago;
            document.querySelector('#gastoRecurrente').checked = item.recurrente;
            
            document.querySelector('#btnGastoSubmit').textContent = 'Actualizar Gasto';
            document.querySelector('#btnGastoSubmit').className = 'btn btn-warning';
            document.querySelector('#btnGastoCancel').style.display = 'block';
            document.querySelector('#gastos-tab').click();
        } else {
            // ... Logic Ingreso ...
            document.querySelector('#ingresoIdEdit').value = item.id;
            document.querySelector('#ingresoConcepto').value = item.concepto;
            document.querySelector('#ingresoMonto').value = item.monto;
            document.querySelector('#ingresoFecha').value = item.fecha;
            document.querySelector('#ingresoHora').value = item.hora;
            document.querySelector('#ingresoCategoria').value = item.categoriaId;
            document.querySelector('#ingresoRecurrente').checked = item.recurrente;

            document.querySelector('#btnIngresoSubmit').textContent = 'Actualizar Ingreso';
            document.querySelector('#btnIngresoSubmit').className = 'btn btn-warning';
            document.querySelector('#btnIngresoCancel').style.display = 'block';
            document.querySelector('#ingresos-tab').click();
        }
    }

    static cancelarEdicion(tipo) {
        if (tipo === 'gasto') {
            document.querySelector('#gastoForm').reset();
            document.querySelector('#gastoIdEdit').value = '';
            document.querySelector('#btnGastoSubmit').textContent = 'Guardar Gasto';
            document.querySelector('#btnGastoSubmit').className = 'btn btn-danger';
            document.querySelector('#btnGastoCancel').style.display = 'none';
        } else {
            document.querySelector('#ingresoForm').reset();
            document.querySelector('#ingresoIdEdit').value = '';
            document.querySelector('#btnIngresoSubmit').textContent = 'Guardar Ingreso';
            document.querySelector('#btnIngresoSubmit').className = 'btn btn-success';
            document.querySelector('#btnIngresoCancel').style.display = 'none';
        }
        
        const hoy = new Date();
        const fechaStr = `${hoy.getFullYear()}-${(hoy.getMonth()+1).toString().padStart(2,'0')}-${hoy.getDate().toString().padStart(2,'0')}`;
        const horaStr = hoy.toTimeString().slice(0,5);
        document.querySelector(`#${tipo}Fecha`).value = fechaStr;
        document.querySelector(`#${tipo}Hora`).value = horaStr;
    }
}

// --- INIT & AUTH HANDLER ---
const modalUpdateEl = document.getElementById('modalAppUpdate');
if (modalUpdateEl) {
    modalAppUpdate = new bootstrap.Modal(modalUpdateEl);
}

const categoryActionButtons = [
    { id: 'btnNuevaCategoriaGasto', action: () => UI.abrirModalCategoria('gasto') },
    { id: 'btnGestionarCategoriaGasto', action: () => UI.abrirGestorCategorias('gasto') },
    { id: 'btnNuevaCategoriaIngreso', action: () => UI.abrirModalCategoria('ingreso') },
    { id: 'btnGestionarCategoriaIngreso', action: () => UI.abrirGestorCategorias('ingreso') }
];

categoryActionButtons.forEach(({ id, action }) => {
    const button = document.getElementById(id);
    if (!button) return;
    button.addEventListener('click', action);
});

const desktopTabButtons = Array.from(document.querySelectorAll('#myTab button[data-bs-toggle="tab"]'));
const mobileTabButtons = Array.from(document.querySelectorAll('.mobile-tab-link'));
const tabPanes = Array.from(document.querySelectorAll('#myTabContent .tab-pane'));

function sincronizarTabMovil(tabIdActivo) {
    mobileTabButtons.forEach((btn) => {
        const isActive = btn.getAttribute('data-tab-trigger') === tabIdActivo;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
}

function activarTab(tabBtn, options = {}) {
    const targetSelector = tabBtn.getAttribute('data-bs-target');
    const targetPane = targetSelector ? document.querySelector(targetSelector) : null;
    if (!targetPane) return;

    try {
        if (window.bootstrap?.Tab) {
            bootstrap.Tab.getOrCreateInstance(tabBtn).show();
        }
    } catch (error) {
        console.warn('No se pudo activar el tab con Bootstrap, usando fallback.', error);
    }

    desktopTabButtons.forEach((btn) => {
        const isActive = btn === tabBtn;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    tabPanes.forEach((pane) => {
        const isActive = pane === targetPane;
        pane.classList.toggle('show', isActive);
        pane.classList.toggle('active', isActive);
    });

    sincronizarTabMovil(tabBtn.id);

    if (options.scrollTop) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

desktopTabButtons.forEach((tabBtn) => {
    tabBtn.addEventListener('click', (event) => {
        event.preventDefault();
        activarTab(tabBtn);
    });

    tabBtn.addEventListener('shown.bs.tab', () => {
sincronizarTabMovil(tabBtn.id);
    sincronizarSidebar(tabBtn.id);
    });
});

mobileTabButtons.forEach((mobileBtn) => {
    mobileBtn.addEventListener('click', () => {
        const targetTabId = mobileBtn.getAttribute('data-tab-trigger');
        const desktopBtn = document.getElementById(targetTabId);
        if (!desktopBtn) return;
        activarTab(desktopBtn, { scrollTop: true });
    });
});

/* Sidebar links */
const sidebarLinks = Array.from(document.querySelectorAll('.app-sidebar-link[data-tab-trigger]'));

function sincronizarSidebar(tabIdActivo) {
    sidebarLinks.forEach((link) => {
        const isActive = link.getAttribute('data-tab-trigger') === tabIdActivo;
        link.classList.toggle('is-active', isActive);
    });
}

sidebarLinks.forEach((link) => {
    link.addEventListener('click', () => {
        const targetTabId = link.getAttribute('data-tab-trigger');
        const desktopBtn = document.getElementById(targetTabId);
        if (!desktopBtn) return;
        activarTab(desktopBtn, { scrollTop: true });
    });
});

// Panel derecho: botón navegar a recurrentes
document.querySelectorAll('.btn-dash-add[data-tab-trigger]').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetTabId = btn.getAttribute('data-tab-trigger');
        const desktopBtn  = document.getElementById(targetTabId);
        if (desktopBtn) activarTab(desktopBtn, { scrollTop: true });
    });
});


const tabActivoInicial = document.querySelector('#myTab button.active');
if (tabActivoInicial) { sincronizarTabMovil(tabActivoInicial.id); sincronizarSidebar(tabActivoInicial.id); }

const btnOpenUpdateModal = document.getElementById('btnOpenUpdateModal');
if (btnOpenUpdateModal) {
    btnOpenUpdateModal.addEventListener('click', abrirModalActualizacion);
}

const btnDownloadUpdate = document.getElementById('btnDownloadUpdate');
if (btnDownloadUpdate) {
    btnDownloadUpdate.addEventListener('click', async () => {
        try {
            await iniciarActualizacionApp();
        } catch (error) {
            console.error('Error al iniciar actualización de app:', error);
            mostrarErrorInicio('No se pudo iniciar la descarga de la actualización.');
        }
    });
}

// --- VIEW TOGGLER ---
function toggleView(isLoggedIn) {
    const landing = document.getElementById('landingPage');
    const app = document.getElementById('appContainer');
    
    if (isLoggedIn) {
        if(landing) landing.style.display = 'none';
        if(app) app.style.display = 'block';
    } else {
        if (IS_MOBILE_APP_MODE) {
            window.location.replace('login.html?mobile_app=1');
            return;
        } else if (landing) {
            landing.style.display = 'block';
        }
        if(app) app.style.display = 'none';
    }
}

function manejarErrorGlobalInicio(contexto, error) {
    console.error(contexto, error);
    UI.toggleLoader(false);
    if (document.getElementById('appContainer')?.style.display !== 'block') {
        toggleView(false);
    }
    mostrarErrorInicio('Ocurrió un error al cargar la aplicación. Recarga la página para continuar.');
}

window.addEventListener('error', (event) => {
    if (!event?.error) return;
    manejarErrorGlobalInicio('Error de ejecución no controlado:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    manejarErrorGlobalInicio('Promesa rechazada no controlada:', event.reason);
});

async function arrancarAppSesionActiva(session, opciones = {}) {
    const { mostrarLoader = false } = opciones;

    if (appIniciando) return;
    appIniciando = true;

    if (!session?.user?.email) {
        UI.toggleLoader(false);
        toggleView(false);
        appIniciando = false;
        return;
    }

    if (mostrarLoader) UI.toggleLoader(true);

    toggleView(true);
    document.getElementById('userEmail').textContent = session.user.email;
    await verificarActualizacionMovil();

    try {
        await conTimeout(initApp(), 60000, 'Timeout al cargar datos iniciales');
        ocultarErrorInicio();
    } catch (error) {
        console.error('Error al cargar datos iniciales:', error);
        UI.toggleLoader(false);
        const appContainer = document.getElementById('appContainer');
        if (appContainer && appContainer.style.display === 'block') {
            mostrarErrorInicio('No se pudieron cargar tus datos. Intenta recargar en unos segundos.');
        } else {
            toggleView(false);
            mostrarErrorInicio('No se pudo conectar con el servidor. Recarga la página.');
        }
    } finally {
        appIniciando = false;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await inicializarGoogleNativoMovil();
    } catch (error) {
        console.warn('Google nativo no pudo inicializarse al arrancar:', error);
    }
    await cargarInfoVersionApk();

    if (!supabaseClient) {
        UI.toggleLoader(false);
        toggleView(false);
        mostrarErrorInicio('No se pudo inicializar la conexión. Recarga la página y verifica tu conexión a internet.');
        return;
    }

    try {
        const { data: { session } } = await obtenerSesionConTimeout(10000);

        if (!session) {
            UI.toggleLoader(false);
            toggleView(false);
        } else {
            await arrancarAppSesionActiva(session, { mostrarLoader: true });
        }

        // Auth Listener con debounce para evitar llamadas múltiples de Supabase
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            if (authChangeDebouncing) return;
            if (event === 'SIGNED_IN') {
                authChangeDebouncing = true;
                clearTimeout(authChangeDebounceTimer);
                authChangeDebounceTimer = setTimeout(() => { authChangeDebouncing = false; }, 5000);
                await arrancarAppSesionActiva(session, { mostrarLoader: true });
            } else if (event === 'SIGNED_OUT') {
                UI.toggleLoader(false);
                toggleView(false);
            }
        });
    } catch (error) {
        console.error('Error al iniciar la app:', error);
        UI.toggleLoader(false);
        toggleView(false);
        mostrarErrorInicio('No se pudo conectar con el servidor en este momento. Intenta recargar en unos segundos.');
    }
});

async function initApp() {
    // Establecer fecha por defecto
    const hoy = new Date();
    const mesStr = `${hoy.getFullYear()}-${(hoy.getMonth()+1).toString().padStart(2,'0')}`;
    const diaStr = mesStr + `-${hoy.getDate().toString().padStart(2,'0')}`;
    const horaStr = hoy.toTimeString().slice(0,5);

    document.querySelector('#filtroMes').value = mesStr;
    
    // Inputs fecha/hora default
    ['gasto', 'ingreso'].forEach(tipo => {
        document.querySelector(`#${tipo}Fecha`).value = diaStr;
        document.querySelector(`#${tipo}Hora`).value = horaStr;
    });

    // Cargar Datos
    await UI.cargarTodo();
    
    // Ocultar loader una vez todo cargado
    UI.toggleLoader(false);
}

document.getElementById('btnLogout').addEventListener('click', async () => {
    await Store.cerrarSesion();
});

// --- EVENTOS APP ---
// Evento cambio de mes
document.querySelector('#filtroMes').addEventListener('change', () => UI.renderizarListas());

// Guardar Gasto
document.querySelector('#gastoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    UI.setLoadingButton('btnGastoSubmit', true);
    try {
        const idEdit = document.querySelector('#gastoIdEdit').value;
        const concepto = document.querySelector('#gastoConcepto').value;
        const monto = document.querySelector('#gastoMonto').value;
        const fecha = document.querySelector('#gastoFecha').value;
        const hora = document.querySelector('#gastoHora').value;
        const catId = document.querySelector('#gastoCategoria').value;
        const metodo = document.querySelector('#gastoMetodo').value;
        const esRecurrente = document.querySelector('#gastoRecurrente').checked;
        const deudaId = document.querySelector('#gastoDeuda').value;

        if (!catId) {
            UI.setLoadingButton('btnGastoSubmit', false);
            return alert('Por favor selecciona una categoría');
        }

        const gasto = { concepto, monto, categoriaId: catId, fecha, hora, metodoPago: metodo, recurrente: esRecurrente, debtId: deudaId };

        if (idEdit) {
            gasto.id = idEdit;
            await Store.actualizarDato(gasto, 'gasto');
            UI.cancelarEdicion('gasto');
        } else {
            await Store.guardarDato(gasto, 'gasto');
            
            // Si estaba vinculado a deuda, actualizamos progreso
            if (deudaId) {
                await Store.actualizarProgresoDeuda(deudaId);
            }

            e.target.reset();
            UI.cancelarEdicion('gasto'); // Para resetear fecha
        }

        await UI.renderizarListas();
        
    } catch (error) {
        console.error(error);
        alert(obtenerMensajeErrorOperacion(error, 'Error al guardar gasto'));
    } finally {
        UI.setLoadingButton('btnGastoSubmit', false, 'Guardar Gasto');
    }
});

// Guardar Ingreso
document.querySelector('#ingresoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    UI.setLoadingButton('btnIngresoSubmit', true);
    try {
        const idEdit = document.querySelector('#ingresoIdEdit').value;
        const concepto = document.querySelector('#ingresoConcepto').value;
        const monto = document.querySelector('#ingresoMonto').value;
        const fecha = document.querySelector('#ingresoFecha').value;
        const hora = document.querySelector('#ingresoHora').value;
        const catId = document.querySelector('#ingresoCategoria').value;
        const esRecurrente = document.querySelector('#ingresoRecurrente').checked;

        if (!catId) {
            UI.setLoadingButton('btnIngresoSubmit', false);
            return alert('Por favor selecciona una categoría');
        }

        const ingreso = { concepto, monto, categoriaId: catId, fecha, hora, recurrente: esRecurrente };

        if (idEdit) {
            ingreso.id = idEdit;
            await Store.actualizarDato(ingreso, 'ingreso');
            UI.cancelarEdicion('ingreso');
        } else {
            await Store.guardarDato(ingreso, 'ingreso');
            e.target.reset();
            UI.cancelarEdicion('ingreso');
        }

        await UI.renderizarListas();
        
    } catch (error) {
        console.error(error);
        alert(obtenerMensajeErrorOperacion(error, 'Error al guardar ingreso'));
    } finally {
        UI.setLoadingButton('btnIngresoSubmit', false, 'Guardar Ingreso');
    }
});

// Guardar Categoría
    document.querySelector('#btnGuardarCategoria').addEventListener('click', async () => {
        UI.setLoadingButton('btnGuardarCategoria', true);
        const id = document.querySelector('#catIdEdit').value;
        const nombre = document.querySelector('#catNombre').value;
        const emoji = document.querySelector('#catEmoji').value;
        const color = document.querySelector('#catColor').value;
        const tipo = document.querySelector('#catTipo').value;

        if (nombre && emoji && tipo) {
            try {
                if (id) {
                    await Store.actualizarCategoria({ id, nombre, emoji, color });
                } else {
                    await Store.agregarCategoria({ nombre, emoji, color, tipo });
                }
                
                // Recargar categorías en caché y UI
                const [nuevasCats, otrasCats] = await Promise.all([
                    Store.obtenerCategorias(tipo),
                    Store.obtenerCategorias(tipo === 'gasto' ? 'ingreso' : 'gasto')
                ]);
                
                UI.categoriasCache = [...nuevasCats, ...otrasCats];
                
                UI.llenarSelectCategorias(tipo, nuevasCats);
                if(tipo === 'gasto') UI.llenarSelectCategorias('presupuesto', nuevasCats);
                
                const modalEl = document.getElementById('modalCategoria');
                const modal = bootstrap.Modal.getInstance(modalEl);
                modal.hide();

                document.querySelector('#formCategoria').reset();
                
                // Si venía del gestor, volver a abrirlo (opcional, pero buena UX)
                if (id) setTimeout(() => UI.abrirGestorCategorias(tipo), 500);
            } catch(e) {
                console.error(e);
                alert(obtenerMensajeErrorOperacion(e, 'Error al guardar categoría'));
            } finally {
                UI.setLoadingButton('btnGuardarCategoria', false, 'Guardar');
            }
        } else {
            UI.setLoadingButton('btnGuardarCategoria', false, 'Guardar');
        }
    });

// Guardar Presupuesto
document.querySelector('#btnGuardarPresupuesto').addEventListener('click', async () => {
    UI.setLoadingButton('btnGuardarPresupuesto', true);
    const catId = document.querySelector('#presupuestoCategoria').value;
    const monto = document.querySelector('#presupuestoMonto').value;
    
    if (catId && monto) {
        try {
            await Store.guardarPresupuesto(catId, monto);
            await UI.renderizarListas(); // Refrescar barras
            bootstrap.Modal.getInstance(document.getElementById('modalPresupuesto')).hide();
            document.querySelector('#formPresupuesto').reset();
        } catch (e) {
            console.error(e);
            alert(obtenerMensajeErrorOperacion(e, 'Error al guardar presupuesto'));
        } finally {
            UI.setLoadingButton('btnGuardarPresupuesto', false, 'Guardar');
        }
    } else {
        UI.setLoadingButton('btnGuardarPresupuesto', false, 'Guardar');
    }
});

// Eliminar/Editar items
['listaGastos', 'listaIngresos'].forEach(idLista => {
    document.getElementById(idLista).addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const id = target.getAttribute('data-id');
        const tipo = target.getAttribute('data-tipo'); // 'gasto' o 'ingreso'

        if (target.classList.contains('delete')) {
            if (confirm('¿Eliminar este registro?')) {
                await Store.eliminarDato(id);
                await UI.renderizarListas();
            }
        } else if (target.classList.contains('edit')) {
            await UI.cargarDatosEdicion(id, tipo);
        }
    });
});

// Cancelar Edición
document.querySelector('#btnGastoCancel').addEventListener('click', () => UI.cancelarEdicion('gasto'));
document.querySelector('#btnIngresoCancel').addEventListener('click', () => UI.cancelarEdicion('ingreso'));

// --- EVENTOS NUEVOS ---

// 1. Guardar Recurrente (Plantilla)
document.querySelector('#btnGuardarRecurrente').addEventListener('click', async () => {
        UI.setLoadingButton('btnGuardarRecurrente', true);
        const id = document.querySelector('#recIdEdit').value;
        const concepto = document.querySelector('#recConcepto').value;
        const monto = document.querySelector('#recMonto').value;
        const categoria = document.querySelector('#recCategoria').value;
        const dia = document.querySelector('#recDia').value;
        const emoji = document.querySelector('#btnEmojiRec').textContent;

        if (!concepto || !categoria) {
            UI.setLoadingButton('btnGuardarRecurrente', false);
            return alert('Completa concepto y categoría');
        }

        try {
            await Store.guardarRecurrente({ id, concepto, monto, categoriaId: categoria, dia, emoji });

            UI.cerrarModal('modalRecurrente');

            document.querySelector('#formRecurrente').reset();
            document.querySelector('#btnEmojiRec').textContent = '📝';
            await UI.renderizarDeudas();
            await UI.renderizarRecurrentes();
            await UI.renderizarOpcionesGasto();
        } catch (e) { 
            console.error(e); 
            alert(obtenerMensajeErrorOperacion(e, 'Error al guardar'));
        } finally {
            UI.setLoadingButton('btnGuardarRecurrente', false, 'Guardar');
        }
    });

// 2. Guardar Deuda
document.querySelector('#btnGuardarDeuda').addEventListener('click', async () => {
        UI.setLoadingButton('btnGuardarDeuda', true);
        const id = document.querySelector('#deudaIdEdit').value;
        const concepto = document.querySelector('#deudaConcepto').value;
        const monto = document.querySelector('#deudaMonto').value;
        const cuotas = document.querySelector('#deudaCuotas').value;
        const pagadas = document.querySelector('#deudaPagadas').value;
        const cuotaMonto = document.querySelector('#deudaCuotaMonto').value;
        const fechaInicio = document.querySelector('#deudaFechaInicio').value;
        const emoji = document.querySelector('#btnEmojiDeuda').textContent;

        if (!concepto || !monto) {
            UI.setLoadingButton('btnGuardarDeuda', false);
            return alert('Datos incompletos');
        }

        try {
            await Store.guardarDeuda({ id, concepto, monto, cuotas, pagadas, cuotaMonto, fechaInicio, emoji });
            
            UI.cerrarModal('modalDeuda');
            
            document.querySelector('#formDeuda').reset();
            document.querySelector('#btnEmojiDeuda').textContent = '💳';
            await UI.renderizarDeudas();
            await UI.renderizarRecurrentes();
            await UI.renderizarOpcionesGasto();
        } catch (e) { 
            console.error(e); 
            alert(obtenerMensajeErrorOperacion(e, 'Error al guardar'));
        } finally {
            UI.setLoadingButton('btnGuardarDeuda', false, 'Guardar Deuda');
        }
    });

// --- PICKERS EMOJIS NUEVOS ---
// Picker Recurrente
const btnRec = document.querySelector('#btnEmojiRec');
    btnRec.classList.add('btn-emoji-trigger');
    btnRec.addEventListener('click', (e) => {
        e.preventDefault();
        UI.abrirPicker(btnRec, (selection) => {
            btnRec.textContent = selection.emoji;
        });
    });

// Picker Deuda
const btnDeuda = document.querySelector('#btnEmojiDeuda');
btnDeuda.classList.add('btn-emoji-trigger');
btnDeuda.addEventListener('click', (e) => {
    e.preventDefault();
    UI.abrirPicker(btnDeuda, (selection) => {
        btnDeuda.textContent = selection.emoji;
    });
});

// Seguridad: Cerrar picker si se cierra cualquier modal
document.addEventListener('hidden.bs.modal', () => {
    if(UI.pickerEmojiContainer) UI.pickerEmojiContainer.style.display = 'none';
});

// --- GESTIÓN DE MODALES (Fix Sombra y Edición) ---

// 1. Reset forms al clickear "+ Nuevo"
document.getElementById('btnAddRecurrente').addEventListener('click', () => {
        document.querySelector('#recIdEdit').value = '';
        document.querySelector('#formRecurrente').reset();
        document.querySelector('#modalRecurrenteTitle').textContent = 'Nueva Plantilla';
        document.querySelector('#btnEmojiRec').textContent = '📝';
    });

document.getElementById('btnAddDeuda').addEventListener('click', () => {
    document.querySelector('#deudaIdEdit').value = '';
    document.querySelector('#formDeuda').reset();
    document.querySelector('#modalDeudaTitle').textContent = 'Registrar Deuda';
    document.querySelector('#btnEmojiDeuda').textContent = '💳';
});

// 2. Cargar categorías al abrir modal recurrente (siempre)
document.getElementById('modalRecurrente').addEventListener('show.bs.modal', async () => {
        const cats = await Store.obtenerCategorias('gasto');
        const select = document.querySelector('#recCategoria');
        const currentVal = select.value;
        select.innerHTML = '';
        cats.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.emoji} ${c.nombre}</option>`;
        });
    if(currentVal && currentVal !== '') select.value = currentVal;
});

document.getElementById('modalDeuda').addEventListener('show.bs.modal', (e) => {
    // Nada especial que hacer aquí, el reset ya se hizo en el click
});

// 3. Cargar Plantilla en Formulario Gasto
document.querySelector('#gastoPlantilla').addEventListener('change', (e) => {
        const val = e.target.value;
        if (!val) return;
        
        const data = JSON.parse(val);
        document.querySelector('#gastoConcepto').value = data.concepto;
        if(data.monto) document.querySelector('#gastoMonto').value = data.monto;
        if(data.category_id) document.querySelector('#gastoCategoria').value = data.category_id;
        
    // Simular evento change en categoria para mostrar presupuesto
    document.querySelector('#gastoCategoria').dispatchEvent(new Event('change'));
});

// 4. Mostrar Presupuesto al cambiar Categoría
document.querySelector('#gastoCategoria').addEventListener('change', async (e) => {
        const catId = e.target.value;
        const presupuestos = await Store.obtenerPresupuestos();
        const infoDiv = document.querySelector('#infoPresupuestoGasto');
        
        if (presupuestos[catId]) {
            const limite = presupuestos[catId];
            // Calcular gastado este mes en esta categoría
            const mesActual = document.querySelector('#filtroMes').value;
            const gastosMes = await Store.obtenerDatos('gasto', mesActual);
            const gastado = gastosMes
                .filter(g => g.categoriaId === catId)
                .reduce((sum, g) => sum + g.monto, 0);

            const restante = limite - gastado;
            const color = restante < 0 ? 'text-danger' : (restante < limite * 0.2 ? 'text-warning' : 'text-success');

            infoDiv.innerHTML = `Presupuesto: <span class="${color} fw-bold">${UI.formatearMoneda(restante)}</span> disponibles de ${UI.formatearMoneda(limite)}`;
        } else {
            infoDiv.textContent = 'Sin presupuesto asignado.';
        }
    });

    // Llenar select de categorías en modales nuevos al abrir
    // Comparativa (Misma lógica, solo obtenerDatos es async ahora)
document.querySelector('#btnComparar').addEventListener('click', async () => {
    const mesA = document.querySelector('#compMesA').value;
    const mesB = document.querySelector('#compMesB').value;

    if (!mesA || !mesB) return alert('Selecciona ambos periodos');

    document.querySelector('#resultadosComparativa').style.display = 'flex';
    
    const rawGastos = await Store.obtenerDatos('gasto');
    const rawIngresos = await Store.obtenerDatos('ingreso');

    const gastosA = rawGastos.filter(g => g.fecha.startsWith(mesA));
    const ingresosA = rawIngresos.filter(i => i.fecha.startsWith(mesA));
    const gastosB = rawGastos.filter(g => g.fecha.startsWith(mesB));
    const ingresosB = rawIngresos.filter(i => i.fecha.startsWith(mesB));

    // Totales
    const totalGastosA = gastosA.reduce((s, g) => s + g.monto, 0);
    const totalIngresosA = ingresosA.reduce((s, i) => s + i.monto, 0);
    const totalGastosB = gastosB.reduce((s, g) => s + g.monto, 0);
    const totalIngresosB = ingresosB.reduce((s, i) => s + i.monto, 0);

    // Gráficos (Plotly) - Igual que antes
    const traceA = {
        x: ['Ingresos', 'Gastos'],
        y: [totalIngresosA, totalGastosA],
        name: mesA,
        type: 'bar',
        width: [0.35, 0.35],
        marker: { color: '#6366F1', line: { color: 'rgba(99, 102, 241, 0.2)', width: 1 } },
        hovertemplate: '<b>' + mesA + ': %{x}</b><br>%{y:,.0f} Gs.<extra></extra>'
    };
    const traceB = {
        x: ['Ingresos', 'Gastos'],
        y: [totalIngresosB, totalGastosB],
        name: mesB,
        type: 'bar',
        width: [0.35, 0.35],
        marker: { color: '#EC4899', line: { color: 'rgba(236, 72, 153, 0.2)', width: 1 } },
        hovertemplate: '<b>' + mesB + ': %{x}</b><br>%{y:,.0f} Gs.<extra></extra>'
    };
    
    Plotly.newPlot('chartCompBalance', [traceA, traceB], crearLayoutPlotly({
        barmode: 'group',
        height: 300,
        margin: { t: 20, b: 30, l: 45, r: 15 },
        legend: { orientation: 'h', y: -0.15, font: { size: 10 } }
    }), {displayModeBar: false});

    const data2 = [{
        x: [mesA, mesB],
        y: [totalGastosA, totalGastosB],
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: '#F43F5E', width: 3, shape: 'spline' },
        marker: { size: 8, color: '#F43F5E' },
        hovertemplate: '<b>Gastos %{x}</b><br>%{y:,.0f} Gs.<extra></extra>'
    }];
    Plotly.newPlot('chartCompGastos', data2, crearLayoutPlotly({
        height: 300,
        margin: { t: 20, b: 30, l: 45, r: 15 },
        yaxis: { title: 'Gastos Totales' }
    }), {displayModeBar: false});
});

// Refresco suave al volver a la pestaña para evitar estados colgados del loader
let ultimoRefrescoVisibilidad = 0;
let refrescando = false;
let appIniciando = false;
let authChangeDebouncing = false;
let authChangeDebounceTimer = null;

document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') return;
    if (!supabaseClient) return;
    if (refrescando) return;
    if (appIniciando) return;

    const appVisible = document.getElementById('appContainer')?.style.display !== 'none';
    if (!appVisible) return;

    const ahora = Date.now();
    if (ahora - ultimoRefrescoVisibilidad < 10000) return;
    
    refrescando = true;
    ultimoRefrescoVisibilidad = ahora;

    try {
        await conTimeout(UI.cargarTodo(), 20000, 'Timeout al refrescar al volver a la pestaña');
        ocultarErrorInicio();
    } catch (error) {
        console.error('Error al refrescar la app al volver a la pestaña:', error);
    } finally {
        UI.toggleLoader(false);
        refrescando = false;
    }
});

if (IS_MOBILE_APP_MODE && capAppPlugin?.addListener) {
    capAppPlugin.addListener('appStateChange', async ({ isActive }) => {
        if (!isActive) return;

        try {
            await cargarInfoVersionApk();
        } catch (error) {
            console.warn('No se pudo verificar actualización al volver a la app:', error);
        }
    });
}

if (IS_MOBILE_APP_MODE && capLocalNotificationsPlugin?.addListener) {
    capLocalNotificationsPlugin.addListener('localNotificationActionPerformed', async (event) => {
        const version = event?.notification?.extra?.version;

        try {
            if (!releaseInfoActual || (version && releaseInfoActual.version !== version)) {
                releaseInfoActual = await obtenerReleaseInfo();
            }
            refrescarEstadoBotonActualizacion(releaseInfoActual);
            abrirModalActualizacion();
        } catch (error) {
            console.warn('No se pudo abrir el detalle de actualización desde la notificación:', error);
        }
    });
}
