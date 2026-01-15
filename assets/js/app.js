// --- Configuration & Data ---
const defaultCoefs = {
    "Mathématiques": 3, "Français": 3, "Anglais": 3,
    "Espagnol": 2, "Allemand": 2,
    "Physique-Chimie": 1, "SVT": 1, "EPS": 1, "Technologie": 1,
    "Arts Plastiques": 1, "Musique": 1, "Latin": 1
};

// On charge les notes sauvegardées ou un tableau vide
let grades = JSON.parse(localStorage.getItem('evoGrades')) || [];
let chartInstance = null;
let showAllHistory = false;

// --- DOM Elements ---
const noteInput = document.getElementById('noteInput');
const matiereSelect = document.getElementById('matiereSelect');
const typeSelect = document.getElementById('typeSelect');
const addBtn = document.getElementById('addGradeBtn');
const gradesList = document.getElementById('gradesList');
const globalAvgDisplay = document.getElementById('globalAverage');
const clearAllBtn = document.getElementById('clearAllBtn');
const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');

// --- Initialization ---
function init() {
    populateMatieres();
    updateUI();
    initChart();
    
    // Events
    addBtn.addEventListener('click', addGrade);
    clearAllBtn.addEventListener('click', clearAll);
    toggleHistoryBtn.addEventListener('click', () => {
        showAllHistory = !showAllHistory;
        toggleHistoryBtn.textContent = showAllHistory ? "Réduire" : "Tout voir";
        renderHistory();
    });

    // Workflow Rapide: Touche Entrée
    noteInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') addGrade();
    });
}

function populateMatieres() {
    // Si on a déjà des matières custom, on pourrait les merger ici, 
    // pour l'instant on utilise la liste par défaut + celles présentes dans l'historique
    const subjects = new Set(Object.keys(defaultCoefs));
    grades.forEach(g => subjects.add(g.subject));
    
    matiereSelect.innerHTML = '';
    subjects.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub;
        opt.textContent = sub;
        matiereSelect.appendChild(opt);
    });
}

// --- Core Logic ---

function addGrade() {
    const val = parseFloat(noteInput.value);
    const subject = matiereSelect.value;
    const type = typeSelect.value; // 'real' ou 'sim'

    if (isNaN(val) || val < 0 || val > 20) {
        alert("Met une note valide entre 0 et 20, bg.");
        return;
    }

    const newGrade = {
        id: Date.now(),
        value: val,
        subject: subject,
        coef: defaultCoefs[subject] || 1, // Fallback coef 1
        type: type,
        date: new Date().toISOString()
    };

    grades.unshift(newGrade); // Ajout au début (plus récent)
    saveData();
    updateUI();

    // Optimisation Flux de Saisie
    noteInput.value = ''; 
    noteInput.focus(); 
    // On ne reset PAS le matiereSelect (Persistance demandée)
}

function updateUI() {
    renderHistory();
    calculateAverage();
}

function renderHistory() {
    gradesList.innerHTML = '';
    
    // Tri par date décroissante (le plus récent en haut)
    // Note: grades est déjà rempli avec unshift, mais on s'assure du tri au cas où
    const sortedGrades = [...grades].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Slice pour l'affichage (5 ou tout)
    const displayGrades = showAllHistory ? sortedGrades : sortedGrades.slice(0, 5);

    displayGrades.forEach(g => {
        const li = document.createElement('li');
        // Ajout classe 'sim' si simulation pour style (italique/opacité)
        li.className = `grade-item ${g.type === 'sim' ? 'sim' : ''}`;
        
        li.innerHTML = `
            <div class="grade-info">
                <strong>${g.subject} : ${g.value}/20</strong>
                <small>Coef ${g.coef} • ${g.type === 'sim' ? 'Simulation' : 'Réel'}</small>
            </div>
            <div class="actions">
                <button class="btn-edit" onclick="editGrade(${g.id})"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-del" onclick="deleteGrade(${g.id})"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        gradesList.appendChild(li);
    });

    // Gestion visibilité bouton "Tout voir"
    toggleHistoryBtn.style.display = grades.length > 5 ? 'block' : 'none';
}

function calculateAverage() {
    let totalPoints = 0;
    let totalCoefs = 0;

    grades.forEach(g => {
        totalPoints += g.value * g.coef;
        totalCoefs += g.coef;
    });

    const avg = totalCoefs > 0 ? (totalPoints / totalCoefs).toFixed(2) : "--";
    globalAvgDisplay.textContent = avg + "/20";
    
    updateChart(avg);
}

// --- Actions (Edit / Delete) ---

// Attach functions to window so onclick in HTML works
window.deleteGrade = function(id) {
    const grade = grades.find(g => g.id === id);
    if (!grade) return;

    // Logique demandée: Confirmation avec mention du mode
    const msg = `Tu veux vraiment supprimer cette note (${grade.value}) en mode ${grade.type === 'sim' ? 'SIMULATION' : 'RÉEL'} ?`;
    
    if (confirm(msg)) {
        grades = grades.filter(g => g.id !== id);
        saveData();
        updateUI();
    }
};

window.editGrade = function(id) {
    const grade = grades.find(g => g.id === id);
    if (!grade) return;

    // On pré-remplit les champs pour modif
    noteInput.value = grade.value;
    matiereSelect.value = grade.subject;
    typeSelect.value = grade.type;

    // Petit trick UX: On supprime l'ancienne pour "laisser place" à la nouvelle version
    // avec un confirm spécifique comme demandé.
    const msg = `Modification de note en cours (Mode : ${grade.type === 'sim' ? 'SIMULATION' : 'RÉEL'}). Continuer ?`;
    if(confirm(msg)) {
        grades = grades.filter(g => g.id !== id);
        saveData();
        updateUI();
        noteInput.focus();
    } else {
        // Reset inputs si annulé
        noteInput.value = '';
    }
};

function clearAll() {
    if (confirm("Wsh t'es sûr de vouloir tout effacer ? C'est irréversible.")) {
        grades = [];
        saveData();
        updateUI();
    }
}

// --- Utils ---
function saveData() {
    localStorage.setItem('evoGrades', JSON.stringify(grades));
}

// --- Chart.js ---
function initChart() {
    const ctx = document.getElementById('moyenneChart').getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [], // Dates ou Index
            datasets: [{
                label: 'Évolution',
                data: [],
                borderColor: '#4f46e5',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(79, 70, 229, 0.1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { min: 0, max: 20 }
            }
        }
    });
}

function updateChart(currentAvg) {
    if (!chartInstance || currentAvg === "--") return;

    // Simple visualisation : on montre l'évolution de la moyenne cumulée
    // On recalcule la moyenne historique étape par étape
    let tempPoints = 0;
    let tempCoefs = 0;
    const historyData = [];
    const labels = [];

    // On trie par date croissante pour le graphe
    const chronologicalGrades = [...grades].sort((a, b) => new Date(a.date) - new Date(b.date));

    chronologicalGrades.forEach((g, index) => {
        tempPoints += g.value * g.coef;
        tempCoefs += g.coef;
        historyData.push((tempPoints / tempCoefs).toFixed(2));
        labels.push(index + 1);
    });

    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = historyData;
    chartInstance.update();
}

// --- Modale Info Logic ---
const modal = document.getElementById("infoModal");
const btn = document.getElementById("infoBtn");
const span = document.getElementsByClassName("close")[0];

btn.onclick = () => modal.style.display = "block";
span.onclick = () => modal.style.display = "none";
window.onclick = (event) => { if (event.target == modal) modal.style.display = "none"; };

// --- Tab Logic ---
document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        button.classList.add('active');
        document.getElementById(button.dataset.tab).classList.add('active');
    });
});

// Start
init();
