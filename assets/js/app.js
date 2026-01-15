const SUBJECTS = {
    "Mathématiques": 3, "Français": 3, "Anglais": 3, "LV2": 2,
    "Physique-Chimie": 1, "SVT": 1, "EPS": 1, "Technologie": 1,
    "Arts Plastiques": 1, "Musique": 1, "Latin": 1
};

let grades = JSON.parse(localStorage.getItem('ev_grades')) || [];
let history = JSON.parse(localStorage.getItem('ev_history')) || {};
let chart = null;

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    update();
});

function initUI() {
    const sel = document.getElementById('subject-select');
    Object.keys(SUBJECTS).forEach(s => sel.innerHTML += `<option value="${s}">${s} (x${SUBJECTS[s]})</option>`);

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.nav-item, .page').forEach(el => el.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
        };
    });

    document.getElementById('add-btn').onclick = submit;
    document.getElementById('grade-input').onkeyup = (e) => e.key === 'Enter' && submit();
    document.getElementById('clear-all-btn').onclick = () => {
        if(confirm("Effacer tout ?")) { grades = []; history = {}; save(); location.reload(); }
    };
    
    document.querySelectorAll('.emoji-opt').forEach(e => {
        e.onclick = () => {
            document.querySelectorAll('.emoji-opt').forEach(x => x.classList.remove('selected'));
            e.classList.add('selected');
        };
    });
}

function submit() {
    const val = document.getElementById('grade-input').value;
    const sub = document.getElementById('subject-select').value;
    const type = document.querySelector('input[name="grade-type"]:checked').value;
    
    if(!val || val < 0 || val > 20) return;
    
    grades.push({ id: Date.now(), val: parseFloat(val), sub, type, coef: SUBJECTS[sub] });
    save();
    update();
    document.getElementById('grade-input').value = '';
    document.getElementById('grade-input').focus();
}

function update() {
    const isStd = document.getElementById('calc-mode-toggle').checked;
    let sum = 0, div = 0;
    
    grades.forEach(g => {
        let w = isStd ? g.coef : 1;
        sum += g.val * w; div += w;
    });

    const avg = div ? (sum / div).toFixed(2) : "--";
    document.getElementById('main-average').innerText = avg;

    const today = new Date().toISOString().split('T')[0];
    if(avg !== "--") {
        if(history[today] < avg && history[today]) confetti({colors:['#000']});
        history[today] = avg;
        save();
    }

    renderHistory();
    renderChart();
}

function renderHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = grades.slice(-5).reverse().map(g => `
        <li class="history-item ${g.type}">
            <span><strong>${g.sub}</strong>: ${g.val}/20</span>
            <button onclick="del(${g.id})" style="border:none; background:none;">❌</button>
        </li>
    `).join('');
}

window.del = (id) => {
    if(navigator.vibrate) navigator.vibrate(10);
    grades = grades.filter(g => g.id !== id);
    save(); update();
};

function renderChart() {
    const ctx = document.getElementById('evolutionChart');
    if(chart) chart.destroy();
    const labels = Object.keys(history).sort();
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.map(l => l.split('-').slice(1).join('/')),
            datasets: [{ data: labels.map(l => history[l]), borderColor: '#000', tension: 0.3, pointRadius: 0 }]
        },
        options: { plugins:{legend:{display:false}}, scales:{x:{display:false}, y:{display:false}} }
    });
}

function save() {
    localStorage.setItem('ev_grades', JSON.stringify(grades));
    localStorage.setItem('ev_history', JSON.stringify(history));
}

window.openBottomSheet = () => document.getElementById('bottom-sheet').style.display = 'flex';
window.closeBottomSheet = () => document.getElementById('bottom-sheet').style.display = 'none';
window.openExportModal = () => document.getElementById('share-overlay').style.display = 'flex';

window.generateShareImage = () => {
    const name = document.getElementById('share-name').value || "Adam";
    document.getElementById('exp-name').innerText = name;
    document.getElementById('exp-emoji').innerText = document.querySelector('.emoji-opt.selected')?.innerText || "😎";
    document.getElementById('exp-note').innerText = document.getElementById('main-average').innerText;
    
    html2canvas(document.getElementById('export-template')).then(canvas => {
        const link = document.createElement('a');
        link.download = `evoMoyenne_${name}.png`;
        link.href = canvas.toDataURL();
        link.click();
    });
};

window.exportPDF = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Bulletin evoMoyenne", 20, 20);
    grades.forEach((g, i) => doc.text(`${g.sub}: ${g.val}/20`, 20, 40 + (i*10)));
    doc.save("bulletin.pdf");
};
