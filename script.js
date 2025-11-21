let allData = {};
let currentMap = "";
let currentSide = "T";
let activeZone = null;

// Variables pour le Zoom/Pan
let scale = 1;
let panning = false;
let pointX = 0, pointY = 0, startX = 0, startY = 0;

// 1. CHARGEMENT DES DONNÉES
fetch('data.json')
    .then(r => r.json())
    .then(d => { allData = d; initMenu(); })
    .catch(e => console.error("Erreur JSON (Lance python -m http.server !):", e));

// 2. CRÉATION DU MENU
function initMenu() {
    const c = document.getElementById('maps-container');
    const maps = ["Mirage", "Nuke", "Inferno", "Dust II", "Ancient", "Train", "Overpass"];
    
    c.innerHTML = ""; // Nettoyage au cas où

    maps.forEach(m => {
        let clean = m.toLowerCase().replace(" ", "");
        if(clean.includes("dust")) clean = "dust2";
        
        let div = document.createElement('div');
        div.className = 'map-card';
        div.onclick = () => openMap(m);
        div.innerHTML = `
            <div class="card-img" style="background-image: url('assets/menu_${clean}.jpg')"></div>
            <div class="card-info"><div class="map-name">${m.toUpperCase()}</div></div>
        `;
        c.appendChild(div);
    });
}

// 3. OUVERTURE D'UNE CARTE
function openMap(name) {
    currentMap = name;
    activeZone = null;
    
    document.getElementById('menu-view').classList.add('hidden');
    document.getElementById('map-view').classList.remove('hidden');
    document.getElementById('current-map-title').innerText = name.toUpperCase();
    
    let clean = name.toLowerCase().replace(" ", "");
    if(clean.includes("dust")) clean = "dust2";
    document.getElementById('radar-img').src = `assets/${clean}_map.png`;
    
    resetZoom(); // Remet le zoom à 1
    updateUI();
    renderPoints();
}

// Retour au menu principal
function goHome() {
    document.getElementById('map-view').classList.add('hidden');
    document.getElementById('menu-view').classList.remove('hidden');
}

// Changement de coté (T / CT)
function setSide(s) {
    currentSide = s;
    activeZone = null; // Reset zone si on change de side
    updateUI();
    renderPoints();
}

// Mise à jour de l'interface (Boutons actifs, visibilité retour)
function updateUI() {
    document.getElementById('btn-t').classList.toggle('active', currentSide === 'T');
    document.getElementById('btn-ct').classList.toggle('active', currentSide === 'CT');
    
    const backZoneBtn = document.getElementById('btn-back-zone');
    const switchCont = document.getElementById('switch-cont');
    
    if(activeZone) {
        backZoneBtn.classList.remove('hidden');
        switchCont.classList.add('hidden');
    } else {
        backZoneBtn.classList.add('hidden');
        switchCont.classList.remove('hidden');
    }
}

// 4. RENDU DES POINTS ET TRAITS
function renderPoints() {
    const pLayer = document.getElementById('points-layer');
    const sLayer = document.getElementById('lines-layer');
    
    // Nettoyage
    pLayer.innerHTML = ""; 
    sLayer.innerHTML = "";

    if(!allData[currentMap]) return;

    // SCÉNARIO A : VUE GLOBALE (Zones d'impact)
    if(!activeZone) {
        allData[currentMap].forEach(z => {
            // Check Side (si dispo dans le JSON, sinon par defaut T)
            let side = z.side || "T";
            
            if(side === currentSide) {
                let col = getColor(z.type);
                // On affiche le nombre de lancers dispos dans le point
                let count = z.lineups ? z.lineups.length : 0;
                createBtn(z.x, z.y, 30, col, count, () => enterZone(z), pLayer);
            }
        });
    } 
    // SCÉNARIO B : VUE DÉTAILLÉE (Intérieur d'une zone)
    else {
        // 1. Point Fantôme (Zone d'impact)
        createBtn(activeZone.x, activeZone.y, 32, null, "X", null, pLayer, "phantom");
        
        if(activeZone.lineups) {
            activeZone.lineups.forEach(l => {
                // 2. Point Lancer
                createBtn(l.x, l.y, 20, "white", "", () => openPopup(activeZone, l), pLayer, "launcher");
                // 3. Trait en pointillés
                drawLine(l.x, l.y, activeZone.x, activeZone.y, sLayer);
            });
        }
    }
}

// Fonction utilitaire pour créer un bouton rond
function createBtn(x, y, size, bg, txt, onClick, container, specialClass="") {
    let b = document.createElement('div');
    b.className = 'point';
    
    // Ajout classe spéciale (phantom, launcher)
    if(specialClass) b.classList.add(specialClass);
    
    b.style.left = x + 'px'; 
    b.style.top = y + 'px';
    
    // Style inline pour les couleurs dynamiques
    if(!specialClass) {
        b.style.width = size + 'px'; 
        b.style.height = size + 'px';
        b.style.backgroundColor = bg;
        b.style.borderColor = bg;
    }
    
    b.innerText = txt;
    
    // Gestion du clic
    if(onClick) {
        b.onclick = (e) => { 
            e.stopPropagation(); // Empêche le drag de la carte
            onClick(); 
        }; 
    }
    container.appendChild(b);
}

// Dessiner un trait SVG
function drawLine(x1, y1, x2, y2, container) {
    let line = document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1',x1); 
    line.setAttribute('y1',y1);
    line.setAttribute('x2',x2); 
    line.setAttribute('y2',y2);
    container.appendChild(line);
}

// Couleurs selon le type de grenade
function getColor(t) {
    if(t==="molotov") return "#d32f2f"; // Rouge
    if(t==="flash") return "#00BFFF";   // Bleu
    if(t==="grenade") return "#4CAF50"; // Vert
    return "#FFB800"; // Or (Smoke)
}

// 5. NAVIGATION INTERNE
function enterZone(z) { activeZone = z; updateUI(); renderPoints(); }
function exitZone() { activeZone = null; updateUI(); renderPoints(); }

// 6. POPUP DETAILS
function openPopup(z, l) {
    document.getElementById('modal-title').innerText = z.name.toUpperCase();
    document.getElementById('modal-type').innerText = l.throw_type;
    
    // Gestion des images
    const imgPos = document.getElementById('img-pos');
    const imgAim = document.getElementById('img-aim');
    
    // On met l'image ou un placeholder si vide
    imgPos.src = l.img_pos ? l.img_pos : "";
    imgAim.src = l.img_aim ? l.img_aim : "";
    
    // Affichage progressif
    const m = document.getElementById('modal');
    m.classList.remove('hidden');
    setTimeout(() => m.classList.add('visible'), 10);
}

function closeModal() { 
    const m = document.getElementById('modal');
    m.classList.remove('visible');
    // Attendre la fin de l'animation CSS avant de cacher
    setTimeout(() => m.classList.add('hidden'), 300); 
}

// Fermer en cliquant à l'extérieur
window.onclick = (e) => { 
    if(e.target == document.querySelector('.modal-backdrop')) closeModal(); 
}

// 7. SYSTÈME DE ZOOM & DRAG (CARTE)
const zoomCont = document.getElementById('zoom-container');
const viewport = document.querySelector('.map-viewport');

function setTransform() {
    zoomCont.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
}

function resetZoom() { 
    scale = 1; pointX = 0; pointY = 0; 
    setTransform(); 
}

// Zoom molette
viewport.onwheel = function (e) {
    e.preventDefault();
    let xs = (e.clientX - pointX) / scale;
    let ys = (e.clientY - pointY) / scale;
    let delta = (e.wheelDelta ? e.wheelDelta : -e.deltaY);
    
    (delta > 0) ? (scale *= 1.1) : (scale /= 1.1);
    
    // Limites de zoom
    if(scale < 1) scale = 1;
    if(scale > 4) scale = 4;

    pointX = e.clientX - xs * scale;
    pointY = e.clientY - ys * scale;
    setTransform();
}

// Drag souris (Déplacement)
zoomCont.onmousedown = function (e) {
    e.preventDefault(); 
    startX = e.clientX - pointX; 
    startY = e.clientY - pointY; 
    panning = true;
    zoomCont.style.cursor = "grabbing";
}

window.onmouseup = function (e) { 
    panning = false; 
    zoomCont.style.cursor = "grab";
}

window.onmousemove = function (e) {
    if (!panning) return;
    e.preventDefault(); 
    pointX = e.clientX - startX; 
    pointY = e.clientY - startY; 
    setTransform();
}