const API_URL = "https://script.google.com/macros/s/AKfycbxLJYQe6QZCiDARD1I5ngkqS3hjfzT1oYki9rlClbNpFf-fjLwXv_Lhp_TOcjLgOTZt/exec";

// === CICLO DE VIDA ===
document.addEventListener('DOMContentLoaded', () => {
    initTheme(); 
    checkAuthState();
    bindLoginEvents();
    bindOnboardingEvents(); // Nueva llamada
    bindCredentialsEvents();
    
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').catch(err => console.error(err));
        });
    }
});

function initTheme() {
    const isDark = localStorage.getItem('genTheme') === 'dark';
    if (isDark) document.documentElement.classList.add('dark');
    actualizarIconoTema(isDark);
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    const themeStr = isDark ? 'dark' : 'light';
    localStorage.setItem('genTheme', isDark ? 'dark' : 'light');
    actualizarIconoTema(isDark);
    const iframe = document.getElementById('appViewer');
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'THEME_UPDATE', theme: themeStr }, '*');
    }
}

function actualizarIconoTema(isDark) {
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (!themeBtn) return;
    themeBtn.innerHTML = isDark 
        ? `<i class="ph ph-sun text-xl text-amber-400"></i><span class="font-medium text-sm text-gray-200">Tema Claro</span>` 
        : `<i class="ph ph-moon text-xl text-gray-600"></i><span class="font-medium text-sm">Tema Oscuro</span>`;
}

// === MÁQUINA DE ESTADOS ===
function checkAuthState() {
    const userStr = localStorage.getItem('genUser');
    const loginView = document.getElementById('login-view');
    const hubView = document.getElementById('hub-view');

    if (userStr) {
        loginView.classList.add('hidden');
        hubView.classList.remove('hidden');
        initHub(JSON.parse(userStr));
    } else {
        hubView.classList.add('hidden');
        loginView.classList.remove('hidden');
        const form = document.getElementById('loginForm');
        if (form) form.reset();
    }
}

// === LOGIN ===
function bindLoginEvents() {
    const form = document.getElementById('loginForm');
    if (!form) return; 
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSubmit');
        const err = document.getElementById('errorMsg');
        
        btn.innerHTML = '<i class="ph ph-spinner animate-spin text-xl"></i> Conectando...';
        btn.disabled = true;
        err.classList.add('hidden');

        const payload = {
            action: 'login',
            user: document.getElementById('username').value,
            pass: document.getElementById('password').value
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error("Error al conectar con el servidor.");
            const data = await response.json();

            if (data.status === 'success') {
                localStorage.setItem('genUser', JSON.stringify(data.user));
                localStorage.setItem('genAppsCatalog', JSON.stringify(data.apps));
                checkAuthState();
            } else if (data.status === 'require_profile') {
                // SE ACTIVA EL ONBOARDING
                abrirModalOnboarding(data.tempUser);
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            err.textContent = error.message || "Error inesperado.";
            err.classList.remove('hidden');
        } finally {
            btn.innerHTML = 'Ingresar';
            btn.disabled = false;
        }
    });
}

// === ONBOARDING (NUEVO) ===
function abrirModalOnboarding(usuario) {
    document.getElementById('onboardUserTemp').value = usuario;
    const modal = document.getElementById('onboardingModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function bindOnboardingEvents() {
    const form = document.getElementById('formOnboarding');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnOnboardSubmit');
        const originalText = btn.innerHTML;
        
        const payload = {
            action: 'completeProfile',
            user: document.getElementById('onboardUserTemp').value,
            nombre: document.getElementById('onboardNombre').value,
            correo: document.getElementById('onboardCorreo').value
        };

        btn.innerHTML = '<i class="ph ph-spinner animate-spin text-xl"></i> Guardando...';
        btn.disabled = true;

        try {
            const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
            const data = await response.json();

            if (data.status === 'success') {
                document.getElementById('onboardingModal').classList.add('hidden');
                document.getElementById('onboardingModal').classList.remove('flex');
                
                // AUTOLOGIN TRUCO: Volvemos a presionar el botón de Iniciar Sesión automáticamente
                document.getElementById('btnSubmit').click();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            alert("Error: " + error.message);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

// === CREDENCIALES ===
function bindCredentialsEvents() {
    const form = document.getElementById('formCredenciales');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        
        const userStr = localStorage.getItem('genUser');
        if (!userStr) return;
        const currentUser = JSON.parse(userStr);

        const payload = {
            action: 'updateCredentials',
            currentUser: currentUser.usuario,
            newUser: document.getElementById('newUsername').value,
            newPass: document.getElementById('newPassword').value
        };

        btn.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Guardando...';
        btn.disabled = true;

        try {
            const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
            const data = await response.json();

            if (data.status === 'success') {
                alert("¡Credenciales actualizadas!\nPor seguridad, tu sesión se cerrará ahora.");
                closeCredentialsModal();
                logout(); 
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            alert("Error: " + error.message);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

// === LÓGICA DEL HUB ===
function initHub(currentUser) {
    document.getElementById('userName').textContent = currentUser.nombre;
    document.getElementById('userRole').textContent = currentUser.rol || currentUser.area;

    const menu = document.getElementById('appMenu');
    const cardsContainer = document.getElementById('cards-container');
    const APPS_CATALOG = JSON.parse(localStorage.getItem('genAppsCatalog')) || [];

    menu.innerHTML = ''; 
    cardsContainer.innerHTML = '';
    renderWelcomeBanner(currentUser.nombre.split(' ')[0]);

    menu.innerHTML += `
        <button class="w-full flex items-center gap-3 p-2 mb-2 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-400 transition-all group" onclick="showHome()">
            <div class="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 group-hover:bg-red-600 group-hover:text-white flex items-center justify-center transition-colors shadow-sm flex-shrink-0"><i class="ph ph-house text-xl"></i></div>
            <span class="text-sm font-bold tracking-wide">Inicio Dashboard</span>
        </button>
        <div class="border-t border-gray-100 dark:border-gray-700 my-3 mx-2"></div>
        <p class="px-3 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Módulos Activos</p>
    `;

    APPS_CATALOG.forEach(app => {
        const urlImagenOptimizada = optimizarLinkImagen(app.imagen);

        const btn = document.createElement('button');
        btn.className = 'w-full flex items-center gap-3 p-2 mb-1 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-gray-800 hover:text-red-700 dark:hover:text-red-400 transition-all group menu-btn border border-transparent hover:border-red-100 dark:hover:border-gray-700';
        btn.dataset.id = app.id;
        btn.innerHTML = `<div class="w-9 h-9 rounded-full bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600 flex-shrink-0 overflow-hidden flex items-center justify-center group-hover:border-red-300 transition-all"><img src="${urlImagenOptimizada}" class="w-full h-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-110" style="image-rendering: crisp-edges;" onerror="this.outerHTML='<i class=\\'ph ph-app-window text-lg\\'></i>'"></div><div class="flex flex-col items-start text-left overflow-hidden flex-1"><span class="text-sm font-semibold truncate w-full transition-transform duration-300 group-hover:translate-x-1">${app.titulo}</span></div>`;
        btn.onclick = () => { loadApp(app, currentUser); toggleMenu(); };
        menu.appendChild(btn);

        // APLICANDO DISEÑO MOBILE-FIRST EN LAS TARJETAS
        const card = document.createElement('div');
        card.className = 'group relative aspect-square bg-white dark:bg-gray-800 rounded-3xl sm:rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl cursor-pointer transition-shadow duration-500 border border-gray-100 dark:border-gray-700 flex flex-col justify-end';
        card.onclick = () => loadApp(app, currentUser);
        card.innerHTML = `
            <div class="absolute left-1/2 -translate-x-1/2 top-8 w-[55%] h-[55%] sm:top-1/2 sm:-translate-y-1/2 sm:w-[90%] sm:h-[90%] sm:group-hover:top-4 sm:group-hover:-translate-y-0 sm:group-hover:w-[55%] sm:group-hover:h-[55%] rounded-full shadow-sm sm:shadow-none sm:group-hover:shadow-lg transition-all duration-500 ease-out z-20 bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-100 dark:border-gray-600 sm:border-2 sm:border-transparent sm:group-hover:border-gray-50 sm:dark:group-hover:border-gray-700">
                <img src="${urlImagenOptimizada}" alt="${app.titulo}" class="w-full h-full object-contain p-2 sm:p-3 transition-transform duration-500 sm:group-hover:scale-110" style="image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" onerror="this.outerHTML='<div class=\\'w-full h-full flex items-center justify-center bg-red-50 dark:bg-gray-700\\'><i class=\\'ph ph-app-window text-3xl sm:text-4xl text-red-600 dark:text-red-400\\'></i></div>'">
            </div>
            
            <div class="p-3 sm:p-4 text-center z-10 opacity-100 translate-y-0 sm:opacity-0 sm:translate-y-4 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 transition-all duration-500 delay-75 ease-out w-full h-full flex flex-col justify-end mt-auto">
                <h3 class="font-extrabold text-[12px] sm:text-[15px] text-gray-800 dark:text-white leading-tight mb-0.5 sm:mb-1 line-clamp-2">${app.titulo}</h3>
                <p class="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 sm:line-clamp-2 mb-1 sm:mb-2 font-medium leading-tight">${app.info || 'Gestión y control de este módulo.'}</p>
            </div>
        `;
        cardsContainer.appendChild(card);
    });

   const appGuardada = sessionStorage.getItem('genCurrentApp');
    
    if (appGuardada) {
        // Buscamos la app en el catálogo por su ID
        const appToLoad = APPS_CATALOG.find(a => a.id === appGuardada);
        if (appToLoad) {
            loadApp(appToLoad, currentUser);
        } else {
            showHome(); // Fallback por si acaso el ID ya no existe
        }
    } else {
        showHome(); // Comportamiento normal si es la primera vez que entra
    }
}

function renderWelcomeBanner(nombre) {
    const horaLocal = new Date().getHours();
    let saludo, svgIcon, colorCls, bgGlow;
    
    if (horaLocal >= 5 && horaLocal < 12) { 
        saludo = "Buenos días"; colorCls = "text-amber-500"; bgGlow = "bg-amber-100 dark:bg-amber-900/30"; 
        svgIcon = `<svg viewBox="0 0 24 24" fill="none" class="w-16 h-16 sm:w-20 sm:h-20 animate-[spin_12s_linear_infinite] drop-shadow-lg"><path d="M12 4V2M12 22v-2M4 12H2m20 0h-2m-2.05-6.95l1.41-1.41M4.64 19.36l1.41-1.41M19.36 19.36l-1.41-1.41M6.05 6.05L4.64 4.64M16 12a4 4 0 11-8 0 4 4 0 018 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`; 
    } else if (horaLocal >= 12 && horaLocal < 19) { 
        saludo = "Buenas tardes"; colorCls = "text-orange-500"; bgGlow = "bg-orange-100 dark:bg-orange-900/30"; 
        svgIcon = `<svg viewBox="0 0 24 24" fill="none" class="w-16 h-16 sm:w-20 sm:h-20 animate-[bounce_3s_infinite] drop-shadow-lg"><path d="M8 17a4 4 0 110-8c0-.44.07-.87.2-1.28A5.5 5.5 0 0113.5 3 5.5 5.5 0 0119 8.5c0 .17 0 .33-.03.5A4 4 0 1116 17H8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`; 
    } else { 
        saludo = "Buenas noches"; colorCls = "text-indigo-500 dark:text-indigo-400"; bgGlow = "bg-indigo-100 dark:bg-indigo-900/30"; 
        svgIcon = `<svg viewBox="0 0 24 24" fill="none" class="w-16 h-16 sm:w-20 sm:h-20 animate-pulse drop-shadow-lg"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`; 
    }

    // APLICANDO DISEÑO MOBILE-FIRST EN EL BANNER (Padding reducido en sm)
    document.getElementById('welcome-banner').innerHTML = `
        <div class="flex items-center gap-3 sm:gap-8 p-5 sm:p-8 rounded-[2rem] bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden transition-all hover:shadow-md">
            <div class="absolute -right-10 -top-10 w-48 h-48 rounded-full ${bgGlow} opacity-60 blur-3xl pointer-events-none"></div>
            <div class="${colorCls} z-10">${svgIcon}</div>
            <div class="z-10 flex-1">
                <h2 class="text-xl sm:text-4xl font-extrabold text-gray-800 dark:text-white tracking-tight leading-tight">
                    ${saludo}, <span class="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-400">${nombre}</span>
                </h2>
                <p class="text-gray-500 dark:text-gray-400 mt-1 sm:mt-2 font-medium text-xs sm:text-lg">¿Qué módulo vamos a gestionar hoy?</p>
            </div>
        </div>
    `;
}

function showHome() {
    document.getElementById('home-dashboard').classList.remove('hidden');
    document.getElementById('iframe-container').classList.add('hidden');
    document.getElementById('appTitle').textContent = "Inicio";
    document.getElementById('appViewer').src = "about:blank"; 
    document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('bg-red-50', 'text-red-700', 'border-red-100', 'dark:bg-gray-800'));
    sessionStorage.removeItem('genCurrentApp');
}

// === Reemplaza tu función loadApp actual por esta versión limpia ===
function loadApp(app, user) {
    if (!app.link) return alert("Enlace no configurado.");
    sessionStorage.setItem('genCurrentApp', app.id);
    let urlSegura = app.link;
    
    // Tratamiento de URL
    try {
        const urlObj = new URL(app.link);
        urlObj.searchParams.append('email', user.email); 
        urlObj.searchParams.append('rol', user.rol); 
        urlObj.searchParams.append('t', Date.now());
        urlSegura = urlObj.toString();
    } catch (e) { 
        urlSegura = `${app.link}${app.link.includes('?') ? '&' : '?'}email=${encodeURIComponent(user.email)}&rol=${user.rol}&t=${Date.now()}`; 
    }

    // Apps externas (AppSheet, etc.) abren en ventana nueva LIMPIA
    if (['appsheet.com', 'plesk.page', 'galaxycont.com'].some(d => urlSegura.includes(d))) {
        window.open(urlSegura, '_blank');
        return showHome(); 
    }

    // Renderizado en Iframe Interno
    document.getElementById('home-dashboard').classList.add('hidden');
    document.getElementById('iframe-container').classList.remove('hidden');
    
    const iframe = document.getElementById('appViewer');
    const loader = document.getElementById('loader');
    
    loader.classList.remove('hidden');
    document.getElementById('appTitle').textContent = app.titulo;
    
    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.classList.remove('bg-red-50', 'text-red-700', 'border-red-100', 'dark:bg-gray-800');
        if (btn.dataset.id === app.id) btn.classList.add('bg-red-50', 'text-red-700', 'border-red-100', 'dark:bg-gray-800');
    });

    // SIMPLEMENTE QUITAMOS EL LOADER. La sesión se inyectará cuando el iframe responda 'MODULO_LISTO'
    iframe.onload = () => { 
        loader.classList.add('hidden');
    };

    // Cargar la URL en el Iframe al final
    iframe.src = urlSegura; 
}

function toggleMenu() {
    const s = document.getElementById('sidebar'), o = document.getElementById('sidebarOverlay');
    s.classList.toggle('-translate-x-full'); o.classList.toggle('hidden');
}

function openCredentialsModal() {
    const m = document.getElementById('credentialsModal'), userStr = localStorage.getItem('genUser');
    if (userStr) document.getElementById('newUsername').value = JSON.parse(userStr).usuario;
    document.getElementById('newPassword').value = '';
    m.classList.remove('hidden'); m.classList.add('flex'); toggleMenu(); 
}

function closeCredentialsModal() {
    document.getElementById('credentialsModal').classList.add('hidden');
    document.getElementById('credentialsModal').classList.remove('flex');
}

function logout() {
    if (confirm("¿Cerrar sesión?")) {
        localStorage.removeItem('genUser'); localStorage.removeItem('genAppsCatalog');
        document.getElementById('appViewer').src = "about:blank"; checkAuthState();
    }
}

function optimizarLinkImagen(url) {
    if (!url) return "";
    if (url.includes("drive.google.com")) {
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
    }
    return url;
}

// === COMUNICACIÓN CON MICRO-FRONTENDS (HANDSHAKE) ===
window.addEventListener("message", (event) => {
    // Escuchamos si algún iframe nos dice que ya está listo
    if (event.data && event.data.type === 'MODULO_LISTO') {
        console.log("GENAPPS: Módulo Iframe listo. Inyectando sesión...");
        
        // Buscamos la sesión local
        const sessionStr = localStorage.getItem('genUser');
        
        if (sessionStr) {
            const iframe = document.getElementById('appViewer'); // ID de tu iframe en GENAPPS
            
            if (iframe && iframe.contentWindow) {
                // Le enviamos la sesión al Iframe
                iframe.contentWindow.postMessage({ 
                    type: 'SESSION_SYNC', 
                    user: JSON.parse(sessionStr),
                    theme: localStorage.getItem('genTheme') || 'light'
                }, '*');
            }
        } else {
            console.warn("GENAPPS: Iframe pidió sesión, pero no hay usuario logueado.");
        }
    }
});
