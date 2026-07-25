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
                { controls: [], mouseMode: false },
                { controls: [], mouseMode: false }
            ],
            activePreset: 0,
            selectedId: null,
            mouseMode: false
        },
        settings: {
            ram: 2048,
            particles: true,
            animations: true,
            closeOnLaunch: false,
            showSnapshots: false,
            jvmArgs: '-XX:+UseG1GC'
        }
    };

    const PAGE_SIZE = 50;

    // ─── DOM References ───
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // ─── Initialization ───
    document.addEventListener('DOMContentLoaded', () => {
        initNavigation();
        initParticles();
        initSettings();
        initVersionTabs();
        initSearchFilters();
        initPlayButton();
        initAccountButtons();
        initNotifDrawer();
        initVirtualControls();
        initHeroVersionSelector();
        initInGameMenu();
        loadVersions('vanilla');
        loadMods();
        showNotification('¡Bienvenido a GLauncher!', 'success');
    });

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
        // Hide all views
        $$('.view').forEach(v => {
            v.classList.remove('active');
        });

        // Show target view
        const targetView = $(`#view-${viewId}`);
        if (targetView) {
            targetView.classList.add('active');
            // Reset scroll
            $('#content-area').scrollTop = 0;
        }
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
                // Guardamos el objeto completo de la versión del loader, incluyendo su URL al manifiesto
                if (v.version && v.url) {
                    grouped[gameVersion].loaderVersions[v.version] = v.url;
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
                // Guardamos el objeto completo
                if (v.version && v.url) {
                    grouped[gameVersion].loaderVersions[v.version] = v.url;
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

        // Update home stat
        const statVersions = $('#stat-versions');
        if (statVersions) statVersions.textContent = state.versions.vanilla.length || '—';

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
                        <button class="version-action-btn play-btn" title="Jugar">
                            <i class="fas fa-play"></i>
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

            const playBtn = item.querySelector('.play-btn');
            if (playBtn) {
                playBtn.addEventListener('click', () => {
                    const versionId = item.dataset.versionId;
                    launchVersion(versionId);
                });
            }

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

        // Update info
        $('#info-selversion').textContent = version.id;
    }

    // Esta función será llamada desde el código nativo de Android
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
                    installBtn.innerHTML = '<i class="fas fa-check"></i> INSTALADA';
                    installBtn.style.background = 'var(--minecraft-green)';
                }
                if (state.selectedVersion && !state.installedVersions.includes(state.selectedVersion.id)) {
                    state.installedVersions.push(state.selectedVersion.id);
                    updateInstalledList();
                    updateHeroVersionSelector();
                    updateStats();
                }
                showNotification(`${state.selectedVersion.id} instalada correctamente`, 'success');
            }, 500);
        }
    }

    function resetVersionDetail() {
        $('#vd-name').textContent = 'Selecciona una versión';
        $('#vd-type').textContent = 'Toca una versión de la lista para ver sus detalles';
        $('#vd-meta').style.display = 'none';
        $('#vd-install-btn').style.display = 'none';
        $('#vd-download-progress').style.display = 'none';
        const installBtn = $('#vd-install-btn');
        if (installBtn) installBtn.disabled = false;
    }

    function launchVersion(versionId) {
        showNotification(`Lanzando Minecraft ${versionId}...`, 'success');
        
        // Vibration feedback (Android)
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }

        // Llamada al puente nativo de Android
        if (window.AndroidAudioBridge && window.AndroidAudioBridge.launchMinecraftVersion) {
            window.AndroidAudioBridge.launchMinecraftVersion(versionId);
        }
    }

    function installVersion(version) {
        const progressBox = $('#vd-download-progress');
        const installBtn = $('#vd-install-btn');

        if (installBtn) installBtn.disabled = true;
        if (progressBox) progressBox.style.display = 'block';
        
        // Llamada al puente nativo de Android
        if (window.AndroidAudioBridge && window.AndroidAudioBridge.installMinecraftVersion) {
            window.AndroidAudioBridge.installMinecraftVersion(JSON.stringify(version));
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

        // Populate select with loader versions
        select.innerHTML = Object.keys(version.loaderVersions)
            .map(loaderVer => `<option value="${loaderVer}">${loaderName} ${loaderVer}</option>`)
            .join('');

        // Replace button to avoid multiple listeners
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        newConfirmBtn.addEventListener('click', () => {
            const selectedLoaderVersion = select.value;
            // Creamos un objeto de versión completo para enviar al nativo
            const versionToInstall = {
                id: `${version.id}-${loaderName.toLowerCase()}-${selectedLoaderVersion}`,
                url: version.loaderVersions[selectedLoaderVersion], // ¡La URL del manifiesto correcto!
                loader: version.loader
            };

            installVersion(versionToInstall);
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
    }

    // ═══════════════════════════════════════════════════════════════
    // MODS
    // ═══════════════════════════════════════════════════════════════

    async function loadMods(query = '') {
        const grid = $('#mods-grid');
        grid.innerHTML = `
            <div class="loading-spinner" style="grid-column:1/-1;">
                <div class="spinner"></div>
                <span>Buscando mods en Modrinth...</span>
            </div>
        `;

        try {
            const url = `${API.modrinth}?query=${encodeURIComponent(query)}&limit=20&facets=[["project_type:mod"]]`;
            const response = await fetch(url);
            const data = await response.json();
            const mods = data.hits || [];

            if (mods.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state" style="grid-column:1/-1;">
                        <i class="fas fa-search"></i>
                        <h3>Sin resultados</h3>
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
                        <span class="mod-author">por <span>${mod.author}</span></span>
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
                                currentActiveModBtn.style.color = 'white';
                                currentActiveModBtn.style.borderColor = 'var(--minecraft-green)';
                            }

                            showNotification(`Mod guardado en /sdcard/GLauncher/mods/ (${selectedLoader} - ${selectedVer})`, 'success');

                            const installedCount = document.querySelectorAll('.mod-install-btn[style*="minecraft-green"]').length;
                            $('#stat-mods').textContent = installedCount;
                            $('#info-activemods').textContent = installedCount;
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
                    loadMods(e.target.value.trim());
                }, 400);
            });
        }
        initGMusic();
    });

    // ═══════════════════════════════════════════════════════════════
    // GMUSIC (Local API + YouTube Player)
    // ═══════════════════════════════════════════════════════════════

    // Detecta automáticamente la IP del servidor si está en la misma red
    const GMUSIC_API = `${window.location.origin}/api/search`;

    let gmusicIsPlaying = false;

    function initGMusic() {
        const searchBtn = $('#gmusic-search-btn');
        const searchInput = $('#gmusic-search-input');
        const playBtn = $('#gmusic-btn-play');
        const rewindBtn = $('#gmusic-btn-rewind');
        const forwardBtn = $('#gmusic-btn-forward');
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

        // Evento Play / Pause
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                toggleGMusicPlay();
            });
        }

        // Eventos Retroceder -15s / Adelantar +15s
        if (rewindBtn) {
            rewindBtn.addEventListener('click', () => {
                seekGMusicPlayer(-15);
            });
        }

        if (forwardBtn) {
            forwardBtn.addEventListener('click', () => {
                seekGMusicPlayer(15);
            });
        }
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
                <span>Buscando en servidor local (192.168.0.100:3000)...</span>
            </div>
        `;

        try {
            const response = await fetch(`${GMUSIC_API}?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            const items = Array.isArray(data) ? data : (data.videos || data.results || data.items || []);

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

            resultsContainer.innerHTML = items.map((item, index) => {
                const title = item.title || item.name || 'Sin título';
                const channel = item.author?.name || item.channel || item.artist || 'Desconocido';
                const videoId = item.videoId || item.id || (item.url ? item.url.split('v=')[1] : '');
                const thumbnail = item.thumbnail || item.image || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : 'icons/version_vanilla.png');
                const duration = item.timestamp || item.duration || '';

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
            console.error('Error in GMusic search:', error);
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error de Conexión</h3>
                    <p>No se pudo conectar al servidor de música en ${GMUSIC_API}</p>
                </div>
            `;
            showNotification('No se pudo conectar con servidor GMusic local', 'error');
        }
    }

    function playGMusicVideo(videoId, title, channel) {
        const iframe = $('#gmusic-iframe');
        const titleEl = $('#gmusic-playing-title');
        const channelEl = $('#gmusic-playing-channel');
        const discCover = $('#gmusic-disc-cover');
        const playIcon = $('#gmusic-play-icon');

        // Si estamos ejecutando en el WebView de Android Nativo con nuestro AndroidAudioBridge
        if (window.AndroidAudioBridge && window.AndroidAudioBridge.playAudioFromYouTube) {
            window.AndroidAudioBridge.playAudioFromYouTube(videoId);
        } else if (iframe) {
            iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`;
        }

        gmusicIsPlaying = true;

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
        const iframe = $('#gmusic-iframe');
        const discCover = $('#gmusic-disc-cover');
        const playIcon = $('#gmusic-play-icon');

        gmusicIsPlaying = !gmusicIsPlaying;

        if (window.AndroidAudioBridge && window.AndroidAudioBridge.togglePlayPause) {
            window.AndroidAudioBridge.togglePlayPause();
        } else if (iframe && iframe.src) {
            const action = gmusicIsPlaying ? 'playVideo' : 'pauseVideo';
            iframe.contentWindow.postMessage(JSON.stringify({
                event: 'command',
                func: action,
                args: []
            }), '*');
        }

        if (discCover) {
            discCover.style.animationPlayState = gmusicIsPlaying ? 'running' : 'paused';
        }

        if (playIcon) {
            playIcon.className = gmusicIsPlaying ? 'fas fa-pause' : 'fas fa-play';
        }

        showNotification(gmusicIsPlaying ? 'Audio reanudado' : 'Audio pausado', 'info');
    }

    function seekGMusicPlayer(seconds) {
        const iframe = $('#gmusic-iframe');

        if (window.AndroidAudioBridge && window.AndroidAudioBridge.seekAudio) {
            window.AndroidAudioBridge.seekAudio(seconds);
        } else if (iframe && iframe.src) {
            iframe.contentWindow.postMessage(JSON.stringify({
                event: 'command',
                func: 'seekBy',
                args: [seconds, true]
            }), '*');
        }

        showNotification(seconds > 0 ? `Adelantado +${seconds}s` : `Retrocedido ${seconds}s`, 'info');
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

        // Install button in version detail
        const installBtn = $('#vd-install-btn');
        if (installBtn) {
            installBtn.addEventListener('click', () => {
                if (state.selectedVersion) {
                    if (state.selectedVersion.loader === 'forge' || state.selectedVersion.loader === 'neoforge') {
                        openLoaderVersionModal(state.selectedVersion);
                    } else {
                        installVersion(state.selectedVersion);
                    }
                }
            });
        }

        // Quick launch items
        const qlItems = $$('.ql-item');
        qlItems.forEach(item => {
            item.addEventListener('click', () => {
                const version = item.dataset.version;
                if (version) launchVersion(version);
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // SETTINGS
    // ═══════════════════════════════════════════════════════════════

    function initSettings() {
        // RAM Slider
        const ramSlider = $('#ram-slider');
        const ramDisplay = $('#ram-display');
        if (ramSlider && ramDisplay) {
            ramSlider.addEventListener('input', (e) => {
                const val = e.target.value;
                ramDisplay.textContent = val;
                state.settings.ram = parseInt(val);
            });
        }

        // Particles toggle
        const particlesToggle = $('#toggle-particles');
        if (particlesToggle) {
            particlesToggle.addEventListener('change', (e) => {
                state.settings.particles = e.target.checked;
                const canvas = $('#particles-canvas');
                if (canvas) canvas.style.display = e.target.checked ? 'block' : 'none';
            });
        }

        // Animations toggle
        const animToggle = $('#toggle-animations');
        if (animToggle) {
            animToggle.addEventListener('change', (e) => {
                state.settings.animations = e.target.checked;
                document.body.classList.toggle('no-animations', !e.target.checked);
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
            });
        }
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
        const toggleMouseModeBtn = $('#vc-toggle-mouse-mode');

        // ─── Drag State ───
        let isDragging = false;
        let dragTarget = null;
        let startX, startY, initialX, initialY;

        if (openBtn && editor) {
            openBtn.addEventListener('click', () => {
                editor.style.display = 'flex';
                loadControlsFromStorage(); // Cargar al abrir
                renderCanvas();
            });
        }

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
        addAttackBtn?.addEventListener('click', () => addControl('button', 'ATK', 'mouse_left'));
        addUseBtn?.addEventListener('click', () => addControl('button', 'USE', 'mouse_right'));

        toggleMouseModeBtn?.addEventListener('click', () => {
            const preset = state.virtualControls.presets[state.virtualControls.activePreset];
            preset.mouseMode = !preset.mouseMode;
            showNotification(`Modo mouse virtual ${preset.mouseMode ? 'activado' : 'desactivado'}`, 'info');
            renderCanvas();
        });

        // ─── Canvas Rendering ───
        function renderCanvas() {
            const preset = state.virtualControls.presets[state.virtualControls.activePreset];
            const controls = preset?.controls || [];
            const mouseMode = preset.mouseMode || false;

            canvas.innerHTML = '<div class="vc-canvas-grid"></div>';
            
            if (controls.length === 0) {
                canvas.innerHTML += `
                    <div class="vc-canvas-hint" id="vc-canvas-hint">
                        <i class="fas fa-hand-point-up" style="font-size:2rem;opacity:0.3;"></i>
                        <p>Añade elementos desde el panel izquierdo</p>
                    </div>`;
            }

            // Render trackpad overlay if mouse mode is active
            if (preset.mouseMode) {
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
            $('#vc-no-selection').style.display = id ? 'none' : 'flex';
            $('#vc-prop-fields').style.display = id ? 'flex' : 'none';
            if (id) updatePropertyInputs();
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
                    state.virtualControls.presets[state.virtualControls.activePreset] = { controls: [], mouseMode: false };
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
                        mouseMode: p?.mouseMode || false
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
                if (window.AndroidAudioBridge && window.AndroidAudioBridge.setVirtualControls) {
                    window.AndroidAudioBridge.setVirtualControls(activePresetConfig);
                }
                editor.style.display = 'none';
                showNotification('Controles virtuales guardados correctamente', 'success');
            });
        }
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

})();
