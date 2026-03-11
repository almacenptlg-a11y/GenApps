// === CONFIGURACIÓN ARQUITECTÓNICA ===
const API_URL = "https://script.google.com/macros/s/AKfycbxLJYQe6QZCiDARD1I5ngkqS3hjfzT1oYki9rlClbNpFf-fjLwXv_Lhp_TOcjLgOTZt/exec";

// === CICLO DE VIDA ===
document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
    bindLoginEvents();
    
    // NUEVO: Registrar el Service Worker para hacer la App instalable
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    console.log('ServiceWorker registrado con éxito con el scope: ', registration.scope);
                })
                .catch(err => {
                    console.error('Fallo al registrar el ServiceWorker: ', err);
                });
        });
    }
});

// === MÁQUINA DE ESTADOS (VISTAS) ===
function checkAuthState() {
    const userStr = localStorage.getItem('genUser');
    const loginView = document.getElementById('login-view');
    const hubView = document.getElementById('hub-view');

    if (userStr) {
        // Sesión activa: Mostrar Hub, ocultar Login
        loginView.classList.add('hidden');
        hubView.classList.remove('hidden');
        initHub(JSON.parse(userStr));
    } else {
        // Sin sesión: Mostrar Login, ocultar Hub
        hubView.classList.add('hidden');
        loginView.classList.remove('hidden');
        // Limpiar formulario por si acaso
        const form = document.getElementById('loginForm');
        if (form) form.reset();
    }
}

// === LÓGICA DE LOGIN ===
function bindLoginEvents() {
    const form = document.getElementById('loginForm');
    if (!form) return; // Seguridad si no existe el form en la vista
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = document.getElementById('btnSubmit');
        const err = document.getElementById('errorMsg');
        
        btn.innerHTML = '<i class="ph ph-spinner animate-spin text-xl"></i> Verificando credenciales...';
        btn.disabled = true;
        err.classList.add('hidden');

        const payload = {
            action: 'login',
            user: document.getElementById('username').value,
            pass: document.getElementById('password').value
        };

        try {
            // text/plain evita el bloqueo de CORS preflight de Google
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error("Error de red al conectar con los servidores.");

            const data = await response.json();

            if (data.status === 'success') {
                // Guardamos la sesión y el catálogo dinámico
                localStorage.setItem('genUser', JSON.stringify(data.user));
                localStorage.setItem('genAppsCatalog', JSON.stringify(data.apps));
                checkAuthState();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error("Detalle del error:", error);
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
    
    // Recuperar el catálogo
    const APPS_CATALOG = JSON.parse(localStorage.getItem('genAppsCatalog')) || [];

    menu.innerHTML = ''; 
    cardsContainer.innerHTML = '';

    // Renderizar Banner Dinámico de Bienvenida
    renderWelcomeBanner(currentUser.nombre.split(' ')[0]); // Usamos solo el primer nombre

    // Menú Lateral Fijo
    menu.innerHTML += `
        <button class="w-full flex items-center gap-3 p-3 mb-2 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-all group" onclick="showHome()">
            <i class="ph ph-house text-2xl group-hover:scale-110 transition-transform"></i>
            <span class="text-sm font-semibold">Inicio (Dashboard)</span>
        </button>
        <div class="border-t border-gray-100 my-2"></div>
    `;

    // Renderizar Tarjetas Avanzadas
    APPS_CATALOG.forEach(app => {
        // 1. Inyectar Menú Lateral
        const btn = document.createElement('button');
        btn.className = 'w-full flex items-center gap-3 p-3 mb-1 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-all group menu-btn';
        btn.dataset.id = app.id;
        btn.innerHTML = `
            <i class="ph ph-app-window text-2xl group-hover:scale-110 transition-transform"></i>
            <div class="flex flex-col items-start text-left overflow-hidden">
                <span class="text-sm font-semibold truncate w-full">${app.titulo}</span>
            </div>
        `;
        btn.onclick = () => { loadApp(app, currentUser); toggleMenu(); };
        menu.appendChild(btn);

       // 2. Inyectar Tarjeta Ultra Compacta (App Launcher Style)
        const card = document.createElement('div');
        // Usamos 'aspect-square' para que sea un cuadrado perfecto.
        card.className = 'group relative aspect-square bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl cursor-pointer transition-all duration-500 border border-gray-100 flex flex-col justify-end';
        card.onclick = () => loadApp(app, currentUser);
        
        card.innerHTML = `
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] h-[95%] group-hover:top-5 group-hover:-translate-y-0 group-hover:w-14 group-hover:h-14 rounded-full shadow-none group-hover:shadow-md transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] z-20 bg-white flex items-center justify-center overflow-hidden border-2 border-transparent group-hover:border-white">
                <img src="${app.imagen}" alt="${app.titulo}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                     onerror="this.outerHTML='<div class=\\'w-full h-full flex items-center justify-center bg-red-50\\'><i class=\\'ph ph-app-window text-3xl text-red-600\\'></i></div>'">
            </div>

            <div class="p-3 pb-4 text-center z-10 opacity-0 transform translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-700 delay-75 ease-[cubic-bezier(0.4,0,0.2,1)] w-full h-full flex flex-col justify-end mt-auto">
                
                <h3 class="font-extrabold text-[13px] text-gray-800 leading-tight mb-1 line-clamp-2">
                    ${app.titulo}
                </h3>
                
                <p class="text-[10px] text-gray-500 line-clamp-2 mb-2 font-medium leading-tight hidden sm:block">
                    ${app.info || 'Gestión y control.'}
                </p>
                
                <div class="flex items-center justify-center gap-1 font-bold text-red-600 text-[10px] uppercase tracking-widest mt-auto">
                    <span>Abrir</span>
                    <i class="ph ph-arrow-right text-xs transition-transform group-hover:translate-x-1"></i>
                </div>
            </div>
        `;
        cardsContainer.appendChild(card);
    });

    showHome();
}

// === RENDERIZADOR DEL BANNER DINÁMICO (NUEVO) ===
function renderWelcomeBanner(nombre) {
    const horaLocal = new Date().getHours();
    let saludo, svgIcon, colorCls, bgGlow;

    // Lógica de Mañana (05:00 - 11:59)
    if (horaLocal >= 5 && horaLocal < 12) {
        saludo = "Buenos días";
        colorCls = "text-amber-500";
        bgGlow = "bg-amber-100";
        // SVG Sol girando lentamente
        svgIcon = `<svg viewBox="0 0 24 24" fill="none" class="w-16 h-16 sm:w-20 sm:h-20 animate-[spin_12s_linear_infinite] drop-shadow-lg"><path d="M12 4V2M12 22v-2M4 12H2m20 0h-2m-2.05-6.95l1.41-1.41M4.64 19.36l1.41-1.41M19.36 19.36l-1.41-1.41M6.05 6.05L4.64 4.64M16 12a4 4 0 11-8 0 4 4 0 018 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    } 
    // Lógica de Tarde (12:00 - 18:59)
    else if (horaLocal >= 12 && horaLocal < 19) {
        saludo = "Buenas tardes";
        colorCls = "text-orange-500";
        bgGlow = "bg-orange-100";
        // SVG Sol y Nube con animación flotante suave
        svgIcon = `<svg viewBox="0 0 24 24" fill="none" class="w-16 h-16 sm:w-20 sm:h-20 animate-[bounce_3s_infinite] drop-shadow-lg"><path d="M8 17a4 4 0 110-8c0-.44.07-.87.2-1.28A5.5 5.5 0 0113.5 3 5.5 5.5 0 0119 8.5c0 .17 0 .33-.03.5A4 4 0 1116 17H8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    } 
    // Lógica de Noche (19:00 - 04:59)
    else {
        saludo = "Buenas noches";
        colorCls = "text-indigo-500";
        bgGlow = "bg-indigo-100";
        // SVG Luna con animación de pulso estelar
        svgIcon = `<svg viewBox="0 0 24 24" fill="none" class="w-16 h-16 sm:w-20 sm:h-20 animate-pulse drop-shadow-lg"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    }

    const container = document.getElementById('welcome-banner');
    container.innerHTML = `
        <div class="flex items-center gap-4 sm:gap-8 p-6 sm:p-8 rounded-[2rem] bg-white shadow-sm border border-gray-100 relative overflow-hidden transition-all hover:shadow-md">
            <div class="absolute -right-10 -top-10 w-48 h-48 rounded-full ${bgGlow} opacity-60 blur-3xl pointer-events-none"></div>
            
            <div class="${colorCls} z-10">
                ${svgIcon}
            </div>
            
            <div class="z-10 flex-1">
                <h2 class="text-2xl sm:text-4xl font-extrabold text-gray-800 tracking-tight leading-tight">
                    ${saludo}, <span class="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-400">${nombre}</span>
                </h2>
                <p class="text-gray-500 mt-2 font-medium text-sm sm:text-lg">¿Qué módulo de La Genovesa vamos a gestionar hoy?</p>
            </div>
        </div>
    `;
}

// === NAVEGACIÓN ENTRE INICIO Y APPS ===
function showHome() {
    document.getElementById('home-dashboard').classList.remove('hidden');
    document.getElementById('iframe-container').classList.add('hidden');
    document.getElementById('appTitle').textContent = "Inicio";
    document.getElementById('appViewer').src = "about:blank"; // Liberar memoria
    
    // Quitar selección del menú
    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.classList.remove('bg-red-50', 'text-red-600', 'shadow-sm', 'border', 'border-red-100');
    });
}

function loadApp(app, user) {
    // 1. Validar que haya un enlace
    if (!app.link || app.link.trim() === "") {
        alert("Este módulo aún no tiene un enlace configurado.");
        return;
    }

    // 2. Constructor Seguro de URLs
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

    // ==========================================
    // 3. REGLA ARQUITECTÓNICA (NUEVO)
    // Detección de apps que bloquean Iframes
    // ==========================================
    if (urlSegura.includes('appsheet.com')) {
        // Abrimos AppSheet en una nueva pestaña para evitar el bloqueo X-Frame-Options
        window.open(urlSegura, '_blank');
        
        // Mantener al usuario en la vista del Dashboard (no mostramos iframe vacío)
        showHome(); 
        return; 
    }

    // ==========================================
    // 4. LÓGICA NORMAL (Para apps internas/Apps Script)
    // ==========================================
    document.getElementById('home-dashboard').classList.add('hidden');
    document.getElementById('iframe-container').classList.remove('hidden');
    
    const iframe = document.getElementById('appViewer');
    const loader = document.getElementById('loader');
    
    loader.classList.remove('hidden');
    document.getElementById('appTitle').textContent = app.titulo;

    // Resaltar menú activo
    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.classList.remove('bg-red-50', 'text-red-600', 'shadow-sm', 'border', 'border-red-100');
        if (btn.dataset.id === app.id) btn.classList.add('bg-red-50', 'text-red-600', 'shadow-sm', 'border', 'border-red-100');
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

function toggleTheme() {
    alert("Función de Tema Oscuro en desarrollo. ¡Próximamente!");
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
        localStorage.removeItem('genAppsCatalog'); // Importante limpiar el catálogo
        document.getElementById('appViewer').src = "about:blank";
        checkAuthState();
    }
}
