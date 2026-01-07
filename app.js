// State Management
let tasks = JSON.parse(localStorage.getItem('cp_tasks')) || [];
let journals = JSON.parse(localStorage.getItem('cp_journals')) || {};
let currentView = 'today';

// --- THE SMART PARSER ---
function smartParse(str) {
    let text = str;
    let targetDate = new Date();
    targetDate.setHours(0,0,0,0);
    let reminderTime = null;

    // 1. Detect "After X Minutes/Hours" (Relative)
    const relMatch = text.match(/after (\d+) (minute|min|hour|hr)s?/i);
    if (relMatch) {
        const val = parseInt(relMatch[1]);
        const unit = relMatch[2].toLowerCase();
        const ms = (unit.startsWith('m')) ? val * 60000 : val * 3600000;
        reminderTime = Date.now() + ms;
        text = text.replace(relMatch[0], '');
    }

    // 2. Detect "Tomorrow"
    if (text.toLowerCase().includes('tomorrow')) {
        targetDate.setDate(targetDate.getDate() + 1);
        text = text.replace(/tomorrow/i, '');
    }

    // 3. Clean up leading/trailing "remind me to" / "to"
    text = text.replace(/remind me to/i, '').replace(/^to /i, '').trim();

    // 4. Auto Tags
    let tag = null;
    if (/(buy|shop|grocery)/i.test(text)) tag = 'SHOPPING';
    if (/(pay|bill|finance)/i.test(text)) tag = 'FINANCE';
    if (/(meet|call|personal)/i.test(text)) tag = 'PERSONAL';

    return {
        id: Date.now(),
        title: text.charAt(0).toUpperCase() + text.slice(1),
        date: targetDate.toDateString(),
        remindAt: reminderTime,
        tag: tag,
        completed: false
    };
}

// --- RENDERING ENGINE ---
function render() {
    const container = document.getElementById('content');
    const title = document.getElementById('viewTitle');
    const todayStr = new Date().toDateString();
    container.innerHTML = '';
    
    // Update Nav UI
    document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.remove('active'));
    document.getElementById(`nav-${currentView}`).classList.add('active');

    if (currentView === 'today') {
        title.innerText = "Today";
        renderList(tasks.filter(t => t.date === todayStr && !t.completed), container);
    } 
    else if (currentView === 'upcoming') {
        title.innerText = "Upcoming";
        const upcoming = tasks.filter(t => new Date(t.date) > new Date(todayStr) && !t.completed);
        renderList(upcoming.sort((a,b) => new Date(a.date) - new Date(b.date)), container);
    } 
    else if (currentView === 'done') {
        title.innerText = "Completed";
        renderList(tasks.filter(t => t.completed), container);
    }
    else if (currentView === 'journal') {
        title.innerText = "Journal";
        const dateKey = new Date().toDateString();
        container.innerHTML = `<textarea id="journalArea" placeholder="Write about today...">${journals[dateKey] || ''}</textarea>`;
        document.getElementById('journalArea').oninput = (e) => {
            journals[dateKey] = e.target.value;
            localStorage.setItem('cp_journals', JSON.stringify(journals));
        };
    }
    else if (currentView === 'calendar') {
        title.innerText = "Calendar";
        renderCalendar(container);
    }
}

function renderList(list, container) {
    if (list.length === 0) {
        container.innerHTML = `<div style="color:var(--dim); text-align:center; margin-top:40px;">No tasks here.</div>`;
        return;
    }
    list.forEach(t => {
        const card = document.createElement('div');
        card.className = `task-card ${t.completed ? 'completed' : ''}`;
        card.innerHTML = `
            <div class="check-btn" onclick="toggleTask(${t.id})"></div>
            <div class="task-info">
                <span class="task-text">${t.title}</span>
                <div class="task-meta">
                    ${t.tag ? `<span class="tag-badge">${t.tag}</span>` : ''}
                    <span>${t.date === new Date().toDateString() ? 'Today' : t.date}</span>
                    ${t.remindAt ? `<span>⏰ ${new Date(t.remindAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>` : ''}
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderCalendar(container) {
    const grid = document.createElement('div');
    grid.className = 'cal-grid';
    const d = new Date();
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    
    for(let i=1; i<=daysInMonth; i++) {
        const dateStr = new Date(d.getFullYear(), d.getMonth(), i).toDateString();
        const hasTasks = tasks.some(t => t.date === dateStr);
        grid.innerHTML += `<div class="cal-day ${hasTasks ? 'has-t' : ''}">${i}</div>`;
    }
    container.appendChild(grid);
}

// --- ACTIONS ---
function setView(v) { currentView = v; render(); }

function toggleTask(id) {
    const t = tasks.find(t => t.id === id);
    if (t) t.completed = !t.completed;
    save();
}

function save() {
    localStorage.setItem('cp_tasks', JSON.stringify(tasks));
    render();
}

document.getElementById('addBtn').onclick = () => {
    const el = document.getElementById('taskInput');
    if (!el.value) return;
    tasks.push(smartParse(el.value));
    el.value = '';
    save();
};

// Handle Notifications
setInterval(() => {
    const now = Date.now();
    tasks.forEach(t => {
        if (t.remindAt && !t.reminded && now >= t.remindAt) {
            new Notification("CalmPlan", { body: t.title });
            t.reminded = true;
            save();
        }
    });
}, 10000);

if (Notification.permission === 'default') Notification.requestPermission();
render();