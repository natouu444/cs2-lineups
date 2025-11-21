let allData = {};
let currentMap = "";
let currentSide = "T";
let activeZone = null;

// Variables pour le Zoom/Pan
let scale = 1;
let panning = false;
let pointX = 0, pointY = 0, startX = 0, startY = 0;

fetch('data.json')
    .then(r => r.json())
    .then(d => { allData = d; initMenu(); })
    .catch(e => console.error("Erreur JSON:", e));

function initMenu() {
    const c = document.getElementById('maps-container');
    const maps = ["Mirage", "Nuke", "Inferno", "Dust II", "Ancient", "Train", "Overpass"];
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

function openMap(name) {
    currentMap = name;
    activeZone = null;
    document.getElementById('menu-view').classList.add('hidden');
    document.getElementById('map-view').classList.remove('hidden');
    document.getElementById('current-map-title').innerText = name.toUpperCase();
    
    let clean = name.toLowerCase().replace(" ", "");
    if(clean.includes("dust")) clean = "dust2";
    document.getElementById('radar-img').src = `assets/${clean}_map.png`;
    
    resetZoom();
    updateUI();
    renderPoints();
}

function goHome() {
    document.getElementById('map-view').classList.add('hidden');
    document.getElementById('menu-view').classList.remove('hidden');
}

function setSide(s) {
    currentSide = s;
    activeZone = null;
    updateUI();
    renderPoints();
}

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

function renderPoints() {
    const pLayer = document.getElementById('points-layer');
    const sLayer = document.getElementById('lines-layer');
    pLayer.innerHTML = ""; sLayer.innerHTML = "";

    if(!allData[currentMap]) return;

    if(!activeZone) {
        allData[currentMap].forEach(z => {
            let side = z.side || "T";
            if(side === currentSide) {
                let col = getColor(z.type);
                createBtn(z.x, z.y, 30, col, z.lineups.length, () => enterZone(z), pLayer);
            }
        });
    } else {
        // Point Fantôme (Zone)
        createBtn(activeZone.x, activeZone.y, 32, null, "X", null, pLayer, "phantom");
        
        activeZone.lineups.forEach(l => {
            // Point Lancer
            createBtn(l.x, l.y, 20, "white", "", () => openPopup(activeZone, l), pLayer, "launcher");
            // Trait
            drawLine(l.x, l.y, activeZone.x, activeZone.y, sLayer);
        });
    }
}

function createBtn(x, y, size, bg, txt, onClick, container, specialClass="") {
    let b = document.createElement('div');
    b.className = 'point';
    if(specialClass) b.classList.add(specialClass);
    
    b.style.left = x + 'px'; b.style.top = y + 'px';
    
    if(!specialClass) {
        b.style.width = size + 'px'; b.style.height = size + 'px';
        b.style.backgroundColor = bg;
        b.style.borderColor = bg; // Pour le pulse
    }
    
    b.innerText = txt;
    if(onClick) b.onclick = (e) => { e.stopPropagation(); onClick(); };
    container.appendChild(b);
}

function drawLine(x1, y1, x2, y2, container) {
    let line = document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1',x1); line.setAttribute('y1',y1);
    line.setAttribute('x2',x2); line.setAttribute('y2',y2);
    container.appendChild(line);
}

function getColor(t) {
    if(t==="molotov") return "#d32f2f"; // Rouge foncé
    if(t==="flash") return "#3b97d3";   // Bleu CS2
    if(t==="grenade") return "#4CAF50";
    return "#de9b35"; // Or CS2
}

function enterZone(z) { activeZone = z; updateUI(); renderPoints(); }
function exitZone() { activeZone = null; updateUI(); renderPoints(); }

function openPopup(z, l) {
    document.getElementById('modal-title').innerText = z.name.toUpperCase();
    document.getElementById('modal-type').innerText = l.throw_type;
    document.getElementById('img-pos').src = l.img_pos || "";
    document.getElementById('img-aim').src = l.img_aim || "";
    
    // Animation d'ouverture (Fade In)
    const m = document.getElementById('modal');
    m.classList.remove('hidden');
    // Petit délai pour que la transition CSS marche
    setTimeout(() => m.classList.add('visible'), 10);
}

function closeModal() { 
    const m = document.getElementById('modal');
    m.classList.remove('visible');
    setTimeout(() => m.classList.add('hidden'), 300); // Attendre la fin de l'anim
}

window.onclick = (e) => { if(e.target == document.querySelector('.modal-backdrop')) closeModal(); }

// ZOOM & DRAG
const zoomCont = document.getElementById('zoom-container');
const viewport = document.querySelector('.map-viewport');

function setTransform() {
    zoomCont.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
}
function resetZoom() { scale = 1; pointX = 0; pointY = 0; setTransform(); }

viewport.onwheel = function (e) {
    e.preventDefault();
    let xs = (e.clientX - pointX) / scale, ys = (e.clientY - pointY) / scale;
    let delta = (e.wheelDelta ? e.wheelDelta : -e.deltaY);
    (delta > 0) ? (scale *= 1.1) : (scale /= 1.1);
    pointX = e.clientX - xs * scale; pointY = e.clientY - ys * scale;
    setTransform();
}
zoomCont.onmousedown = function (e) {
    e.preventDefault(); startX = e.clientX - pointX; startY = e.clientY - pointY; panning = true;
}
window.onmouseup = function (e) { panning = false; }
window.onmousemove = function (e) {
    if (!panning) return;
    e.preventDefault(); pointX = e.clientX - startX; pointY = e.clientY - startY; setTransform();
}