// State
let state = {
    stories: [],
    team: [],
    ooo: [],
    blockedDates: [],
    archive: [],
    competitors: [],
    currentView: 'week',
    currentDate: new Date(),
    oooMonth: new Date()
};

// API Functions
async function fetchData(endpoint) {
    const response = await fetch(`/api/${endpoint}`);
    return response.json();
}

async function postData(endpoint, data) {
    const response = await fetch(`/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return response.json();
}

async function putData(endpoint, id, data) {
    const response = await fetch(`/api/${endpoint}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return response.json();
}

async function deleteData(endpoint, id) {
    const response = await fetch(`/api/${endpoint}/${id}`, {
        method: 'DELETE'
    });
    return response.json();
}

// Initialize
async function init() {
    await loadAllData();
    setupNavigation();
    setupModals();
    setupEventListeners();
    renderCalendar();
    renderOooCalendar();
    renderBlockedDates();
    renderTotals();
    renderArchive();
    renderCompetitors();
    renderTeam();
}

async function loadAllData() {
    try {
        [state.stories, state.team, state.ooo, state.blockedDates, state.archive, state.competitors] = await Promise.all([
            fetchData('stories'),
            fetchData('team'),
            fetchData('ooo'),
            fetchData('blocked-dates'),
            fetchData('archive'),
            fetchData('competitors')
        ]);
    } catch (error) {
        console.error('Failed to load data:', error);
    }
}

// Navigation
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            item.classList.add('active');
            document.getElementById(section).classList.add('active');
        });
    });
}

// Modal Management
function setupModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal);
        });
        modal.querySelector('.modal-close')?.addEventListener('click', () => closeModal(modal));
        modal.querySelector('.modal-cancel')?.addEventListener('click', () => closeModal(modal));
    });
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modal) {
    if (typeof modal === 'string') modal = document.getElementById(modal);
    modal.classList.remove('active');
    modal.querySelector('form')?.reset();
}

// Event Listeners
function setupEventListeners() {
    // Calendar view toggle
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentView = btn.dataset.view;
            renderCalendar();
        });
    });

    // Calendar navigation
    document.getElementById('prevPeriod').addEventListener('click', () => {
        navigatePeriod(-1);
    });
    document.getElementById('nextPeriod').addEventListener('click', () => {
        navigatePeriod(1);
    });
    document.getElementById('todayBtn').addEventListener('click', () => {
        state.currentDate = new Date();
        renderCalendar();
    });

    // OOO calendar navigation
    document.getElementById('prevOooMonth').addEventListener('click', () => {
        state.oooMonth.setMonth(state.oooMonth.getMonth() - 1);
        renderOooCalendar();
    });
    document.getElementById('nextOooMonth').addEventListener('click', () => {
        state.oooMonth.setMonth(state.oooMonth.getMonth() + 1);
        renderOooCalendar();
    });

    // Add buttons
    document.getElementById('addStoryBtn').addEventListener('click', () => {
        document.getElementById('storyModalTitle').textContent = 'Add New Story';
        document.getElementById('storyId').value = '';
        openModal('storyModal');
    });
    document.getElementById('addOooBtn').addEventListener('click', () => {
        openModal('oooModal');
    });
    document.getElementById('addBlockedBtn').addEventListener('click', () => openModal('blockedModal'));
    document.getElementById('addArchiveBtn').addEventListener('click', () => {
        document.getElementById('archiveModalTitle').textContent = 'Add to Archive';
        document.getElementById('archiveId').value = '';
        openModal('archiveModal');
    });
    document.getElementById('addTeamBtn').addEventListener('click', () => openModal('teamModal'));
    document.getElementById('addCompetitorBtn').addEventListener('click', addCompetitorArticle);

    // Forms
    document.getElementById('storyForm').addEventListener('submit', handleStorySubmit);
    document.getElementById('oooForm').addEventListener('submit', handleOooSubmit);
    document.getElementById('blockedForm').addEventListener('submit', handleBlockedSubmit);
    document.getElementById('archiveForm').addEventListener('submit', handleArchiveSubmit);
    document.getElementById('teamForm').addEventListener('submit', handleTeamSubmit);

    // Archive search
    document.getElementById('archiveSearch').addEventListener('input', (e) => {
        renderArchive(e.target.value);
    });

    // Competitor URL input
    document.getElementById('competitorUrl').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addCompetitorArticle();
        }
    });
}

// Calendar Functions
function navigatePeriod(direction) {
    const d = state.currentDate;
    switch (state.currentView) {
        case 'week':
            d.setDate(d.getDate() + (direction * 7));
            break;
        case 'month':
            d.setMonth(d.getMonth() + direction);
            break;
        case 'quarter':
            d.setMonth(d.getMonth() + (direction * 3));
            break;
    }
    renderCalendar();
}

function renderCalendar() {
    const container = document.getElementById('calendarContainer');
    const periodLabel = document.getElementById('currentPeriod');
    const storyListEl = document.getElementById('storyList');

    switch (state.currentView) {
        case 'week':
            renderWeekView(container, periodLabel);
            break;
        case 'month':
            renderMonthView(container, periodLabel);
            break;
        case 'quarter':
            renderQuarterView(container, periodLabel);
            break;
    }

    renderStoryList(storyListEl);
}

function renderWeekView(container, periodLabel) {
    const weekStart = getWeekStart(state.currentDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    periodLabel.textContent = `${formatDate(weekStart, 'short')} - ${formatDate(weekEnd, 'short')}`;

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let html = '<div class="calendar-header" style="grid-template-columns: repeat(7, 1fr);">';
    days.forEach(day => {
        html += `<div class="calendar-header-cell">${day}</div>`;
    });
    html += '</div><div class="calendar-grid" style="grid-template-columns: repeat(7, 1fr);">';

    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        html += renderCalendarDay(date);
    }

    html += '</div>';
    container.innerHTML = html;
}

function renderMonthView(container, periodLabel) {
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = getWeekStart(firstDay);

    periodLabel.textContent = formatDate(state.currentDate, 'monthYear');

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let html = '<div class="calendar-header" style="grid-template-columns: repeat(7, 1fr);">';
    days.forEach(day => {
        html += `<div class="calendar-header-cell">${day}</div>`;
    });
    html += '</div><div class="calendar-grid" style="grid-template-columns: repeat(7, 1fr);">';

    const currentDate = new Date(startDate);
    while (currentDate <= lastDay || currentDate.getDay() !== 0) {
        const isOtherMonth = currentDate.getMonth() !== month;
        html += renderCalendarDay(currentDate, isOtherMonth);
        currentDate.setDate(currentDate.getDate() + 1);
        if (currentDate > lastDay && currentDate.getDay() === 0) break;
    }

    html += '</div>';
    container.innerHTML = html;
}

function renderQuarterView(container, periodLabel) {
    const quarterStart = new Date(state.currentDate);
    quarterStart.setMonth(Math.floor(quarterStart.getMonth() / 3) * 3, 1);
    const quarterEnd = new Date(quarterStart);
    quarterEnd.setMonth(quarterEnd.getMonth() + 3);
    quarterEnd.setDate(0);

    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const q = Math.floor(quarterStart.getMonth() / 3);
    periodLabel.textContent = `${quarters[q]} ${quarterStart.getFullYear()}`;

    let html = '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">';

    for (let i = 0; i < 3; i++) {
        const monthDate = new Date(quarterStart);
        monthDate.setMonth(quarterStart.getMonth() + i);
        html += renderMiniMonth(monthDate);
    }

    html += '</div>';
    container.innerHTML = html;
}

function renderMiniMonth(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = getWeekStart(firstDay);

    let html = `<div class="mini-calendar">
        <div style="font-weight: 600; margin-bottom: 0.5rem;">${formatDate(date, 'monthYear')}</div>
        <div class="mini-calendar-header">`;

    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(d => {
        html += `<div>${d}</div>`;
    });

    html += '</div><div class="mini-calendar-grid">';

    const currentDate = new Date(startDate);
    while (currentDate <= lastDay || currentDate.getDay() !== 0) {
        const isOtherMonth = currentDate.getMonth() !== month;
        const dateStr = formatDateISO(currentDate);
        const isBlocked = isDateBlocked(dateStr);
        const hasStories = getStoriesForDate(dateStr).length > 0;
        const isToday = isSameDay(currentDate, new Date());

        let classes = 'mini-day';
        if (isOtherMonth) classes += ' other-month';
        if (isBlocked) classes += ' blocked';
        if (isToday) classes += ' today';

        html += `<div class="${classes}" title="${hasStories ? 'Has stories' : ''}">${currentDate.getDate()}</div>`;
        currentDate.setDate(currentDate.getDate() + 1);
        if (currentDate > lastDay && currentDate.getDay() === 0) break;
    }

    html += '</div></div>';
    return html;
}

function renderCalendarDay(date, isOtherMonth = false) {
    const dateStr = formatDateISO(date);
    const isBlocked = isDateBlocked(dateStr);
    const blockedReason = getBlockedReason(dateStr);
    const isToday = isSameDay(date, new Date());
    const oooForDay = getOooForDate(dateStr);
    const stories = getStoriesForDate(dateStr);

    let classes = 'calendar-day';
    if (isOtherMonth) classes += ' other-month';
    if (isBlocked) classes += ' blocked';
    if (isToday) classes += ' today';

    let html = `<div class="${classes}">
        <div class="day-number">${date.getDate()}</div>`;

    if (isBlocked) {
        html += `<div class="day-blocked-label">${blockedReason}</div>`;
    }

    oooForDay.forEach(ooo => {
        // Support both old (memberId) and new (name) format
        let displayName = ooo.name;
        if (!displayName && ooo.memberId) {
            const member = state.team.find(t => t.id === ooo.memberId);
            displayName = member ? member.name : null;
        }
        if (displayName) {
            html += `<div class="day-ooo">${displayName} OOO</div>`;
        }
    });

    stories.forEach(story => {
        const brandClass = getBrandClass(story.brand);
        html += `<div class="calendar-story ${brandClass}" onclick="editStory('${story.id}')" title="${story.studyName}">${story.studyName}</div>`;
    });

    html += '</div>';
    return html;
}

function renderStoryList(container) {
    if (state.stories.length === 0) {
        container.innerHTML = '<div class="empty-state">No stories yet. Add your first story!</div>';
        return;
    }

    const sortedStories = [...state.stories].sort((a, b) => {
        const dateA = a.productionDate || a.pitchDate || '';
        const dateB = b.productionDate || b.pitchDate || '';
        return dateA.localeCompare(dateB);
    });

    let html = '';
    sortedStories.forEach(story => {
        const brandClass = getBrandClass(story.brand);
        html += `
            <div class="story-item">
                <div>
                    <div class="story-title">${story.studyName}</div>
                    <div class="story-meta">
                        <span class="story-brand ${brandClass}">${story.brand || 'No Brand'}</span>
                        <span class="story-status status-${story.status || 'planning'}">${story.status || 'Planning'}</span>
                        ${story.productionDate ? `<span>Prod: ${formatDate(new Date(story.productionDate), 'short')}</span>` : ''}
                    </div>
                </div>
                <div class="story-actions">
                    <button class="btn btn-secondary btn-small" onclick="editStory('${story.id}')">Edit</button>
                    <button class="btn btn-danger btn-small" onclick="deleteStory('${story.id}')">Delete</button>
                </div>
            </div>`;
    });

    container.innerHTML = html;
}

// OOO Functions
function renderOooCalendar() {
    const year = state.oooMonth.getFullYear();
    const month = state.oooMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = getWeekStart(firstDay);

    document.getElementById('oooMonthLabel').textContent = formatDate(state.oooMonth, 'monthYear');

    let html = '<div class="mini-calendar-header">';
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(d => {
        html += `<div>${d}</div>`;
    });
    html += '</div><div class="mini-calendar-grid">';

    const currentDate = new Date(startDate);
    while (currentDate <= lastDay || currentDate.getDay() !== 0) {
        const dateStr = formatDateISO(currentDate);
        const oooForDay = getOooForDate(dateStr);
        const isToday = isSameDay(currentDate, new Date());
        const isOtherMonth = currentDate.getMonth() !== month;

        let classes = 'mini-day';
        if (isOtherMonth) classes += ' other-month';
        if (isToday) classes += ' today';
        if (oooForDay.length > 0) classes += ' has-ooo';

        html += `<div class="${classes}">${currentDate.getDate()}</div>`;
        currentDate.setDate(currentDate.getDate() + 1);
        if (currentDate > lastDay && currentDate.getDay() === 0) break;
    }

    html += '</div>';
    document.getElementById('oooCalendar').innerHTML = html;

    renderOooList();
}

function renderOooList() {
    const container = document.getElementById('oooList');

    if (state.ooo.length === 0) {
        container.innerHTML = '<div class="empty-state">No OOO entries</div>';
        return;
    }

    const sortedOoo = [...state.ooo].sort((a, b) => a.startDate.localeCompare(b.startDate));

    let html = '';
    sortedOoo.forEach(ooo => {
        // Support both old (memberId) and new (name) format
        let displayName = ooo.name;
        if (!displayName && ooo.memberId) {
            const member = state.team.find(t => t.id === ooo.memberId);
            displayName = member ? member.name : 'Unknown';
        }
        html += `
            <div class="ooo-item">
                <div class="ooo-info">
                    <div class="ooo-name">${displayName || 'Unknown'}</div>
                    <div class="ooo-dates">${formatDate(new Date(ooo.startDate), 'short')} - ${formatDate(new Date(ooo.endDate), 'short')}</div>
                </div>
                <button class="btn btn-danger btn-small" onclick="deleteOoo('${ooo.id}')">Remove</button>
            </div>`;
    });

    container.innerHTML = html;
}

// Blocked Dates Functions
function renderBlockedDates() {
    const container = document.getElementById('blockedList');

    if (state.blockedDates.length === 0) {
        container.innerHTML = '<div class="empty-state">No blocked dates</div>';
        return;
    }

    const sortedDates = [...state.blockedDates].sort((a, b) => a.date.localeCompare(b.date));

    let html = '';
    sortedDates.forEach(blocked => {
        html += `
            <div class="blocked-item">
                <div class="blocked-info">
                    <div class="blocked-reason">${blocked.reason}</div>
                    <div class="blocked-date">${formatDate(new Date(blocked.date), 'long')}${blocked.recurring ? ' (Recurring)' : ''}</div>
                </div>
                <button class="btn btn-danger btn-small" onclick="deleteBlockedDate('${blocked.id}')">Remove</button>
            </div>`;
    });

    container.innerHTML = html;
}

// Totals Functions
async function renderTotals() {
    try {
        const stats = await fetchData('stats');

        const totalsGrid = document.getElementById('totalsGrid');
        totalsGrid.innerHTML = `
            <div class="totals-card">
                <div class="totals-card-label">Total Active Stories</div>
                <div class="totals-card-value">${stats.totalStories}</div>
            </div>
            <div class="totals-card">
                <div class="totals-card-label">Archived Stories</div>
                <div class="totals-card-value">${stats.totalArchived}</div>
            </div>
            <div class="totals-card brand-lawnstarter">
                <div class="totals-card-label">LawnStarter Published</div>
                <div class="totals-card-value">${stats.publishedByBrand['LawnStarter'] || 0}</div>
            </div>
            <div class="totals-card brand-lawnlove">
                <div class="totals-card-label">Lawn Love Published</div>
                <div class="totals-card-value">${stats.publishedByBrand['Lawn Love'] || 0}</div>
            </div>
            <div class="totals-card brand-homegnome">
                <div class="totals-card-label">Home Gnome Published</div>
                <div class="totals-card-value">${stats.publishedByBrand['Home Gnome'] || 0}</div>
            </div>
        `;

        // Render chart
        const brands = ['LawnStarter', 'Lawn Love', 'Home Gnome'];
        const maxValue = Math.max(...brands.map(b => stats.publishedByBrand[b] || 0), 1);

        let chartHtml = '';
        brands.forEach(brand => {
            const value = stats.publishedByBrand[brand] || 0;
            const percentage = (value / maxValue) * 100;
            const brandClass = getBrandClass(brand);

            chartHtml += `
                <div class="chart-bar">
                    <div class="chart-label">${brand}</div>
                    <div class="chart-bar-container">
                        <div class="chart-bar-fill ${brandClass}" style="width: ${percentage}%"></div>
                    </div>
                    <div class="chart-value">${value}</div>
                </div>`;
        });

        document.getElementById('brandChart').innerHTML = chartHtml;
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

// Archive Functions
function renderArchive(searchTerm = '') {
    const container = document.getElementById('archiveList');

    let filtered = state.archive;
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = state.archive.filter(a =>
            a.title.toLowerCase().includes(term) ||
            (a.brand && a.brand.toLowerCase().includes(term))
        );
    }

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state">No archived stories</div>';
        return;
    }

    let html = '';
    filtered.forEach(item => {
        html += `
            <div class="archive-card">
                <div class="archive-card-header">
                    <div class="archive-card-title">
                        <h3>${item.title}</h3>
                        <span class="story-brand ${getBrandClass(item.brand)}">${item.brand || 'No Brand'}</span>
                    </div>
                    <div class="story-actions">
                        <button class="btn btn-secondary btn-small" onclick="editArchive('${item.id}')">Edit</button>
                        <button class="btn btn-danger btn-small" onclick="deleteArchive('${item.id}')">Delete</button>
                    </div>
                </div>
                <div class="archive-metrics-grid">
                    <div class="metric-item">
                        <span class="metric-label">Links</span>
                        <span class="metric-value">${item.linkCount || 0}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Pageviews</span>
                        <span class="metric-value">${item.pageviews ? item.pageviews.toLocaleString() : 0}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">CTR</span>
                        <span class="metric-value">${item.ctr ? item.ctr.toFixed(2) + '%' : '-'}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Domain Auth</span>
                        <span class="metric-value">${item.domainAuthority || '-'}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Impressions</span>
                        <span class="metric-value">${item.impressions ? item.impressions.toLocaleString() : '-'}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Position</span>
                        <span class="metric-value">${item.position ? item.position.toFixed(1) : '-'}</span>
                    </div>
                </div>
                <div class="archive-dates">
                    ${item.publishDate ? `<span>Published: ${formatDate(new Date(item.publishDate), 'short')}</span>` : ''}
                    ${item.refreshDate ? `<span>Refreshed: ${formatDate(new Date(item.refreshDate), 'short')}</span>` : ''}
                </div>
                ${item.url ? `<a href="${item.url}" target="_blank" class="archive-url">${item.url}</a>` : ''}
                ${item.feedback ? `<div class="archive-feedback">"${item.feedback}"</div>` : ''}
            </div>`;
    });

    container.innerHTML = html;
}

// Competitor Functions
async function addCompetitorArticle() {
    const urlInput = document.getElementById('competitorUrl');
    const url = urlInput.value.trim();

    if (!url) return;

    // Try to extract publication date from URL
    let pubDate = extractDateFromUrl(url);
    let title = extractTitleFromUrl(url);

    try {
        const competitor = await postData('competitors', {
            url,
            title,
            pubDate,
            notes: ''
        });
        state.competitors.push(competitor);
        renderCompetitors();
        urlInput.value = '';
    } catch (error) {
        console.error('Failed to add competitor article:', error);
    }
}

function extractDateFromUrl(url) {
    // Common URL date patterns
    const patterns = [
        /(\d{4})\/(\d{2})\/(\d{2})/,  // 2024/01/15
        /(\d{4})-(\d{2})-(\d{2})/,     // 2024-01-15
        /(\d{4})(\d{2})(\d{2})/        // 20240115
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            const year = parseInt(match[1]);
            const month = parseInt(match[2]);
            const day = parseInt(match[3]);
            if (year >= 2000 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            }
        }
    }
    return null;
}

function extractTitleFromUrl(url) {
    try {
        const urlObj = new URL(url);
        const path = urlObj.pathname;
        // Get last path segment and clean it
        const segments = path.split('/').filter(s => s);
        if (segments.length > 0) {
            let title = segments[segments.length - 1];
            // Remove file extensions
            title = title.replace(/\.(html?|php|aspx?)$/i, '');
            // Replace dashes/underscores with spaces and capitalize
            title = title.replace(/[-_]/g, ' ');
            title = title.replace(/\b\w/g, l => l.toUpperCase());
            return title;
        }
        return urlObj.hostname;
    } catch {
        return 'Unknown Article';
    }
}

function renderCompetitors() {
    const container = document.getElementById('competitorList');

    if (state.competitors.length === 0) {
        container.innerHTML = '<div class="empty-state">No competitor articles logged</div>';
        return;
    }

    const sorted = [...state.competitors].sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''));

    let html = '';
    sorted.forEach(item => {
        html += `
            <div class="competitor-item">
                <div class="competitor-header">
                    <div class="competitor-info">
                        <div class="competitor-title">${item.title}</div>
                        <div class="competitor-meta">
                            ${item.pubDate ? `Published: ${formatDate(new Date(item.pubDate), 'short')}` : 'Publication date not detected'}
                            | Added: ${formatDate(new Date(item.addedAt), 'short')}
                        </div>
                    </div>
                    <button class="btn btn-danger btn-small" onclick="deleteCompetitor('${item.id}')">Delete</button>
                </div>
                <a href="${item.url}" target="_blank" class="competitor-url">${item.url}</a>
            </div>`;
    });

    container.innerHTML = html;
}

// Team Functions
function renderTeam() {
    const container = document.getElementById('teamList');

    if (state.team.length === 0) {
        container.innerHTML = '<div class="empty-state">No team members</div>';
        return;
    }

    let html = '';
    state.team.forEach(member => {
        html += `
            <div class="team-item">
                <div class="team-info">
                    <div class="team-name">${member.name}</div>
                    <div class="team-role">${member.role}${member.email ? ` | ${member.email}` : ''}</div>
                </div>
                <button class="btn btn-danger btn-small" onclick="deleteTeamMember('${member.id}')">Remove</button>
            </div>`;
    });

    container.innerHTML = html;
}


// Form Handlers
async function handleStorySubmit(e) {
    e.preventDefault();

    const storyData = {
        studyName: document.getElementById('studyName').value,
        brand: document.getElementById('brand').value,
        pitchDate: document.getElementById('pitchDate').value,
        newsPeg: document.getElementById('newsPeg').value,
        analysisDueBy: document.getElementById('analysisDueBy').value,
        draftDueBy: document.getElementById('draftDueBy').value,
        editsDueBy: document.getElementById('editsDueBy').value,
        qaDueBy: document.getElementById('qaDueBy').value,
        productionDate: document.getElementById('productionDate').value,
        expertsContacted: parseInt(document.getElementById('expertsContacted').value) || 0,
        status: document.getElementById('status').value,
        notesBlockers: document.getElementById('notesBlockers').value,
        urlResearch: document.getElementById('urlResearch').value,
        urlMethodology: document.getElementById('urlMethodology').value,
        urlAnalysis: document.getElementById('urlAnalysis').value,
        urlPublished: document.getElementById('urlPublished').value
    };

    const storyId = document.getElementById('storyId').value;

    try {
        if (storyId) {
            const updated = await putData('stories', storyId, storyData);
            const index = state.stories.findIndex(s => s.id === storyId);
            if (index !== -1) state.stories[index] = updated;
        } else {
            const newStory = await postData('stories', storyData);
            state.stories.push(newStory);
        }
        closeModal('storyModal');
        renderCalendar();
        renderTotals();
    } catch (error) {
        console.error('Failed to save story:', error);
    }
}

async function handleOooSubmit(e) {
    e.preventDefault();

    const oooData = {
        name: document.getElementById('oooName').value,
        startDate: document.getElementById('oooStartDate').value,
        endDate: document.getElementById('oooEndDate').value
    };

    try {
        const newOoo = await postData('ooo', oooData);
        state.ooo.push(newOoo);
        closeModal('oooModal');
        renderOooCalendar();
        renderCalendar();
    } catch (error) {
        console.error('Failed to add OOO:', error);
    }
}

async function handleBlockedSubmit(e) {
    e.preventDefault();

    const blockedData = {
        date: document.getElementById('blockedDate').value,
        reason: document.getElementById('blockedReason').value,
        recurring: document.getElementById('blockedRecurring').checked
    };

    try {
        const newBlocked = await postData('blocked-dates', blockedData);
        state.blockedDates.push(newBlocked);
        closeModal('blockedModal');
        renderBlockedDates();
        renderCalendar();
    } catch (error) {
        console.error('Failed to add blocked date:', error);
    }
}

async function handleArchiveSubmit(e) {
    e.preventDefault();

    const archiveData = {
        title: document.getElementById('archiveTitle').value,
        brand: document.getElementById('archiveBrand').value,
        publishDate: document.getElementById('archivePublishDate').value,
        refreshDate: document.getElementById('archiveRefreshDate').value,
        linkCount: parseInt(document.getElementById('archiveLinkCount').value) || 0,
        pageviews: parseInt(document.getElementById('archivePageviews').value) || 0,
        ctr: parseFloat(document.getElementById('archiveCtr').value) || 0,
        domainAuthority: parseInt(document.getElementById('archiveDomainAuthority').value) || 0,
        impressions: parseInt(document.getElementById('archiveImpressions').value) || 0,
        position: parseFloat(document.getElementById('archivePosition').value) || 0,
        url: document.getElementById('archiveUrl').value,
        feedback: document.getElementById('archiveFeedback').value
    };

    const archiveId = document.getElementById('archiveId').value;

    try {
        if (archiveId) {
            const updated = await putData('archive', archiveId, archiveData);
            const index = state.archive.findIndex(a => a.id === archiveId);
            if (index !== -1) state.archive[index] = updated;
        } else {
            const newArchive = await postData('archive', archiveData);
            state.archive.push(newArchive);
        }
        closeModal('archiveModal');
        renderArchive();
        renderTotals();
    } catch (error) {
        console.error('Failed to save archive entry:', error);
    }
}

async function handleTeamSubmit(e) {
    e.preventDefault();

    const teamData = {
        name: document.getElementById('memberName').value,
        role: document.getElementById('memberRole').value,
        email: document.getElementById('memberEmail').value
    };

    try {
        const newMember = await postData('team', teamData);
        state.team.push(newMember);
        closeModal('teamModal');
        renderTeam();
    } catch (error) {
        console.error('Failed to add team member:', error);
    }
}

// Edit Functions
window.editStory = function(id) {
    const story = state.stories.find(s => s.id === id);
    if (!story) return;

    document.getElementById('storyModalTitle').textContent = 'Edit Story';
    document.getElementById('storyId').value = story.id;
    document.getElementById('studyName').value = story.studyName || '';
    document.getElementById('brand').value = story.brand || '';
    document.getElementById('pitchDate').value = story.pitchDate || '';
    document.getElementById('newsPeg').value = story.newsPeg || '';
    document.getElementById('analysisDueBy').value = story.analysisDueBy || '';
    document.getElementById('draftDueBy').value = story.draftDueBy || '';
    document.getElementById('editsDueBy').value = story.editsDueBy || '';
    document.getElementById('qaDueBy').value = story.qaDueBy || '';
    document.getElementById('productionDate').value = story.productionDate || '';
    document.getElementById('expertsContacted').value = story.expertsContacted || '';
    document.getElementById('status').value = story.status || 'planning';
    document.getElementById('notesBlockers').value = story.notesBlockers || '';
    document.getElementById('urlResearch').value = story.urlResearch || '';
    document.getElementById('urlMethodology').value = story.urlMethodology || '';
    document.getElementById('urlAnalysis').value = story.urlAnalysis || '';
    document.getElementById('urlPublished').value = story.urlPublished || '';

    openModal('storyModal');
};

window.editArchive = function(id) {
    const item = state.archive.find(a => a.id === id);
    if (!item) return;

    document.getElementById('archiveModalTitle').textContent = 'Edit Archive Entry';
    document.getElementById('archiveId').value = item.id;
    document.getElementById('archiveTitle').value = item.title || '';
    document.getElementById('archiveBrand').value = item.brand || '';
    document.getElementById('archivePublishDate').value = item.publishDate || '';
    document.getElementById('archiveRefreshDate').value = item.refreshDate || '';
    document.getElementById('archiveLinkCount').value = item.linkCount || '';
    document.getElementById('archivePageviews').value = item.pageviews || '';
    document.getElementById('archiveCtr').value = item.ctr || '';
    document.getElementById('archiveDomainAuthority').value = item.domainAuthority || '';
    document.getElementById('archiveImpressions').value = item.impressions || '';
    document.getElementById('archivePosition').value = item.position || '';
    document.getElementById('archiveUrl').value = item.url || '';
    document.getElementById('archiveFeedback').value = item.feedback || '';

    openModal('archiveModal');
};

// Delete Functions
window.deleteStory = async function(id) {
    if (!confirm('Are you sure you want to delete this story?')) return;

    try {
        await deleteData('stories', id);
        state.stories = state.stories.filter(s => s.id !== id);
        renderCalendar();
        renderTotals();
    } catch (error) {
        console.error('Failed to delete story:', error);
    }
};

window.deleteOoo = async function(id) {
    try {
        await deleteData('ooo', id);
        state.ooo = state.ooo.filter(o => o.id !== id);
        renderOooCalendar();
        renderCalendar();
    } catch (error) {
        console.error('Failed to delete OOO:', error);
    }
};

window.deleteBlockedDate = async function(id) {
    try {
        await deleteData('blocked-dates', id);
        state.blockedDates = state.blockedDates.filter(b => b.id !== id);
        renderBlockedDates();
        renderCalendar();
    } catch (error) {
        console.error('Failed to delete blocked date:', error);
    }
};

window.deleteArchive = async function(id) {
    if (!confirm('Are you sure you want to delete this archive entry?')) return;

    try {
        await deleteData('archive', id);
        state.archive = state.archive.filter(a => a.id !== id);
        renderArchive();
        renderTotals();
    } catch (error) {
        console.error('Failed to delete archive entry:', error);
    }
};

window.deleteCompetitor = async function(id) {
    try {
        await deleteData('competitors', id);
        state.competitors = state.competitors.filter(c => c.id !== id);
        renderCompetitors();
    } catch (error) {
        console.error('Failed to delete competitor:', error);
    }
};

window.deleteTeamMember = async function(id) {
    if (!confirm('Are you sure you want to remove this team member?')) return;

    try {
        await deleteData('team', id);
        state.team = state.team.filter(t => t.id !== id);
        renderTeam();
    } catch (error) {
        console.error('Failed to delete team member:', error);
    }
};

// Export Function
window.exportData = function(type) {
    window.location.href = `/api/export/${type}`;
};

// Helper Functions
function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d;
}

function formatDate(date, format) {
    const options = {
        short: { month: 'short', day: 'numeric' },
        long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
        monthYear: { year: 'numeric', month: 'long' }
    };
    return date.toLocaleDateString('en-US', options[format] || options.short);
}

function formatDateISO(date) {
    return date.toISOString().split('T')[0];
}

function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

function isDateBlocked(dateStr) {
    return state.blockedDates.some(b => {
        if (b.recurring) {
            // Match month and day only for recurring dates
            const blockedDate = new Date(b.date);
            const checkDate = new Date(dateStr);
            return blockedDate.getMonth() === checkDate.getMonth() &&
                   blockedDate.getDate() === checkDate.getDate();
        }
        return b.date === dateStr;
    });
}

function getBlockedReason(dateStr) {
    const blocked = state.blockedDates.find(b => {
        if (b.recurring) {
            const blockedDate = new Date(b.date);
            const checkDate = new Date(dateStr);
            return blockedDate.getMonth() === checkDate.getMonth() &&
                   blockedDate.getDate() === checkDate.getDate();
        }
        return b.date === dateStr;
    });
    return blocked ? blocked.reason : '';
}

function getOooForDate(dateStr) {
    return state.ooo.filter(o => {
        return dateStr >= o.startDate && dateStr <= o.endDate;
    });
}

function getStoriesForDate(dateStr) {
    return state.stories.filter(s => {
        return s.productionDate === dateStr || s.pitchDate === dateStr;
    });
}

function getBrandClass(brand) {
    const brandMap = {
        'LawnStarter': 'brand-lawnstarter',
        'Lawn Love': 'brand-lawnlove',
        'Home Gnome': 'brand-homegnome'
    };
    return brandMap[brand] || '';
}

function getTeamMemberName(id) {
    const member = state.team.find(t => t.id === id);
    return member ? member.name : 'Unknown';
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
