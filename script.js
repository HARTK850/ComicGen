// Utility functions
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i> ${message}`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
    document.querySelector(`button[onclick="showSection('${sectionId}')"]`)?.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Hide loading screen after page load
window.addEventListener('load', () => {
    const loadingScreen = document.getElementById('loading-screen');
    loadingScreen.style.opacity = '0';
    setTimeout(() => loadingScreen.style.display = 'none', 500);
});

// Settings Section
function toggleApiKeyVisibility() {
    const apiKeyInput = document.getElementById('api-key');
    const eyeIcon = document.getElementById('eye-icon');
    if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    } else {
        apiKeyInput.type = 'password';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    }
}

async function validateApiKey() {
    const apiKey = document.getElementById('api-key').value;
    const apiStatus = document.getElementById('api-status');
    if (!apiKey) {
        apiStatus.className = 'api-status error';
        apiStatus.textContent = 'אנא הכנס מפתח API';
        return;
    }

    try {
        // Simulated API check using a test call to Gemini
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey);
        if (response.ok) {
            localStorage.setItem('geminiApiKey', apiKey);
            apiStatus.className = 'api-status success';
            apiStatus.textContent = 'מפתח API תקין ונשמר בהצלחה!';
            showToast('מפתח API נשמר בהצלחה', 'success');
        } else {
            apiStatus.className = 'api-status error';
            apiStatus.textContent = 'מפתח API לא תקין';
            showToast('מפתח API לא תקין', 'error');
        }
    } catch (error) {
        apiStatus.className = 'api-status error';
        apiStatus.textContent = 'שגיאה בבדיקת מפתח API';
        showToast('שגיאה בבדיקת מפתח API', 'error');
    }
}

function saveSettings() {
    const storyModel = document.getElementById('story-model').value;
    const imageModel = document.getElementById('image-model').value;
    localStorage.setItem('storyModel', storyModel);
    localStorage.setItem('imageModel', imageModel);
    showToast('הגדרות נשמרו בהצלחה', 'success');
}

// Load saved settings
document.addEventListener('DOMContentLoaded', () => {
    const savedApiKey = localStorage.getItem('geminiApiKey');
    const savedStoryModel = localStorage.getItem('storyModel') || 'gemini-2.5-flash';
    const savedImageModel = localStorage.getItem('imageModel') || 'gemini-2.5-flash-image';
    if (savedApiKey) document.getElementById('api-key').value = savedApiKey;
    document.getElementById('story-model').value = savedStoryModel;
    document.getElementById('image-model').value = savedImageModel;

    // Set default creation type and art style
    document.getElementById('creation-type').value = 'ai';
    document.getElementById('art-style').value = 'comic';
    toggleCreationMode();
});

// Story Editor
function toggleCreationMode() {
    const creationType = document.getElementById('creation-type').value;
    document.getElementById('manual-input').style.display = creationType === 'manual' ? 'block' : 'none';
    document.getElementById('ai-input').style.display = creationType === 'ai' ? 'block' : 'none';
}

// Simulated Gemini API calls (replace with actual API integration)
async function generateAIStory() {
    const prompt = document.getElementById('story-prompt').value;
    const storyModel = document.getElementById('story-model').value;
    const apiKey = localStorage.getItem('geminiApiKey');
    const createBtn = document.getElementById('create-ai-btn');
    const createBtnText = document.getElementById('create-ai-btn-text');

    if (!apiKey) {
        showToast('אנא הכנס מפתח API תקין בהגדרות', 'error');
        return;
    }
    if (!prompt) {
        showToast('אנא הכנס תיאור לסיפור', 'error');
        return;
    }

    createBtn.disabled = true;
    createBtnText.textContent = 'מייצר קומיקס... 0%';
    const storyOutput = document.getElementById('story-output');
    storyOutput.innerHTML = '<div class="page-loading"><i class="fas fa-spinner fa-spin"></i><p>מייצר קומיקס...</p></div>';

    try {
        // Simulated story generation
        const storyResponse = await simulateStoryGeneration(prompt, storyModel, apiKey);
        const pages = storyResponse.pages; // Array of { panels: [{ text, type }] }
        await generateComicImages(pages);
        createBtnText.textContent = 'יצירת הקומיקס 100%';
        showSection('comic-editor');
    } catch (error) {
        storyOutput.innerHTML = '<div class="page-error">שגיאה ביצירת הקומיקס</div>';
        showToast('שגיאה ביצירת הקומיקס', 'error');
    } finally {
        createBtn.disabled = false;
    }
}

async function processStory() {
    const storyText = document.getElementById('story-text').value;
    const storyModel = document.getElementById('story-model').value;
    const apiKey = localStorage.getItem('geminiApiKey');
    const createBtn = document.getElementById('create-btn');
    const createBtnText = document.getElementById('create-btn-text');

    if (!apiKey) {
        showToast('אנא הכנס מפתח API תקין בהגדרות', 'error');
        return;
    }
    if (!storyText) {
        showToast('אנא הכנס סיפור', 'error');
        return;
    }

    createBtn.disabled = true;
    createBtnText.textContent = 'מייצר קומיקס... 0%';
    const storyOutput = document.getElementById('story-output');
    storyOutput.innerHTML = '<div class="page-loading"><i class="fas fa-spinner fa-spin"></i><p>מייצר קומיקס...</p></div>';

    try {
        // Simulated story processing
        const storyResponse = await simulateStoryProcessing(storyText, storyModel, apiKey);
        const pages = storyResponse.pages;
        await generateComicImages(pages);
        createBtnText.textContent = 'יצירת הקומיקס 100%';
        showSection('comic-editor');
    } catch (error) {
        storyOutput.innerHTML = '<div class="page-error">שגיאה ביצירת הקומיקס</div>';
        showToast('שגיאה ביצירת הקומיקס', 'error');
    } finally {
        createBtn.disabled = false;
    }
}

// Simulated API functions (replace with actual Gemini API calls)
async function simulateStoryGeneration(prompt, model, apiKey) {
    // Simulate API rate limit check
    const canGenerate = await checkApiRateLimit(apiKey, 10); // Assume 10 images needed
    if (!canGenerate) {
        const backupKey = await promptForBackupApiKey();
        if (backupKey) {
            localStorage.setItem('backupApiKey', backupKey);
        } else {
            throw new Error('API rate limit exceeded and no backup key provided');
        }
    }

    // Simulate story generation
    const pages = [];
    const panelCount = Math.floor(Math.random() * 20) + 20; // 20-40 panels
    const panelsPerPage = Math.floor(Math.random() * 4) + 3; // 3-6 panels per page
    let panelIndex = 0;

    while (panelIndex < panelCount) {
        const pagePanels = [];
        const panelsThisPage = Math.min(panelsPerPage, panelCount - panelIndex);
        for (let i = 0; i < panelsThisPage; i++) {
            pagePanels.push({
                text: `דיאלוג לדוגמה ${panelIndex + 1}`,
                type: Math.random() > 0.5 ? 'speech' : 'thought'
            });
            panelIndex++;
        }
        pages.push({ panels: pagePanels });
    }

    return { pages };
}

async function simulateStoryProcessing(text, model, apiKey) {
    // Simulate processing user-provided story
    return await simulateStoryGeneration(text, model, apiKey); // Same logic for simplicity
}

async function checkApiRateLimit(apiKey, requiredImages) {
    // Simulated rate limit check (replace with actual Gemini API rate limit check)
    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey);
        return response.ok; // Simplified check
    } catch {
        return false;
    }
}

async function promptForBackupApiKey() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h2>מפתח API נוסף נדרש</h2>
            <p>נראה שמפתח ה-API הנוכחי לא יספיק לכל התמונות המבוקשות. אנא הזן מפתח API נוסף לגיבוי.</p>
            <div class="form-group">
                <label for="backup-api-key">מפתח API נוסף:</label>
                <input type="password" id="backup-api-key" placeholder="הכנס מפתח API נוסף">
            </div>
            <button class="btn btn-primary" onclick="saveBackupApiKey()">שמור</button>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';
    return new Promise(resolve => {
        window.saveBackupApiKey = () => {
            const backupKey = document.getElementById('backup-api-key').value;
            modal.remove();
            resolve(backupKey);
        };
    });
}

async function generateComicImages(pages) {
    const artStyle = document.getElementById('art-style').value;
    const imageModel = document.getElementById('image-model').value;
    const apiKey = localStorage.getItem('geminiApiKey');
    const backupApiKey = localStorage.getItem('backupApiKey');
    const storyOutput = document.getElementById('story-output');
    const comicPanels = document.getElementById('comic-panels');
    storyOutput.innerHTML = '';
    comicPanels.innerHTML = '';

    let progress = 0;
    const totalPages = pages.length;
    const createBtnText = document.getElementById(document.getElementById('creation-type').value === 'ai' ? 'create-ai-btn-text' : 'create-btn-text');

    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const prompt = `Create a comic page in ${artStyle} style with ${page.panels.length} panels, each containing Hebrew text for dialogues or thoughts: ${page.panels.map(p => `${p.type}: ${p.text}`).join(', ')}`;
        try {
            // Simulated image generation
            const imageUrl = await simulateImageGeneration(prompt, imageModel, apiKey, backupApiKey);
            const pageDiv = document.createElement('div');
            pageDiv.className = 'story-output-page';
            pageDiv.innerHTML = `<img src="${imageUrl}" class="comic-page-image" loading="eager" alt="Comic Page ${i + 1}">`;
            storyOutput.appendChild(pageDiv);

            // Add to comic editor
            const panelItem = document.createElement('div');
            panelItem.className = 'comic-panel-item';
            panelItem.innerHTML = `
                <div class="panel-header">
                    <span class="panel-number">עמוד ${i + 1}</span>
                    <div class="panel-controls">
                        <button class="panel-btn" onclick="deletePanel(this)"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="panel-content">
                    <div class="panel-image"><img src="${imageUrl}" loading="eager" alt="Comic Page ${i + 1}"></div>
                    ${page.panels.map((p, idx) => `
                        <div class="panel-text-item">${p.type === 'speech' ? 'דיבור' : 'מחשבה'}: ${p.text}</div>
                    `).join('')}
                </div>
            `;
            comicPanels.appendChild(panelItem);

            progress = ((i + 1) / totalPages) * 100;
            createBtnText.textContent = `מייצר קומיקס... ${Math.round(progress)}%`;
        } catch (error) {
            storyOutput.innerHTML += '<div class="page-error">שגיאה ביצירת עמוד</div>';
        }
    }
}

async function simulateImageGeneration(prompt, model, apiKey, backupApiKey) {
    // Simulated image generation (replace with actual Gemini API image generation)
    return 'https://via.placeholder.com/800x600.png?text=Comic+Page'; // Placeholder
}

// Comic Editor
function addPanel() {
    const comicPanels = document.getElementById('comic-panels');
    const panelCount = comicPanels.children.length + 1;
    const panelItem = document.createElement('div');
    panelItem.className = 'comic-panel-item';
    panelItem.innerHTML = `
        <div class="panel-header">
            <span class="panel-number">פאנל ${panelCount}</span>
            <div class="panel-controls">
                <button class="panel-btn" onclick="deletePanel(this)"><i class="fas fa-trash"></i></button>
            </div>
        </div>
        <div class="panel-content">
            <div class="panel-image">תמונה חדשה</div>
            <textarea class="panel-text" placeholder="הכנס טקסט לפאנל..."></textarea>
        </div>
    `;
    comicPanels.appendChild(panelItem);
}

function deletePanel(btn) {
    btn.closest('.comic-panel-item').remove();
}

function showSaveProjectModal() {
    const modal = document.getElementById('save-project-modal');
    modal.style.display = 'block';
    document.getElementById('save-project-form').onsubmit = (e) => {
        e.preventDefault();
        const projectName = document.getElementById('project-name').value;
        if (projectName) {
            saveProject(projectName);
            closeSaveProjectModal();
        }
    };
}

function closeSaveProjectModal() {
    document.getElementById('save-project-modal').style.display = 'none';
}

function saveProject(projectName) {
    const comicPanels = document.getElementById('comic-panels').innerHTML;
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    projects.push({
        id: Date.now(),
        name: projectName,
        content: comicPanels,
        createdAt: new Date().toISOString(),
        isFavorite: false
    });
    localStorage.setItem('projects', JSON.stringify(projects));
    showToast('פרויקט נשמר בהצלחה', 'success');
    loadProjects();
}

async function downloadComic() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const comicPanels = document.querySelectorAll('.comic-panel-item');
    
    for (let i = 0; i < comicPanels.length; i++) {
        const img = comicPanels[i].querySelector('.panel-image img');
        if (img) {
            if (i > 0) doc.addPage();
            const imgData = await getImageData(img);
            doc.addImage(imgData, 'PNG', 10, 10, 190, 277);
        }
    }
    
    doc.save('comic.pdf');
}

async function getImageData(img) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
    });
}

// Projects Section
function loadProjects() {
    const projectsList = document.getElementById('projects-list');
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    projectsList.innerHTML = '';

    projects.forEach(project => {
        const projectCard = document.createElement('div');
        projectCard.className = 'project-card';
        projectCard.innerHTML = `
            <h3>${project.name}</h3>
            <p>נוצר ב: ${new Date(project.createdAt).toLocaleDateString('he-IL')}</p>
            <div class="project-actions">
                <button class="btn btn-primary" onclick="loadProject(${project.id})">טען</button>
                <button class="btn btn-secondary" onclick="editProject(${project.id})">ערוך שם</button>
                <button class="btn btn-secondary" onclick="toggleFavorite(${project.id})">
                    <i class="fas fa-star ${project.isFavorite ? 'active' : ''}"></i>
                </button>
                <button class="btn btn-secondary" onclick="deleteProject(${project.id})">מחק</button>
            </div>
        `;
        projectsList.appendChild(projectCard);
    });
}

function filterProjects() {
    const searchTerm = document.getElementById('project-search').value.toLowerCase();
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const projectsList = document.getElementById('projects-list');
    projectsList.innerHTML = '';

    projects.filter(project => project.name.toLowerCase().includes(searchTerm)).forEach(project => {
        const projectCard = document.createElement('div');
        projectCard.className = 'project-card';
        projectCard.innerHTML = `
            <h3>${project.name}</h3>
            <p>נוצר ב: ${new Date(project.createdAt).toLocaleDateString('he-IL')}</p>
            <div class="project-actions">
                <button class="btn btn-primary" onclick="loadProject(${project.id})">טען</button>
                <button class="btn btn-secondary" onclick="editProject(${project.id})">ערוך שם</button>
                <button class="btn btn-secondary" onclick="toggleFavorite(${project.id})">
                    <i class="fas fa-star ${project.isFavorite ? 'active' : ''}"></i>
                </button>
                <button class="btn btn-secondary" onclick="deleteProject(${project.id})">מחק</button>
            </div>
        `;
        projectsList.appendChild(projectCard);
    });
}

function loadProject(id) {
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const project = projects.find(p => p.id === id);
    if (project) {
        document.getElementById('comic-panels').innerHTML = project.content;
        showSection('comic-editor');
        showToast('פרויקט נטען בהצלחה', 'success');
    }
}

function editProject(id) {
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const project = projects.find(p => p.id === id);
    if (project) {
        const modal = document.getElementById('edit-project-modal');
        document.getElementById('edit-project-name').value = project.name;
        document.getElementById('edit-project-id').value = id;
        modal.style.display = 'block';
        document.getElementById('edit-project-form').onsubmit = (e) => {
            e.preventDefault();
            const newName = document.getElementById('edit-project-name').value;
            if (newName) {
                project.name = newName;
                localStorage.setItem('projects', JSON.stringify(projects));
                loadProjects();
                closeEditProjectModal();
                showToast('שם הפרויקט עודכן', 'success');
            }
        };
    }
}

function closeEditProjectModal() {
    document.getElementById('edit-project-modal').style.display = 'none';
}

function toggleFavorite(id) {
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const project = projects.find(p => p.id === id);
    if (project) {
        project.isFavorite = !project.isFavorite;
        localStorage.setItem('projects', JSON.stringify(projects));
        loadProjects();
        showToast(project.isFavorite ? 'הוסף למועדפים' : 'הוסר מהמועדפים', 'success');
    }
}

function deleteProject(id) {
    if (confirm('האם אתה בטוח שברצונך למחוק את הפרויקט?')) {
        const projects = JSON.parse(localStorage.getItem('projects') || '[]').filter(p => p.id !== id);
        localStorage.setItem('projects', JSON.stringify(projects));
        loadProjects();
        showToast('פרויקט נמחק בהצלחה', 'success');
    }
}

// Load projects on page load
document.addEventListener('DOMContentLoaded', loadProjects);

// Feedback (to be implemented later)
function submitFeedback() {
    showToast('משוב לא מיושם כרגע', 'info');
}

// Admin (placeholder)
function generateReport() {
    showToast('דוחות לא מיושמים כרגע', 'info');
}

function sendReportEmail() {
    showToast('שליחת דוח לא מיושמת כרגע', 'info');
}
