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
        // Test API key with a simple text generation call
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
            method: 'POST',
            headers: {
                'x-goog-api-key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'Test' }] }]
            })
        });
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

async function generateAIStory() {
    const prompt = document.getElementById('story-prompt').value;
    const storyModel = document.getElementById('story-model').value;
    let apiKey = localStorage.getItem('geminiApiKey');
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
        // Generate story structure
        const storyResponse = await generateStory(prompt, storyModel, apiKey);
        const pages = parseStoryResponse(storyResponse); // Parse to array of { panels: [{ text, type }] }
        
        // Check rate limits approximately (since no direct check, estimate based on pages)
        const canGenerate = await checkApiRateLimit(apiKey, pages.length);
        if (!canGenerate) {
            const backupKey = await promptForBackupApiKey();
            if (backupKey) {
                localStorage.setItem('backupApiKey', backupKey);
                apiKey = backupKey; // Switch to backup
            } else {
                throw new Error('API rate limit exceeded and no backup key provided');
            }
        }

        await generateComicImages(pages, apiKey);
        createBtnText.textContent = 'יצירת הקומיקס 100%';
        showSection('comic-editor');
    } catch (error) {
        storyOutput.innerHTML = '<div class="page-error">שגיאה ביצירת הקומיקס: ' + error.message + '</div>';
        showToast('שגיאה ביצירת הקומיקס', 'error');
    } finally {
        createBtn.disabled = false;
    }
}

async function processStory() {
    const storyText = document.getElementById('story-text').value;
    const storyModel = document.getElementById('story-model').value;
    let apiKey = localStorage.getItem('geminiApiKey');
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
        // Process user story into structure
        const storyResponse = await processUserStory(storyText, storyModel, apiKey);
        const pages = parseStoryResponse(storyResponse);
        
        const canGenerate = await checkApiRateLimit(apiKey, pages.length);
        if (!canGenerate) {
            const backupKey = await promptForBackupApiKey();
            if (backupKey) {
                localStorage.setItem('backupApiKey', backupKey);
                apiKey = backupKey;
            } else {
                throw new Error('API rate limit exceeded and no backup key provided');
            }
        }

        await generateComicImages(pages, apiKey);
        createBtnText.textContent = 'יצירת הקומיקס 100%';
        showSection('comic-editor');
    } catch (error) {
        storyOutput.innerHTML = '<div class="page-error">שגיאה ביצירת הקומיקס: ' + error.message + '</div>';
        showToast('שגיאה ביצירת הקומיקס', 'error');
    } finally {
        createBtn.disabled = false;
    }
}

async function generateStory(prompt, model, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const requestBody = {
        contents: [{
            parts: [{
                text: `צור סיפור קומיקס בעברית על בסיס: ${prompt}. חלק לעמודים, כל עמוד 3-6 פאנלים, כל פאנל עם טקסט דיבור או מחשבה בעברית. פלט כ-JSON: { "pages": [{ "panels": [{ "text": "טקסט", "type": "speech" or "thought" }] }] }`
            }]
        }]
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'x-goog-api-key': apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        if (response.status === 429) throw new Error('Rate limit exceeded');
        throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

async function processUserStory(text, model, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const requestBody = {
        contents: [{
            parts: [{
                text: `חלק את הסיפור הבא לקומיקס בעברית: ${text}. חלק לעמודים, כל עמוד 3-6 פאנלים, כל פאנל עם טקסט דיבור או מחשבה בעברית. פלט כ-JSON: { "pages": [{ "panels": [{ "text": "טקסט", "type": "speech" or "thought" }] }] }`
            }]
        }]
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'x-goog-api-key': apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        if (response.status === 429) throw new Error('Rate limit exceeded');
        throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

function parseStoryResponse(responseText) {
    // Parse JSON from response (assume it's clean JSON)
    try {
        return JSON.parse(responseText);
    } catch {
        // If not perfect, extract JSON part
        const jsonStart = responseText.indexOf('{');
        const jsonEnd = responseText.lastIndexOf('}') + 1;
        return JSON.parse(responseText.substring(jsonStart, jsonEnd));
    }
}

async function checkApiRateLimit(apiKey, requiredCalls) {
    // No direct endpoint, so make a test call and assume limit (e.g., 15 calls/min)
    // For simplicity, always return true unless test fails with 429
    try {
        await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
            method: 'POST',
            headers: {
                'x-goog-api-key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'Test rate limit' }] }]
            })
        });
        return true;
    } catch (error) {
        if (error.message.includes('429')) return false;
        throw error;
    }
}

async function promptForBackupApiKey() {
    return new Promise(resolve => {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="this.parentElement.parentElement.remove(); resolve(null);">&times;</span>
                <h2>מפתח API נוסף נדרש</h2>
                <p>נראה שמפתח ה-API הנוכחי לא יספיק לכל התמונות המבוקשות. אנא הזן מפתח API נוסף לגיבוי.</p>
                <div class="form-group">
                    <label for="backup-api-key">מפתח API נוסף:</label>
                    <input type="password" id="backup-api-key" placeholder="הכנס מפתח API נוסף">
                </div>
                <button class="btn btn-primary" onclick="resolve(document.getElementById('backup-api-key').value); this.closest('.modal').remove();">שמור</button>
            </div>
        `;
        document.body.appendChild(modal);
    });
}

async function generateComicImages(pages, apiKey) {
    const artStyle = document.getElementById('art-style').value;
    const imageModel = mapImageModel(document.getElementById('image-model').value); // Map to actual like 'imagen-4.0-generate-001'
    const storyOutput = document.getElementById('story-output');
    const comicPanels = document.getElementById('comic-panels');
    storyOutput.innerHTML = '';
    comicPanels.innerHTML = '';

    let progress = 0;
    const totalPages = pages.pages.length; // Assume {pages: []}
    const createBtnText = document.getElementById(document.getElementById('creation-type').value === 'ai' ? 'create-ai-btn-text' : 'create-btn-text');

    for (let i = 0; i < totalPages; i++) {
        const page = pages.pages[i];
        const pagePrompt = `Comic page in ${artStyle} style with ${page.panels.length} panels. Include speech/thought bubbles with Hebrew text only: ${page.panels.map(p => `${p.type}: ${p.text}`).join(', ')}. All text in Hebrew.`;
        
        try {
            const imageData = await generateImage(pagePrompt, imageModel, apiKey);
            const imageUrl = `data:image/png;base64,${imageData}`; // From base64
            
            const pageDiv = document.createElement('div');
            pageDiv.className = 'story-output-page';
            pageDiv.innerHTML = `<img src="${imageUrl}" class="comic-page-image" loading="eager" alt="Comic Page ${i + 1}">`;
            storyOutput.appendChild(pageDiv);

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
            if (error.message.includes('429')) {
                const backupKey = localStorage.getItem('backupApiKey');
                if (backupKey) {
                    apiKey = backupKey;
                    i--; // Retry with backup
                    continue;
                } else {
                    throw error;
                }
            }
            storyOutput.innerHTML += '<div class="page-error">שגיאה ביצירת עמוד: ' + error.message + '</div>';
        }
    }
}

function mapImageModel(selected) {
    const map = {
        'gemini-2.5-flash-image': 'imagen-3.0-generate-001', // Example mapping
        'gemini-2.0-flash-image': 'imagen-3.0-fast-generate-001',
        'imagen-4': 'imagen-4.0-generate-001'
    };
    return map[selected] || 'imagen-4.0-generate-001';
}

async function generateImage(prompt, model, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict`;
    const requestBody = {
        instances: [{ prompt: prompt }], // English prompt
        parameters: { sampleCount: 1, aspectRatio: '3:4' } // Adjust as needed
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'x-goog-api-key': apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        if (response.status === 429) throw new Error('Rate limit exceeded (429)');
        throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    // Assume single image
    return data.predictions[0].generatedImages[0].image.imageBytes; // base64
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
    const comicPanelItems = document.querySelectorAll('.comic-panel-item');
    
    for (let i = 0; i < comicPanelItems.length; i++) {
        const img = comicPanelItems[i].querySelector('.panel-image img');
        if (img) {
            if (i > 0) doc.addPage();
            const imgData = await getImageData(img);
            doc.addImage(imgData, 'PNG', 0, 0, 210, 297); // A4 size
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
                    <i class="fas fa-star ${project.isFavorite ? 'active' : ''}"></i> ${project.isFavorite ? 'הסר מועדף' : 'סמן כמועדף'}
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

    const filtered = projects.filter(project => project.name.toLowerCase().includes(searchTerm));
    filtered.forEach(project => {
        const projectCard = document.createElement('div');
        projectCard.className = 'project-card';
        projectCard.innerHTML = `
            <h3>${project.name}</h3>
            <p>נוצר ב: ${new Date(project.createdAt).toLocaleDateString('he-IL')}</p>
            <div class="project-actions">
                <button class="btn btn-primary" onclick="loadProject(${project.id})">טען</button>
                <button class="btn btn-secondary" onclick="editProject(${project.id})">ערוך שם</button>
                <button class="btn btn-secondary" onclick="toggleFavorite(${project.id})">
                    <i class="fas fa-star ${project.isFavorite ? 'active' : ''}"></i> ${project.isFavorite ? 'הסר מועדף' : 'סמן כמועדף'}
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
        let projects = JSON.parse(localStorage.getItem('projects') || '[]');
        projects = projects.filter(p => p.id !== id);
        localStorage.setItem('projects', JSON.stringify(projects));
        loadProjects();
        showToast('פרויקט נמחק בהצלחה', 'success');
    }
}

// Load projects on page load
document.addEventListener('DOMContentLoaded', loadProjects);

// Feedback (skipped as per instructions)
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
