let tasks = JSON.parse(localStorage.getItem('calm_tasks')) || [];
let viewingDate = new Date();
let selectedDate = new Date().toDateString();

// --- Logic: NLP & Task Creation ---
function parseInput(str) {
    const input = str.toLowerCase();
    let date = new Date(selectedDate);
    let reminderMs = null;
    let cleanText = str;

    if (input.includes('tomorrow')) {
        date = new Date();
        date.setDate(date.getDate() + 1);
        cleanText = cleanText.replace(/tomorrow/i, '');
    }

    const minMatch = input.match(/after (\d+) min/);
    if (minMatch) {
        reminderMs = parseInt(minMatch[1]) * 60000;
        cleanText = cleanText.replace(minMatch[0], '');
    }

    const hrMatch = input.match(/after (\d+) hour/);
    if (hrMatch) {
        reminderMs = parseInt(hrMatch[1]) * 3600000;
        cleanText = cleanText.replace(hrMatch[0], '');
    }

    let tag = null;
    if (/(buy|shop|grocery)/.test(input)) tag = 'shopping';
    else if (/(pay|bill|finance)/.test(input)) tag = 'finance';
    else if (/(meet|call|personal)/.test(input)) tag = 'personal';

    return {
        id: Date.now(),
        text: cleanText.trim(),
        date: date.toDateString(),
        completed: false,
        tag: tag,
        remindAt: reminderMs ? Date.now() + reminderMs : null,
        reminded: false
    };
}

// --- UI Rendering ---
function render() {
    // Calendar Logic
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';
    const month = viewingDate.getMonth();
    const year = viewingDate.getFullYear();
    document.getElementById('monthDisplay').innerText = viewingDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) grid.innerHTML += `<div></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
        const dObj = new Date(year, month, d);
        const dStr = dObj.toDateString();
        const hasTasks = tasks.some(t => t.date === dStr);
        const isActive = dStr === selectedDate;
        grid.innerHTML += `<div class="day ${isActive ? 'active' : ''} ${hasTasks ? 'has-tasks' : ''}" onclick="selectDate('${dStr}')">${d}</div>`;
    }

    // Task List Logic
    const list = document.getElementById('tasks');
    list.innerHTML = '';
    const dayTasks = tasks.filter(t => t.date === selectedDate);
    document.getElementById('selectedDateTitle').innerText = (selectedDate === new Date().toDateString()) ? "Today" : selectedDate;

    dayTasks.forEach(t => {
        const item = document.createElement('div');
        item.className = `task-item ${t.completed ? 'done' : ''}`;
        item.onclick = () => { t.completed = !t.completed; save(); };
        item.innerHTML = `
            <div class="tag" style="background: var(--tag-${t.tag || 'none'})"></div>
            <span>${t.text}</span>
        `;
        list.appendChild(item);
    });
}

function selectDate(d) { selectedDate = d; render(); }
function changeMonth(step) { viewingDate.setMonth(viewingDate.getMonth() + step); render(); }
function goToday() { viewingDate = new Date(); selectedDate = new Date().toDateString(); render(); }

function save() {
    localStorage.setItem('calm_tasks', JSON.stringify(tasks));
    render();
}

document.getElementById('addBtn').onclick = () => {
    const input = document.getElementById('taskInput');
    if (!input.value) return;
    tasks.push(parseInput(input.value));
    input.value = '';
    save();
};

// Reminder Checker
setInterval(() => {
    const now = Date.now();
    tasks.forEach(t => {
        if (t.remindAt && !t.reminded && now >= t.remindAt) {
            if (Notification.permission === "granted") {
                new Notification("Planner", { body: t.text });
            } else {
                alert("Reminder: " + t.text);
            }
            t.reminded = true;
            save();
        }
    });
}, 10000);

if (Notification.permission === "default") Notification.requestPermission();
render();