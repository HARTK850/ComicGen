// ComicGen - Comic Generator Application
// Global State Management
const AppState = {
  apiKey: localStorage.getItem("gemini_api_key") || "",
  backupApiKey: "",
  storyModel: localStorage.getItem("story_model") || "gemini-2.5-flash",
  imageModel: localStorage.getItem("image_model") || "gemini-2.5-flash-image", // שם מודל נכון ליצירת תמונות
  currentSection: "home",
  currentProject: null,
  projects: [],
  selectedRating: 0,
  isGenerating: false,
};

// בדיקה והחלפה של המודל אם צריך
if (AppState.imageModel.includes("preview")) {
  AppState.imageModel = "gemini-2.5-flash-image";
  localStorage.setItem("image_model", AppState.imageModel);
}

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  hideLoadingScreen();
  initializeApp();
  loadProjects();
  updateNavigation();
});

function hideLoadingScreen() {
  const loadingScreen = document.getElementById("loading-screen");
  if (loadingScreen) {
    setTimeout(() => {
      loadingScreen.style.opacity = "0";
      setTimeout(() => {
        loadingScreen.style.display = "none";
      }, 500);
    }, 1000);
  }
}

function initializeApp() {
  try {
    const savedProjects = localStorage.getItem("projects");
    AppState.projects = savedProjects ? JSON.parse(savedProjects) : [];
    if (!Array.isArray(AppState.projects)) {
      AppState.projects = [];
      localStorage.setItem("projects", "[]");
    }
  } catch (error) {
    console.error("[v0] Error loading projects:", error);
    AppState.projects = [];
    localStorage.setItem("projects", "[]");
  }

  // Load saved API key
  if (AppState.apiKey) {
    document.getElementById("api-key").value = AppState.apiKey;
  }

  // Load saved story model
  const storyModelSelect = document.getElementById("story-model");
  if (storyModelSelect) {
    storyModelSelect.value = AppState.storyModel;
  }

  // Initialize star rating
  initializeStarRating();

  // Set default creation type and art style
  const creationType = document.getElementById("creation-type");
  const artStyle = document.getElementById("art-style");
  if (creationType) creationType.value = "ai";
  if (artStyle) artStyle.value = "comic";
  toggleCreationMode();
}

// Navigation Functions
function showSection(sectionId) {
  document.querySelectorAll(".section").forEach((section) => {
    section.classList.remove("active");
  });
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add("active");
    AppState.currentSection = sectionId;
  }
  updateNavigation();
}

function updateNavigation() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  const activeBtn = document.querySelector(
    `.nav-btn[onclick="showSection('${AppState.currentSection}')"]`
  );
  if (activeBtn) {
    activeBtn.classList.add("active");
  }
  if (AppState.currentSection === "projects") {
    loadProjects();
  }
}

// API Key Management
function toggleApiKeyVisibility() {
  const apiKeyInput = document.getElementById("api-key");
  const eyeIcon = document.getElementById("eye-icon");
  if (apiKeyInput && eyeIcon) {
    if (apiKeyInput.type === "password") {
      apiKeyInput.type = "text";
      eyeIcon.classList.remove("fa-eye");
      eyeIcon.classList.add("fa-eye-slash");
    } else {
      apiKeyInput.type = "password";
      eyeIcon.classList.remove("fa-eye-slash");
      eyeIcon.classList.add("fa-eye");
    }
  }
}

async function validateApiKey() {
  const apiKey = document.getElementById("api-key")?.value.trim() || "";
  const statusDiv = document.getElementById("api-status");
  const btn = document.getElementById("validate-api-btn");
  const btnText = document.getElementById("validate-btn-text");

  if (!apiKey) {
    if (statusDiv) {
      showStatus(statusDiv, "error", "אנא הכנס מפתח API");
    }
    return;
  }

  if (btn) {
    btn.classList.add("btn-loading");
    btn.disabled = true;
  }
  if (btnText) btnText.textContent = "בודק...";

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Hello" }] }],
        }),
      }
    );

    if (response.ok) {
      if (statusDiv) {
        showStatus(statusDiv, "success", "✓ מפתח API תקין ונשמר בהצלחה!");
      }
      AppState.apiKey = apiKey;
      localStorage.setItem("gemini_api_key", apiKey);
      showToast("success", "מפתח API נשמר בהצלחה");
    } else {
      if (statusDiv) {
        showStatus(statusDiv, "error", "✗ מפתח API לא תקין. אנא בדוק ונסה שוב.");
      }
      showToast("error", "מפתח API לא תקין");
    }
  } catch (error) {
    if (statusDiv) {
      showStatus(statusDiv, "error", "✗ שגיאה בבדיקת המפתח. אנא נסה שוב.");
    }
    showToast("error", "שגיאה בבדיקת המפתח");
  } finally {
    if (btn) {
      btn.classList.remove("btn-loading");
      btn.disabled = false;
      if (btnText) btnText.textContent = "בדוק ושמור";
    }
  }
}

function showStatus(element, type, message) {
  if (element) {
    element.textContent = message;
    element.className = `api-status ${type}`;
  }
}

function saveSettings() {
  const storyModel = document.getElementById("story-model")?.value || "gemini-2.5-flash";
  AppState.storyModel = storyModel;
  localStorage.setItem("story_model", storyModel);
  showToast("success", "ההגדרות נשמרו בהצלחה");
}

// Story Editor Functions
function toggleCreationMode() {
  const creationType = document.getElementById("creation-type")?.value || "ai";
  const manualInput = document.getElementById("manual-input");
  const aiInput = document.getElementById("ai-input");

  if (manualInput && aiInput) {
    if (creationType === "manual") {
      manualInput.style.display = "block";
      aiInput.style.display = "none";
    } else {
      manualInput.style.display = "none";
      aiInput.style.display = "block";
    }
  }
}

async function processStory() {
  const storyText = document.getElementById("story-text")?.value.trim() || "";
  if (!storyText) {
    showToast("error", "אנא הכנס סיפור");
    return;
  }
  if (!AppState.apiKey) {
    showToast("error", "אנא הגדר מפתח API תחילה");
    showSection("api-setup");
    return;
  }

  showToast("info", "מעבד את הסיפור ומייצר תמונות...");
  await generateComic(storyText, document.getElementById("art-style")?.value || "comic", false);
}

async function generateAIStory() {
  if (!AppState.apiKey) {
    showToast("error", "אנא הגדר מפתח API תחילה");
    showSection("api-setup");
    return;
  }

  const storyPrompt = document.getElementById("story-prompt")?.value.trim() || "";
  if (!storyPrompt) {
    showToast("error", "אנא תאר את הסיפור שאתה רוצה");
    return;
  }

  showToast("info", "מייצר סיפור AI ותמונות...");
  await generateComic(storyPrompt, document.getElementById("art-style")?.value || "comic", true);
}

async function generateComic(input, artStyle, isAIGenerated) {
  if (AppState.isGenerating) {
    showToast("info", "יצירה כבר בתהליך...");
    return;
  }

  AppState.isGenerating = true;
  const btnId = isAIGenerated ? "create-ai-btn" : "create-btn";
  const btnTextId = isAIGenerated ? "create-ai-btn-text" : "create-btn-text";
  const btn = document.getElementById(btnId);
  const btnText = document.getElementById(btnTextId);

  if (btn) btn.disabled = true;
  if (btnText) btnText.textContent = "0%";

  try {
    // Step 1: Generate or process story (10%)
    let storyStructure;
    if (isAIGenerated) {
      storyStructure = await generateStoryWithAI(input, artStyle);
    } else {
      storyStructure = await processManualStory(input, artStyle);
    }
    if (btnText) updateProgress(btnText, 10);

    // Step 2: Check API quota (15%)
    const quotaCheck = await checkImageGenerationQuota(storyStructure.pages.length);
    if (!quotaCheck.canGenerate) {
      const backupKey = await promptForBackupApiKey();
      if (!backupKey) throw new Error("לא ניתן להמשיך בלי מפתח API נוסף");
      AppState.backupApiKey = backupKey;
    }
    if (btnText) updateProgress(btnText, 15);

    // Step 3: Generate comic pages (20% - 95%)
    const pages = await generateComicPages(storyStructure, artStyle, btnText);

    // Step 4: Display results (100%)
    if (btnText) updateProgress(btnText, 100);
    AppState.currentProject = {
      id: Date.now(),
      name: "קומיקס חדש",
      pages: pages,
      createdAt: new Date().toISOString(),
      artStyle: artStyle,
    };

    setTimeout(() => {
      showSection("comic-editor");
      displayComicInEditor(pages);
      AppState.isGenerating = false;
      if (btn) btn.disabled = false;
      if (btnText)
        btnText.textContent = isAIGenerated ? "יצירת הקומיקס" : "יצירת הקומיקס";
    }, 500);
  } catch (error) {
    console.error("[v0] Error generating comic:", error);
    showToast("error", `שגיאה ביצירת הקומיקס: ${error.message}`);
    AppState.isGenerating = false;
    if (btn) btn.disabled = false;
    if (btnText)
      btnText.textContent = isAIGenerated ? "יצירת הקומיקס" : "יצירת הקומיקס";
  }
}

function updateProgress(element, percentage) {
  if (element) element.textContent = `${percentage}%`;
}

async function generateStoryWithAI(prompt, artStyle) {
  const systemPrompt = `אתה כותב קומיקס מקצועי. צור סיפור קומיקס מרתק בעברית על פי ההנחיה הבאה.
חלק את הסיפור לעמודים (1-10 עמודים), כאשר כל עמוד מכיל 3-6 פאנלים.
כל פאנל צריך לכלול:
1. תיאור ויזואלי מפורט של הסצנה
2. דיאלוג או מחשבות של הדמויות (אם יש)
3. טקסט נרטיבי (אם נדרש)

החזר את התשובה בפורמט JSON:
{
  "title": "כותרת הקומיקס",
  "pages": [
    {
      "pageNumber": 1,
      "panels": [
        {
          "panelNumber": 1,
          "visualDescription": "תיאור מפורט",
          "dialogue": "דיאלוג או מחשבות",
          "narration": "טקסט נרטיבי"
        }
      ]
    }
  ]
}`;

  const response = await callGeminiAPI(
    AppState.storyModel,
    `${systemPrompt}\n\nהנחיה: ${prompt}\nסגנון: ${getStyleDescription(artStyle)}`
  );
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("לא ניתן לפרסר את תשובת ה-AI");
  return JSON.parse(jsonMatch[0]);
}

async function processManualStory(storyText, artStyle) {
  const systemPrompt = `אתה עורך קומיקס מקצועי. קבל סיפור בעברית וחלק אותו לעמודים.
חלק את הסיפור לעמודים (1-10 עמודים), כאשר כל עמוד מכיל 3-6 פאנלים.
כל פאנל צריך לכלול:
1. תיאור ויזואלי מפורט של הסצנה
2. דיאלוג או מחשבות של הדמויות (אם יש)
3. טקסט נרטיבי (אם נדרש)

החזר את התשובה בפורמט JSON:
{
  "title": "כותרת הקומיקס",
  "pages": [
    {
      "pageNumber": 1,
      "panels": [
        {
          "panelNumber": 1,
          "visualDescription": "תיאור מפורט",
          "dialogue": "דיאלוג או מחשבות",
          "narration": "טקסט נרטיבי"
        }
      ]
    }
  ]
}`;

  const response = await callGeminiAPI(
    AppState.storyModel,
    `${systemPrompt}\n\nסיפור:\n${storyText}\n\nסגנון: ${getStyleDescription(artStyle)}`
  );
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("לא ניתן לפרסר את תשובת ה-AI");
  return JSON.parse(jsonMatch[0]);
}

function getStyleDescription(artStyle) {
  const styles = {
    anime: "אנימה יפנית - עיניים גדולות, צבעים חיים, קווים נקיים",
    realistic: "ריאליסטי - פרטים מדויקים, תאורה טבעית, פרופורציות אמיתיות",
    cartoon: "קריקטורה - מוגזם, צבעוני, משעשע",
    comic: "קומיקס קלאסי - קווים מתאר מודגשים, צללים דרמטיים, בועות דיבור",
    manga: "מנגה - שחור לבן, קווים מהירות, ביטויים דרמטיים",
  };
  return styles[artStyle] || styles["comic"];
}

async function checkImageGenerationQuota(numberOfPages) {
  if (numberOfPages > 10) {
    showToast("warning", "מספר עמודים גדול – זה עלול לנצל את המכסה היומית!");
  }
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${AppState.imageModel}?key=${AppState.apiKey}`
    );
    return { canGenerate: response.ok };
  } catch (error) {
    console.error("[v0] Error checking quota:", error);
    return { canGenerate: true }; // התרשה המשך גם אם הבדיקה נכשלה
  }
}

async function promptForBackupApiKey() {
  return new Promise((resolve) =>
    resolve(prompt("אנא הזן מפתח API נוסף לגיבוי.")?.trim() || null)
  );
}

async function generateComicPages(storyStructure, artStyle, progressElement) {
  const pages = [];
  const totalPages = Math.min(storyStructure.pages.length, 1); // הגבל לעמוד אחד
  const progressPerPage = 75 / totalPages;
  let currentProgress = 20;

  for (let i = 0; i < totalPages; i++) {
    const page = storyStructure.pages[i];
    try {
      const imageUrl = await generatePageImage(page, artStyle, storyStructure.title);
      pages.push({
        pageNumber: page.pageNumber,
        imageUrl: imageUrl,
        panels: page.panels,
      });
      currentProgress += progressPerPage;
      if (progressElement) updateProgress(progressElement, Math.round(currentProgress));
    } catch (error) {
      console.error(`[v0] Error generating page ${i + 1}:`, error);
      if (AppState.backupApiKey) {
        try {
          const imageUrl = await generatePageImage(page, artStyle, storyStructure.title, true);
          pages.push({
            pageNumber: page.pageNumber,
            imageUrl: imageUrl,
            panels: page.panels,
          });
          currentProgress += progressPerPage;
          if (progressElement) updateProgress(progressElement, Math.round(currentProgress));
        } catch (backupError) {
          console.error(`[v0] Error with backup key for page ${i + 1}:`, backupError);
          pages.push({
            pageNumber: page.pageNumber,
            imageUrl: null,
            panels: page.panels,
            error: backupError.message,
          });
          currentProgress += progressPerPage;
          if (progressElement) updateProgress(progressElement, Math.round(currentProgress));
        }
      } else {
        pages.push({
          pageNumber: page.pageNumber,
          imageUrl: null,
          panels: page.panels,
          error: error.message,
        });
        currentProgress += progressPerPage;
        if (progressElement) updateProgress(progressElement, Math.round(currentProgress));
      }
    }
    await sleep(2500); // עיכוב של 2.5 שניות למניעת 429
  }

  return pages;
}

async function generatePageImage(page, artStyle, title, useBackupKey = false) {
  const apiKey = useBackupKey ? AppState.backupApiKey : AppState.apiKey;
  let pagePrompt = `Create a complete comic book page in ${getStyleDescription(
    artStyle
  )} style.\nTitle: ${title}\nPage ${page.pageNumber} contains ${page.panels.length} panels:\n\n`;
  page.panels.forEach((panel, index) => {
    pagePrompt += `Panel ${index + 1}:\nScene: ${panel.visualDescription}\n`;
    if (panel.dialogue) pagePrompt += `Dialogue (in Hebrew): ${panel.dialogue}\n`;
    if (panel.narration) pagePrompt += `Narration (in Hebrew): ${panel.narration}\n`;
    pagePrompt += `\n`;
  });
  pagePrompt += `\nAll text must be in Hebrew! Create a professional layout with speech bubbles and narration boxes.`;
  return await generateImageWithGemini(pagePrompt, useBackupKey);
}

async function generateImageWithGemini(pagePrompt, useBackup = false) {
  console.log("[v0] Calling Gemini 2.5 Flash Image API");
  const apiKey = useBackup ? AppState.backupApiKey : AppState.apiKey;
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${AppState.imageModel}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: pagePrompt }] }],
            generationConfig: {
              temperature: 0.8,
              topK: 40,
              topP: 0.95,
            },
          }),
        }
      );

      if (response.status === 429) {
        const errorData = await response.json();
        const retryDelay =
          errorData.error?.details?.find((d) => d["@type"] === "type.googleapis.com/google.rpc.RetryInfo")
            ?.retryDelay || "60s";
        const delayMs = parseInt(retryDelay.replace("s", "")) * 1000 || 60000;
        console.log(`[v0] Rate limit hit, retrying after ${retryDelay}`);
        await sleep(delayMs);
        retryCount++;
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API שגיאה ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      if (!data.candidates || !data.candidates[0].content.parts[0].inlineData) {
        throw new Error("No image data in response");
      }

      const imageData = data.candidates[0].content.parts[0].inlineData.data;
      console.log("[v0] Image generated successfully – base64 length:", imageData.length);
      return `data:image/png;base64,${imageData}`;
    } catch (error) {
      console.error("[v0] Gemini API error:", error);
      if (retryCount < maxRetries - 1) {
        await sleep(5000);
        retryCount++;
      } else {
        throw error;
      }
    }
  }
  throw new Error("Exceeded max retries");
}

function displayComicInEditor(pages) {
  const comicPanels = document.getElementById("comic-panels");
  if (comicPanels) {
    comicPanels.innerHTML = "";
    pages.forEach((page, index) => {
      const pageDiv = document.createElement("div");
      pageDiv.className = "comic-panel-item";
      pageDiv.dataset.index = index;

      const header = document.createElement("div");
      header.className = "panel-header";
      header.innerHTML = `
        <span class="panel-number">עמוד ${page.pageNumber}</span>
        <div class="panel-controls">
          <button class="panel-btn" onclick="deletePanel(${index})" title="מחק">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;

      const content = document.createElement("div");
      content.className = "panel-content";

      if (page.imageUrl) {
        const img = document.createElement("img");
        img.src = page.imageUrl;
        img.alt = `עמוד ${page.pageNumber}`;
        img.className = "panel-generated-image";
        img.loading = "eager";
        img.style.width = "100%";
        img.style.height = "auto";
        img.style.borderRadius = "8px";
        content.appendChild(img);
      } else if (page.error) {
        const errorDiv = document.createElement("div");
        errorDiv.className = "panel-image";
        errorDiv.style.background = "#fff3cd";
        errorDiv.style.color = "#856404";
        errorDiv.style.padding = "20px";
        errorDiv.style.textAlign = "center";
        errorDiv.innerHTML = `
          <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px;"></i><br>
          <strong>שגיאה ביצירת התמונה</strong><br>
          <small style="font-size: 0.8rem;">${page.error}</small>
        `;
        content.appendChild(errorDiv);
      } else {
        content.innerHTML = '<div class="panel-image">טוען תמונה...</div>';
      }

      const textDiv = document.createElement("div");
      textDiv.style.marginTop = "10px";
      page.panels.forEach((panel, pIndex) => {
        const panelText = document.createElement("div");
        panelText.className = "panel-text-item";
        let textContent = `<strong>פאנל ${pIndex + 1}:</strong><br>`;
        if (panel.dialogue) textContent += `💬 ${panel.dialogue}<br>`;
        if (panel.narration) textContent += `📝 ${panel.narration}`;
        panelText.innerHTML = textContent;
        textDiv.appendChild(panelText);
      });
      content.appendChild(textDiv);

      pageDiv.appendChild(header);
      pageDiv.appendChild(content);
      comicPanels.appendChild(pageDiv);
    });
  }
}

function addPanel() {
  showToast("info", 'השתמש ב"עורך הסיפור" ליצירת פאנלים חדשים');
}

function deletePanel(index) {
  if (confirm("האם אתה בטוח שברצונך למחוק עמוד זה?")) {
    AppState.currentProject.pages.splice(index, 1);
    displayComicInEditor(AppState.currentProject.pages);
    showToast("success", "העמוד נמחק");
  }
}

// Project Management
function showSaveProjectModal() {
  if (!AppState.currentProject) {
    showToast("error", "אין פרויקט לשמור");
    return;
  }
  const modal = document.getElementById("save-project-modal");
  if (modal) modal.style.display = "block";
  const form = document.getElementById("save-project-form");
  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      saveProject();
    };
  }
}

function closeSaveProjectModal() {
  const modal = document.getElementById("save-project-modal");
  if (modal) modal.style.display = "none";
}

function saveProject() {
  const projectName = document.getElementById("project-name")?.value.trim() || "";
  if (!projectName) {
    showToast("error", "אנא הכנס שם לפרויקט");
    return;
  }

  AppState.currentProject.name = projectName;
  const existingIndex = AppState.projects.findIndex((p) => p.id === AppState.currentProject.id);
  if (existingIndex >= 0) {
    AppState.projects[existingIndex] = AppState.currentProject;
  } else {
    AppState.projects.push(AppState.currentProject);
  }

  try {
    localStorage.setItem("projects", JSON.stringify(AppState.projects));
    closeSaveProjectModal();
    showToast("success", "הפרויקט נשמר בהצלחה");
    loadProjects();
  } catch (error) {
    console.error("[v0] Error saving project:", error);
    showToast("error", "שגיאה בשמירת הפרויקט");
  }
}

function loadProjects() {
  const projectsList = document.getElementById("projects-list");
  if (!projectsList) return;

  try {
    const savedProjects = localStorage.getItem("projects");
    AppState.projects = savedProjects ? JSON.parse(savedProjects) : [];
    if (!Array.isArray(AppState.projects)) {
      AppState.projects = [];
      localStorage.setItem("projects", "[]");
    }
  } catch (error) {
    console.error("[v0] Error loading projects:", error);
    AppState.projects = [];
    localStorage.setItem("projects", "[]");
  }

  if (AppState.projects.length === 0) {
    projectsList.innerHTML =
      '<p style="text-align: center; color: #666; padding: 40px;">אין פרויקטים שמורים</p>';
    return;
  }

  projectsList.innerHTML = "";
  AppState.projects
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach((project, index) => {
      if (project && project.pages && Array.isArray(project.pages)) {
        const projectCard = createProjectCard(project, index);
        projectsList.appendChild(projectCard);
      }
    });
}

function toHebrewDate(dateString) {
  try {
    const date = new Date(dateString);
    const Hebcal = window.Hebcal || {};
    if (Hebcal.HDate) {
      const hDate = new Hebcal.HDate(date);
      const hebrewDay = hDate.getDate();
      const hebrewMonth = hDate.getMonthName("he");
      const hebrewYear = hDate.getFullYear();
      return `${hebrewDay} ב${hebrewMonth} ${hebrewYear}`;
    }
    return date.toLocaleDateString("he-IL");
  } catch (error) {
    console.error("[v0] Error converting to Hebrew date:", error);
    return new Date(dateString).toLocaleDateString("he-IL");
  }
}

function createProjectCard(project, index) {
  if (!project || !project.pages) return document.createElement("div");
  const card = document.createElement("div");
  card.className = "project-card";
  card.dataset.projectName = (project.name || "").toLowerCase();
  const hebrewDate = toHebrewDate(project.createdAt);
  card.innerHTML = `
    <h3>${project.name || "ללא שם"}</h3>
    <p>נוצר ב: ${hebrewDate}</p>
    <p>עמודים: ${project.pages.length}</p>
    <div class="project-actions" style="display: flex; gap: 10px; margin-top: 10px;">
      <button class="btn btn-primary" onclick="loadProject(${index})" style="padding: 8px 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
        <i class="fas fa-folder-open"></i> פתח
      </button>
      <button class="btn btn-secondary" onclick="showEditProjectModal(${index})" style="padding: 8px 12px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
        <i class="fas fa-edit"></i> שנה שם
      </button>
      <button class="btn btn-danger" onclick="deleteProject(${index})" style="padding: 8px 12px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
        <i class="fas fa-trash"></i> מחק
      </button>
    </div>
  `;
  return card;
}

function loadProject(index) {
  AppState.currentProject = AppState.projects[index];
  showSection("comic-editor");
  displayComicInEditor(AppState.currentProject.pages);
  showToast("success", "הפרויקט נטען");
}

function showEditProjectModal(index) {
  const modal = document.getElementById("edit-project-modal");
  const project = AppState.projects[index];
  if (modal) {
    document.getElementById("edit-project-name").value = project.name;
    document.getElementById("edit-project-id").value = index;
    modal.style.display = "block";
  }
}

function closeEditProjectModal() {
  const modal = document.getElementById("edit-project-modal");
  if (modal) modal.style.display = "none";
}

function updateProjectName() {
  const newName = document.getElementById("edit-project-name")?.value.trim() || "";
  const index = parseInt(document.getElementById("edit-project-id")?.value) || -1;
  if (!newName) {
    showToast("error", "אנא הכנס שם");
    return;
  }
  if (index >= 0) {
    AppState.projects[index].name = newName;
    localStorage.setItem("projects", JSON.stringify(AppState.projects));
    closeEditProjectModal();
    loadProjects();
    showToast("success", "השם עודכן");
  }
}

function deleteProject(index) {
  if (confirm("האם אתה בטוח שברצונך למחוק פרויקט זה?")) {
    AppState.projects.splice(index, 1);
    localStorage.setItem("projects", JSON.stringify(AppState.projects));
    loadProjects();
    showToast("success", "הפרויקט נמחק");
  }
}

function filterProjects() {
  const searchTerm = (document.getElementById("project-search")?.value || "").toLowerCase();
  const projectCards = document.querySelectorAll(".project-card");
  projectCards.forEach((card) => {
    const projectName = card.dataset.projectName;
    card.style.display = projectName.includes(searchTerm) ? "flex" : "none";
  });
}

// Download Comic as PDF
async function downloadComic() {
  if (!AppState.currentProject || !AppState.currentProject.pages.length) {
    showToast("error", "אין קומיקס להורדה");
    return;
  }
  showToast("info", "מכין PDF...");
  try {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
      await downloadAsImages();
      return;
    }
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    AppState.currentProject.pages.forEach((page, i) => {
      if (page.imageUrl) {
        if (i > 0) pdf.addPage();
        pdf.addImage(page.imageUrl, "PNG", 10, 10, 190, 253);
      }
    });
    pdf.save(`${AppState.currentProject.name}.pdf`);
    showToast("success", "הקומיקס הורד בהצלחה");
  } catch (error) {
    console.error("[v0] Error creating PDF:", error);
    showToast("error", "שגיאה ביצירת PDF");
  }
}

async function downloadAsImages() {
  AppState.currentProject.pages.forEach((page, i) => {
    if (page.imageUrl) {
      const link = document.createElement("a");
      link.href = page.imageUrl;
      link.download = `${AppState.currentProject.name}_page_${i + 1}.png`;
      link.click();
    }
  });
  showToast("success", "התמונות הורדו");
}

// Feedback System
function initializeStarRating() {
  const stars = document.querySelectorAll(".star");
  stars.forEach((star) => {
    star.addEventListener("click", () => {
      AppState.selectedRating = parseInt(star.dataset.rating);
      stars.forEach((s, index) => {
        if (index < AppState.selectedRating) s.classList.add("active");
        else s.classList.remove("active");
      });
    });
    star.addEventListener("mouseenter", () => {
      const rating = parseInt(star.dataset.rating);
      stars.forEach((s, index) => {
        if (index < rating) s.style.color = "#ffd700";
      });
    });
    star.addEventListener("mouseleave", () => {
      stars.forEach((s, index) => {
        s.style.color = index < AppState.selectedRating ? "#ffd700" : "#ddd";
      });
    });
  });
}

function submitFeedback() {
  const feedbackText = document.getElementById("feedback-text")?.value.trim() || "";
  if (AppState.selectedRating === 0 && !feedbackText) {
    showToast("error", "אנא דרג או כתוב משוב");
    return;
  }
  console.log("Feedback Submitted:", { rating: AppState.selectedRating, text: feedbackText });
  showToast("success", "תודה על המשוב!");
  document.getElementById("feedback-text").value = "";
  AppState.selectedRating = 0;
  document.querySelectorAll(".star").forEach((s) => s.classList.remove("active"));
}

// Admin Functions (placeholder)
function updateAdminStats() {
  document.getElementById("total-users").textContent = "123";
  document.getElementById("total-comics").textContent = AppState.projects.length.toString();
  document.getElementById("avg-rating").textContent = "4.5";
  document.getElementById("total-feedback").textContent = "50";
}

function generateReport() {
  showToast("info", "יצירת דוח אינה מיושמת במלואה");
}

function sendReportEmail() {
  showToast("info", "שליחת דוח למייל אינה מיושמת במלואה");
}

// Toast Notifications
function showToast(type, message) {
  const container = document.getElementById("toast-container");
  if (container) {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${
      type === "success" ? "check-circle" : type === "error" ? "exclamation-circle" : "info-circle"
    }"></i><span>${message}</span>`;
    container.prepend(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Utility Functions
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGeminiAPI(model, prompt) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${AppState.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, topK: 40, topP: 0.95 },
      }),
    }
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error ${response.status}: ${errorText}`);
  }
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}
