// === CONFIGURACIÓN ARQUITECTÓNICA ===
const API_URL = "https://script.google.com/macros/s/AKfycbxLJYQe6QZCiDARD1I5ngkqS3hjfzT1oYki9rlClbNpFf-fjLwXv_Lhp_TOcjLgOTZt/exec";

// === CICLO DE VIDA ===
document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
    bindLoginEvents();
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
    
    // Recuperar el catálogo dinámico desde el servidor
    const APPS_CATALOG = JSON.parse(localStorage.getItem('genAppsCatalog')) || [];

    menu.innerHTML = ''; 
    cardsContainer.innerHTML = '';

    // Botón de Inicio fijo en el menú
    menu.innerHTML += `
        <button class="w-full flex items-center gap-3 p-3 mb-2 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-all group" onclick="showHome()">
            <i class="ph ph-house text-2xl group-hover:scale-110 transition-transform"></i>
            <span class="text-sm font-semibold">Inicio (Dashboard)</span>
        </button>
        <div class="border-t border-gray-100 my-2"></div>
    `;

    // Renderizar tarjetas iterando sobre la BD de Apps
    APPS_CATALOG.forEach(app => {
        // 1. Inyectar en el Menú Lateral
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

        // 2. Inyectar Tarjeta en el Dashboard (Con imagen real dinámica)
        const card = document.createElement('div');
        card.className = 'bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-3 cursor-pointer hover:shadow-xl hover:-translate-y-2 hover:border-red-200 transition-all duration-300 group relative overflow-hidden';
        card.onclick = () => loadApp(app, currentUser);
        
        // Uso la etiqueta <img> para cargar la URL de la imagen del backend.
        // OnError: Si el link falla, pone un ícono por defecto automáticamente.
        card.innerHTML = `
            <div class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-50 to-transparent rounded-bl-full -z-10 transition-transform group-hover:scale-150"></div>
            
            <div class="w-14 h-14 rounded-xl bg-red-50 flex items-center justify-center group-hover:bg-red-600 transition-colors shadow-sm overflow-hidden">
                <img src="${app.imagen}" alt="${app.titulo}" class="w-full h-full object-cover group-hover:opacity-90" 
                     onerror="this.outerHTML='<i class=\\'ph ph-squares-four text-3xl text-red-600 group-hover:text-white\\'></i>'">
            </div>
            
            <div class="mt-2">
                <h3 class="font-bold text-gray-800 text-lg leading-tight mb-1">${app.titulo}</h3>
                <p class="text-xs text-gray-500 line-clamp-2">${app.info || 'Haz clic para acceder al módulo.'}</p>
            </div>
            
            <div class="mt-auto pt-4 flex items-center justify-between text-xs font-semibold text-gray-400 group-hover:text-red-600 transition-colors">
                <span>Abrir Módulo</span>
                <i class="ph ph-arrow-right text-lg"></i>
            </div>
        `;
        cardsContainer.appendChild(card);
    });

    showHome();
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
    // Validar que haya un enlace
    if (!app.link || app.link.trim() === "") {
        alert("Este módulo aún no tiene un enlace configurado.");
        return;
    }

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

    // Constructor Seguro de URLs (Previene errores si el link original ya tiene parámetros '?')
    let urlSegura = app.link;
    try {
        const urlObj = new URL(app.link);
        urlObj.searchParams.append('email', user.email);
        urlObj.searchParams.append('rol', user.rol);
        urlObj.searchParams.append('t', Date.now());
        urlSegura = urlObj.toString();
    } catch (e) {
        // Fallback si la URL no es estándar
        const separador = app.link.includes('?') ? '&' : '?';
        urlSegura = `${app.link}${separador}email=${encodeURIComponent(user.email)}&rol=${user.rol}&t=${Date.now()}`;
    }

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
