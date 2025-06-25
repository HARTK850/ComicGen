// Global Variables
let currentUser = null;
let currentProject = null;
let apiKey = null;
let currentRating = 0;
let comicPanels = [];
let draggedElement = null;

// Admin email for reports
const ADMIN_EMAIL = 'y15761576@gmail.com';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Hide loading screen after 2 seconds
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }, 2000);

    // Load saved data
    loadSavedData();
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Check if user is admin
    checkAdminAccess();
    
    // Update statistics
    updateStatistics();
    
    // Show home section by default
    showSection('home');
}

function loadSavedData() {
    // Load API key
    const savedApiKey = localStorage.getItem('gemini_api_key');
    if (savedApiKey) {
        try {
            const decryptedKey = CryptoJS.AES.decrypt(savedApiKey, 'comic-creator-secret').toString(CryptoJS.enc.Utf8);
            apiKey = decryptedKey;
            document.getElementById('api-key').value = decryptedKey;
        } catch (error) {
            console.error('Error decrypting API key:', error);
        }
    }
    
    // Load current user
    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    }
    
    // Load current project
    const savedProject = localStorage.getItem('current_project');
    if (savedProject) {
        currentProject = JSON.parse(savedProject);
        loadProject(currentProject);
    }
}

function initializeEventListeners() {
    // Star rating
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            currentRating = parseInt(this.dataset.rating);
            updateStarRating(currentRating);
        });
        
        star.addEventListener('mouseover', function() {
            const rating = parseInt(this.dataset.rating);
            updateStarRating(rating);
        });
    });
    
    // Reset star rating on mouse leave
    document.getElementById('star-rating').addEventListener('mouseleave', function() {
        updateStarRating(currentRating);
    });
    
    // Login form
    document.getElementById('login-form').addEventListener('submit', function(e) {
        e.preventDefault();
        handleLogin();
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('login-modal');
        if (e.target === modal) {
            closeLoginModal();
        }
    });
    
    // Auto-save functionality
    setInterval(autoSave, 30000); // Auto-save every 30 seconds
}

// Navigation Functions
function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update navigation buttons
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Find and activate the corresponding nav button
    const activeBtn = Array.from(navButtons).find(btn => 
        btn.onclick && btn.onclick.toString().includes(sectionId)
    );
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

// User Management
function toggleUserMenu() {
    const userMenu = document.getElementById('user-menu');
    userMenu.classList.toggle('show');
}

function showLoginModal() {
    document.getElementById('login-modal').style.display = 'block';
    toggleUserMenu();
}

function closeLoginModal() {
    document.getElementById('login-modal').style.display = 'none';
}

function handleLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showToast('אנא מלא את כל השדות', 'error');
        return;
    }
    
    // Simple authentication (in real app, this would be server-side)
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        currentUser = user;
        localStorage.setItem('current_user', JSON.stringify(user));
        showToast('התחברת בהצלחה!', 'success');
        closeLoginModal();
        checkAdminAccess();
    } else {
        // Create new user if doesn't exist
        const newUser = {
            id: Date.now(),
            username: username,
            password: password, // In real app, this would be hashed
            createdAt: new Date().toISOString(),
            isAdmin: username === 'admin' && password === 'admin123'
        };
        
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        
        currentUser = newUser;
        localStorage.setItem('current_user', JSON.stringify(newUser));
        
        showToast('משתמש חדש נוצר בהצלחה!', 'success');
        closeLoginModal();
        checkAdminAccess();
    }
    
    // Clear form
    document.getElementById('login-form').reset();
}

function logout() {
    currentUser = null;
    localStorage.removeItem('current_user');
    showToast('התנתקת בהצלחה', 'info');
    toggleUserMenu();
    checkAdminAccess();
}

function checkAdminAccess() {
    const adminBtn = document.querySelector('.admin-only');
    if (currentUser && currentUser.isAdmin) {
        adminBtn.style.display = 'flex';
    } else {
        adminBtn.style.display = 'none';
    }
}

// API Management
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
    const apiKeyInput = document.getElementById('api-key');
    const statusDiv = document.getElementById('api-status');
    const key = apiKeyInput.value.trim();
    
    if (!key) {
        showApiStatus('אנא הכנס מפתח API', 'error');
        return;
    }
    
    showApiStatus('בודק את המפתח...', 'info');
    
    try {
        // Test API key with a simple request
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${key}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: 'Hello'
                    }]
                }]
            })
        });
        
        if (response.ok) {
            // Encrypt and save API key
            const encryptedKey = CryptoJS.AES.encrypt(key, 'comic-creator-secret').toString();
            localStorage.setItem('gemini_api_key', encryptedKey);
            apiKey = key;
            
            showApiStatus('המפתח תקין ונשמר בהצלחה!', 'success');
            showToast('מפתח API נשמר בהצלחה', 'success');
        } else {
            throw new Error('Invalid API key');
        }
    } catch (error) {
        showApiStatus('המפתח לא תקין. אנא בדוק ונסה שוב.', 'error');
        showToast('שגיאה בבדיקת המפתח', 'error');
    }
}

function showApiStatus(message, type) {
    const statusDiv = document.getElementById('api-status');
    statusDiv.textContent = message;
    statusDiv.className = `api-status ${type}`;
}

// Story Editor Functions
function toggleCreationMode() {
    const creationType = document.getElementById('creation-type').value;
    const manualInput = document.getElementById('manual-input');
    const aiInput = document.getElementById('ai-input');
    
    if (creationType === 'manual') {
        manualInput.style.display = 'block';
        aiInput.style.display = 'none';
    } else {
        manualInput.style.display = 'none';
        aiInput.style.display = 'block';
    }
}

async function processStory() {
    const storyText = document.getElementById('story-text').value.trim();
    
    if (!storyText) {
        showToast('אנא הכנס טקסט סיפור', 'error');
        return;
    }
    
    showToast('מעבד את הסיפור...', 'info');
    
    // Split story into panels (simple logic - can be enhanced)
    const sentences = storyText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const panels = [];
    
    for (let i = 0; i < sentences.length; i++) {
        panels.push({
            id: Date.now() + i,
            text: sentences[i].trim(),
            dialog: '',
            imagePrompt: `${sentences[i].trim()} in ${document.getElementById('art-style').value} style`
        });
    }
    
    comicPanels = panels;
    displayStoryOutput(panels);
    showToast('הסיפור חולק לפנלים בהצלחה!', 'success');
}

async function generateAIStory() {
    if (!apiKey) {
        showToast('אנא הגדר מפתח API תחילה', 'error');
        showSection('api-setup');
        return;
    }
    
    const theme = document.getElementById('story-theme').value.trim();
    const characters = document.getElementById('story-characters').value.trim();
    const setting = document.getElementById('story-setting').value.trim();
    
    if (!theme) {
        showToast('אנא הכנס נושא לסיפור', 'error');
        return;
    }
    
    showToast('יוצר סיפור אוטומטי...', 'info');
    
    try {
        const prompt = `צור סיפור קצר בעברית על ${theme}. 
        דמויות: ${characters || 'דמויות מעניינות'}
        רקע: ${setting || 'מקום מעניין'}
        הסיפור צריך להיות מתאים לקומיקס עם 4-6 פנלים.
        כתוב את הסיפור בצורה ברורה עם משפטים קצרים.`;
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate story');
        }
        
        const data = await response.json();
        const generatedStory = data.candidates[0].content.parts[0].text;
        
        // Set the generated story in the text area
        document.getElementById('story-text').value = generatedStory;
        
        // Switch to manual mode to show the generated story
        document.getElementById('creation-type').value = 'manual';
        toggleCreationMode();
        
        // Process the generated story
        await processStory();
        
        showToast('סיפור נוצר בהצלחה!', 'success');
        
    } catch (error) {
        console.error('Error generating story:', error);
        showToast('שגיאה ביצירת הסיפור', 'error');
    }
}

function displayStoryOutput(panels) {
    const outputDiv = document.getElementById('story-output');
    
    let html = '<h3>הפנלים שנוצרו:</h3>';
    panels.forEach((panel, index) => {
        html += `
            <div class="story-panel">
                <h4>פנל ${index + 1}</h4>
                <p><strong>טקסט:</strong> ${panel.text}</p>
                <p><strong>תיאור תמונה:</strong> ${panel.imagePrompt}</p>
            </div>
        `;
    });
    
    html += `
        <div class="story-actions">
            <button onclick="moveToComicEditor()" class="btn btn-primary">
                <i class="fas fa-arrow-left"></i>
                עבור לעורך הקומיקס
            </button>
        </div>
    `;
    
    outputDiv.innerHTML = html;
}

function moveToComicEditor() {
    showSection('comic-editor');
    renderComicPanels();
}

// Comic Editor Functions
function addPanel() {
    const newPanel = {
        id: Date.now(),
        text: 'טקסט חדש...',
        dialog: '',
        imagePrompt: 'תיאור תמונה...'
    };
    
    comicPanels.push(newPanel);
    renderComicPanels();
    showToast('פנל חדש נוסף', 'success');
}

function renderComicPanels() {
    const panelsContainer = document.getElementById('comic-panels');
    
    if (comicPanels.length === 0) {
        panelsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-images"></i>
                <p>אין פנלים עדיין</p>
                <p>צור סיפור או הוסף פנל ידנית</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    comicPanels.forEach((panel, index) => {
        html += `
            <div class="comic-panel-item" data-panel-id="${panel.id}">
                <div class="panel-header">
                    <span class="panel-number">פנל ${index + 1}</span>
                    <div class="panel-controls">
                        <button class="panel-btn" onclick="editPanel(${panel.id})" title="ערוך">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="panel-btn" onclick="deletePanel(${panel.id})" title="מחק">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="panel-content">
                    <div class="panel-text">${panel.text}</div>
                    <div class="panel-image">
                        <i class="fas fa-image"></i>
                        <span>תמונה: ${panel.imagePrompt}</span>
                    </div>
                </div>
                <input type="text" class="dialog-input" placeholder="הוסף דיאלוג..." 
                       value="${panel.dialog}" onchange="updatePanelDialog(${panel.id}, this.value)">
            </div>
        `;
    });
    
    panelsContainer.innerHTML = html;
    
    // Initialize drag and drop
    initializeDragAndDrop();
}

function initializeDragAndDrop() {
    const panelsContainer = document.getElementById('comic-panels');
    
    if (typeof Sortable !== 'undefined') {
        new Sortable(panelsContainer, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: function(evt) {
                // Reorder panels array
                const movedPanel = comicPanels.splice(evt.oldIndex, 1)[0];
                comicPanels.splice(evt.newIndex, 0, movedPanel);
                
                // Re-render to update panel numbers
                renderComicPanels();
                showToast('סדר הפנלים שונה', 'info');
            }
        });
    }
}

function editPanel(panelId) {
    const panel = comicPanels.find(p => p.id === panelId);
    if (!panel) return;
    
    const newText = prompt('ערוך את הטקסט:', panel.text);
    if (newText !== null) {
        panel.text = newText;
        renderComicPanels();
        showToast('הפנל עודכן', 'success');
    }
}

function deletePanel(panelId) {
    if (confirm('האם אתה בטוח שברצונך למחוק את הפנל?')) {
        comicPanels = comicPanels.filter(p => p.id !== panelId);
        renderComicPanels();
        showToast('הפנל נמחק', 'info');
    }
}

function updatePanelDialog(panelId, dialog) {
    const panel = comicPanels.find(p => p.id === panelId);
    if (panel) {
        panel.dialog = dialog;
        showToast('דיאלוג עודכן', 'info');
    }
}

// Project Management
function saveProject() {
    if (!currentUser) {
        showToast('אנא התחבר כדי לשמור פרויקט', 'error');
        showLoginModal();
        return;
    }
    
    const projectName = prompt('שם הפרויקט:', currentProject?.name || 'פרויקט חדש');
    if (!projectName) return;
    
    const project = {
        id: currentProject?.id || Date.now(),
        name: projectName,
        userId: currentUser.id,
        panels: comicPanels,
        createdAt: currentProject?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Save to localStorage (in real app, this would be server-side)
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const existingIndex = projects.findIndex(p => p.id === project.id);
    
    if (existingIndex >= 0) {
        projects[existingIndex] = project;
    } else {
        projects.push(project);
    }
    
    localStorage.setItem('projects', JSON.stringify(projects));
    localStorage.setItem('current_project', JSON.stringify(project));
    
    currentProject = project;
    showToast('הפרויקט נשמר בהצלחה!', 'success');
    
    // Update statistics
    updateStatistics();
}

function loadProject(project) {
    currentProject = project;
    comicPanels = project.panels || [];
    renderComicPanels();
}

function autoSave() {
    if (currentUser && comicPanels.length > 0) {
        saveProject();
    }
}

async function downloadComic() {
    if (comicPanels.length === 0) {
        showToast('אין פנלים להורדה', 'error');
        return;
    }
    
    showToast('מכין את הקומיקס להורדה...', 'info');
    
    try {
        // Create a canvas for the comic
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size (A4 proportions)
        canvas.width = 800;
        canvas.height = 1200;
        
        // White background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw panels
        const panelsPerRow = 2;
        const panelWidth = 350;
        const panelHeight = 250;
        const margin = 25;
        
        comicPanels.forEach((panel, index) => {
            const row = Math.floor(index / panelsPerRow);
            const col = index % panelsPerRow;
            
            const x = margin + col * (panelWidth + margin);
            const y = margin + row * (panelHeight + margin);
            
            // Draw panel border
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, panelWidth, panelHeight);
            
            // Draw panel content
            ctx.fillStyle = '#333';
            ctx.font = '16px Heebo';
            ctx.textAlign = 'right';
            
            // Wrap text
            const words = panel.text.split(' ');
            let line = '';
            let lineY = y + 30;
            
            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = ctx.measureText(testLine);
                const testWidth = metrics.width;
                
                if (testWidth > panelWidth - 20 && n > 0) {
                    ctx.fillText(line, x + panelWidth - 10, lineY);
                    line = words[n] + ' ';
                    lineY += 25;
                } else {
                    line = testLine;
                }
            }
            ctx.fillText(line, x + panelWidth - 10, lineY);
            
            // Draw dialog if exists
            if (panel.dialog) {
                ctx.fillStyle = 'white';
                ctx.fillRect(x + 10, y + panelHeight - 60, panelWidth - 20, 40);
                ctx.strokeRect(x + 10, y + panelHeight - 60, panelWidth - 20, 40);
                
                ctx.fillStyle = '#333';
                ctx.font = '14px Heebo';
                ctx.fillText(panel.dialog, x + panelWidth - 20, y + panelHeight - 35);
            }
        });
        
        // Convert to blob and download
        canvas.toBlob(function(blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `comic-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast('הקומיקס הורד בהצלחה!', 'success');
        });
        
    } catch (error) {
        console.error('Error downloading comic:', error);
        showToast('שגיאה בהורדת הקומיקס', 'error');
    }
}

// Feedback Functions
function updateStarRating(rating) {
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

function submitFeedback() {
    const feedbackText = document.getElementById('feedback-text').value.trim();
    
    if (currentRating === 0) {
        showToast('אנא בחר דירוג', 'error');
        return;
    }
    
    if (!feedbackText) {
        showToast('אנא כתוב משוב', 'error');
        return;
    }
    
    const feedback = {
        id: Date.now(),
        userId: currentUser?.id || 'anonymous',
        rating: currentRating,
        text: feedbackText,
        timestamp: new Date().toISOString()
    };
    
    // Save feedback
    const feedbacks = JSON.parse(localStorage.getItem('feedbacks') || '[]');
    feedbacks.push(feedback);
    localStorage.setItem('feedbacks', JSON.stringify(feedbacks));
    
    // Reset form
    document.getElementById('feedback-text').value = '';
    currentRating = 0;
    updateStarRating(0);
    
    showToast('תודה על המשוב!', 'success');
    
    // Update statistics
    updateStatistics();
    
    // Send feedback email (simulated)
    sendFeedbackEmail(feedback);
}

// Admin Functions
function updateStatistics() {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const feedbacks = JSON.parse(localStorage.getItem('feedbacks') || '[]');
    
    document.getElementById('total-users').textContent = users.length;
    document.getElementById('total-comics').textContent = projects.length;
    document.getElementById('total-feedback').textContent = feedbacks.length;
    
    // Calculate average rating
    if (feedbacks.length > 0) {
        const avgRating = feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length;
        document.getElementById('avg-rating').textContent = avgRating.toFixed(1);
    } else {
        document.getElementById('avg-rating').textContent = '0';
    }
}

function generateReport() {
    if (!currentUser || !currentUser.isAdmin) {
        showToast('אין הרשאה לפעולה זו', 'error');
        return;
    }
    
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const feedbacks = JSON.parse(localStorage.getItem('feedbacks') || '[]');
    
    const report = {
        date: new Date().toISOString(),
        totalUsers: users.length,
        totalComics: projects.length,
        totalFeedbacks: feedbacks.length,
        averageRating: feedbacks.length > 0 ? 
            (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1) : 0,
        recentActivity: {
            newUsersThisWeek: users.filter(u => 
                new Date(u.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            ).length,
            newComicsThisWeek: projects.filter(p => 
                new Date(p.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            ).length
        }
    };
    
    // Save report
    const reports = JSON.parse(localStorage.getItem('reports') || '[]');
    reports.push(report);
    localStorage.setItem('reports', JSON.stringify(reports));
    
    showToast('דוח נוצר בהצלחה', 'success');
    
    return report;
}

function sendReportEmail() {
    const report = generateReport();
    if (!report) return;
    
    // Simulate sending email
    const emailContent = `
דוח שימוש - יוצר הקומיקס העברי
תאריך: ${new Date(report.date).toLocaleDateString('he-IL')}

סטטיסטיקות כלליות:
- סך המשתמשים: ${report.totalUsers}
- סך הקומיקסים: ${report.totalComics}
- סך המשובים: ${report.totalFeedbacks}
- דירוג ממוצע: ${report.averageRating}

פעילות השבוע:
- משתמשים חדשים: ${report.recentActivity.newUsersThisWeek}
- קומיקסים חדשים: ${report.recentActivity.newComicsThisWeek}

דוח נשלח אוטומטית מיוצר הקומיקס העברי
    `;
    
    // In a real application, this would send an actual email
    console.log('Email would be sent to:', ADMIN_EMAIL);
    console.log('Email content:', emailContent);
    
    showToast(`דוח נשלח למייל ${ADMIN_EMAIL}`, 'success');
}

function sendFeedbackEmail(feedback) {
    // Simulate sending feedback email
    const emailContent = `
משוב חדש מיוצר הקומיקס העברי

דירוג: ${feedback.rating}/5
תאריך: ${new Date(feedback.timestamp).toLocaleDateString('he-IL')}
משתמש: ${feedback.userId}

תוכן המשוב:
${feedback.text}
    `;
    
    console.log('Feedback email would be sent to:', ADMIN_EMAIL);
    console.log('Email content:', emailContent);
}

// Utility Functions
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' : 
                 'fa-info-circle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Periodic email reports (simulated)
setInterval(() => {
    if (currentUser && currentUser.isAdmin) {
        // Send weekly report (simulated)
        const lastReport = localStorage.getItem('last_report_date');
        const now = new Date();
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        
        if (!lastReport || (now - new Date(lastReport)) > oneWeek) {
            sendReportEmail();
            localStorage.setItem('last_report_date', now.toISOString());
        }
    }
}, 60000); // Check every minute (in real app, this would be server-side)

// Initialize crypto-js if not loaded
if (typeof CryptoJS === 'undefined') {
    window.CryptoJS = {
        AES: {
            encrypt: (text, key) => btoa(text), // Simple base64 encoding as fallback
            decrypt: (encrypted, key) => ({ toString: () => atob(encrypted) })
        },
        enc: {
            Utf8: {}
        }
    };
}

// Initialize Sortable if not loaded
if (typeof Sortable === 'undefined') {
    window.Sortable = function(el, options) {
        // Simple fallback - basic drag and drop
        let draggedElement = null;
        
        Array.from(el.children).forEach(child => {
            child.draggable = true;
            
            child.addEventListener('dragstart', function(e) {
                draggedElement = this;
                this.style.opacity = '0.5';
            });
            
            child.addEventListener('dragend', function(e) {
                this.style.opacity = '';
                draggedElement = null;
            });
            
            child.addEventListener('dragover', function(e) {
                e.preventDefault();
            });
            
            child.addEventListener('drop', function(e) {
                e.preventDefault();
                if (draggedElement && draggedElement !== this) {
                    const rect = this.getBoundingClientRect();
                    const midpoint = rect.top + rect.height / 2;
                    
                    if (e.clientY < midpoint) {
                        this.parentNode.insertBefore(draggedElement, this);
                    } else {
                        this.parentNode.insertBefore(draggedElement, this.nextSibling);
                    }
                    
                    if (options.onEnd) {
                        options.onEnd({
                            oldIndex: 0, // Simplified
                            newIndex: 0  // Simplified
                        });
                    }
                }
            });
        });
    };
}