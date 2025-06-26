document.addEventListener('DOMContentLoaded', () => {
    // Hide loading screen
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }

    // Initialize the active section to 'home'
    showSection('home');
    loadProjects(); // Load projects on startup
});

// Utility function to show toast notifications
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.classList.add('toast', type);
    toast.innerHTML = `<span>${message}</span>`;
    toastContainer.prepend(toast); // Add to the top

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Function to handle section display
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');

    // Update active state of navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`.nav-btn[onclick="showSection('${sectionId}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    // If navigating to projects section, refresh the list
    if (sectionId === 'projects') {
        loadProjects();
    }
}

// API Setup functions
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

function validateApiKey() {
    const apiKey = document.getElementById('api-key').value;
    const apiStatus = document.getElementById('api-status');

    if (apiKey.trim() === '') {
        apiStatus.className = 'api-status error';
        apiStatus.textContent = 'אנא הכנס מפתח API.';
        showToast('מפתח API ריק.', 'error');
        return;
    }

    // In a real application, you would make an actual API call to validate the key.
    // For this example, we'll just simulate a successful validation.
    apiStatus.className = 'api-status success';
    apiStatus.textContent = 'מפתח API תקף! נשמר בהצלחה.';
    showToast('מפתח API נשמר בהצלחה!', 'success');
    localStorage.setItem('geminiApiKey', apiKey); // Save to local storage
}

// Story Editor functions
function toggleCreationMode() {
    const creationType = document.getElementById('creation-type').value;
    document.getElementById('manual-input').style.display = creationType === 'manual' ? 'block' : 'none';
    document.getElementById('ai-input').style.display = creationType === 'ai' ? 'block' : 'none';
}

function processStory() {
    const storyText = document.getElementById('story-text').value;
    const storyOutput = document.getElementById('story-output');
    if (storyText.trim() === '') {
        showToast('אנא הכנס סיפור לכתיבה ידנית.', 'error');
        return;
    }

    // Simulate panel generation from story text
    const panels = storyText.split(/(?<=[.?!])\s+/).filter(Boolean); // Split by sentences
    storyOutput.innerHTML = `<h3>פנלים שנוצרו:</h3>`;
    if (panels.length > 0) {
        panels.forEach((panelText, index) => {
            const p = document.createElement('p');
            p.textContent = `פנל ${index + 1}: ${panelText}`;
            storyOutput.appendChild(p);
        });
        showToast('הסיפור חולק לפנלים בהצלחה!', 'success');
    } else {
        storyOutput.innerHTML = `<p>לא נוצרו פנלים מהסיפור שהוזן.</p>`;
        showToast('לא נוצרו פנלים מהסיפור.', 'info');
    }
}

async function generateAIStory() {
    const storyTheme = document.getElementById('story-theme').value;
    const storyCharacters = document.getElementById('story-characters').value;
    const storySetting = document.getElementById('story-setting').value;
    const storyOutput = document.getElementById('story-output');

    if (!storyTheme && !storyCharacters && !storySetting) {
        showToast('אנא מלא לפחות שדה אחד ליצירת סיפור AI.', 'error');
        return;
    }

    const apiKey = localStorage.getItem('geminiApiKey');
    if (!apiKey) {
        showToast('אנא הגדר מפתח API לפני יצירת סיפור AI.', 'error');
        showSection('api-setup');
        return;
    }

    storyOutput.innerHTML = `<p>יוצר סיפור באמצעות AI, אנא המתן...</p>`;
    showToast('יוצר סיפור AI...', 'info');

    // Simulate AI story generation
    try {
        // In a real application, you would call the Gemini API here
        // const response = await fetch('YOUR_GEMINI_API_ENDPOINT', {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //         'Authorization': `Bearer ${apiKey}`
        //     },
        //     body: JSON.stringify({ theme: storyTheme, characters: storyCharacters, setting: storySetting })
        // });
        // const data = await response.json();
        // const generatedStory = data.story; // Assuming API returns story text

        // Placeholder for AI generated story
        const generatedStory = `
            בעיר עתידנית, גיבור צעיר בשם אלון מצא דרקון קסום בשם פיירו.
            הם יצאו יחד למסע להצלת הנסיכה לילה, שנחטפה על ידי מכשף רשע.
            במהלך המסע הם נתקלו במכשולים רבים, אך בעזרת ידידותם ואומץ לבם הצליחו להתגבר על כולם.
            לבסוף, הם הגיעו לטירה האפלה, הביסו את המכשף והצילו את הנסיכה, שהתגלתה כקוסמת חזקה בעצמה.
            העיר חגגה את חזרתם, ואלון, פיירו והנסיכה הפכו לגיבורים אגדיים.
        `;

        processStoryFromAI(generatedStory); // Process the AI generated story into panels
        showToast('סיפור AI נוצר בהצלחה!', 'success');
    } catch (error) {
        console.error('Error generating AI story:', error);
        storyOutput.innerHTML = `<p style="color: red;">שגיאה ביצירת סיפור AI: ${error.message}. ודא שמפתח ה-API תקין.</p>`;
        showToast('שגיאה ביצירת סיפור AI.', 'error');
    }
}

function processStoryFromAI(story) {
    document.getElementById('story-text').value = story; // Populate manual input with AI story
    processStory(); // Process the story into panels
}


// Comic Editor functions
let currentComicPanels = []; // Stores the current panels being edited
let currentProjectId = null; // Stores the ID of the project being edited

function addPanel(panelText = '', imageUrl = '', dialogs = []) {
    const comicPanelsContainer = document.getElementById('comic-panels');
    const panelId = `panel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const panelDiv = document.createElement('div');
    panelDiv.classList.add('comic-panel-item');
    panelDiv.setAttribute('draggable', 'true'); // Make panels draggable
    panelDiv.dataset.panelId = panelId;

    panelDiv.innerHTML = `
        <div class="panel-header">
            <span class="panel-number">פנל ${comicPanelsContainer.children.length + 1}</span>
            <div class="panel-controls">
                <button class="panel-btn" onclick="removePanel('${panelId}')" title="מחק פנל"><i class="fas fa-trash"></i></button>
                <button class="panel-btn" onclick="generatePanelImage('${panelId}')" title="צור תמונה לפנל"><i class="fas fa-image"></i></button>
            </div>
        </div>
        <div class="panel-content">
            <textarea class="panel-text" placeholder="כתוב את תיאור הפנל..." oninput="updatePanelContent('${panelId}', 'text', this.value)">${panelText}</textarea>
            <div class="panel-image" onclick="openImageUpload('${panelId}')">
                ${imageUrl ? `<img src="${imageUrl}" alt="Panel Image">` : 'לחץ להעלאת תמונה או צור עם AI'}
            </div>
            <div class="panel-dialogs" data-panel-id="${panelId}">
                ${dialogs.map((d, idx) => `
                    <div class="dialog-item">
                        <input type="text" value="${d}" class="dialog-input" oninput="updatePanelContent('${panelId}', 'dialog', this.value, ${idx})">
                        <button class="panel-btn" onclick="removeDialog('${panelId}', ${idx})" title="מחק דיאלוג"><i class="fas fa-times"></i></button>
                    </div>
                `).join('')}
                <button class="btn btn-secondary add-dialog-btn" onclick="addDialog('${panelId}')">הוסף דיאלוג</button>
            </div>
        </div>
    `;
    comicPanelsContainer.appendChild(panelDiv);

    // Update panel numbers after adding
    updatePanelNumbers();

    // Add to current comic panels array
    currentComicPanels.push({
        id: panelId,
        text: panelText,
        imageUrl: imageUrl,
        dialogs: dialogs
    });

    addDragAndDropListeners(panelDiv); // Add drag and drop listeners to the new panel
}

function updatePanelNumbers() {
    const panels = document.querySelectorAll('.comic-panel-item');
    panels.forEach((panel, index) => {
        panel.querySelector('.panel-number').textContent = `פנל ${index + 1}`;
    });
}

function removePanel(panelId) {
    if (confirm('האם אתה בטוח שברצונך למחוק פנל זה?')) {
        document.querySelector(`.comic-panel-item[data-panel-id="${panelId}"]`).remove();
        currentComicPanels = currentComicPanels.filter(panel => panel.id !== panelId);
        updatePanelNumbers();
        showToast('פנל נמחק בהצלחה!', 'info');
    }
}

function updatePanelContent(panelId, type, value, dialogIndex = -1) {
    const panel = currentComicPanels.find(p => p.id === panelId);
    if (!panel) return;

    if (type === 'text') {
        panel.text = value;
    } else if (type === 'dialog' && dialogIndex !== -1) {
        panel.dialogs[dialogIndex] = value;
    }
    // No need to save to local storage immediately, will be saved on "שמור פרויקט"
}

function addDialog(panelId) {
    const panelDiv = document.querySelector(`.comic-panel-item[data-panel-id="${panelId}"]`);
    const dialogsContainer = panelDiv.querySelector('.panel-dialogs');
    const newDialogIndex = dialogsContainer.querySelectorAll('.dialog-item').length;

    const dialogItemDiv = document.createElement('div');
    dialogItemDiv.classList.add('dialog-item');
    dialogItemDiv.innerHTML = `
        <input type="text" placeholder="הכנס דיאלוג..." class="dialog-input" oninput="updatePanelContent('${panelId}', 'dialog', this.value, ${newDialogIndex})">
        <button class="panel-btn" onclick="removeDialog('${panelId}', ${newDialogIndex})" title="מחק דיאלוג"><i class="fas fa-times"></i></button>
    `;
    dialogsContainer.insertBefore(dialogItemDiv, dialogsContainer.lastElementChild); // Insert before the add dialog button

    const panel = currentComicPanels.find(p => p.id === panelId);
    if (panel) {
        panel.dialogs.push(''); // Add an empty string for the new dialog
    }
}

function removeDialog(panelId, dialogIndex) {
    const panel = currentComicPanels.find(p => p.id === panelId);
    if (!panel) return;

    panel.dialogs.splice(dialogIndex, 1); // Remove from array

    const panelDiv = document.querySelector(`.comic-panel-item[data-panel-id="${panelId}"]`);
    const dialogsContainer = panelDiv.querySelector('.panel-dialogs');
    // Re-render dialogs to update indices and remove the specific one
    dialogsContainer.innerHTML = `
        ${panel.dialogs.map((d, idx) => `
            <div class="dialog-item">
                <input type="text" value="${d}" class="dialog-input" oninput="updatePanelContent('${panelId}', 'dialog', this.value, ${idx})">
                <button class="panel-btn" onclick="removeDialog('${panelId}', ${idx})" title="מחק דיאלוג"><i class="fas fa-times"></i></button>
            </div>
        `).join('')}
        <button class="btn btn-secondary add-dialog-btn" onclick="addDialog('${panelId}')">הוסף דיאלוג</button>
    `;
}


function generatePanelImage(panelId) {
    const panel = currentComicPanels.find(p => p.id === panelId);
    if (!panel) return;

    const apiKey = localStorage.getItem('geminiApiKey');
    if (!apiKey) {
        showToast('אנא הגדר מפתח API לפני יצירת תמונה.', 'error');
        showSection('api-setup');
        return;
    }

    const artStyle = document.getElementById('art-style').value;
    const prompt = `צור תמונה בסגנון ${artStyle} עבור הפנל הבא: "${panel.text}". קח בחשבון את הדיאלוגים: ${panel.dialogs.join(', ')}.`;
    const panelImageDiv = document.querySelector(`.comic-panel-item[data-panel-id="${panelId}"] .panel-image`);
    panelImageDiv.innerHTML = 'יוצר תמונה... <i class="fas fa-spinner fa-spin"></i>';
    showToast('יוצר תמונה לפנל...', 'info');

    // Simulate image generation with a placeholder image
    setTimeout(() => {
        const imageUrl = 'https://via.placeholder.com/300x150?text=Generated+Image'; // Placeholder
        panelImageDiv.innerHTML = `<img src="${imageUrl}" alt="Panel Image">`;
        panel.imageUrl = imageUrl;
        showToast('תמונה נוצרה בהצלחה!', 'success');
    }, 2000);

    // In a real application, you would call your image generation API here (e.g., DALL-E, Midjourney via API, etc.)
    // try {
    //     const response = await fetch('YOUR_IMAGE_GENERATION_API_ENDPOINT', {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json',
    //             'Authorization': `Bearer ${apiKey}` // If required
    //         },
    //         body: JSON.stringify({ prompt: prompt, style: artStyle })
    //     });
    //     const data = await response.json();
    //     const imageUrl = data.imageUrl; // Assuming API returns imageUrl

    //     panelImageDiv.innerHTML = `<img src="${imageUrl}" alt="Panel Image">`;
    //     panel.imageUrl = imageUrl;
    //     showToast('תמונה נוצרה בהצלחה!', 'success');
    // } catch (error) {
    //     console.error('Error generating image:', error);
    //     panelImageDiv.innerHTML = 'שגיאה ביצירת תמונה. נסה שוב.';
    //     showToast('שגיאה ביצירת תמונה.', 'error');
    // }
}

function openImageUpload(panelId) {
    // Simulate image upload (in a real app, you'd open a file input or a modal for URL)
    const imageUrl = prompt('הכנס כתובת URL של תמונה או השאר ריק ליצירה עם AI:');
    if (imageUrl !== null) {
        const panel = currentComicPanels.find(p => p.id === panelId);
        if (panel) {
            panel.imageUrl = imageUrl.trim() !== '' ? imageUrl : '';
            const panelImageDiv = document.querySelector(`.comic-panel-item[data-panel-id="${panelId}"] .panel-image`);
            if (panel.imageUrl) {
                panelImageDiv.innerHTML = `<img src="${panel.imageUrl}" alt="Panel Image">`;
            } else {
                panelImageDiv.innerHTML = 'לחץ להעלאת תמונה או צור עם AI';
            }
            showToast('תמונה עודכנה בהצלחה!', 'success');
        }
    }
}


// Drag and Drop for panels
let draggedPanel = null;

function addDragAndDropListeners(panelElement) {
    panelElement.addEventListener('dragstart', (e) => {
        draggedPanel = panelElement;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', panelElement.innerHTML);
        panelElement.classList.add('dragging');
    });

    panelElement.addEventListener('dragover', (e) => {
        e.preventDefault(); // Necessary to allow dropping
        if (e.target.closest('.comic-panel-item') !== draggedPanel) {
            e.target.closest('.comic-panel-item').classList.add('drag-over');
        }
    });

    panelElement.addEventListener('dragleave', (e) => {
        e.target.closest('.comic-panel-item').classList.remove('drag-over');
    });

    panelElement.addEventListener('drop', (e) => {
        e.preventDefault();
        e.target.closest('.comic-panel-item').classList.remove('drag-over');

        if (draggedPanel) {
            const dropTarget = e.target.closest('.comic-panel-item');
            if (dropTarget && draggedPanel !== dropTarget) {
                const comicPanelsContainer = document.getElementById('comic-panels');
                const draggedIndex = Array.from(comicPanelsContainer.children).indexOf(draggedPanel);
                const dropIndex = Array.from(comicPanelsContainer.children).indexOf(dropTarget);

                // Reorder in DOM
                if (draggedIndex < dropIndex) {
                    dropTarget.parentNode.insertBefore(draggedPanel, dropTarget.nextSibling);
                } else {
                    dropTarget.parentNode.insertBefore(draggedPanel, dropTarget);
                }

                // Reorder in currentComicPanels array
                const [removed] = currentComicPanels.splice(draggedIndex, 1);
                currentComicPanels.splice(dropIndex, 0, removed);

                updatePanelNumbers();
            }
        }
    });

    panelElement.addEventListener('dragend', () => {
        draggedPanel.classList.remove('dragging');
        document.querySelectorAll('.comic-panel-item.drag-over').forEach(item => {
            item.classList.remove('drag-over');
        });
        draggedPanel = null;
    });
}

// Function to download the comic
function downloadComic() {
    showToast('פונקציית הורדת קומיקס אינה מיושמת במלואה בדמו זה.', 'info');
    // In a real application, you would render the comic to a canvas or PDF and trigger download.
}

// Project Management Functions (New)
let projects = JSON.parse(localStorage.getItem('comicProjects')) || [];

function saveProject() {
    if (currentComicPanels.length === 0) {
        showToast('אין פנלים לשמירה. אנא צור פנלים לפני השמירה.', 'error');
        return;
    }
    showSaveProjectModal();
}

function showSaveProjectModal() {
    const saveProjectModal = document.getElementById('save-project-modal');
    saveProjectModal.style.display = 'block';
    // Pre-fill project name if editing an existing project
    const projectNameInput = document.getElementById('project-name');
    if (currentProjectId) {
        const existingProject = projects.find(p => p.id === currentProjectId);
        if (existingProject) {
            projectNameInput.value = existingProject.name;
        }
    } else {
        projectNameInput.value = ''; // Clear for new projects
    }
}

function closeSaveProjectModal() {
    document.getElementById('save-project-modal').style.display = 'none';
}

document.getElementById('save-project-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const projectName = document.getElementById('project-name').value.trim();

    if (!projectName) {
        showToast('אנא הכנס שם לפרויקט.', 'error');
        return;
    }

    if (currentProjectId) {
        // Update existing project
        const projectIndex = projects.findIndex(p => p.id === currentProjectId);
        if (projectIndex !== -1) {
            projects[projectIndex].name = projectName;
            projects[projectIndex].panels = currentComicPanels;
            projects[projectIndex].lastModified = new Date().toLocaleString();
            showToast(`הפרויקט "${projectName}" עודכן בהצלחה!`, 'success');
        }
    } else {
        // Save new project
        const newProject = {
            id: Date.now(),
            name: projectName,
            panels: currentComicPanels,
            createdAt: new Date().toLocaleString(),
            lastModified: new Date().toLocaleString()
        };
        projects.push(newProject);
        showToast(`הפרויקט "${projectName}" נשמר בהצלחה!`, 'success');
    }

    localStorage.setItem('comicProjects', JSON.stringify(projects));
    closeSaveProjectModal();
    loadProjects(); // Refresh projects list
    currentProjectId = null; // Reset current project ID after saving
    document.getElementById('project-name').value = ''; // Clear input field
});

function loadProjects() {
    const projectsListContainer = document.getElementById('projects-list');
    projectsListContainer.innerHTML = ''; // Clear current list

    if (projects.length === 0) {
        projectsListContainer.innerHTML = '<p style="text-align: center; color: #666;">עדיין אין פרויקטים שמורים. התחל ליצור!</p>';
        return;
    }

    projects.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified)); // Sort by last modified

    projects.forEach(project => {
        const projectCard = document.createElement('div');
        projectCard.classList.add('project-card');
        projectCard.dataset.projectId = project.id;
        projectCard.innerHTML = `
            <h3>${project.name}</h3>
            <p>נוצר: ${project.createdAt}</p>
            <p>עודכן לאחרונה: ${project.lastModified}</p>
            <div class="project-actions">
                <button class="btn btn-primary" onclick="loadProject(${project.id})"><i class="fas fa-folder-open"></i> פתח</button>
                <button class="btn btn-secondary" onclick="showEditProjectModal(${project.id}, '${project.name}')"><i class="fas fa-pencil-alt"></i> שנה שם</button>
                <button class="btn btn-danger" onclick="deleteProject(${project.id})"><i class="fas fa-trash"></i> מחק</button>
            </div>
        `;
        projectsListContainer.appendChild(projectCard);
    });
}

function loadProject(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (project) {
        currentComicPanels = JSON.parse(JSON.stringify(project.panels)); // Deep copy
        currentProjectId = projectId; // Set current project being edited

        const comicPanelsContainer = document.getElementById('comic-panels');
        comicPanelsContainer.innerHTML = ''; // Clear existing panels in editor

        currentComicPanels.forEach(panelData => {
            addPanel(panelData.text, panelData.imageUrl, panelData.dialogs);
        });
        showSection('comic-editor');
        showToast(`הפרויקט "${project.name}" נטען בהצלחה!`, 'success');
    } else {
        showToast('שגיאה: פרויקט לא נמצא.', 'error');
    }
}

function showEditProjectModal(projectId, currentName) {
    const editModal = document.getElementById('edit-project-modal');
    document.getElementById('edit-project-name').value = currentName;
    document.getElementById('edit-project-id').value = projectId;
    editModal.style.display = 'block';
}

function closeEditProjectModal() {
    document.getElementById('edit-project-modal').style.display = 'none';
}

document.getElementById('edit-project-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const newName = document.getElementById('edit-project-name').value.trim();
    const projectId = parseInt(document.getElementById('edit-project-id').value);

    if (!newName) {
        showToast('אנא הכנס שם חדש לפרויקט.', 'error');
        return;
    }

    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex !== -1) {
        const oldName = projects[projectIndex].name;
        projects[projectIndex].name = newName;
        projects[projectIndex].lastModified = new Date().toLocaleString();
        localStorage.setItem('comicProjects', JSON.stringify(projects));
        showToast(`שם הפרויקט שונה מ-"${oldName}" ל-"${newName}" בהצלחה!`, 'success');
        closeEditProjectModal();
        loadProjects(); // Refresh the list
    } else {
        showToast('שגיאה: פרויקט לא נמצא לשינוי שם.', 'error');
    }
});


function deleteProject(projectId) {
    if (confirm('האם אתה בטוח שברצונך למחוק פרויקט זה?')) {
        projects = projects.filter(p => p.id !== projectId);
        localStorage.setItem('comicProjects', JSON.stringify(projects));
        showToast('הפרויקט נמחק בהצלחה!', 'info');
        loadProjects(); // Refresh the list
    }
}

function filterProjects() {
    const searchTerm = document.getElementById('project-search').value.toLowerCase();
    const projectCards = document.querySelectorAll('.projects-list .project-card');

    projectCards.forEach(card => {
        const projectName = card.querySelector('h3').textContent.toLowerCase();
        if (projectName.includes(searchTerm)) {
            card.style.display = 'flex'; // Show
        } else {
            card.style.display = 'none'; // Hide
        }
    });
}


// Feedback Section (existing functions, slightly modified for toast)
let userRating = 0;

document.getElementById('star-rating').addEventListener('click', (e) => {
    if (e.target.classList.contains('star')) {
        userRating = parseInt(e.target.dataset.rating);
        document.querySelectorAll('.star').forEach(star => {
            if (parseInt(star.dataset.rating) <= userRating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }
});

function submitFeedback() {
    const feedbackText = document.getElementById('feedback-text').value.trim();

    if (userRating === 0 && feedbackText === '') {
        showToast('אנא דרג את החוויה שלך או כתוב משוב.', 'error');
        return;
    }

    // In a real app, you would send this data to a server.
    console.log('Feedback Submitted:', { rating: userRating, text: feedbackText });
    showToast('תודה על המשוב שלך!', 'success');
    document.getElementById('feedback-text').value = '';
    userRating = 0;
    document.querySelectorAll('.star').forEach(star => star.classList.remove('active'));
}

// Admin Section (placeholder functions)
function updateAdminStats() {
    // These would typically fetch data from a backend
    document.getElementById('total-users').textContent = '123';
    document.getElementById('total-comics').textContent = projects.length.toString(); // Using locally saved projects
    document.getElementById('avg-rating').textContent = '4.5'; // Placeholder
    document.getElementById('total-feedback').textContent = '50'; // Placeholder
}

function generateReport() {
    showToast('פונקציית יצירת דוח אינה מיושמת במלואה בדמו זה.', 'info');
}

function sendReportEmail() {
    showToast('פונקציית שליחת דוח למייל אינה מיושמת במלואה בדמו זה.', 'info');
}

// Initial calls
toggleCreationMode(); // Set initial state for story editor
updateAdminStats(); // Update admin stats on load
