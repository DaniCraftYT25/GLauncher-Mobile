/**
 * ═══════════════════════════════════════════════════════════════════
 * GLauncher Mobile — Main Application JavaScript
 * ═══════════════════════════════════════════════════════════════════
 * Launcher de Minecraft para Android (Landscape)
 * Soporta: Vanilla, Fabric, Forge, NeoForge
 */

(function () {
    'use strict';

    // ─── API Endpoints ───
    const API = {
        vanilla: 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json',
        fabric: {
            game: 'https://meta.fabricmc.net/v2/versions/game',
            loader: 'https://meta.fabricmc.net/v2/versions/loader'
        },
        prism: {
            fabric: 'https://meta.prismlauncher.org/v1/net.fabricmc.fabric-loader/index.json',
            forge: 'https://meta.prismlauncher.org/v1/net.minecraftforge/index.json',
            neoforge: 'https://meta.prismlauncher.org/v1/net.neoforged/index.json'
        },
        modrinth: 'https://api.modrinth.com/v2/search'
    };

    // ─── Service Keys ───
    const SUPABASE_URL = 'https://ouqpeojilykkrmatijxp.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91cXBlb2ppbHlra3JtYXRpanhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5OTc3NjgsImV4cCI6MjA4NTU3Mzc2OH0.cI5AV0N-F1B2tqvBUKgOz0T2XCF3i56K23spLb3sHHY';
    const GIPHY_API_KEY = '1At7olUkhbz0QZOZCPdbbpYngyLOe3CS';

    // FIX: Usar el objeto global 'supabase' para crear el cliente y guardarlo en una nueva variable.
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ─── App State ───
    const state = {
        currentView: 'home',
        currentLoader: 'vanilla',
        versions: {
            vanilla: [],
            fabric: [],
            forge: [],
            neoforge: []
        },
        selectedVersion: null,
        installedVersions: [],
        showSnapshots: false,
        searchQuery: '',
        currentPage: 0,
        notifications: [],
        installedAssets: [], // Para mods, texturas, etc.
        chatMessages: [],
        user: {
            name: 'Jugador',
            uuid: '00000000-0000-0000-0000-000000000000',
            type: 'offline',
            avatar: 'images/default_avatar.png'
        },
        virtualControls: {
            presets: [
                { 
                    controls: [
                        {
                            id: 'vc-default-joystick',
                            type: 'joystick',
                            label: '',
                            func: 'joystick_move',
                            x: 18,
                            y: 70,
                            size: 120,
                            opacity: 70,
                            color: '#9b59b6',
                            shape: 'circle'
                        },
                        {
                            id: 'vc-default-menu',
                            type: 'button',
                            label: '☰',
                            func: 'ingame_menu',
                            x: 6,
                            y: 8,
                            size: 48,
                            opacity: 80,
                            color: '#95a5a6',
                            shape: 'square'
                        },
                        {
                            id: 'vc-default-jump',
                            type: 'button',
                            label: 'JMP',
                            func: 'key_space',
                            x: 88,
                            y: 75,
                            size: 70,
                            opacity: 70,
                            color: '#2ecc71',
                            shape: 'circle'
                        }
                    ], 
                    mouseMode: true 
                },
                { controls: [], mouseMode: true },
                { controls: [], mouseMode: true }
            ],
            activePreset: 0,
            selectedId: null,
        },
        settings: {
            ram: 2048,
            particles: true,
            animations: true,
            closeOnLaunch: false,
            showSnapshots: false,
            jvmArgs: '-XX:+UseG1GC',
            uiZoom: 100,
            resolution: 100, // Porcentaje de resolución (30 a 100)
            backgroundUri: 'images/ifondo.png',
            backgroundBlur: 1,
            backgroundSaturate: 120
        }
    };

    const PAGE_SIZE = 50;

    // ─── DOM References ───
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // ─── Initialization ───
    document.addEventListener('DOMContentLoaded', () => {
        initNavigation();
        loadUserProfile();
        loadSettings();
        loadInstalledVersions(); // ← Cargar versiones instaladas desde localStorage
        applyBackgroundSettings();
        initParticles();
        initNotifDrawer();
        initVirtualControls();
        initTutorial();
        initInGameMenu();
        initGMusicPlayerControls();
        initPersistentChat();
        loadAllVersionCounts().then(() => {
            switchView('home');
            showNotification('¡Bienvenido a GLauncher!', 'success');
        });
    });

    function saveInstalledVersions() {
        localStorage.setItem('glauncher_installed_versions', JSON.stringify(state.installedVersions));
    }

    function loadInstalledVersions() {
        try {
            const saved = localStorage.getItem('glauncher_installed_versions');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    state.installedVersions = parsed;
                }
            }
        } catch(e) {
            console.error('Error cargando versiones instaladas:', e);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // NAVIGATION SYSTEM
    // ═══════════════════════════════════════════════════════════════
    function initNavigation() {
        const navItems = $$('.nav-item');
        const viewTitles = {
            home: ['INICIO', 'Bienvenido a GLauncher'],
            versions: ['VERSIONES', 'Gestiona tus versiones de Minecraft'],
            mods: ['MODS', 'Explora y gestiona tus mods'],
            gmusic: ['GMUSIC', 'Reproductor de música y soundtracks'],
            account: ['CUENTA', 'Tu perfil y configuración'],
            settings: ['AJUSTES', 'Personaliza tu experiencia']
        };

        navItems.forEach(btn => {
            btn.addEventListener('click', () => {
                const viewId = btn.dataset.view;
                if (viewId === state.currentView) return;

                // Update nav active state
                navItems.forEach(n => n.classList.remove('active'));
                btn.classList.add('active');

                // Switch views
                switchView(viewId);

                // Update top bar
                const [title, subtitle] = viewTitles[viewId] || ['', ''];
                $('#top-bar-title').textContent = title;
                $('#top-bar-subtitle').textContent = subtitle;

                state.currentView = viewId;
            });
        });

        // Topbar Settings button handler
        const topSettingsBtn = $('#btn-settings-top');
        if (topSettingsBtn) {
            topSettingsBtn.addEventListener('click', () => {
                navItems.forEach(n => n.classList.remove('active'));
                switchView('settings');
                const [title, subtitle] = viewTitles.settings;
                $('#top-bar-title').textContent = title;
                $('#top-bar-subtitle').textContent = subtitle;
                state.currentView = 'settings';
            });
        }

        // Sidebar logo tap -> go home
        $('#sidebar-logo').addEventListener('click', () => {
            $$('.nav-item').forEach(n => n.classList.remove('active'));
            $('#nav-home').classList.add('active');
            switchView('home');
            $('#top-bar-title').textContent = 'INICIO';
            $('#top-bar-subtitle').textContent = 'Bienvenido a GLauncher';
            state.currentView = 'home';
        });

        // Refresh button
        $('#btn-refresh').addEventListener('click', () => {
            const btn = $('#btn-refresh');
            btn.querySelector('i').style.transition = 'transform 0.5s ease';
            btn.querySelector('i').style.transform = 'rotate(360deg)';
            setTimeout(() => {
                btn.querySelector('i').style.transform = '';
            }, 500);
            
            if (state.currentView === 'versions') {
                loadVersions(state.currentLoader);
            } else if (state.currentView === 'mods') {
                loadMods();
            }
            showNotification('Datos actualizados', 'success');
        });
    }

    function switchView(viewId) {
        const contentArea = $('#content-area');
        const allViews = $$('.view');
        const targetView = $(`#view-${viewId}`);

        // Ocultar todas las vistas
        allViews.forEach(view => view.classList.remove('active'));

        if (targetView) {
            // Mostrar la vista correcta
            targetView.classList.add('active');
        } else {
            console.error(`Error al cambiar de vista: No se encontró el elemento #view-${viewId}`);
            contentArea.innerHTML = `<div class="empty-state"><h3>Error al cargar la vista</h3><p>No se encontró la vista '${viewId}'.</p></div>`;
            return;
        }

        contentArea.scrollTop = 0;

        // Ejecutar los inicializadores específicos de la vista
        switch (viewId) {
            case 'home':
                initHeroVersionSelector();
                initPlayButton();
                updateStats();
                break;
            case 'versions':
                initVersionTabs();
                initSearchFilters();
                loadVersions(state.currentLoader);
                break;
            case 'mods':
                initInstalledAssets();
                loadMods();
                break;
            case 'gmusic':
                initGMusic();
                break;
            case 'account':
                initAccountButtons();
                updateUserUI();
                initAccountTabs();
                renderGChat(); // Solo renderizar, no reiniciar la conexión
                break;
            case 'settings':
                initSettings();
                break;
        }
    }

    async function loadAllVersionCounts() {
        // Carga en paralelo los datos de todas las versiones para tener las estadísticas listas
        await Promise.all([
            loadVanillaVersions().catch(e => console.error("Failed to load vanilla versions:", e)),
            loadFabricVersions().catch(e => console.error("Failed to load fabric versions:", e)),
            loadForgeVersions().catch(e => console.error("Failed to load forge versions:", e)),
            loadNeoForgeVersions().catch(e => console.error("Failed to load neoforge versions:", e))
        ]);
    }
    // ═══════════════════════════════════════════════════════════════
    // VERSION MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    function initVersionTabs() {
        const tabs = $$('.loader-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                state.currentLoader = tab.dataset.loader;
                state.currentPage = 0; // reset pagination on loader change
                state.selectedVersion = null;
                resetVersionDetail();
                loadVersions(tab.dataset.loader);
            });
        });
    }

    function initSearchFilters() {
        const searchInput = $('#version-search');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    state.searchQuery = e.target.value.toLowerCase();
                    renderVersionList();
                }, 200);
            });
        }

        const filterReleases = $('#filter-releases');
        if (filterReleases) {
            filterReleases.addEventListener('click', () => {
                filterReleases.classList.toggle('active');
                state.showSnapshots = false;
                renderVersionList();
            });
        }

        const filterSnapshots = $('#filter-snapshots');
        if (filterSnapshots) {
            filterSnapshots.addEventListener('click', () => {
                filterSnapshots.classList.toggle('active');
                state.showSnapshots = filterSnapshots.classList.contains('active');
                renderVersionList();
            });
        }
    }

    async function loadVersions(loader) {
        const list = $('#version-list');
        list.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <span>Cargando versiones ${loader}...</span>
            </div>
        `;

        try {
            switch (loader) {
                case 'vanilla':
                    await loadVanillaVersions();
                    break;
                case 'fabric':
                    await loadFabricVersions();
                    break;
                case 'forge':
                    await loadForgeVersions();
                    break;
                case 'neoforge':
                    await loadNeoForgeVersions();
                    break;
            }
            renderVersionList();
        } catch (error) {
            console.error(`Error loading ${loader} versions:`, error);
            list.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error de conexión</h3>
                    <p>No se pudieron cargar las versiones de ${loader}. Verifica tu conexión a internet.</p>
                </div>
            `;
            showNotification(`Error al cargar versiones de ${loader}`, 'error');
        }
    }

    async function loadVanillaVersions() {
        const response = await fetch(API.vanilla);
        const data = await response.json();
        state.versions.vanilla = data.versions.map(v => ({
            id: v.id,
            type: v.type,
            url: v.url,
            releaseTime: v.releaseTime,
            loader: 'vanilla'
        }));
    }

    async function loadFabricVersions() {
        const response = await fetch(API.fabric.game);
        const games = await response.json();
        const loaderResponse = await fetch(API.fabric.loader);
        const loaders = await loaderResponse.json();
        const latestLoader = loaders[0]?.version;

        if (!latestLoader) {
            state.versions.fabric = [];
            return;
        }

        state.versions.fabric = games
            .filter(v => v.stable) // Solo versiones estables de MC
            .map(v => ({
                id: v.version,
                type: 'release',
                loader: 'fabric',
                url: `https://meta.fabricmc.net/v2/versions/loader/${v.version}/${latestLoader}/profile/json`,
                releaseTime: new Date().toISOString() // La API de Fabric no da fecha
            }));
    }

    async function loadForgeVersions() {
        const response = await fetch(API.prism.forge);
        const data = await response.json();
        const arr = Array.isArray(data) ? data : (data.versions || []);
        const grouped = {};

        arr.forEach(v => {
            const gameVersion = v.requires?.find(r => r.uid === 'net.minecraft')?.equals;
            if (gameVersion) {
                if (!grouped[gameVersion]) {
                    grouped[gameVersion] = { id: gameVersion, type: 'release', loader: 'forge', releaseTime: v.releaseTime, loaderVersions: {} };
                }
                // FIX: Guardar el objeto de versión completo, no solo la URL.
                if (v.version) {
                    grouped[gameVersion].loaderVersions[v.version] = v;
                }
                if (new Date(v.releaseTime) > new Date(grouped[gameVersion].releaseTime)) {
                    grouped[gameVersion].releaseTime = v.releaseTime;
                }
            }
        });

        state.versions.forge = Object.values(grouped).sort((a, b) => new Date(b.releaseTime) - new Date(a.releaseTime));
    }

    async function loadNeoForgeVersions() {
        const response = await fetch(API.prism.neoforge);
        const data = await response.json();
        const arr = Array.isArray(data) ? data : (data.versions || []);
        const grouped = {};

        arr.forEach(v => {
            const gameVersion = v.requires?.find(r => r.uid === 'net.minecraft')?.equals;
            if (gameVersion) {
                if (!grouped[gameVersion]) {
                    grouped[gameVersion] = { id: gameVersion, type: 'release', loader: 'neoforge', releaseTime: v.releaseTime, loaderVersions: {} };
                }
                // FIX: Guardar el objeto de versión completo, no solo la URL.
                if (v.version) {
                    grouped[gameVersion].loaderVersions[v.version] = v;
                }
                if (new Date(v.releaseTime) > new Date(grouped[gameVersion].releaseTime)) {
                    grouped[gameVersion].releaseTime = v.releaseTime;
                }
            }
        });

        state.versions.neoforge = Object.values(grouped).sort((a, b) => new Date(b.releaseTime) - new Date(a.releaseTime));
    }

    function renderVersionList() {
        const list = $('#version-list');
        const loaderIcons = {
            vanilla: 'icons/version_vanilla.png',
            fabric: 'icons/version_fabric.png',
            forge: 'icons/version_forge.png',
            neoforge: 'icons/version_neoforge.png'
        };

        const pagination = $('#version-pagination');
        const loader = state.currentLoader;
        let versions = [...state.versions[loader]];

        // Filter by search
        if (state.searchQuery) {
            versions = versions.filter(v => v.id.toLowerCase().includes(state.searchQuery));
            state.currentPage = 0; // reset page on filter change
        }

        // Filter snapshots
        if (!state.showSnapshots && loader === 'vanilla') {
            versions = versions.filter(v => v.type === 'release');
        }

        // Update count
        const countEl = $('#version-count-num');
        if (countEl) countEl.textContent = versions.length;

        if (versions.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>Sin resultados</h3>
                    <p>No se encontraron versiones con ese filtro.</p>
                </div>
            `;
            if (pagination) pagination.style.display = 'none';
            return;
        }

        // ─── Pagination ───
        const totalPages = Math.ceil(versions.length / PAGE_SIZE);
        if (state.currentPage >= totalPages) state.currentPage = totalPages - 1;
        if (state.currentPage < 0) state.currentPage = 0;

        const start = state.currentPage * PAGE_SIZE;
        const toRender = versions.slice(start, start + PAGE_SIZE);

        // Show pagination controls if more than one page
        if (pagination) {
            if (totalPages > 1) {
                pagination.style.display = 'flex';
                const pageInfo = $('#page-info');
                const prevBtn = $('#page-prev');
                const nextBtn = $('#page-next');
                if (pageInfo) pageInfo.textContent = `Página ${state.currentPage + 1} de ${totalPages} (${start + 1}–${Math.min(start + PAGE_SIZE, versions.length)} de ${versions.length})`;
                if (prevBtn) prevBtn.disabled = state.currentPage === 0;
                if (nextBtn) nextBtn.disabled = state.currentPage >= totalPages - 1;

                // Bind pagination buttons (remove old listeners first)
                const newPrev = prevBtn.cloneNode(true);
                const newNext = nextBtn.cloneNode(true);
                prevBtn.parentNode.replaceChild(newPrev, prevBtn);
                nextBtn.parentNode.replaceChild(newNext, nextBtn);

                newPrev.addEventListener('click', () => {
                    state.currentPage--;
                    renderVersionList();
                    $('#version-list').scrollTop = 0;
                });
                newNext.addEventListener('click', () => {
                    state.currentPage++;
                    renderVersionList();
                    $('#version-list').scrollTop = 0;
                });

                // Re-apply disabled state
                newPrev.disabled = state.currentPage === 0;
                newNext.disabled = state.currentPage >= totalPages - 1;
            } else {
                pagination.style.display = 'none';
            }
        }

        const loaderLabels = { vanilla: 'Vanilla', fabric: 'Fabric', forge: 'Forge', neoforge: 'NeoForge' };

        list.innerHTML = toRender.map((v, index) => {
            const typeClass = v.type === 'snapshot' ? 'snapshot' : 
                              v.type === 'old_beta' ? 'beta' :
                              v.type === 'old_alpha' ? 'alpha' : '';
            const typeLabel = v.type === 'release' ? 'Release' : 
                              v.type === 'snapshot' ? 'Snapshot' :
                              v.type === 'old_beta' ? 'Beta' :
                              v.type === 'old_alpha' ? 'Alpha' : v.type;
            const date = v.releaseTime ? formatDate(v.releaseTime) : '';
            const globalIndex = start + index + 1;
            const iconSrc = loaderIcons[v.loader] || 'icons/version_vanilla.png';

            return `
                <div class="version-item ${state.selectedVersion?.id === v.id ? 'selected' : ''}" 
                     data-version-id="${v.id}" 
                     data-version-type="${v.type}"
                     style="animation-delay: ${index * 20}ms">
                    <span class="version-num">#${globalIndex}</span>
                    <img src="${iconSrc}" alt="${v.loader}" class="version-icon">
                    <div class="version-info">
                        <span class="version-name">${v.id}</span>
                        <span class="version-type">
                            <span class="version-type-badge ${typeClass}"></span>
                            ${loaderLabels[v.loader]} • ${typeLabel} ${date ? '• ' + date : ''}
                        </span>
                    </div>
                    <div class="version-actions">
                        <button class="version-action-btn download-btn" title="Descargar">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Add click handlers
        list.querySelectorAll('.version-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.version-action-btn')) return;
                const versionId = item.dataset.versionId;
                const version = versions.find(v => v.id === versionId);
                if (version) selectVersion(version);
            });

            const downloadBtn = item.querySelector('.download-btn');
            if (downloadBtn) {
                downloadBtn.addEventListener('click', () => {
                    const versionId = item.dataset.versionId;
                    const version = versions.find(v => v.id === versionId);
                    if (version) {
                        selectVersion(version);
                        if (version.loader === 'forge' || version.loader === 'neoforge') {
                            openLoaderVersionModal(version);
                        } else {
                            installVersion(version);
                        }
                    }
                });
            }
        });
    }

    function selectVersion(version) {
        state.selectedVersion = version;

        // Update list selection
        $$('.version-item').forEach(el => {
            el.classList.toggle('selected', el.dataset.versionId === version.id);
        });

        // Update detail panel
        const loaderIcons = {
            vanilla: 'icons/version_vanilla.png',
            fabric: 'icons/version_fabric.png',
            forge: 'icons/version_forge.png',
            neoforge: 'icons/version_neoforge.png'
        };
        $('#vd-icon').src = loaderIcons[version.loader] || 'icons/version_vanilla.png';
        const detail = $('#version-detail');
        $('#vd-name').textContent = version.id;
        
        const loaderLabels = { vanilla: 'Vanilla', fabric: 'Fabric', forge: 'Forge', neoforge: 'NeoForge' };
        const typeLabels = { release: 'Release', snapshot: 'Snapshot', old_beta: 'Beta', old_alpha: 'Alpha' };
        
        $('#vd-type').textContent = `${loaderLabels[version.loader] || ''} - ${typeLabels[version.type] || version.type}`;
        $('#vd-type-val').textContent = typeLabels[version.type] || version.type;
        $('#vd-date-val').textContent = version.releaseTime ? formatDate(version.releaseTime) : '—';
        $('#vd-loader-val').textContent = loaderLabels[version.loader] || version.loader;
        
        $('#vd-meta').style.display = 'flex';
        $('#vd-install-btn').style.display = 'block';

        // Cambiar el botón si la versión ya está instalada
        const isInstalled = state.installedVersions.some(v => (v.id || v) === version.id);
        const installBtn = $('#vd-install-btn');
        installBtn.innerHTML = isInstalled 
            ? '<i class="fas fa-trash"></i> BORRAR' 
            : '<i class="fas fa-download"></i> INSTALAR';
        installBtn.classList.toggle('danger', isInstalled);

        const newInstallBtn = installBtn.cloneNode(true);
        installBtn.parentNode.replaceChild(newInstallBtn, installBtn);
        newInstallBtn.addEventListener('click', () => handleInstallClick(version));
    }

    // Esta función será llamada desde el código nativo de Android
    // para actualizar el progreso de la descarga.
    window.updateDownloadProgress = function(percentage, message) {
        const progressFill = $('#vd-progress-fill');
        const progressText = $('#vd-progress-text');
        const installBtn = $('#vd-install-btn');

        if (progressFill) progressFill.style.width = `${percentage}%`;
        if (progressText) progressText.textContent = `${message} ${percentage}%`;

        if (percentage >= 100) {
            setTimeout(() => {
                $('#vd-download-progress').style.display = 'none';
                if (installBtn) {
                    installBtn.disabled = false;
                    installBtn.innerHTML = '<i class="fas fa-trash"></i> BORRAR';
                    installBtn.classList.add('danger');
                }
                const isAlreadyInstalled = state.installedVersions.some(v => (v.id || v) === state.selectedVersion.id);
                if (state.selectedVersion && !isAlreadyInstalled) {
                    state.installedVersions.push(state.selectedVersion.id);
                    saveInstalledVersions(); // ← Persistir en localStorage
                    updateInstalledList();
                    updateHeroVersionSelector();
                    updateStats();
                }
                showNotification(`${state.selectedVersion.id} instalada correctamente`, 'success');
            }, 500);
        }
    }

    // Esta función será llamada desde el código nativo de Android
    // después de que una versión haya sido borrada.
    window.onVersionDeleted = function(versionId) {
        state.installedVersions = state.installedVersions.filter(v => (v.id || v) !== versionId);
        saveInstalledVersions(); // ← Persistir en localStorage
        updateInstalledList();
        updateHeroVersionSelector();
        updateStats();
        showNotification(`Versión ${versionId} eliminada`, 'success');
    }

    // FIX: Actualizar el botón de detalles cuando se borra una versión
    if (state.selectedVersion && (state.selectedVersion.id || state.selectedVersion) === versionId) {
        const installBtn = $('#vd-install-btn');
        installBtn.innerHTML = '<i class="fas fa-download"></i> INSTALAR';
        installBtn.classList.remove('danger');
    }

    function resetVersionDetail() {
        $('#vd-name').textContent = 'Selecciona una versión';
        $('#vd-type').textContent = 'Toca una versión de la lista para ver sus detalles';
        $('#vd-meta').style.display = 'none';
        $('#vd-install-btn').style.display = 'none';
        $('#vd-download-progress').style.display = 'none';
        const installBtn = $('#vd-install-btn');
        installBtn.classList.remove('danger');
        if (installBtn) installBtn.disabled = false;
    }

    function handleInstallClick(version) {
        if (!version) return;
        // Asegurarse de que la versión esté seleccionada para que la UI esté sincronizada
        selectVersion(version);

        const isInstalled = state.installedVersions.some(v => (v.id || v) === version.id);

        if (isInstalled) {
            openDeleteConfirmModal(version);
        } else {
            if (version.loader === 'forge' || version.loader === 'neoforge') {
                openLoaderVersionModal(version);
            } else {
                installVersion(version);
            }
        }
    }

    function openDeleteConfirmModal(version) {
        const modal = $('#delete-confirm-modal');
        const versionNameEl = $('#delete-modal-version-name');
        const cancelBtn = $('#delete-modal-cancel-btn');
        const confirmBtn = $('#delete-modal-confirm-btn');

        versionNameEl.textContent = version.id;
        modal.classList.add('active');

        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        newConfirmBtn.addEventListener('click', () => {
            if (window.GLauncher && window.GLauncher.deleteMinecraftVersion) {
                window.GLauncher.deleteMinecraftVersion(version.id);
            }
            modal.classList.remove('active');
        });

        cancelBtn.onclick = () => {
            modal.classList.remove('active');
        };
    }


    function launchVersion(versionId) {
        // FIX: Asegurarse de que versionId sea siempre una cadena, no un objeto.
        const idToLaunch = (typeof versionId === 'object' && versionId !== null) ? versionId.id : versionId;

        showNotification(`Lanzando Minecraft ${versionId}...`, 'success');
        
        // Vibration feedback (Android)
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }

        // Llamada al puente nativo de Android
        if (window.GLauncher && window.GLauncher.launchMinecraftVersion) {
            const resScale = (state.settings.resolution || 100) / 100.0;
            window.GLauncher.launchMinecraftVersion(idToLaunch, state.settings.ram, resScale);
        }
    }

    function installVersion(version) {
        const progressBox = $('#vd-download-progress');
        const installBtn = $('#vd-install-btn');

        if (installBtn) installBtn.disabled = true;
        if (progressBox) progressBox.style.display = 'block';
        
        // Llamada al puente nativo de Android
        if (window.GLauncher && window.GLauncher.installMinecraftVersion) {
            window.GLauncher.installMinecraftVersion(JSON.stringify(version));
        }
    }

    function openLoaderVersionModal(version) {
        const modal = $('#loader-version-modal');
        const icon = $('#loader-modal-icon');
        const title = $('#loader-modal-title');
        const subtitle = $('#loader-modal-subtitle');
        const select = $('#loader-version-select');
        const confirmBtn = $('#loader-confirm-download-btn');

        const loaderName = version.loader === 'forge' ? 'Forge' : 'NeoForge';
        icon.src = `icons/version_${version.loader}.png`;
        title.textContent = `Minecraft ${version.id}`;
        subtitle.textContent = `Selecciona una versión de ${loaderName}`;

        // FIX: Ordenar las versiones del loader de forma descendente (más nuevo primero)
        // La API de Prism no garantiza el orden, así que lo forzamos aquí.
        const sortedLoaderVersions = Object.keys(version.loaderVersions || {}).sort((a, b) => {
            // Intentar una comparación semántica si es posible, si no, alfabética inversa.
            return b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' });
        });

        select.innerHTML = sortedLoaderVersions
            .map(loaderVer => `<option value="${loaderVer}">${loaderName} ${loaderVer}</option>`)
            .join('');

        // Replace button to avoid multiple listeners
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        newConfirmBtn.addEventListener('click', () => {
            const selectedLoaderVersion = select.value;
            // FIX: El objeto de la versión del loader ya contiene todo lo necesario (id, url, etc.)
            // Simplemente lo obtenemos y lo pasamos a la función de instalación.
            const loaderVersionObject = version.loaderVersions[selectedLoaderVersion];

            if (loaderVersionObject && loaderVersionObject.url) {
                installVersion(loaderVersionObject);
            }

            modal.classList.remove('active');
        });

        modal.classList.add('active');
    }

    $('#loader-modal-close')?.addEventListener('click', () => $('#loader-version-modal').classList.remove('active'));

    function updateInstalledList() {
        const list = $('#installed-list');
        if (state.installedVersions.length === 0) {
            list.innerHTML = `
                <div class="empty-state" style="padding:15px;">
                    <i class="fas fa-inbox" style="font-size:1.2rem;"></i>
                    <p style="font-size:0.5rem;">Ninguna versión instalada</p>
                </div>
            `;
            return;
        }

        list.innerHTML = state.installedVersions.map(v => `
            <div class="installed-item" data-version="${v}">
                <img src="icons/version_vanilla.png" alt="" class="ii-icon">
                <span class="ii-name">${v.id || v}</span>
                <span class="ii-badge">✓ Instalada</span>
            </div>
        `).join('');

        list.querySelectorAll('.installed-item').forEach(item => {
            item.addEventListener('click', () => {
                launchVersion(item.dataset.version);
            });
        });
    }

    function initHeroVersionSelector() {
        const selector = $('#hero-version-selector');
        const selectedText = $('#hero-version-selected-text');
        const dropdown = $('#hero-version-dropdown');

        selector.addEventListener('click', (e) => {
            if (e.target.closest('.hero-version-item')) return;
            selector.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (!selector.contains(e.target)) {
                selector.classList.remove('open');
            }
        });

        updateHeroVersionSelector();
    }

    function updateHeroVersionSelector() {
        const dropdown = $('#hero-version-dropdown');
        const selectedText = $('#hero-version-selected-text');

        if (state.installedVersions.length === 0) {
            dropdown.innerHTML = '<div class="empty-state" style="padding:10px; font-size:0.5rem;">Instala una versión</div>';
            selectedText.textContent = 'Ninguna versión instalada';
            state.selectedVersion = null;
            return;
        }

        dropdown.innerHTML = state.installedVersions.map(v => `
            <div class="ql-item hero-version-item" data-version-id="${v.id || v}">
                <img src="icons/version_vanilla.png" alt="" class="ql-icon">
                <div class="ql-info"><span class="ql-name">${v.id || v}</span></div>
            </div>
        `).join('');

        dropdown.querySelectorAll('.hero-version-item').forEach(item => {
            item.addEventListener('click', () => {
                state.selectedVersion = state.installedVersions.find(v => (v.id || v) === item.dataset.versionId);
                selectedText.textContent = item.dataset.versionId;
            });
        });

        // Select the last installed version by default
        if (!state.selectedVersion) {
            state.selectedVersion = state.installedVersions[state.installedVersions.length - 1];
        }
        selectedText.textContent = state.selectedVersion.id || state.selectedVersion;
    }

    function updateStats() {
        $('#stat-installed').textContent = state.installedVersions.length;
        
        // FIX: Sumar todas las versiones de todos los loaders para la estadística de "Disponibles"
        const totalVersions = Object.values(state.versions).reduce((sum, arr) => sum + arr.length, 0);
        const statVersions = $('#stat-versions');
        if (statVersions) {
            statVersions.textContent = totalVersions > 0 ? totalVersions : '—';
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // MODS
    // ═══════════════════════════════════════════════════════════════

    let currentModQuery = '';
    let currentModProjectType = 'mod';

    async function loadMods() {
        const grid = $('#mods-grid');
        grid.innerHTML = `
            <div class="loading-spinner" style="grid-column:1/-1;">
                <div class="spinner"></div>
                <span>Buscando en Modrinth...</span>
            </div>
        `;

        try {
            const facets = `[["project_type:${currentModProjectType}"]]`;
            const url = `${API.modrinth}?query=${encodeURIComponent(currentModQuery)}&limit=20&facets=${encodeURIComponent(facets)}`;
            const response = await fetch(url);
            const data = await response.json();
            const mods = data.hits || [];

            if (mods.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state" style="grid-column:1/-1;">
                        <i class="fas fa-search"></i>
                        <h3>Sin resultados para "${currentModProjectType}"</h3>
                        <p>No se encontraron mods en Modrinth.</p>
                    </div>
                `;
                return;
            }

            grid.innerHTML = mods.map((mod, i) => {
                const iconUrl = mod.icon_url || 'icons/version_vanilla.png';
                const downloads = mod.downloads > 1000000 
                    ? (mod.downloads / 1000000).toFixed(1) + 'M' 
                    : mod.downloads > 1000 ? (mod.downloads / 1000).toFixed(1) + 'K' : mod.downloads;

                return `
                    <div class="mod-card" style="animation-delay: ${i * 40}ms">
                        <img src="${iconUrl}" alt="${mod.title}" style="width:56px;height:56px;border-radius:var(--radius-sm);object-fit:cover;border:1px solid var(--glass-border);" onerror="this.src='icons/version_vanilla.png'">
                        <span class="mod-title">${mod.title}</span>
                        <span class="mod-author">por <span>${mod.author || 'Desconocido'}</span></span>
                        <span class="mod-downloads"><i class="fas fa-download"></i> ${downloads}</span>
                        <button class="mod-install-btn" data-id="${mod.project_id || mod.id || mod.slug}" data-title="${mod.title}" data-author="${mod.author}" data-icon="${iconUrl}">
                            <i class="fas fa-plus"></i> Instalar
                        </button>
                    </div>
                `;
            }).join('');

            // Install button handlers - open modal
            grid.querySelectorAll('.mod-install-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const modData = {
                        id: btn.dataset.id,
                        title: btn.dataset.title,
                        author: btn.dataset.author,
                        icon: btn.dataset.icon
                    };
                    openModModal(modData, btn);
                });
            });

        } catch (error) {
            console.error('Error fetching Modrinth mods:', error);
            grid.innerHTML = `
                <div class="empty-state" style="grid-column:1/-1;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error de Modrinth</h3>
                    <p>No se pudo conectar a la API de Modrinth.</p>
                </div>
            `;
        }
    }

    // Modal Interaction
    let currentActiveModBtn = null;
    let currentModVersions = [];

    async function openModModal(mod, btnElement) {
        currentActiveModBtn = btnElement;
        const modal = $('#mod-modal');
        $('#mod-modal-icon').src = mod.icon;
        $('#mod-modal-title').textContent = mod.title;
        $('#mod-modal-author').textContent = `por ${mod.author}`;
        
        const versionSelect = $('#mod-select-version');
        const loaderSelect = $('#mod-select-loader');
        const progressBox = $('#mod-download-progress');
        progressBox.style.display = 'none';

        versionSelect.innerHTML = '<option>Cargando versiones...</option>';
        loaderSelect.innerHTML = '<option>Cargando loaders...</option>';
        modal.classList.add('active');

        try {
            // Fetch project versions from Modrinth API
            const response = await fetch(`https://api.modrinth.com/v2/project/${mod.id}/version`);
            currentModVersions = await response.json();

            // Extract unique game versions and loaders
            const gameVersions = new Set();
            const loaders = new Set();

            currentModVersions.forEach(ver => {
                ver.game_versions.forEach(gv => gameVersions.add(gv));
                ver.loaders.forEach(l => loaders.add(l));
            });

            // Populate selects
            versionSelect.innerHTML = Array.from(gameVersions).map(v => `<option value="${v}">${v}</option>`).join('');
            loaderSelect.innerHTML = Array.from(loaders).map(l => `<option value="${l}">${l.toUpperCase()}</option>`).join('');

        } catch (err) {
            console.error('Error fetching mod details:', err);
            versionSelect.innerHTML = '<option value="1.20.1">1.20.1</option><option value="1.20.4">1.20.4</option>';
            loaderSelect.innerHTML = '<option value="fabric">FABRIC</option><option value="forge">FORGE</option>';
        }
    }

    // Modal Events Setup
    document.addEventListener('DOMContentLoaded', () => {
        const modal = $('#mod-modal');
        const closeBtn = $('#mod-modal-close');
        const confirmBtn = $('#mod-confirm-download-btn');

        if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));

        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                const selectedVer = $('#mod-select-version').value;
                const selectedLoader = $('#mod-select-loader').value;
                const progressBox = $('#mod-download-progress');
                const progressFill = $('#mod-progress-fill');
                const progressText = $('#mod-progress-text');

                progressBox.style.display = 'block';
                confirmBtn.disabled = true;

                let progress = 0;
                const interval = setInterval(() => {
                    progress += 20;
                    progressFill.style.width = `${progress}%`;
                    progressText.textContent = `Descargando en /sdcard/GLauncher/mods/... ${progress}%`;

                    if (progress >= 100) {
                        clearInterval(interval);
                        setTimeout(() => {
                            modal.classList.remove('active');
                            confirmBtn.disabled = false;
                            progressBox.style.display = 'none';

                            if (currentActiveModBtn) {
                                currentActiveModBtn.innerHTML = '<i class="fas fa-check"></i> Instalado';
                                currentActiveModBtn.style.background = 'var(--minecraft-green)';
                                currentActiveModBtn.disabled = true;
                            }

                            // Añadir a la lista de assets instalados
                            const newAsset = {
                                id: currentActiveModBtn.dataset.id,
                                name: currentActiveModBtn.dataset.title,
                                icon: currentActiveModBtn.dataset.icon,
                                enabled: true
                            };
                            state.installedAssets.push(newAsset);
                            saveInstalledAssets();
                            showNotification(`"${newAsset.name}" instalado correctamente`, 'success');
                        }, 500);
                    }
                }, 150);
            });
        }
    });

    // Setup Modrinth Search Input Event
    let modSearchDebounce;
    document.addEventListener('DOMContentLoaded', () => {
        const searchInput = $('#mod-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(modSearchDebounce);
                modSearchDebounce = setTimeout(() => {
                    currentModQuery = e.target.value.trim();
                    loadMods();
                }, 400);
            });
        }

        // Filtros de tipo de proyecto
        const projectTypeTabs = $$('#mod-search-view .loader-tab');
        projectTypeTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                projectTypeTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentModProjectType = tab.dataset.projectType;
                loadMods();
            });
        });

        initGMusic();
    });

    function initInstalledAssets() {
        const installedView = $('#view-installed-assets');
        const searchView = $('#view-mods');
        const grid = $('#mods-grid');
        const searchBar = $('#mod-search-view');

        $('#view-installed-btn')?.addEventListener('click', () => {
            grid.style.display = 'none';
            searchBar.style.display = 'none';
            installedView.classList.add('active');
            renderInstalledAssets();
        });

        $('#back-to-search-btn')?.addEventListener('click', () => {
            installedView.classList.remove('active');
            grid.style.display = 'grid';
            searchBar.style.display = 'flex';
        });

        loadInstalledAssets();
    }

    function renderInstalledAssets() {
        const list = $('#installed-assets-list');
        if (state.installedAssets.length === 0) {
            list.innerHTML = `<div class="empty-state"><i class="fas fa-box-open"></i><h3>No hay nada instalado</h3><p>Usa la búsqueda para encontrar y descargar mods, texturas y más.</p></div>`;
            return;
        }

        list.innerHTML = state.installedAssets.map(asset => `
            <div class="installed-asset-item ${!asset.enabled ? 'disabled' : ''}" data-id="${asset.id}">
                <img src="${asset.icon}" class="ia-icon" onerror="this.src='icons/version_vanilla.png'">
                <div class="ia-info">
                    <span class="ia-name">${asset.name}</span>
                    <span class="ia-meta">ID: ${asset.id}</span>
                </div>
                <div class="version-actions">
                    <button class="top-bar-btn toggle-asset-btn" title="${asset.enabled ? 'Desactivar' : 'Activar'}">
                        <i class="fas ${asset.enabled ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                    </button>
                    <button class="top-bar-btn info-asset-btn" title="Información"><i class="fas fa-info-circle"></i></button>
                    <button class="top-bar-btn danger delete-asset-btn" title="Eliminar"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');

        // Add event listeners
        list.querySelectorAll('.toggle-asset-btn').forEach(btn => btn.addEventListener('click', toggleAsset));
        list.querySelectorAll('.delete-asset-btn').forEach(btn => btn.addEventListener('click', deleteAsset));
    }

    function toggleAsset(e) {
        const item = e.currentTarget.closest('.installed-asset-item');
        const assetId = item.dataset.id;
        const asset = state.installedAssets.find(a => a.id === assetId);
        if (asset) {
            asset.enabled = !asset.enabled;
            saveInstalledAssets();
            renderInstalledAssets(); // Re-render para actualizar la UI
            showNotification(`'${asset.name}' ${asset.enabled ? 'activado' : 'desactivado'}`, 'info');
        }
    }

    function deleteAsset(e) {
        const item = e.currentTarget.closest('.installed-asset-item');
        const assetId = item.dataset.id;
        const asset = state.installedAssets.find(a => a.id === assetId);
        if (asset) {
            if (confirm(`¿Seguro que quieres eliminar '${asset.name}'?`)) {
                state.installedAssets = state.installedAssets.filter(a => a.id !== assetId);
                saveInstalledAssets();
                renderInstalledAssets();
                showNotification(`'${asset.name}' ha sido eliminado`, 'success');
                playSound('sounds/sfx/recicle.mp3');
            }
        }
    }

    function saveInstalledAssets() { localStorage.setItem('glauncher_installed_assets', JSON.stringify(state.installedAssets)); }
    function loadInstalledAssets() { state.installedAssets = JSON.parse(localStorage.getItem('glauncher_installed_assets') || '[]'); }

    // ═══════════════════════════════════════════════════════════════
    // GMUSIC (Local API + YouTube Player)
    // ═══════════════════════════════════════════════════════════════

    // Proxy de búsqueda de YouTube que funciona sin clave de API
    const GMUSIC_API = `https://pipedapi.kavin.rocks/search`;
    const GMUSIC_THUMBNAIL_API = `https://pipedapi.kavin.rocks`;
    let gmusicIsPlaying = false;

    function initGMusic() {
        // Esta función ahora solo se encarga de la búsqueda y las playlists
        const searchBtn = $('#gmusic-search-btn');
        const searchInput = $('#gmusic-search-input');
        const playlistChips = $$('.gmusic-playlist-chip');

        if (searchBtn && searchInput) {
            searchBtn.addEventListener('click', () => {
                performGMusicSearch(searchInput.value.trim());
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    performGMusicSearch(searchInput.value.trim());
                }
            });
        }

        // Eventos para Chips de Playlists
        playlistChips.forEach(chip => {
            chip.addEventListener('click', () => {
                playlistChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                const query = chip.dataset.query;
                if (searchInput) searchInput.value = query;
                performGMusicSearch(query);
            });
        });
    }

    async function performGMusicSearch(query) {
        const resultsContainer = $('#gmusic-results-container');
        if (!query) {
            showNotification('Escribe un término de búsqueda para GMusic', 'warning');
            return;
        }

        resultsContainer.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <span>Buscando en YouTube Music...</span>
            </div>
        `;

        try {
            // YouTube InnerTube API — la misma que usa la app de YouTube, sin clave de API
            const response = await fetch('https://www.youtube.com/youtubei/v1/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-YouTube-Client-Name': '1',
                    'X-YouTube-Client-Version': '2.20231121.08.00'
                },
                body: JSON.stringify({
                    context: {
                        client: {
                            clientName: 'WEB',
                            clientVersion: '2.20231121.08.00',
                            hl: 'es',
                            gl: 'US'
                        }
                    },
                    query: query,
                    // Filtro para videos de música
                    params: 'EgWKAQIIAWoKEAoQAxAEEAkQBQ%3D%3D'
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            // Extraer videos del response de InnerTube
            const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
                ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];

            const items = contents
                .filter(c => c.videoRenderer)
                .map(c => c.videoRenderer)
                .slice(0, 20);

            if (items.length === 0) {
                resultsContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-music"></i>
                        <h3>Sin resultados</h3>
                        <p>No se encontraron resultados para "${query}".</p>
                    </div>
                `;
                return;
            }

            resultsContainer.innerHTML = items.map(item => {
                const videoId = item.videoId || '';
                const title = item.title?.runs?.[0]?.text || 'Sin título';
                const channel = item.ownerText?.runs?.[0]?.text || item.shortBylineText?.runs?.[0]?.text || 'Desconocido';
                const thumbnail = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
                const duration = item.lengthText?.simpleText || '';

                return `
                    <div class="ql-item gmusic-result-item" data-video-id="${videoId}" data-title="${escapeHtml(title)}" data-channel="${escapeHtml(channel)}" style="margin-bottom: 8px; padding: 10px; cursor: pointer;">
                        <img src="${thumbnail}" alt="" style="width: 48px; height: 36px; border-radius: 6px; object-fit: cover; border: 1px solid var(--glass-border);" onerror="this.src='icons/version_vanilla.png'">
                        <div class="ql-info" style="flex: 1; overflow: hidden; margin-left: 10px;">
                            <span class="ql-name" style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap; display: block;">${title}</span>
                            <span class="ql-version" style="color: var(--text-muted); display: block;">${channel} ${duration ? '• ' + duration : ''}</span>
                        </div>
                        <i class="fas fa-play text-primary" style="font-size: 0.9rem; margin-left: 8px;"></i>
                    </div>
                `;
            }).join('');

            resultsContainer.querySelectorAll('.gmusic-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const videoId = item.dataset.videoId;
                    const title = item.dataset.title;
                    const channel = item.dataset.channel;
                    if (videoId) {
                        playGMusicVideo(videoId, title, channel);
                    } else {
                        showNotification('Error: No se pudo obtener el ID del video', 'error');
                    }
                });
            });

        } catch (error) {
            console.error('Error in GMusic InnerTube search:', error);
            // Fallback: Piped API
            try {
                const fbRes = await fetch(`https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(query)}&filter=music_songs`);
                if (fbRes.ok) {
                    const fbData = await fbRes.json();
                    const fbItems = (fbData.items || []).slice(0, 20);
                    if (fbItems.length > 0) {
                        resultsContainer.innerHTML = fbItems.map(item => {
                            const videoId = item.url ? item.url.replace('/watch?v=', '') : '';
                            const title = item.title || 'Sin título';
                            const channel = item.uploaderName || 'Desconocido';
                            const thumbnail = videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : 'icons/version_vanilla.png';
                            const duration = item.duration > 0 ? formatDuration(item.duration) : '';
                            return `
                                <div class="ql-item gmusic-result-item" data-video-id="${videoId}" data-title="${escapeHtml(title)}" data-channel="${escapeHtml(channel)}" style="margin-bottom: 8px; padding: 10px; cursor: pointer;">
                                    <img src="${thumbnail}" alt="" style="width: 48px; height: 36px; border-radius: 6px; object-fit: cover; border: 1px solid var(--glass-border);" onerror="this.src='icons/version_vanilla.png'">
                                    <div class="ql-info" style="flex: 1; overflow: hidden; margin-left: 10px;">
                                        <span class="ql-name" style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap; display: block;">${title}</span>
                                        <span class="ql-version" style="color: var(--text-muted); display: block;">${channel}${duration ? ' • ' + duration : ''}</span>
                                    </div>
                                    <i class="fas fa-play text-primary" style="font-size: 0.9rem; margin-left: 8px;"></i>
                                </div>
                            `;
                        }).join('');
                        resultsContainer.querySelectorAll('.gmusic-result-item').forEach(item => {
                            item.addEventListener('click', () => {
                                if (item.dataset.videoId) playGMusicVideo(item.dataset.videoId, item.dataset.title, item.dataset.channel);
                            });
                        });
                        return;
                    }
                }
            } catch(e2) { /* silenciar fallback */ }

            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error de Conexión</h3>
                    <p>No se pudo conectar con YouTube Music. Verifica tu conexión a internet.</p>
                </div>
            `;
            showNotification('Error al buscar música. Verifica tu conexión.', 'error');
        }
    }

    function playGMusicVideo(videoId, title, channel) {
        const titleEl = $('#gmusic-playing-title');
        const channelEl = $('#gmusic-playing-channel');
        const discCover = $('#gmusic-disc-cover');
        const playIcon = $('#gmusic-play-icon');

        if (window.GLauncher && window.GLauncher.playAudioFromYouTube) {
            window.GLauncher.playAudioFromYouTube(videoId);
            gmusicIsPlaying = true;
        }

        if (discCover) {
            discCover.style.animation = 'spin 3s linear infinite';
        }

        if (playIcon) {
            playIcon.className = 'fas fa-pause';
        }

        if (titleEl) titleEl.textContent = title;
        if (channelEl) channelEl.textContent = channel;

        showNotification(`Reproduciendo audio: ${title}`, 'success');
    }

    function toggleGMusicPlay() {        
        const discCover = $('#gmusic-disc-cover');
        const playIcon = $('#gmusic-play-icon');

        gmusicIsPlaying = !gmusicIsPlaying;

        if (discCover) {
            discCover.style.animationPlayState = gmusicIsPlaying ? 'running' : 'paused';
        }

        if (playIcon) {
            playIcon.className = gmusicIsPlaying ? 'fas fa-pause' : 'fas fa-play';
        }

        // FIX: Llamar directamente al método del puente de Android que ahora controla la reproducción de audio.
        if (window.GLauncher && window.GLauncher.togglePlayPause) {
            window.GLauncher.togglePlayPause();
        }
        showNotification(gmusicIsPlaying ? 'Audio reanudado' : 'Audio pausado', 'info');
    }

    function seekGMusicPlayer(seconds) {
        // FIX: Llamar directamente al método del puente de Android.
        if (window.GLauncher && window.GLauncher.seekAudio) {
            window.GLauncher.seekAudio(seconds);
        }
        showNotification(seconds > 0 ? `Adelantado +${seconds}s` : `Retrocedido ${seconds}s`, 'info');
    }

    function initGMusicPlayerControls() {
        // Esta función se llama una sola vez al inicio para evitar listeners duplicados.
        const playBtn = $('#gmusic-btn-play');
        const rewindBtn = $('#gmusic-btn-rewind');
        const forwardBtn = $('#gmusic-btn-forward');

        if (playBtn) {
            playBtn.addEventListener('click', toggleGMusicPlay);
        }
        if (rewindBtn) {
            rewindBtn.addEventListener('click', () => seekGMusicPlayer(-15));
        }
        if (forwardBtn) {
            forwardBtn.addEventListener('click', () => seekGMusicPlayer(15));
        }
    }

    function escapeHtml(str) {
        return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // ═══════════════════════════════════════════════════════════════
    // ACCOUNT
    // ═══════════════════════════════════════════════════════════════

    function initAccountButtons() {
        // Microsoft Login
        const msBtn = $('#btn-login-ms');
        if (msBtn) {
            msBtn.addEventListener('click', () => {
                showNotification('Inicio de sesión con Microsoft no disponible en la demo', 'warning');
            });
        }

        // Offline Login
        const offBtn = $('#btn-login-offline');
        if (offBtn) {
            offBtn.addEventListener('click', () => {
                const name = prompt('Nombre de jugador offline:');
                if (name && name.trim()) {
                    state.user.name = name.trim();
                    state.user.type = 'offline';
                    state.user.uuid = generateOfflineUUID(name.trim());
                    updateUserUI();
                    showNotification(`Conectado como ${name.trim()} (Offline)`, 'success');
                }
            });
        }

        // Sidebar avatar
        const sideAvatar = $('#sidebar-avatar');
        if (sideAvatar) {
            sideAvatar.addEventListener('click', () => {
                $$('.nav-item').forEach(n => n.classList.remove('active'));
                $('#nav-account').classList.add('active');
                switchView('account');
                $('#top-bar-title').textContent = 'CUENTA';
                $('#top-bar-subtitle').textContent = 'Tu perfil y configuración';
                state.currentView = 'account';
            });
        }
    }

    function updateUserUI() {
        // Update all user name displays
        const nameEls = ['#home-username', '#account-name', '#info-playername'];
        nameEls.forEach(sel => {
            const el = $(sel);
            if (el) el.textContent = state.user.name;
        });

        // UUID
        const uuidEls = ['#account-uuid', '#info-uuid'];
        uuidEls.forEach(sel => {
            const el = $(sel);
            if (el) el.textContent = sel.includes('account-uuid') ? `UUID: ${state.user.uuid}` : state.user.uuid;
        });

        // Account type
        const typeEl = $('#account-type');
        if (typeEl) typeEl.textContent = state.user.type === 'offline' ? 'Offline' : 'Microsoft';
        
        const infoType = $('#info-accounttype');
        if (infoType) infoType.textContent = state.user.type === 'offline' ? 'Offline' : 'Microsoft';
    }

    function saveUserProfile() {
        if (window.GLauncher && window.GLauncher.saveUserProfile) {
            window.GLauncher.saveUserProfile(JSON.stringify(state.user));
        }
    }

    function loadUserProfile() {
        if (window.GLauncher && window.GLauncher.loadUserProfile) {
            try {
                const profileJson = window.GLauncher.loadUserProfile();
                const loadedProfile = JSON.parse(profileJson);
                // Fusionar con el estado por defecto para evitar errores
                Object.assign(state.user, loadedProfile);
            } catch (e) {
                console.error("Error al cargar el perfil de usuario:", e);
                // Si hay un error, se usa el perfil por defecto
            }
        }
        // Actualizar la UI con el perfil cargado (o el por defecto)
        updateUserUI();
    }

    // ═══════════════════════════════════════════════════════════════
    // GCHAT (Supabase Realtime)
    // ═══════════════════════════════════════════════════════════════
    let chatSubscription = null;
    let isChatCooldown = false;

    function initPersistentChat() {
        // Esta función se llama una sola vez al inicio de la app
        fetchInitialMessages();
        subscribeToChat();
    }

    function renderGChat() {
        // Esta función se llama cada vez que se entra a la vista de la cuenta
        const sendBtn = $('#gchat-send-btn');
        const input = $('#gchat-input');
        const gifBtn = $('#gchat-gif-btn');
        const messagesBox = $('#gchat-messages-box');

        if (!messagesBox) return;
        
        const sendMessage = async () => {
            if (isChatCooldown) {
                showNotification('Espera 5 segundos para enviar otro mensaje', 'warning');
                return;
            }

            const messageText = input.value.trim();
            if (!messageText) return;

            const messagePayload = {
                username: state.user.name,
                message: messageText,
                // user_id: supabase.auth.user()?.id // Descomentar si se implementa Supabase Auth
            };

            isChatCooldown = true;
            sendBtn.disabled = true;
            sendBtn.style.opacity = '0.5';

            const { error } = await supabaseClient.from('global_chat').insert([messagePayload]);

            if (error) {
                showNotification('Error al enviar el mensaje', 'error');
                console.error('Error sending message:', error);
                isChatCooldown = false; // Reset cooldown on error
                sendBtn.disabled = false;
                sendBtn.style.opacity = '1';
            } else {
                input.value = '';
                setTimeout(() => {
                    isChatCooldown = false;
                    sendBtn.disabled = false;
                    sendBtn.style.opacity = '1';
                }, 5000); // 5 segundos de cooldown
            }
        };

        sendBtn?.addEventListener('click', sendMessage);
        input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });

        gifBtn?.addEventListener('click', openGiphyModal);

        // Renderizar los mensajes que ya tenemos en el estado
        messagesBox.innerHTML = '';
        state.chatMessages.forEach(msg => renderMessage(msg, 'append'));
        messagesBox.scrollTop = messagesBox.scrollHeight;
    }

    async function fetchInitialMessages() {
        const { data, error } = await supabaseClient
            .from('global_chat')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error("Error fetching initial chat messages:", error);
            const messagesBox = $('#gchat-messages-box');
            messagesBox.innerHTML = '<div class="empty-state"><p>Error al cargar mensajes.</p></div>';
            return;
        }

        // Guardar mensajes en el estado, en el orden correcto (más antiguo primero)
        state.chatMessages = data.reverse();
    }

    function subscribeToChat() {
        // Cancelar suscripción anterior si existe
        if (chatSubscription) {
            chatSubscription.unsubscribe();
        }

        chatSubscription = supabaseClient.channel('public:global_chat')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'global_chat' }, payload => {
                const newMessage = payload.new;
                state.chatMessages.push(newMessage);
                
                // Si estamos en la vista de chat, renderizarlo inmediatamente
                if (state.currentView === 'account' && $('#account-tab-gchat')?.classList.contains('active')) {
                    renderMessage(newMessage, 'append');
                    const messagesBox = $('#gchat-messages-box');
                    if (messagesBox) messagesBox.scrollTop = messagesBox.scrollHeight;
                } else {
                    // Si no, mostrar una notificación
                    showNotification(`Nuevo mensaje en GChat de ${newMessage.username}`, 'info');
                }
            })
            .subscribe();
    }

    function renderMessage(msg, method = 'prepend') {
        const messagesBox = $('#gchat-messages-box');
        if (!messagesBox) return;

        const msgEl = document.createElement('div');
        msgEl.className = 'gchat-message';

        // Detectar si el mensaje es una URL de GIF
        // FIX: Usar una expresión regular para detectar URLs de Giphy de forma más flexible,
        // ya que pueden venir de subdominios como media0, media1, etc.
        const isGif = /https?:\/\/media\d*\.giphy\.com\/media\//.test(msg.message);
        msgEl.innerHTML = `
            <div class="gchat-msg-header">
                <span class="gchat-username" style="color: ${getUserColor(msg.username)}">${msg.username}</span>
                <span class="gchat-timestamp">${new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <div class="gchat-msg-content">
                ${isGif 
                    ? `<img src="${msg.message}" class="gchat-gif" alt="GIF">` 
                    : escapeHtml(msg.message)
                }
            </div>
        `;

        if (method === 'prepend') {
            messagesBox.prepend(msgEl);
            messagesBox.scrollTop = 0;
        } else {
            messagesBox.appendChild(msgEl);
            // FIX: Hacer scroll hacia abajo para ver el nuevo mensaje
            messagesBox.scrollTop = messagesBox.scrollHeight;
        }
    }

    function getUserColor(username) {
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        const color = `hsl(${hash % 360}, 70%, 75%)`;
        return color;
    }

    function initAccountTabs() {
        const tabButtons = $$('.account-sidebar-btn');
        const tabContents = $$('.account-tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (button.disabled) return;

                const tabId = button.dataset.tab;

                // Update button active state
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Update content active state
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === `account-tab-${tabId}`) {
                        content.classList.add('active');
                    }
                });
            });
        });
    }

    function generateOfflineUUID(name) {
        // Simple hash-based UUID for offline mode
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            const char = name.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        const hex = Math.abs(hash).toString(16).padStart(8, '0');
        return `${hex.slice(0,8)}-${hex.slice(0,4)}-4${hex.slice(1,4)}-a${hex.slice(1,4)}-${hex.padEnd(12,'0').slice(0,12)}`;
    }

    // ═══════════════════════════════════════════════════════════════
    // GIPHY INTEGRATION
    // ═══════════════════════════════════════════════════════════════
    function openGiphyModal() {
        const modal = $('#giphy-modal');
        const searchInput = $('#giphy-search-input');
        const resultsContainer = $('#giphy-results');

        modal.classList.add('active');
        searchInput.focus();
        resultsContainer.innerHTML = '<div class="empty-state"><p>Busca un GIF</p></div>';

        let debounceTimer;
        searchInput.oninput = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const query = searchInput.value.trim();
                if (query.length > 1) {
                    searchGiphy(query);
                }
            }, 300);
        };

        $('#giphy-modal-close').onclick = () => modal.classList.remove('active');
    }

    async function searchGiphy(query) {
        const resultsContainer = $('#giphy-results');
        resultsContainer.innerHTML = '<div class="loading-spinner" style="grid-column: 1 / -1;"><div class="spinner"></div></div>';

        const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=24&rating=g`;

        try {
            const response = await fetch(url);
            const json = await response.json();
            resultsContainer.innerHTML = json.data.map(gif => `
                <img src="${gif.images.fixed_width_downsampled.url}" alt="${gif.title}" class="giphy-result-item" data-full-url="${gif.images.original.url}">
            `).join('');

            resultsContainer.querySelectorAll('.giphy-result-item').forEach(item => {
                item.onclick = async () => {
                    const gifUrl = item.dataset.fullUrl.split('?')[0]; // URL limpia
                    const { error } = await supabaseClient.from('global_chat').insert([{ username: state.user.name, message: gifUrl }]);
                    if (error) {
                        showNotification('Error al enviar el GIF', 'error');
                    } else {
                        $('#giphy-modal').classList.remove('active');
                    }
                };
            });

        } catch (error) {
            console.error('Giphy search error:', error);
            resultsContainer.innerHTML = '<div class="empty-state"><p>Error al buscar GIFs.</p></div>';
        }
    }


    // ═══════════════════════════════════════════════════════════════
    // PLAY BUTTON
    // ═══════════════════════════════════════════════════════════════

    function initPlayButton() {
        const playBtn = $('#btn-play-hero');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                if (state.selectedVersion) {
                    launchVersion(state.selectedVersion.id);
                } else {
                    showNotification('Selecciona o instala una versión primero', 'warning');
                    // Navigate to versions
                    $$('.nav-item').forEach(n => n.classList.remove('active'));
                    $('#nav-versions').classList.add('active');
                    switchView('versions');
                    $('#top-bar-title').textContent = 'VERSIONES';
                    $('#top-bar-subtitle').textContent = 'Gestiona tus versiones de Minecraft';
                    state.currentView = 'versions';
                }
            });
        }

    }

    // ═══════════════════════════════════════════════════════════════
    // SETTINGS
    // ═══════════════════════════════════════════════════════════════

    function initSettings() {
        // Cargar los valores iniciales desde el estado a la UI
        applySettings();

        // RAM Slider
        const ramSlider = $('#ram-slider');
        const ramDisplay = $('#ram-display');
        if (ramSlider && ramDisplay) {
            ramSlider.addEventListener('input', (e) => {
                ramDisplay.textContent = e.target.value;
            });
            ramSlider.addEventListener('change', (e) => { // Guardar al soltar
                state.settings.ram = parseInt(e.target.value);
                saveSettings();
            });
        }

        // Particles toggle
        const particlesToggle = $('#toggle-particles');
        if (particlesToggle) {
            particlesToggle.addEventListener('change', (e) => {
                state.settings.particles = e.target.checked;
                const canvas = $('#particles-canvas');
                if (canvas) canvas.style.display = e.target.checked ? 'block' : 'none';
                saveSettings();
            });
        }

        // Animations toggle
        const animToggle = $('#toggle-animations');
        if (animToggle) {
            animToggle.addEventListener('change', (e) => {
                state.settings.animations = e.target.checked;
                document.documentElement.classList.toggle('no-animations', !e.target.checked);
                saveSettings();
            });
        }

        // UI Zoom Slider
        const zoomSlider = $('#ui-zoom-slider');
        const zoomDisplay = $('#ui-zoom-display');
        if (zoomSlider && zoomDisplay) {
            zoomSlider.addEventListener('input', (e) => {
                zoomDisplay.textContent = e.target.value;
                document.documentElement.style.fontSize = `${14 * (e.target.value / 100)}px`;
            });
            zoomSlider.addEventListener('change', (e) => { // Guardar al soltar
                state.settings.uiZoom = parseInt(e.target.value);
                saveSettings();
            });
        }

        // Resolution Slider
        const resSlider = $('#resolution-slider');
        const resDisplay = $('#resolution-display');
        if (resSlider && resDisplay) {
            resSlider.addEventListener('input', (e) => {
                resDisplay.textContent = e.target.value;
            });
            resSlider.addEventListener('change', (e) => { // Guardar al soltar
                state.settings.resolution = parseInt(e.target.value);
                saveSettings();
            });
        }

        // JVM Arguments
        const jvmArgsInput = $('#jvm-args');
        if (jvmArgsInput) {
            jvmArgsInput.addEventListener('change', (e) => {
                state.settings.jvmArgs = e.target.value;
                saveSettings();
            });
        }

        // Close on Launch toggle
        const closeLaunchToggle = $('#toggle-close-launch');
        if (closeLaunchToggle) {
            closeLaunchToggle.addEventListener('change', (e) => {
                state.settings.closeOnLaunch = e.target.checked;
                saveSettings();
            });
        }

        // Snapshots toggle
        const snapToggle = $('#toggle-snapshots');
        if (snapToggle) {
            snapToggle.addEventListener('change', (e) => {
                state.showSnapshots = e.target.checked;
                if (state.currentView === 'versions') {
                    renderVersionList();
                }
                state.settings.showSnapshots = e.target.checked;
                saveSettings();
            });
        }
    }

    // --- Background Settings ---
    const selectBgBtn = $('#btn-select-bg');
    if (selectBgBtn) {
        selectBgBtn.addEventListener('click', () => {
            if (window.GLauncher && window.GLauncher.selectBackgroundImage) {
                window.GLauncher.selectBackgroundImage();
            } else {
                showNotification('Función no disponible en este entorno', 'warning');
            }
        });
    }

    const resetBgBtn = $('#btn-reset-bg');
    if (resetBgBtn) {
        resetBgBtn.addEventListener('click', () => {
            state.settings.backgroundUri = 'images/ifondo.png'; // Ruta por defecto
            saveSettings();
            applyBackgroundSettings();
            showNotification('Fondo reseteado al predeterminado', 'success');
        });
    }

    const bgBlurSlider = $('#bg-blur-slider');
    const bgBlurDisplay = $('#bg-blur-display');
    if (bgBlurSlider) {
        bgBlurSlider.addEventListener('input', (e) => {
            bgBlurDisplay.textContent = e.target.value;
            state.settings.backgroundBlur = parseInt(e.target.value, 10);
            applyBackgroundSettings();
        });
        bgBlurSlider.addEventListener('change', saveSettings);
    }

    const bgSaturateSlider = $('#bg-saturate-slider');
    const bgSaturateDisplay = $('#bg-saturate-display');
    if (bgSaturateSlider) {
        bgSaturateSlider.addEventListener('input', (e) => {
            bgSaturateDisplay.textContent = e.target.value;
            state.settings.backgroundSaturate = parseInt(e.target.value, 10);
            applyBackgroundSettings();
        });
        bgSaturateSlider.addEventListener('change', saveSettings);
    }

    // Esta función es llamada desde Java cuando se selecciona un archivo
    window.onBackgroundSelected = function(uriString) {
        state.settings.backgroundUri = uriString;
        saveSettings();
        applyBackgroundSettings();
        showNotification('Nuevo fondo seleccionado', 'success');
    };

    function saveSettings() {
        localStorage.setItem('glauncher_settings', JSON.stringify(state.settings));
        showNotification('Ajustes guardados', 'info');
    }

    function loadSettings() {
        const saved = localStorage.getItem('glauncher_settings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Fusionar con los valores por defecto para evitar errores si se añaden nuevos ajustes
                Object.assign(state.settings, parsed);
                // Cargar también el estado de los snapshots
                state.showSnapshots = state.settings.showSnapshots;
            } catch (e) {
                console.error("Error al cargar los ajustes", e);
            }
        }
    }

    function applySettings() {
        // Aplicar los ajustes cargados a la UI
        $('#ram-slider').value = state.settings.ram;
        $('#ram-display').textContent = state.settings.ram;
        $('#jvm-args').value = state.settings.jvmArgs;
        $('#toggle-particles').checked = state.settings.particles;
        $('#toggle-animations').checked = state.settings.animations;
        $('#ui-zoom-slider').value = state.settings.uiZoom;
        $('#ui-zoom-display').textContent = state.settings.uiZoom;
        $('#toggle-close-launch').checked = state.settings.closeOnLaunch;
        $('#toggle-snapshots').checked = state.settings.showSnapshots;
        $('#bg-blur-slider').value = state.settings.backgroundBlur;
        $('#bg-blur-display').textContent = state.settings.backgroundBlur;
        $('#bg-saturate-slider').value = state.settings.backgroundSaturate;
        $('#bg-saturate-display').textContent = state.settings.backgroundSaturate;
        
        // Resolution UI setup
        const resSlider = $('#resolution-slider');
        const resDisplay = $('#resolution-display');
        if (resSlider && resDisplay) {
            resSlider.value = state.settings.resolution || 100;
            resDisplay.textContent = state.settings.resolution || 100;
        }

        // Aplicar efectos visuales iniciales
        $('#particles-canvas').style.display = state.settings.particles ? 'block' : 'none';
        document.documentElement.classList.toggle('no-animations', !state.settings.animations);
        // FIX: Aplicar el zoom guardado al iniciar.
        document.documentElement.style.fontSize = `${14 * (state.settings.uiZoom / 100)}px`;
    }

    function applyBackgroundSettings() {
        const bgContainer = $('#bg-container');
        const uri = state.settings.backgroundUri;
        const isVideo = uri.endsWith('.mp4') || uri.endsWith('.webm') || uri.includes('video');

        let mediaElement = bgContainer.querySelector('.bg-media');

        // Crear el elemento correcto (img o video) si no existe o es del tipo incorrecto
        const expectedTag = isVideo ? 'VIDEO' : 'IMG';
        if (!mediaElement || mediaElement.tagName !== expectedTag) {
            bgContainer.innerHTML = ''; // Limpiar
            mediaElement = document.createElement(isVideo ? 'video' : 'img');
            mediaElement.classList.add('bg-media');
            if (isVideo) {
                mediaElement.autoplay = true;
                mediaElement.loop = true;
                mediaElement.muted = true;
            }
            bgContainer.appendChild(mediaElement);
        }

        mediaElement.src = uri;
        mediaElement.style.filter = `blur(${state.settings.backgroundBlur}px) saturate(${state.settings.backgroundSaturate}%)`;

        // Re-insertar el overlay del gradiente
        bgContainer.insertAdjacentHTML('beforeend', '<div class="bg-overlay"></div>');
    }

    // ═══════════════════════════════════════════════════════════════
    // PARTICLES
    // ═══════════════════════════════════════════════════════════════

    function initParticles() {
        const canvas = $('#particles-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let particles = [];
        let animFrame;

        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }

        function createParticle() {
            return {
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 + 0.5,
                speedX: (Math.random() - 0.5) * 0.3,
                speedY: (Math.random() - 0.5) * 0.3,
                opacity: Math.random() * 0.5 + 0.1,
                color: Math.random() > 0.7 ? '#9b59b6' : '#ffffff'
            };
        }

        function init() {
            resize();
            particles = Array.from({ length: 40 }, createParticle);
        }

        function animate() {
            if (!state.settings.particles) {
                animFrame = requestAnimationFrame(animate);
                return;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach(p => {
                p.x += p.speedX;
                p.y += p.speedY;

                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.opacity;
                ctx.fill();
            });

            // Draw connections
            ctx.globalAlpha = 0.05;
            ctx.strokeStyle = '#9b59b6';
            ctx.lineWidth = 0.5;
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 120) {
                        ctx.globalAlpha = 0.05 * (1 - dist / 120);
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }

            ctx.globalAlpha = 1;
            animFrame = requestAnimationFrame(animate);
        }

        window.addEventListener('resize', resize);
        init();
        animate();
    }

    // ═══════════════════════════════════════════════════════════════
    // NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════════

    // ─── Sound FX ───
    function playSound(src) {
        try {
            const audio = new Audio(src);
            audio.volume = 0.8;
            audio.play().catch(() => {});
        } catch (e) { /* silent fail */ }
    }

    function showNotification(message, type = 'info') {
        const container = $('#notification-container');
        if (!container) return;

        // Play SFX
        if (type === 'error') {
            playSound('sounds/notifications/error.mp3');
        } else {
            playSound('sounds/notifications/acept.mp3');
        }

        const notif = document.createElement('div');
        notif.className = `notification ${type}`;
        
        const icons = {
            info: 'fas fa-info-circle',
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle'
        };

        notif.innerHTML = `
            <i class="${icons[type] || icons.info}" style="font-size:1rem;margin-right:8px;"></i>
            <span>${message}</span>
        `;

        container.appendChild(notif);

        // Vibration feedback on Android
        if (navigator.vibrate && type === 'error') {
            navigator.vibrate([50, 30, 50]);
        }

        // Add to notification drawer history
        const timestamp = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        state.notifications.unshift({ message, type, timestamp, id: Date.now() });
        updateNotifDrawer();

        // Auto remove toast
        setTimeout(() => {
            notif.classList.add('removing');
            setTimeout(() => notif.remove(), 400);
        }, 3500);
    }

    function updateNotifDrawer() {
        const drawerList = $('#notif-drawer-list');
        const badge = $('#notif-badge');
        if (!drawerList) return;

        const unread = state.notifications.length;
        if (badge) {
            badge.textContent = unread > 9 ? '9+' : unread;
            badge.style.display = unread > 0 ? 'flex' : 'none';
        }

        if (state.notifications.length === 0) {
            drawerList.innerHTML = `
                <div class="notif-drawer-empty">
                    <i class="fas fa-bell-slash"></i>
                    <p>Sin notificaciones</p>
                </div>
            `;
            return;
        }

        const iconMap = {
            info: 'fas fa-info-circle',
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle'
        };

        drawerList.innerHTML = state.notifications.map(n => `
            <div class="notif-drawer-item ${n.type}">
                <i class="${iconMap[n.type] || iconMap.info} notif-drawer-icon"></i>
                <div class="notif-drawer-content">
                    <span class="notif-drawer-msg">${n.message}</span>
                    <span class="notif-drawer-time">${n.timestamp}</span>
                </div>
            </div>
        `).join('');
    }

    function initNotifDrawer() {
        const openBtn = $('#btn-notifications');
        const overlay = $('#notif-drawer-overlay');
        const drawer = $('#notif-drawer');
        const closeBtn = $('#notif-drawer-close');
        const clearBtn = $('#notif-drawer-clear');

        function openDrawer() {
            drawer.classList.add('open');
            overlay.classList.add('open');
            playSound('sounds/sfx/open-notification.mp3');
        }

        function closeDrawer() {
            drawer.classList.remove('open');
            overlay.classList.remove('open');
            playSound('sounds/sfx/close-notification.mp3');
        }

        if (openBtn) openBtn.addEventListener('click', openDrawer);
        if (overlay) overlay.addEventListener('click', closeDrawer);
        if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                state.notifications = [];
                updateNotifDrawer();
            });
        }
    }

    function initVirtualControls() {
        const openBtn = $('#btn-virtual-controls');
        const editor = $('#vc-editor');
        const canvas = $('#vc-canvas');
        const closeBtn = $('#vc-close-editor-btn');
        const saveBtn = $('#vc-save-editor-btn');
        const resetBtn = $('#vc-reset-btn');
        const addBtn = $('#vc-add-btn');
        const addJoystickBtn = $('#vc-add-joystick');
        const addAttackBtn = $('#vc-add-attack');
        const addUseBtn = $('#vc-add-use');
        const palette = $('.vc-palette');

        // ─── Drag State ───
        let isDragging = false;
        let dragTarget = null;
        let startX, startY, initialX, initialY;

        if (openBtn && editor) {
            openBtn.addEventListener('click', () => {
                editor.style.display = 'flex';
                loadControlsFromStorage(); // Cargar al abrir
                selectControl(null); // Asegurarse de que no hay nada seleccionado al abrir
                initVcTutorial(); // Iniciar el tutorial del editor
                renderCanvas();
            });
        }

        // Deseleccionar al hacer clic en el canvas
        canvas.addEventListener('mousedown', (e) => {
            if (e.target === canvas) {
                selectControl(null);
            }
        });
        if (closeBtn) closeBtn.addEventListener('click', () => editor.style.display = 'none');

        // ─── Adding Controls ───
        function addControl(type, label, func, size = 60) {
            const newControl = {
                id: 'vc-' + Date.now(),
                type: type,
                label: label,
                func: func,
                x: 50,
                y: 50,
                size: size,
                opacity: 70,
                color: '#9b59b6',
                shape: 'circle'
            };
            state.virtualControls.presets[state.virtualControls.activePreset].controls.push(newControl);
            renderCanvas();
            selectControl(newControl.id);
        }

        addBtn?.addEventListener('click', () => addControl('button', 'A', 'key_space'));
        addJoystickBtn?.addEventListener('click', () => addControl('joystick', '', 'joystick_move', 100));

        // ─── Canvas Rendering ───
        function renderCanvas() {
            const preset = state.virtualControls.presets[state.virtualControls.activePreset];
            const controls = preset?.controls || [];

            canvas.innerHTML = '<div class="vc-canvas-grid"></div>';
            
            if (controls.length === 0) {
                canvas.innerHTML += `
                    <div class="vc-canvas-hint" id="vc-canvas-hint">
                        <i class="fas fa-hand-point-up" style="font-size:2rem;opacity:0.3;"></i>
                        <p>Añade elementos desde el panel izquierdo</p>
                    </div>`;
            }

            // Render trackpad overlay if mouse mode is active
            if (preset.mouseMode) { // Siempre será true ahora
                canvas.innerHTML += `
                    <div class="vc-mouse-trackpad">
                        <div style="text-align:center; color:rgba(255,255,255,0.2); font-family:'Minecraftia'; font-size:0.6rem;">
                            <i class="fas fa-mouse" style="font-size: 2rem;"></i>
                            <p>Área de control de cámara</p>
                        </div>
                    </div>`;
            }

            controls.forEach(ctrl => {
                // Buscamos el template correspondiente en el index.html
                const template = $(`#vc-tpl-${ctrl.type}`);
                if (!template) return;

                // Clonamos la estructura del template
                const el = template.content.cloneNode(true).firstElementChild;
                
                el.id = ctrl.id;
                el.classList.add(`type-${ctrl.type}`);
                if (state.virtualControls.selectedId === ctrl.id) el.classList.add('selected');

                el.style.left = `${ctrl.x}%`;
                el.style.top = `${ctrl.y}%`;
                el.style.width = `${ctrl.size}px`;
                el.style.height = `${ctrl.size}px`;
                el.style.opacity = ctrl.opacity / 100;
                el.style.backgroundColor = ctrl.color;
                el.style.borderRadius = ctrl.shape === 'circle' ? '50%' : '8px';
                el.style.transform = 'translate(-50%, -50%)';
                
                // Seteamos el texto si el elemento tiene un span (para botones y mouse)
                const labelSpan = el.querySelector('span');
                if (labelSpan && ctrl.type !== 'joystick') {
                    labelSpan.textContent = ctrl.label;
                }
                
                el.addEventListener('mousedown', startDrag);
                el.addEventListener('touchstart', startDrag, { passive: false });
                canvas.appendChild(el);
            });
        }

        // ─── Interaction ───
        function startDrag(e) {
            e.stopPropagation();
            const id = e.currentTarget.id;
            selectControl(id);
            
            const event = e.type.startsWith('touch') ? e.touches[0] : e;
            isDragging = true;
            dragTarget = e.currentTarget;
            const ctrl = getSelectedControl();
            
            startX = event.clientX;
            startY = event.clientY;
            initialX = ctrl.x;
            initialY = ctrl.y;

            document.addEventListener('mousemove', onDrag);
            document.addEventListener('touchmove', onDrag, { passive: false });
            document.addEventListener('mouseup', stopDrag);
            document.addEventListener('touchend', stopDrag);
        }

        function onDrag(e) {
            if (!isDragging || !dragTarget) return;
            if (e.cancelable) e.preventDefault();
            
            const event = e.type.startsWith('touch') ? e.touches[0] : e;
            const rect = canvas.getBoundingClientRect();
            const dx = ((event.clientX - startX) / rect.width) * 100;
            const dy = ((event.clientY - startY) / rect.height) * 100;
            
            const ctrl = getSelectedControl();
            ctrl.x = Math.max(0, Math.min(100, initialX + dx));
            ctrl.y = Math.max(0, Math.min(100, initialY + dy));
            
            dragTarget.style.left = `${ctrl.x}%`;
            dragTarget.style.top = `${ctrl.y}%`;
            updatePropertyInputs();
        }

        function stopDrag() {
            isDragging = false;
            document.removeEventListener('mousemove', onDrag);
            document.removeEventListener('touchmove', onDrag);
            document.removeEventListener('mouseup', stopDrag);
            document.removeEventListener('touchend', stopDrag);
        }

        // ─── Properties Panel ───
        function selectControl(id) {
            state.virtualControls.selectedId = id;
            $$('.vc-element').forEach(el => el.classList.toggle('selected', el.id === id));
            
            // Lógica para mostrar/ocultar paneles
            const propPanel = $('#vc-properties');
            const noSelection = $('#vc-no-selection');
            const propFields = $('#vc-prop-fields');
            const addPanel = $('.vc-palette');
            
            propPanel.style.display = id ? 'flex' : 'none';
            if (noSelection) noSelection.style.display = id ? 'none' : 'flex';
            if (propFields) propFields.style.display = id ? 'flex' : 'none';
            addPanel.classList.toggle('hidden', !!id);

            if (id) {
                updatePropertyInputs();
            }
        }

        function getSelectedControl() {
            const presetControls = state.virtualControls.presets[state.virtualControls.activePreset]?.controls || [];
            return presetControls.find(c => c.id === state.virtualControls.selectedId) || null;
        }

        function updatePropertyInputs() {
            const ctrl = getSelectedControl();
            if (!ctrl) return;

            $('#prop-label').value = ctrl.label;
            $('#prop-function').value = ctrl.func;
            $('#prop-size').value = ctrl.size;
            $('#prop-size-val').textContent = ctrl.size;
            $('#prop-opacity').value = ctrl.opacity;
            $('#prop-opacity-val').textContent = ctrl.opacity;
            $('#prop-x').value = Math.round(ctrl.x);
            $('#prop-x-val').textContent = Math.round(ctrl.x);
            $('#prop-y').value = Math.round(ctrl.y);
            $('#prop-y-val').textContent = Math.round(ctrl.y);
            
            $$('.vc-color-swatch').forEach(s => s.classList.toggle('active', s.dataset.color === ctrl.color));
            $$('.vc-shape-btn').forEach(b => b.classList.toggle('active', b.dataset.shape === ctrl.shape));
        }

        // Bind property inputs
        const inputs = {
            '#prop-label': 'label',
            '#prop-function': 'func',
            '#prop-size': 'size',
            '#prop-opacity': 'opacity',
            '#prop-x': 'x',
            '#prop-y': 'y'
        };

        Object.entries(inputs).forEach(([sel, prop]) => {
            $(sel)?.addEventListener('input', (e) => {
                const ctrl = getSelectedControl();
                if (!ctrl) return;
                ctrl[prop] = sel.includes('label') || sel.includes('func') ? e.target.value : parseInt(e.target.value);
                renderCanvas();
                updatePropertyInputs();
            });
        });

        // Preset Switcher Logic
        $$('.vc-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                $$('.vc-preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.virtualControls.activePreset = parseInt(btn.dataset.preset, 10);
                selectControl(null);
                renderCanvas();
            });
        });

        $$('.vc-color-swatch').forEach(s => {
            s.addEventListener('click', () => {
                const ctrl = getSelectedControl();
                if (ctrl) { ctrl.color = s.dataset.color; renderCanvas(); updatePropertyInputs(); }
            });
        });

        $$('.vc-shape-btn').forEach(b => {
            b.addEventListener('click', () => {
                const ctrl = getSelectedControl();
                if (ctrl) { ctrl.shape = b.dataset.shape; renderCanvas(); updatePropertyInputs(); }
            });
        });

        $('#vc-delete-element')?.addEventListener('click', () => {
            playSound('sounds/sfx/recicle.mp3');
            const preset = state.virtualControls.presets[state.virtualControls.activePreset];
            preset.controls = preset.controls.filter(c => c.id !== state.virtualControls.selectedId);
            selectControl(null);
            renderCanvas();
        });

        // ─── Global Actions ───
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('¿Resetear este preset?')) {
                    playSound('sounds/sfx/recicle.mp3');
                    state.virtualControls.presets[state.virtualControls.activePreset] = { controls: [], mouseMode: true };
                    selectControl(null);
                    renderCanvas();
                }
            });
        }

        function saveControlsToStorage() {
            localStorage.setItem('glauncher_controls', JSON.stringify(state.virtualControls.presets));
        }

        function loadControlsFromStorage() {
            const saved = localStorage.getItem('glauncher_controls');
            if (saved) {
                const parsedPresets = JSON.parse(saved);
                // Asegurarse de que la estructura cargada sea la correcta
                if (Array.isArray(parsedPresets) && parsedPresets.length === 3) {
                    state.virtualControls.presets = parsedPresets.map(p => ({
                        controls: p?.controls || (Array.isArray(p) ? p : []), // Compatibilidad con la estructura vieja
                        mouseMode: true // Forzar siempre a true
                    }));
                }
            }
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                // Guardar todos los presets en el almacenamiento local del navegador
                saveControlsToStorage(); 
                
                // Enviar solo la configuración del PRESET ACTIVO al puente de Android
                const activePresetConfig = JSON.stringify(state.virtualControls.presets[state.virtualControls.activePreset]);
                if (window.GLauncher && window.GLauncher.setVirtualControls) {
                    window.GLauncher.setVirtualControls(activePresetConfig);
                }
                editor.style.display = 'none';
                showNotification('Controles virtuales guardados correctamente', 'success');
            });
        }

        // --- Lógica para arrastrar el panel de "Añadir" ---
        const paletteHeader = $('.vc-palette-header');
        let isDraggingPalette = false;
        let paletteOffsetX, paletteOffsetY;

        paletteHeader.addEventListener('mousedown', (e) => {
            isDraggingPalette = true;
            palette.style.transition = 'none'; // Desactivar transición mientras se arrastra
            paletteOffsetX = e.clientX - palette.offsetLeft;
            paletteOffsetY = e.clientY - palette.offsetTop;
            document.addEventListener('mousemove', onPaletteDrag);
            document.addEventListener('mouseup', stopPaletteDrag);
        });

        function onPaletteDrag(e) {
            if (!isDraggingPalette) return;
            const mainBounds = $('.vc-editor-main').getBoundingClientRect();
            
            let newX = e.clientX - paletteOffsetX;
            let newY = e.clientY - paletteOffsetY;

            // Limitar a los bordes del contenedor principal
            newX = Math.max(0, Math.min(newX, mainBounds.width - palette.offsetWidth));
            newY = Math.max(0, Math.min(newY, mainBounds.height - palette.offsetHeight));

            palette.style.left = `${newX}px`;
            palette.style.top = `${newY}px`;
        }

        function stopPaletteDrag() {
            isDraggingPalette = false;
            palette.style.transition = ''; // Reactivar transición
            document.removeEventListener('mousemove', onPaletteDrag);
            document.removeEventListener('mouseup', stopPaletteDrag);
        }
    }

    function initVcTutorial() {
        // Usamos el overlay del tutorial principal
        const mainTutorialOverlay = $('#tutorial-overlay');
        if (!mainTutorialOverlay) return;

        const hasCompleted = localStorage.getItem('glauncher_vc_tutorial_completed');
        if (hasCompleted) return;

        const overlay = $('#tutorial-overlay');
        const spotlight = $('#tutorial-spotlight');
        const tooltip = $('#tutorial-tooltip');
        const titleEl = $('#tutorial-title');
        const descEl = $('#tutorial-desc');
        const nextBtn = $('#tutorial-next');
        const prevBtn = $('#tutorial-prev');
        const finishBtn = $('#tutorial-finish');
        const dotsContainer = $('#tutorial-dots');

        const steps = [
            {
                element: '#vc-canvas',
                title: '¡Editor de Controles!',
                description: 'Este es el lienzo. Aquí verás una vista previa de tus controles sobre la pantalla del juego.',
                position: 'center'
            },
            {
                element: '#vc-palette',
                title: 'Añadir Controles',
                description: 'Usa este panel para añadir nuevos botones o joysticks a la pantalla. ¡Puedes arrastrar este panel para moverlo!',
                position: 'right'
            },
            {
                element: '#vc-properties',
                title: 'Panel de Propiedades',
                description: 'Cuando selecciones un control, este panel aparecerá para que puedas cambiar su tamaño, función, color y más.',
                position: 'left' // Asumimos que aparecerá a la derecha
            },
            {
                element: '.vc-presets-bar',
                title: 'Presets',
                description: 'Puedes guardar hasta 3 configuraciones de controles diferentes y cambiar entre ellas aquí.',
                position: 'bottom'
            },
            {
                element: '#vc-save-editor-btn',
                title: 'Guardar y Salir',
                description: 'Cuando termines, pulsa este botón para guardar los cambios y cerrar el editor.',
                position: 'bottom'
            }
        ];

        let currentStep = 0;

        // Reutilizamos la función showStep del tutorial principal
        function showStep(index) {
            const step = steps[index];
            const target = $(step.element);

            if (!target) {
                tooltip.style.opacity = 0;
                spotlight.style.opacity = 0;
                return;
            }

            const rect = target.getBoundingClientRect();
            spotlight.style.width = `${rect.width + 8}px`;
            spotlight.style.height = `${rect.height + 8}px`;
            spotlight.style.top = `${rect.top - 4}px`;
            spotlight.style.left = `${rect.left - 4}px`;

            titleEl.innerHTML = step.title;
            descEl.innerHTML = step.description;

            // Lógica de posicionamiento del tooltip (copiada del tutorial principal)
            setTimeout(() => {
                const tooltipRect = tooltip.getBoundingClientRect();
                let top, left;
                const windowHeight = window.innerHeight;
                const windowWidth = window.innerWidth;

                if (step.position === 'right') { top = rect.top; left = rect.right + 15; } 
                else if (step.position === 'bottom') { top = rect.bottom + 15; left = rect.left; } 
                else if (step.position === 'left') { top = rect.top; left = rect.left - tooltipRect.width - 15; }
                else { top = rect.top + rect.height / 2 - tooltipRect.height / 2; left = rect.left + rect.width / 2 - tooltipRect.width / 2; }

                // Ajustar si se sale de la pantalla
                if (top + tooltipRect.height > windowHeight - 10) {
                    top = rect.top - tooltipRect.height - 15; // Moverlo arriba del elemento
                }
                if (left + tooltipRect.width > windowWidth - 10) {
                    left = windowWidth - tooltipRect.width - 10;
                }
                left = Math.max(10, left);

                tooltip.style.top = `${top}px`;
                tooltip.style.left = `${left}px`;
            }, 10);

            prevBtn.style.visibility = index === 0 ? 'hidden' : 'visible';
            nextBtn.style.display = index === steps.length - 1 ? 'none' : 'flex';
            finishBtn.style.display = index === steps.length - 1 ? 'flex' : 'none';
            dotsContainer.innerHTML = steps.map((_, i) => `<div class="tutorial-dot ${i === index ? 'active' : ''}"></div>`).join('');
        }

        nextBtn.onclick = () => {
            if (currentStep < steps.length - 1) {
                currentStep++;
                showStep(currentStep);
            }
        };
        prevBtn.onclick = () => {
            if (currentStep > 0) {
                currentStep--;
                showStep(currentStep);
            }
        };
        finishBtn.onclick = () => {
            localStorage.setItem('glauncher_vc_tutorial_completed', 'true');
            mainTutorialOverlay.classList.remove('active');
            // Restaurar estado normal del editor
            selectControl(null);
        };

        mainTutorialOverlay.classList.add('active');
        $('#vc-properties').style.display = 'flex'; // Forzar visibilidad para el tutorial
        $('#vc-palette').classList.remove('hidden');
        showStep(currentStep);
    }

    function initTutorial() {
        const overlay = $('#tutorial-overlay');
        if (!overlay) return;

        const hasCompleted = localStorage.getItem('glauncher_tutorial_completed');
        if (hasCompleted) return;

        const spotlight = $('#tutorial-spotlight');
        const tooltip = $('#tutorial-tooltip');
        const titleEl = $('#tutorial-title');
        const descEl = $('#tutorial-desc');
        const nextBtn = $('#tutorial-next');
        const prevBtn = $('#tutorial-prev');
        const finishBtn = $('#tutorial-finish');
        const dotsContainer = $('#tutorial-dots');

        const steps = [
            {
                element: '#sidebar-logo',
                title: '¡Bienvenido a GLauncher!',
                description: 'Este es un rápido tour para mostrarte cómo funciona todo. ¡Vamos a empezar!',
                position: 'center'
            },
            {
                element: '#sidebar-nav',
                title: 'Navegación Principal',
                description: 'Usa la barra lateral para moverte entre las secciones: Inicio, Versiones, Mods, GMusic y tu Cuenta.',
                position: 'right'
            },
            {
                element: '#nav-versions',
                title: 'Instalar y Jugar',
                description: 'Ve a la pestaña de <strong>Versiones</strong> para instalar tus versiones favoritas de Minecraft.',
                position: 'right'
            },
            {
                element: '#hero-actions',
                title: 'Selecciona tu Versión',
                description: 'Una vez instalada, la versión aparecerá aquí. Selecciónala y pulsa JUGAR.',
                position: 'bottom'
            },
            {
                element: '#btn-virtual-controls',
                title: 'Controles Virtuales',
                description: 'Toca este ícono para abrir el <strong>editor de controles</strong>. Arrastra, añade y personaliza los botones a tu gusto.',
                position: 'bottom'
            },
            {
                element: '#nav-gmusic',
                title: 'GMusic Player',
                description: 'En la pestaña de <strong>GMusic</strong>, puedes buscar y reproducir música de fondo mientras juegas.',
                position: 'right'
            },
            {
                element: '#sidebar-logo',
                title: '¡Todo Listo!',
                description: 'Ya estás preparado para disfrutar de la experiencia completa. ¡Diviértete!',
                position: 'center'
            }
        ];

        let currentStep = 0;

        function showStep(index) {
            const step = steps[index];
            const target = $(step.element);

            if (!target) {
                tooltip.style.opacity = 0;
                spotlight.style.opacity = 0;
                return;
            }

            const rect = target.getBoundingClientRect();
            spotlight.style.width = `${rect.width + 8}px`;
            spotlight.style.height = `${rect.height + 8}px`;
            spotlight.style.top = `${rect.top - 4}px`;
            spotlight.style.left = `${rect.left - 4}px`;

            titleEl.innerHTML = step.title;
            descEl.innerHTML = step.description;

            // Usamos un timeout para asegurar que el contenido del tooltip se renderice
            // y podamos obtener su altura/anchura real antes de posicionarlo.
            setTimeout(() => {
                const tooltipRect = tooltip.getBoundingClientRect();
                const mainArea = $('.main-area').getBoundingClientRect();
                let top, left;

                if (step.position === 'right') {
                    top = rect.top;
                    left = rect.right + 15;
                } else if (step.position === 'bottom') {
                    top = rect.bottom + 15;
                    left = rect.left;
                } else if (step.position === 'top') {
                    top = rect.top - tooltipRect.height - 15;
                    left = rect.left;
                } else { // center
                    top = mainArea.height / 2 - tooltipRect.height / 2;
                    left = mainArea.width / 2 - tooltipRect.width / 2;
                    spotlight.style.width = '0px';
                    spotlight.style.height = '0px';
                }

                // Ajustar si se sale de la pantalla
                if (left + tooltipRect.width > mainArea.right - 10) {
                    left = mainArea.right - tooltipRect.width - 10;
                }
                left = Math.max(10, left);

                tooltip.style.top = `${top}px`;
                tooltip.style.left = `${left}px`;
            }, 10); // Pequeño delay

            // Actualizar botones y puntos
            prevBtn.style.visibility = index === 0 ? 'hidden' : 'visible';
            nextBtn.style.display = index === steps.length - 1 ? 'none' : 'flex';
            finishBtn.style.display = index === steps.length - 1 ? 'flex' : 'none';
            dotsContainer.innerHTML = steps.map((_, i) => `<div class="tutorial-dot ${i === index ? 'active' : ''}"></div>`).join('');
        }

        nextBtn.addEventListener('click', () => {
            if (currentStep < steps.length - 1) {
                currentStep++;
                showStep(currentStep);
            }
        });

        prevBtn.addEventListener('click', () => {
            if (currentStep > 0) {
                currentStep--;
                showStep(currentStep);
            }
        });

        finishBtn.addEventListener('click', () => {
            localStorage.setItem('glauncher_tutorial_completed', 'true');
            overlay.classList.remove('active');
        });

        // Iniciar tutorial
        overlay.classList.add('active');
        showStep(currentStep);
    }

    function initInGameMenu() {
        const overlay = $('#ingame-menu-overlay');
        const btnResume = $('#ingame-btn-resume');
        const btnControls = $('#ingame-btn-controls');
        const btnSettings = $('#ingame-btn-settings');
        const btnExit = $('#ingame-btn-exit');

        // Esta función será llamada por el motor del juego cuando se pulse el botón de menú
        window.toggleInGameMenu = function(show) {
            if (show) {
                overlay.style.display = 'block';
                setTimeout(() => overlay.classList.add('open'), 10);
            } else {
                overlay.classList.remove('open');
                setTimeout(() => overlay.style.display = 'none', 300);
            }
        }

        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) window.toggleInGameMenu(false);
        });
        btnResume?.addEventListener('click', () => window.toggleInGameMenu(false));
        btnControls?.addEventListener('click', () => {
            $('#vc-editor').style.display = 'flex';
        });
        btnSettings?.addEventListener('click', () => {
            showNotification('Ajustes no implementados en esta vista', 'warning');
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    function formatDate(dateStr) {
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            const options = { year: 'numeric', month: 'short', day: 'numeric' };
            return date.toLocaleDateString('es-ES', options);
        } catch {
            return '';
        }
    }
    // Formatea segundos a mm:ss o h:mm:ss (usado por GMusic)
    function formatDuration(seconds) {
        if (!seconds || seconds <= 0) return '';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) {
            return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
        return `${m}:${String(s).padStart(2, '0')}`;
    }

})();
