// LocalStorage setup
const STORAGE_KEY = 'cifrasagrada_data';

// Initialize data
let appData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
    cifras: [
        // Mock data
        {
            id: '1',
            title: 'Sonda-me, Usa-me',
            artist: 'Aline Barros',
            key: 'G',
            content: 'Senhor, Eu se[G]i que tu me so[D/F#]ndas\nSe[Em]i também que me con[Bm]heces\nSe me ass[C]ento ou me lev[D]anto\nCo[Am]nheces meus pensam[D]entos',
            lastAccessed: Date.now()
        }
    ],
    settings: {}
};

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

// Globals
let currentCifraId = null;
let currentTransposition = 0;
let autoScrollInterval = null;

// Routing
function navigate(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + pageId).classList.add('active');
    
    // Update bottom nav
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const navItem = Array.from(document.querySelectorAll('.nav-item')).find(item => item.getAttribute('onclick') === `navigate('${pageId}')`);
    if(navItem) navItem.classList.add('active');

    if (pageId === 'dashboard') {
        renderRecentList();
    } else if (pageId === 'biblioteca') {
        renderLibrary();
    }
}

// Toast Notification
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Utility: Generate ID
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderRecentList();
});

// --- DASHBOARD ---
function renderRecentList() {
    const list = document.getElementById('recent-list');
    list.innerHTML = '';
    
    // Sort by last accessed
    const sorted = [...appData.cifras].sort((a, b) => b.lastAccessed - a.lastAccessed).slice(0, 5);
    
    if (sorted.length === 0) {
        list.innerHTML = '<p style="color: var(--color-text-light); text-align: center;">Nenhuma cifra encontrada.</p>';
        return;
    }
    
    sorted.forEach(cifra => {
        const item = document.createElement('div');
        item.className = 'cifra-item';
        item.onclick = () => openViewer(cifra.id);
        
        item.innerHTML = `
            <div class="cifra-info">
                <span class="cifra-title">${cifra.title || 'Sem Título'}</span>
                <span class="cifra-meta">${cifra.artist || 'Desconhecido'} • Tom: ${cifra.key || '?'}</span>
            </div>
            <i class="fa-solid fa-chevron-right" style="color: var(--color-text-light);"></i>
        `;
        list.appendChild(item);
    });
}

// --- EDITOR ---
function openEditor(id) {
    navigate('editor');
    const titleInput = document.getElementById('editor-title');
    const artistInput = document.getElementById('editor-artist');
    const keyInput = document.getElementById('editor-key');
    const contentInput = document.getElementById('editor-content');
    
    if (id) {
        const cifra = appData.cifras.find(c => c.id === id);
        if (cifra) {
            currentCifraId = id;
            titleInput.value = cifra.title || '';
            artistInput.value = cifra.artist || '';
            keyInput.value = cifra.key || '';
            contentInput.value = cifra.content || '';
            cifra.lastAccessed = Date.now();
            saveData();
            return;
        }
    }
    
    // New
    currentCifraId = null;
    titleInput.value = '';
    artistInput.value = '';
    keyInput.value = '';
    contentInput.value = '';
    
    // Add active state to Criar icon
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.nav-item')[1].classList.add('active');
}

function insertChordBracket() {
    const textarea = document.getElementById('editor-content');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    textarea.value = text.substring(0, start) + '[]' + text.substring(end);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + 1;
}

function saveCifra() {
    const title = document.getElementById('editor-title').value.trim();
    const artist = document.getElementById('editor-artist').value.trim();
    const key = document.getElementById('editor-key').value.trim();
    const content = document.getElementById('editor-content').value;
    
    if (!title && !content) {
        showToast('Preencha pelo menos o título ou o conteúdo.');
        return;
    }
    
    if (currentCifraId) {
        const cifra = appData.cifras.find(c => c.id === currentCifraId);
        cifra.title = title;
        cifra.artist = artist;
        cifra.key = key;
        cifra.content = content;
        cifra.lastAccessed = Date.now();
    } else {
        const newId = generateId();
        appData.cifras.push({
            id: newId,
            title,
            artist,
            key,
            content,
            lastAccessed: Date.now()
        });
        currentCifraId = newId;
    }
    
    saveData();
    showToast('Salvo automaticamente ✅');
}

function previewCifra() {
    saveCifra();
    if(currentCifraId) {
        openViewer(currentCifraId);
    }
}

// --- IMPORTADOR ---
function processImport() {
    const text = document.getElementById('import-content').value;
    if (!text) return;
    
    showToast('Organizando sua cifra... 🎸');
    
    // Simple heuristic parser
    // Detects lines with mostly chords and converts them to inline [Chord] format
    const lines = text.split('\n');
    let processed = '';
    
    const chordRegex = /\b([A-G][#b]?(?:m|maj|dim|aug|sus|add)?[0-9]?(?:\/[A-G][#b]?)?)\b/g;
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        // Check if line is a chord line (contains multiple chords, few non-chord words)
        let words = line.trim().split(/\s+/);
        let chordCount = 0;
        words.forEach(w => {
            if (w.match(/^([A-G][#b]?(?:m|maj|dim|aug|sus|add)?[0-9]?(?:\/[A-G][#b]?)?)$/)) {
                chordCount++;
            }
        });
        
        if (words.length > 0 && chordCount / words.length > 0.5) {
            // It's a chord line. We could try to merge it with the next line, but for MVP
            // we'll just format the chords in brackets on their own line.
            processed += line.replace(chordRegex, '[$1]') + '\n';
        } else {
            processed += line + '\n';
        }
    }
    
    // Send to editor
    openEditor(null);
    document.getElementById('editor-content').value = processed;
    document.getElementById('editor-title').value = "Cifra Importada";
    showToast('Cifra pronta 🙏. Ajuste se necessário.');
}

// --- BIBLIOTECA ---
function renderLibrary(query = '') {
    const list = document.getElementById('library-list');
    list.innerHTML = '';
    
    let filtered = appData.cifras;
    if (query) {
        const q = query.toLowerCase();
        filtered = filtered.filter(c => 
            (c.title && c.title.toLowerCase().includes(q)) || 
            (c.artist && c.artist.toLowerCase().includes(q))
        );
    }
    
    // Sort alphabetical
    filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    
    if (filtered.length === 0) {
        list.innerHTML = '<p style="color: var(--color-text-light); text-align: center;">Nenhuma cifra encontrada.</p>';
        return;
    }
    
    filtered.forEach(cifra => {
        const item = document.createElement('div');
        item.className = 'cifra-item';
        item.onclick = () => openViewer(cifra.id);
        
        item.innerHTML = `
            <div class="cifra-info">
                <span class="cifra-title">${cifra.title || 'Sem Título'}</span>
                <span class="cifra-meta">${cifra.artist || 'Desconhecido'} • Tom: ${cifra.key || '?'}</span>
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="btn btn-outline" style="padding: 4px 8px;" onclick="event.stopPropagation(); openEditor('${cifra.id}')"><i class="fa-solid fa-pen"></i></button>
            </div>
        `;
        list.appendChild(item);
    });
}

function filterLibrary() {
    const query = document.getElementById('search-input').value;
    renderLibrary(query);
}

// --- VIEWER / RENDERER ---
function renderContentToHTML(content) {
    if (!content) return '';
    
    // Converts inline chords [G] to styled spans
    const escaped = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // First, let's parse lines
    const lines = escaped.split('\n');
    let html = '';
    
    lines.forEach(line => {
        if (line.trim() === '') {
            html += '<br>';
            return;
        }
        
        // If line contains bracket chords, it's a lyric line with chords
        if (line.includes('[')) {
            const parsedLine = line.replace(/\[(.*?)\]/g, '<span class="chord-anchor"><span class="chord">$1</span></span>');
            html += `<div class="lyric-line has-chords">${parsedLine}</div>`;
        } else {
            // Plain text line
            html += `<div class="lyric-line">${line}</div>`;
        }
    });
    
    return html;
}

let viewData = { content: '', key: '' };

function openViewer(id) {
    const cifra = appData.cifras.find(c => c.id === id);
    if (!cifra) return;
    
    currentCifraId = id;
    cifra.lastAccessed = Date.now();
    saveData();
    
    viewData = { content: cifra.content || '', key: cifra.key || '' };
    
    document.getElementById('view-title').textContent = cifra.title || 'Sem Título';
    document.getElementById('view-artist').textContent = cifra.artist || 'Desconhecido';
    document.getElementById('view-key').textContent = viewData.key;
    
    document.getElementById('view-content').innerHTML = renderContentToHTML(viewData.content);
    navigate('viewer');
}

function transposeView(steps) {
    // Process content
    const regex = /\[([^\]]+)\]/g;
    viewData.content = viewData.content.replace(regex, (match, chord) => {
        if (chord.includes('/')) {
            const parts = chord.split('/');
            const transposedParts = parts.map(p => transposeChord(p, steps));
            return `[${transposedParts.join('/')}]`;
        }
        return `[${transposeChord(chord, steps)}]`;
    });
    
    // Process key
    if (viewData.key) {
        if(viewData.key.includes('/')) {
            const parts = viewData.key.split('/');
            viewData.key = parts.map(p => transposeChord(p, steps)).join('/');
        } else {
            viewData.key = transposeChord(viewData.key, steps);
        }
    }
    
    document.getElementById('view-key').textContent = viewData.key;
    document.getElementById('view-content').innerHTML = renderContentToHTML(viewData.content);
}

// --- PERFORMANCE MODE ---
function startPerformance() {
    document.getElementById('perf-title').textContent = document.getElementById('view-title').textContent;
    document.getElementById('perf-key').textContent = document.getElementById('view-key').textContent;
    document.getElementById('perf-content').innerHTML = document.getElementById('view-content').innerHTML;
    
    document.body.classList.add('performance-mode');
    document.getElementById('page-performance').style.display = 'block';
}

function stopPerformance() {
    document.body.classList.remove('performance-mode');
    document.getElementById('page-performance').style.display = 'none';
    if(autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
    }
}

function toggleAutoScroll() {
    if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
        showToast('Scroll automático parado');
    } else {
        autoScrollInterval = setInterval(() => {
            window.scrollBy(0, 1);
        }, 50); // Speed adjustable
        showToast('Scroll automático ativado');
    }
}

// --- PERFIL ---
function clearData() {
    if(confirm('Tem certeza que deseja apagar todos os dados locais?')) {
        localStorage.removeItem(STORAGE_KEY);
        appData = { cifras: [], settings: {} };
        navigate('dashboard');
        showToast('Dados limpos.');
    }
}
