// === CONFIGURACIÓN ARQUITECTÓNICA ===
const API_URL = "https://script.google.com/macros/s/AKfycbxLJYQe6QZCiDARD1I5ngkqS3hjfzT1oYki9rlClbNpFf-fjLwXv_Lhp_TOcjLgOTZt/exec";

// === CICLO DE VIDA ===
document.addEventListener('DOMContentLoaded', () => {
    initTheme(); // Cargar Modo Nocturno
    checkAuthState();
    bindLoginEvents();
    
    // Registrar el Service Worker para PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').catch(err => console.error('SW Error:', err));
        });
    }
});

// === MOTOR DE MODO NOCTURNO ===
function initTheme() {
    const isDark = localStorage.getItem('genTheme') === 'dark';
    if (isDark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    actualizarIconoTema(isDark);
}

function toggleTheme() {
    const htmlEl = document.documentElement;
    htmlEl.classList.toggle('dark');
    const isDark = htmlEl.classList.contains('dark');
    localStorage.setItem('genTheme', isDark ? 'dark' : 'light');
    actualizarIconoTema(isDark);
}

function actualizarIconoTema(isDark) {
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (!themeBtn) return;
    if (isDark) {
        themeBtn.innerHTML = `<i class="ph ph-sun text-xl text-amber-400"></i><span class="font-medium text-sm text-gray-200">Tema Claro</span>`;
    } else {
        themeBtn.innerHTML = `<i class="ph ph-moon text-xl text-gray-600"></i><span class="font-medium text-sm">Tema Oscuro</span>`;
    }
}

// === MÁQUINA DE ESTADOS (VISTAS) ===
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

// === LÓGICA DE LOGIN ===
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

            if (!response.ok) throw new Error("Error al conectar con los servidores.");
            const data = await response.json();

            if (data.status === 'success') {
                localStorage.setItem('genUser', JSON.stringify(data.user));
                localStorage.setItem('genAppsCatalog', JSON.stringify(data.apps));
                checkAuthState();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            err.textContent = error.message || "Ocurrió un error inesperado al conectar.";
            err.classList.remove('hidden');
        } finally {
            btn.innerHTML = 'Ingresar';
            btn.disabled = false;
        }
    });
}

// === LÓGICA DEL HUB (CONTENEDOR) ===
function initHub(currentUser) {
    document.getElementById('userName').textContent = currentUser.nombre;
    document.getElementById('userRole').textContent = currentUser.rol || currentUser.area;

    const menu = document.getElementById('appMenu');
    const cardsContainer = document.getElementById('cards-container');
    const APPS_CATALOG = JSON.parse(localStorage.getItem('genAppsCatalog')) || [];

    menu.innerHTML = ''; 
    cardsContainer.innerHTML = '';

    renderWelcomeBanner(currentUser.nombre.split(' ')[0]);

    // Botón Inicio en Sidebar
    menu.innerHTML += `
        <button class="w-full flex items-center gap-3 p-2 mb-2 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-400 transition-all group" onclick="showHome()">
            <div class="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 group-hover:bg-red-600 group-hover:text-white flex items-center justify-center transition-colors shadow-sm flex-shrink-0">
                <i class="ph ph-house text-xl"></i>
            </div>
            <span class="text-sm font-bold tracking-wide">Inicio Dashboard</span>
        </button>
        <div class="border-t border-gray-100 dark:border-gray-700 my-3 mx-2"></div>
        <p class="px-3 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Módulos Activos</p>
    `;

    // UN SOLO BUCLE PARA SIDEBAR Y TARJETAS
    APPS_CATALOG.forEach(app => {
        const urlImagenOptimizada = optimizarLinkImagen(app.imagen);

        // 1. Inyectar Menú Lateral
        const btn = document.createElement('button');
        btn.className = 'w-full flex items-center gap-3 p-2 mb-1 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-gray-800 hover:text-red-700 dark:hover:text-red-400 transition-all group menu-btn border border-transparent hover:border-red-100 dark:hover:border-gray-700';
        btn.dataset.id = app.id;
        btn.innerHTML = `
            <div class="w-9 h-9 rounded-full bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600 flex-shrink-0 overflow-hidden flex items-center justify-center group-hover:border-red-300 transition-all">
                <img src="${urlImagenOptimizada}" alt="${app.titulo}" class="w-full h-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-110" style="image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" onerror="this.outerHTML='<i class=\\'ph ph-app-window text-lg text-gray-400 dark:text-gray-500\\'></i>'">
            </div>
            <div class="flex flex-col items-start text-left overflow-hidden flex-1">
                <span class="text-sm font-semibold truncate w-full transition-transform duration-300 group-hover:translate-x-1">${app.titulo}</span>
            </div>
        `;
        btn.onclick = () => { loadApp(app, currentUser); toggleMenu(); };
        menu.appendChild(btn);

        // 2. Inyectar Tarjeta Ultra Compacta
        const card = document.createElement('div');
        card.className = 'group relative aspect-square bg-white dark:bg-gray-800 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl cursor-pointer transition-shadow duration-500 border border-gray-100 dark:border-gray-700 flex flex-col justify-end';
        card.onclick = () => loadApp(app, currentUser);
        
        card.innerHTML = `
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] group-hover:top-6 group-hover:-translate-y-0 group-hover:w-[55%] group-hover:h-[55%] rounded-full shadow-none group-hover:shadow-lg transition-all duration-500 ease-out z-20 bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden border-2 border-transparent group-hover:border-gray-50 dark:group-hover:border-gray-700">
                <img src="${urlImagenOptimizada}" alt="${app.titulo}" class="w-full h-full object-contain p-3 transition-transform duration-500 group-hover:scale-110" style="image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" onerror="this.outerHTML='<div class=\\'w-full h-full flex items-center justify-center bg-red-50 dark:bg-gray-700\\'><i class=\\'ph ph-app-window text-4xl text-red-600 dark:text-red-400\\'></i></div>'">
            </div>

            <div class="p-4 text-center z-10 opacity-0 transform translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 delay-75 ease-out w-full h-full flex flex-col justify-end mt-auto">
                <h3 class="font-extrabold text-[15px] text-gray-800 dark:text-white leading-tight mb-1 line-clamp-2">${app.titulo}</h3>
                <p class="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mb-2 font-medium leading-tight hidden sm:block">${app.info || 'Gestión y control de este módulo.'}</p>
            </div>
        `;
        cardsContainer.appendChild(card);
    });

    showHome();
}

// === RENDERIZADOR DEL BANNER DINÁMICO ===
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

    const container = document.getElementById('welcome-banner');
    container.innerHTML = `
        <div class="flex items-center gap-4 sm:gap-8 p-6 sm:p-8 rounded-[2rem] bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden transition-all hover:shadow-md">
            <div class="absolute -right-10 -top-10 w-48 h-48 rounded-full ${bgGlow} opacity-60 blur-3xl pointer-events-none"></div>
            <div class="${colorCls} z-10">${svgIcon}</div>
            <div class="z-10 flex-1">
                <h2 class="text-2xl sm:text-4xl font-extrabold text-gray-800 dark:text-white tracking-tight leading-tight">
                    ${saludo}, <span class="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-400">${nombre}</span>
                </h2>
                <p class="text-gray-500 dark:text-gray-400 mt-2 font-medium text-sm sm:text-lg">¿Qué módulo de La Genovesa vamos a gestionar hoy?</p>
            </div>
        </div>
    `;
}

// === NAVEGACIÓN Y CARGA DE APPS ===
function showHome() {
    document.getElementById('home-dashboard').classList.remove('hidden');
    document.getElementById('iframe-container').classList.add('hidden');
    document.getElementById('appTitle').textContent = "Inicio";
    document.getElementById('appViewer').src = "about:blank"; 
    
    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.classList.remove('bg-red-50', 'text-red-700', 'border-red-100', 'dark:bg-gray-800');
    });
}

function loadApp(app, user) {
    if (!app.link || app.link.trim() === "") {
        alert("Este módulo aún no tiene un enlace configurado.");
        return;
    }

    let urlSegura = app.link;
    try {
        const urlObj = new URL(app.link);
        urlObj.searchParams.append('email', user.email);
        urlObj.searchParams.append('rol', user.rol);
        urlObj.searchParams.append('t', Date.now());
        urlSegura = urlObj.toString();
    } catch (e) {
        const separador = app.link.includes('?') ? '&' : '?';
        urlSegura = `${app.link}${separador}email=${encodeURIComponent(user.email)}&rol=${user.rol}&t=${Date.now()}`;
    }

    // Dominios que bloquean iframes abren en PopUp Nativo
    const dominiosBloqueados = ['appsheet.com', 'plesk.page', 'galaxycont.com'];
    if (dominiosBloqueados.some(dominio => urlSegura.includes(dominio))) {
        const ancho = window.innerWidth * 0.8;
        const alto = window.innerHeight * 0.8;
        const left = (window.innerWidth - ancho) / 2;
        const top = (window.innerHeight - alto) / 2;
        
        window.open(urlSegura, app.titulo, `width=${ancho},height=${alto},top=${top},left=${left},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`);
        showHome(); 
        return; 
    }

    // Apps internas abren en Iframe
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

    iframe.src = urlSegura;
    iframe.onload = () => loader.classList.add('hidden');
}

// === INTERACCIONES DE UI ===
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    } else {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }
}

function openCredentialsModal() {
    const modal = document.getElementById('credentialsModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    toggleMenu(); 
}

function closeCredentialsModal() {
    const modal = document.getElementById('credentialsModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function logout() {
    if (confirm("¿Estás seguro de que deseas cerrar la sesión?")) {
        localStorage.removeItem('genUser');
        localStorage.removeItem('genAppsCatalog');
        document.getElementById('appViewer').src = "about:blank";
        checkAuthState();
    }
}

// === UTILIDADES ARQUITECTÓNICAS ===
function optimizarLinkImagen(url) {
    if (!url) return "";
    if (url.includes("drive.google.com")) {
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
            return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
        }
    }
    return url;
}
