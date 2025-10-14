// ComicGen - Comic Generator Application
// Global State Management
const AppState = {
  apiKey: localStorage.getItem("gemini_api_key") || "",
  backupApiKey: "",
  storyModel: localStorage.getItem("story_model") || "gemini-2.5-flash",
  imageModel: localStorage.getItem("image_model") || "flux-1.1-pro",
  currentSection: "home",
  currentProject: null,
  projects: [],
  selectedRating: 0,
  isGenerating: false,
}

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  hideLoadingScreen()
  initializeApp()
  loadProjects()
  updateNavigation()
})

function hideLoadingScreen() {
  const loadingScreen = document.getElementById("loading-screen")
  setTimeout(() => {
    loadingScreen.style.opacity = "0"
    setTimeout(() => {
      loadingScreen.style.display = "none"
    }, 500)
  }, 1000)
}

function initializeApp() {
  try {
    const savedProjects = localStorage.getItem("projects")
    AppState.projects = savedProjects ? JSON.parse(savedProjects) : []
    if (!Array.isArray(AppState.projects)) {
      AppState.projects = []
      localStorage.setItem("projects", "[]")
    }
  } catch (error) {
    console.error("[v0] Error loading projects:", error)
    AppState.projects = []
    localStorage.setItem("projects", "[]")
  }

  // Load saved API key
  if (AppState.apiKey) {
    document.getElementById("api-key").value = AppState.apiKey
  }

  // Load saved models
  document.getElementById("story-model").value = AppState.storyModel
  document.getElementById("image-model").value = AppState.imageModel

  // Initialize star rating
  initializeStarRating()

  // Set default creation type and art style
  document.getElementById("creation-type").value = "ai"
  document.getElementById("art-style").value = "comic"
  toggleCreationMode()
}

// Navigation Functions
function showSection(sectionId) {
  // Hide all sections
  document.querySelectorAll(".section").forEach((section) => {
    section.classList.remove("active")
  })

  // Show selected section
  const targetSection = document.getElementById(sectionId)
  if (targetSection) {
    targetSection.classList.add("active")
    AppState.currentSection = sectionId
  }

  // Update navigation buttons
  updateNavigation()
}

function updateNavigation() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.remove("active")
  })

  const activeBtn = Array.from(document.querySelectorAll(".nav-btn")).find((btn) => {
    const onclick = btn.getAttribute("onclick")
    return onclick && onclick.includes(`'${AppState.currentSection}'`)
  })

  if (activeBtn) {
    activeBtn.classList.add("active")
  }
}

// API Key Management
function toggleApiKeyVisibility() {
  const apiKeyInput = document.getElementById("api-key")
  const eyeIcon = document.getElementById("eye-icon")

  if (apiKeyInput.type === "password") {
    apiKeyInput.type = "text"
    eyeIcon.classList.remove("fa-eye")
    eyeIcon.classList.add("fa-eye-slash")
  } else {
    apiKeyInput.type = "password"
    eyeIcon.classList.remove("fa-eye-slash")
    eyeIcon.classList.add("fa-eye")
  }
}

async function validateApiKey() {
  const apiKey = document.getElementById("api-key").value.trim()
  const statusDiv = document.getElementById("api-status")
  const btn = document.getElementById("validate-api-btn")
  const btnText = document.getElementById("validate-btn-text")

  if (!apiKey) {
    showStatus(statusDiv, "error", "אנא הכנס מפתח API")
    return
  }

  // Show spinner on button
  btn.classList.add("btn-loading")
  btn.disabled = true
  btnText.textContent = "בודק..."

  try {
    // Test API key with a simple request
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: "Hello",
                },
              ],
            },
          ],
        }),
      },
    )

    if (response.ok) {
      AppState.apiKey = apiKey
      localStorage.setItem("gemini_api_key", apiKey)
      showStatus(statusDiv, "success", "✓ מפתח API תקין ונשמר בהצלחה!")
      showToast("success", "מפתח API נשמר בהצלחה")
    } else {
      showStatus(statusDiv, "error", "✗ מפתח API לא תקין. אנא בדוק ונסה שוב.")
      showToast("error", "מפתח API לא תקין")
    }
  } catch (error) {
    showStatus(statusDiv, "error", "✗ שגיאה בבדיקת המפתח. אנא נסה שוב.")
    showToast("error", "שגיאה בבדיקת המפתח")
  } finally {
    // Remove spinner
    btn.classList.remove("btn-loading")
    btn.disabled = false
    btnText.textContent = "בדוק ושמור"
  }
}

function showStatus(element, type, message) {
  element.textContent = message
  element.className = `api-status ${type}`
}

function saveSettings() {
  const storyModel = document.getElementById("story-model").value
  const imageModel = document.getElementById("image-model").value

  AppState.storyModel = storyModel
  AppState.imageModel = imageModel

  localStorage.setItem("story_model", storyModel)
  localStorage.setItem("image_model", imageModel)

  showToast("success", "ההגדרות נשמרו בהצלחה")
}

// Story Editor Functions
function toggleCreationMode() {
  const creationType = document.getElementById("creation-type").value
  const manualInput = document.getElementById("manual-input")
  const aiInput = document.getElementById("ai-input")

  if (creationType === "manual") {
    manualInput.style.display = "block"
    aiInput.style.display = "none"
  } else {
    manualInput.style.display = "none"
    aiInput.style.display = "block"
  }
}

async function processStory() {
  if (!AppState.apiKey) {
    showToast("error", "אנא הכנס מפתח API בהגדרות")
    showSection("settings")
    return
  }

  const storyText = document.getElementById("story-text").value.trim()
  if (!storyText) {
    showToast("error", "אנא הכנס סיפור")
    return
  }

  const artStyle = document.getElementById("art-style").value
  await generateComic(storyText, artStyle, false)
}

async function generateAIStory() {
  if (!AppState.apiKey) {
    showToast("error", "אנא הכנס מפתח API בהגדרות")
    showSection("settings")
    return
  }

  const storyPrompt = document.getElementById("story-prompt").value.trim()
  if (!storyPrompt) {
    showToast("error", "אנא תאר את הסיפור שאתה רוצה")
    return
  }

  const artStyle = document.getElementById("art-style").value
  await generateComic(storyPrompt, artStyle, true)
}

async function generateComic(input, artStyle, isAIGenerated) {
  if (AppState.isGenerating) {
    showToast("info", "יצירה כבר בתהליך...")
    return
  }

  AppState.isGenerating = true
  const btnId = isAIGenerated ? "create-ai-btn" : "create-btn"
  const btnTextId = isAIGenerated ? "create-ai-btn-text" : "create-btn-text"
  const btn = document.getElementById(btnId)
  const btnText = document.getElementById(btnTextId)

  btn.disabled = true
  btnText.textContent = "0%"

  try {
    // Step 1: Generate or process story (10%)
    updateProgress(btnText, 10)
    let storyStructure

    if (isAIGenerated) {
      storyStructure = await generateStoryWithAI(input, artStyle)
    } else {
      storyStructure = await processManualStory(input, artStyle)
    }

    // Step 2: Check API quota (15%)
    updateProgress(btnText, 15)
    const quotaCheck = await checkImageGenerationQuota(storyStructure.pages.length)

    if (!quotaCheck.canGenerate) {
      const backupKey = await promptForBackupApiKey()
      if (!backupKey) {
        throw new Error("לא ניתן להמשיך בלי מפתח API נוסף")
      }
      AppState.backupApiKey = backupKey
    }

    // Step 3: Generate comic pages (20% - 95%)
    const pages = await generateComicPages(storyStructure, artStyle, btnText)

    // Step 4: Display results (100%)
    updateProgress(btnText, 100)
    AppState.currentProject = {
      id: Date.now(),
      name: "קומיקס חדש",
      pages: pages,
      createdAt: new Date().toISOString(),
      artStyle: artStyle,
    }

    setTimeout(() => {
      showSection("comic-editor")
      displayComicInEditor(pages)
      AppState.isGenerating = false
      btn.disabled = false
      btnText.textContent = isAIGenerated ? "יצירת הקומיקס" : "יצירת הקומיקס"
    }, 500)
  } catch (error) {
    console.error("[v0] Error generating comic:", error)
    showToast("error", `שגיאה ביצירת הקומיקס: ${error.message}`)
    AppState.isGenerating = false
    btn.disabled = false
    btnText.textContent = isAIGenerated ? "יצירת הקומיקס" : "יצירת הקומיקס"
  }
}

function updateProgress(element, percentage) {
  element.textContent = `${percentage}%`
}

async function generateStoryWithAI(prompt, artStyle) {
  const systemPrompt = `אתה כותב קומיקס מקצועי. צור סיפור קומיקס מרתק בעברית על פי ההנחיה הבאה.
חלק את הסיפור לעמודים (3-10 עמודים), כאשר כל עמוד מכיל 3-6 פאנלים.
כל פאנל צריך לכלול:
1. תיאור ויזואלי מפורט של הסצנה
2. דיאלוג או מחשבות של הדמויות (אם יש)
3. טקסט נרטיבי (אם נדרש)

החזר את התשובה בפורמט JSON הבא:
{
  "title": "כותרת הקומיקס",
  "pages": [
    {
      "pageNumber": 1,
      "panels": [
        {
          "panelNumber": 1,
          "visualDescription": "תיאור מפורט של מה שנראה בפאנל",
          "dialogue": "דיאלוג או מחשבות",
          "narration": "טקסט נרטיבי"
        }
      ]
    }
  ]
}`

  const response = await callGeminiAPI(
    AppState.storyModel,
    `${systemPrompt}\n\nהנחיה: ${prompt}\nסגנון: ${getStyleDescription(artStyle)}`,
  )

  // Parse JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error("לא ניתן לפרסר את תשובת ה-AI")
  }

  return JSON.parse(jsonMatch[0])
}

async function processManualStory(storyText, artStyle) {
  const systemPrompt = `אתה עורך קומיקס מקצועי. קבל סיפור בעברית וחלק אותו לעמודי קומיקס.
חלק את הסיפור לעמודים (3-10 עמודים), כאשר כל עמוד מכיל 3-6 פאנלים.
כל פאנל צריך לכלול:
1. תיאור ויזואלי מפורט של הסצנה
2. דיאלוג או מחשבות של הדמויות (אם יש)
3. טקסט נרטיבי (אם נדרש)

החזר את התשובה בפורמט JSON הבא:
{
  "title": "כותרת הקומיקס",
  "pages": [
    {
      "pageNumber": 1,
      "panels": [
        {
          "panelNumber": 1,
          "visualDescription": "תיאור מפורט של מה שנראה בפאנל",
          "dialogue": "דיאלוג או מחשבות",
          "narration": "טקסט נרטיבי"
        }
      ]
    }
  ]
}`

  const response = await callGeminiAPI(
    AppState.storyModel,
    `${systemPrompt}\n\nסיפור:\n${storyText}\n\nסגנון: ${getStyleDescription(artStyle)}`,
  )

  // Parse JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error("לא ניתן לפרסר את תשובת ה-AI")
  }

  return JSON.parse(jsonMatch[0])
}

function getStyleDescription(artStyle) {
  const styles = {
    anime: "אנימה יפנית - עיניים גדולות, צבעים חיים, קווים נקיים",
    realistic: "ריאליסטי - פרטים מדויקים, תאורה טבעית, פרופורציות אמיתיות",
    cartoon: "קריקטורה - מוגזם, צבעוני, משעשע",
    comic: "קומיקס קלאסי - קווים מתאר מודגשים, צללים דרמטיים, בועות דיבור",
    manga: "מנגה - שחור לבן, קווים מהירות, ביטויים דרמטיים",
  }
  return styles[artStyle] || styles["comic"]
}

async function checkImageGenerationQuota(numberOfPages) {
  // This is a simplified check - in production, you'd want to call the actual quota API
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash?key=${AppState.apiKey}`,
    )
    if (response.ok) {
      return { canGenerate: true }
    }
    return { canGenerate: false }
  } catch (error) {
    console.error("[v0] Error checking quota:", error)
    return { canGenerate: true } // Allow generation even if check fails
  }
}

async function promptForBackupApiKey() {
  return new Promise((resolve) => {
    const message =
      "נראה שמפתח ה-API הנוכחי לא יספיק לכל התמונות המבוקשות, או שיש בעיה במפתח. אנא הזן מפתח API נוסף לגיבוי."
    const backupKey = prompt(message)
    resolve(backupKey ? backupKey.trim() : null)
  })
}

async function generateComicPages(storyStructure, artStyle, progressElement) {
  const pages = []
  const totalPages = storyStructure.pages.length
  const progressPerPage = 75 / totalPages
  let currentProgress = 20

  for (let i = 0; i < storyStructure.pages.length; i++) {
    const page = storyStructure.pages[i]

    try {
      // Generate image for entire page - NO RETRY
      const imageUrl = await generatePageImage(page, artStyle, storyStructure.title)

      pages.push({
        pageNumber: page.pageNumber,
        imageUrl: imageUrl,
        panels: page.panels,
      })

      currentProgress += progressPerPage
      updateProgress(progressElement, Math.round(currentProgress))
    } catch (error) {
      console.error(`[v0] Error generating page ${i + 1}:`, error)

      // Try backup key if available, but NO RETRY
      if (AppState.backupApiKey) {
        try {
          const imageUrl = await generatePageImage(page, artStyle, storyStructure.title, true)
          pages.push({
            pageNumber: page.pageNumber,
            imageUrl: imageUrl,
            panels: page.panels,
          })
          currentProgress += progressPerPage
          updateProgress(progressElement, Math.round(currentProgress))
        } catch (backupError) {
          console.error(`[v0] Error with backup key for page ${i + 1}:`, backupError)
          pages.push({
            pageNumber: page.pageNumber,
            imageUrl: null,
            panels: page.panels,
            error: error.message,
          })
          currentProgress += progressPerPage
          updateProgress(progressElement, Math.round(currentProgress))
        }
      } else {
        pages.push({
          pageNumber: page.pageNumber,
          imageUrl: null,
          panels: page.panels,
          error: error.message,
        })
        currentProgress += progressPerPage
        updateProgress(progressElement, Math.round(currentProgress))
      }
    }
  }

  return pages
}

async function generatePageImage(page, artStyle, title, useBackupKey = false) {
  const apiKey = useBackupKey ? AppState.backupApiKey : AppState.apiKey
  const model = AppState.imageModel

  // Create detailed prompt for the entire page
  let pagePrompt = `Create a complete comic book page in ${getStyleDescription(artStyle)} style.\n`
  pagePrompt += `Title: ${title}\n`
  pagePrompt += `Page ${page.pageNumber} contains ${page.panels.length} panels:\n\n`

  page.panels.forEach((panel, index) => {
    pagePrompt += `Panel ${index + 1}:\n`
    pagePrompt += `Scene: ${panel.visualDescription}\n`
    if (panel.dialogue) {
      pagePrompt += `Dialogue (in Hebrew speech bubble): ${panel.dialogue}\n`
    }
    if (panel.narration) {
      pagePrompt += `Narration (in Hebrew text box): ${panel.narration}\n`
    }
    pagePrompt += `\n`
  })

  pagePrompt += `\nIMPORTANT: All text must be in Hebrew! Create a professional panel layout with clear speech bubbles and text boxes. Comic book style with clear borders between panels.`

  // Check if using Imagen models
  if (model.includes("imagen")) {
    // Try Imagen API (Vertex AI required)
    try {
      return await generateWithImagen(pagePrompt, apiKey, model)
    } catch (error) {
      throw new Error(
        `Imagen API שגיאה: ${error.message}. שים לב: Imagen דורש הגדרת Vertex AI. מומלץ להשתמש במודל Gemini בהגדרות.`,
      )
    }
  } else {
    // Use Gemini text generation to create detailed description
    // Note: Gemini text models cannot generate actual images
    throw new Error(
      "מודלים של Gemini לא יכולים ליצור תמונות ישירות. אנא השתמש במודל Imagen או שלב עם שירות חיצוני ליצירת תמונות.",
    )
  }
}

async function generateWithImagen(prompt, apiKey, model) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instances: [
          {
            prompt: prompt,
          },
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: "3:4",
          safetyFilterLevel: "block_some",
          personGeneration: "allow_all",
        },
      }),
    },
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API error ${response.status}: ${errorText}`)
  }

  const data = await response.json()

  if (data.predictions && data.predictions.length > 0) {
    const prediction = data.predictions[0]
    if (prediction.bytesBase64Encoded) {
      return `data:image/png;base64,${prediction.bytesBase64Encoded}`
    }
    if (prediction.mimeType && prediction.bytesBase64Encoded) {
      return `data:${prediction.mimeType};base64,${prediction.bytesBase64Encoded}`
    }
  }

  throw new Error("No image data in response")
}

// Comic Editor Functions
function displayComicInEditor(pages) {
  const comicPanels = document.getElementById("comic-panels")
  comicPanels.innerHTML = ""

  pages.forEach((page, index) => {
    const pageElement = createPageElement(page, index)
    comicPanels.appendChild(pageElement)
  })
}

function createPageElement(page, index) {
  const pageDiv = document.createElement("div")
  pageDiv.className = "comic-panel-item"
  pageDiv.dataset.pageIndex = index

  const header = document.createElement("div")
  header.className = "panel-header"
  header.innerHTML = `
    <span class="panel-number">עמוד ${page.pageNumber}</span>
    <div class="panel-controls">
      <button class="panel-btn" onclick="deletePanel(${index})" title="מחק">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `

  const content = document.createElement("div")
  content.className = "panel-content"

  if (page.imageUrl) {
    const img = document.createElement("img")
    img.src = page.imageUrl
    img.alt = `עמוד ${page.pageNumber}`
    img.className = "panel-generated-image"
    img.loading = "eager" // Force immediate loading, not lazy loading
    img.style.width = "100%"
    img.style.height = "auto"
    img.style.borderRadius = "8px"
    content.appendChild(img)
  } else if (page.error) {
    const errorDiv = document.createElement("div")
    errorDiv.className = "panel-image"
    errorDiv.style.background = "#fff3cd"
    errorDiv.style.color = "#856404"
    errorDiv.style.padding = "20px"
    errorDiv.style.textAlign = "center"
    errorDiv.innerHTML = `
      <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px;"></i><br>
      <strong>שגיאה ביצירת התמונה</strong><br>
      <small style="font-size: 0.8rem;">${page.error}</small>
    `
    content.appendChild(errorDiv)
  } else {
    content.innerHTML = '<div class="panel-image">טוען תמונה...</div>'
  }

  // Display panel text information
  const textDiv = document.createElement("div")
  textDiv.style.marginTop = "10px"
  page.panels.forEach((panel, pIndex) => {
    const panelText = document.createElement("div")
    panelText.className = "panel-text-item"
    let textContent = `<strong>פאנל ${pIndex + 1}:</strong><br>`
    if (panel.dialogue) textContent += `💬 ${panel.dialogue}<br>`
    if (panel.narration) textContent += `📝 ${panel.narration}`
    panelText.innerHTML = textContent
    textDiv.appendChild(panelText)
  })
  content.appendChild(textDiv)

  pageDiv.appendChild(header)
  pageDiv.appendChild(content)

  return pageDiv
}

function addPanel() {
  showToast("info", 'השתמש ב"עורך הסיפור" ליצירת פאנלים חדשים')
}

function deletePanel(index) {
  if (confirm("האם אתה בטוח שברצונך למחוק עמוד זה?")) {
    AppState.currentProject.pages.splice(index, 1)
    displayComicInEditor(AppState.currentProject.pages)
    showToast("success", "העמוד נמחק")
  }
}

// Project Management
function showSaveProjectModal() {
  if (!AppState.currentProject) {
    showToast("error", "אין פרויקט לשמור")
    return
  }

  const modal = document.getElementById("save-project-modal")
  modal.style.display = "block"

  document.getElementById("save-project-form").onsubmit = (e) => {
    e.preventDefault()
    saveProject()
  }
}

function closeSaveProjectModal() {
  document.getElementById("save-project-modal").style.display = "none"
  document.getElementById("project-name").value = ""
}

function saveProject() {
  const projectName = document.getElementById("project-name").value.trim()

  if (!projectName) {
    showToast("error", "אנא הכנס שם לפרויקט")
    return
  }

  AppState.currentProject.name = projectName

  // Check if project already exists (update) or new
  const existingIndex = AppState.projects.findIndex((p) => p.id === AppState.currentProject.id)

  if (existingIndex >= 0) {
    AppState.projects[existingIndex] = AppState.currentProject
  } else {
    AppState.projects.push(AppState.currentProject)
  }

  try {
    localStorage.setItem("projects", JSON.stringify(AppState.projects))
    closeSaveProjectModal()
    showToast("success", "הפרויקט נשמר בהצלחה")
    loadProjects()
  } catch (error) {
    console.error("[v0] Error saving project:", error)
    showToast("error", "שגיאה בשמירת הפרויקט")
  }
}

function loadProjects() {
  const projectsList = document.getElementById("projects-list")

  if (!projectsList) return

  try {
    const savedProjects = localStorage.getItem("projects")
    AppState.projects = savedProjects ? JSON.parse(savedProjects) : []

    if (!Array.isArray(AppState.projects)) {
      AppState.projects = []
      localStorage.setItem("projects", "[]")
    }
  } catch (error) {
    console.error("[v0] Error loading projects:", error)
    AppState.projects = []
    localStorage.setItem("projects", "[]")
  }

  if (AppState.projects.length === 0) {
    projectsList.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">אין פרויקטים שמורים</p>'
    return
  }

  projectsList.innerHTML = ""

  AppState.projects.forEach((project, index) => {
    try {
      if (project && project.pages && Array.isArray(project.pages)) {
        const projectCard = createProjectCard(project, index)
        projectsList.appendChild(projectCard)
      }
    } catch (error) {
      console.error(`[v0] Error creating project card ${index}:`, error)
    }
  })
}

function toHebrewDate(dateString) {
  const date = new Date(dateString)

  // Hebrew months
  const hebrewMonths = ["תשרי", "חשוון", "כסלו", "טבת", "שבט", "אדר", "ניסן", "אייר", "סיוון", "תמוז", "אב", "אלול"]

  // Simple conversion (this is a basic implementation)
  // For accurate Hebrew calendar, you'd need a proper library
  const gregorianYear = date.getFullYear()
  const hebrewYear = gregorianYear + 3760
  const month = date.getMonth()
  const day = date.getDate()

  // Approximate Hebrew month (this is simplified)
  const hebrewMonth = hebrewMonths[month % 12]

  return `${day} ב${hebrewMonth} ${hebrewYear}`
}

function createProjectCard(project, index) {
  if (!project || !project.pages) {
    console.error("[v0] Invalid project data:", project)
    return document.createElement("div")
  }

  const card = document.createElement("div")
  card.className = "project-card"
  card.dataset.projectName = (project.name || "").toLowerCase()

  // Convert to Hebrew date
  const hebrewDate = toHebrewDate(project.createdAt)

  card.innerHTML = `
    <h3>${project.name || "ללא שם"}</h3>
    <p>נוצר ב: ${hebrewDate}</p>
    <p>עמודים: ${project.pages.length}</p>
    <div class="project-actions">
      <button class="btn btn-primary" onclick="loadProject(${index})">
        <i class="fas fa-folder-open"></i>
        פתח
      </button>
      <button class="btn btn-secondary" onclick="showEditProjectModal(${index})">
        <i class="fas fa-edit"></i>
        שנה שם
      </button>
      <button class="btn btn-secondary" onclick="toggleFavorite(${index})">
        <i class="fas fa-star${project.favorite ? "" : "-o"}"></i>
      </button>
      <button class="btn btn-secondary" onclick="deleteProject(${index})">
        <i class="fas fa-trash"></i>
        מחק
      </button>
    </div>
  `

  return card
}

function loadProject(index) {
  AppState.currentProject = AppState.projects[index]
  showSection("comic-editor")
  displayComicInEditor(AppState.currentProject.pages)
  showToast("success", "הפרויקט נטען")
}

function showEditProjectModal(index) {
  const modal = document.getElementById("edit-project-modal")
  const project = AppState.projects[index]

  document.getElementById("edit-project-name").value = project.name
  document.getElementById("edit-project-id").value = index

  modal.style.display = "block"

  document.getElementById("edit-project-form").onsubmit = (e) => {
    e.preventDefault()
    updateProjectName()
  }
}

function closeEditProjectModal() {
  document.getElementById("edit-project-modal").style.display = "none"
}

function updateProjectName() {
  const newName = document.getElementById("edit-project-name").value.trim()
  const index = Number.parseInt(document.getElementById("edit-project-id").value)

  if (!newName) {
    showToast("error", "אנא הכנס שם")
    return
  }

  AppState.projects[index].name = newName
  localStorage.setItem("projects", JSON.stringify(AppState.projects))

  closeEditProjectModal()
  loadProjects()
  showToast("success", "השם עודכן")
}

function toggleFavorite(index) {
  AppState.projects[index].favorite = !AppState.projects[index].favorite
  localStorage.setItem("projects", JSON.stringify(AppState.projects))
  loadProjects()
  showToast("success", AppState.projects[index].favorite ? "נוסף למועדפים" : "הוסר מהמועדפים")
}

function deleteProject(index) {
  if (confirm("האם אתה בטוח שברצונך למחוק פרויקט זה?")) {
    AppState.projects.splice(index, 1)
    localStorage.setItem("projects", JSON.stringify(AppState.projects))
    loadProjects()
    showToast("success", "הפרויקט נמחק")
  }
}

function filterProjects() {
  const searchTerm = document.getElementById("project-search").value.toLowerCase()
  const projectCards = document.querySelectorAll(".project-card")

  projectCards.forEach((card) => {
    const projectName = card.dataset.projectName
    if (projectName.includes(searchTerm)) {
      card.style.display = "flex"
    } else {
      card.style.display = "none"
    }
  })
}

// Download Comic as PDF
async function downloadComic() {
  if (!AppState.currentProject || !AppState.currentProject.pages.length) {
    showToast("error", "אין קומיקס להורדה")
    return
  }

  showToast("info", "מכין PDF...")

  try {
    // Create a simple PDF using jsPDF (we'll need to include this library)
    // For now, we'll create a simple implementation
    const { jsPDF } = window.jspdf || {}

    if (!jsPDF) {
      // Fallback: download images as zip or individual files
      await downloadAsImages()
      return
    }

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    })

    for (let i = 0; i < AppState.currentProject.pages.length; i++) {
      const page = AppState.currentProject.pages[i]

      if (page.imageUrl) {
        if (i > 0) {
          pdf.addPage()
        }

        // Add image to PDF
        const imgWidth = 190
        const imgHeight = 253
        pdf.addImage(page.imageUrl, "PNG", 10, 10, imgWidth, imgHeight)
      }
    }

    pdf.save(`${AppState.currentProject.name}.pdf`)
    showToast("success", "הקומיקס הורד בהצלחה")
  } catch (error) {
    console.error("[v0] Error creating PDF:", error)
    showToast("error", "שגיאה ביצירת PDF")
  }
}

async function downloadAsImages() {
  // Fallback method: download each page as an image
  for (let i = 0; i < AppState.currentProject.pages.length; i++) {
    const page = AppState.currentProject.pages[i]

    if (page.imageUrl) {
      const link = document.createElement("a")
      link.href = page.imageUrl
      link.download = `${AppState.currentProject.name}_page_${i + 1}.png`
      link.click()
    }
  }

  showToast("success", "התמונות הורדו")
}

// Feedback System
function initializeStarRating() {
  const stars = document.querySelectorAll(".star")

  stars.forEach((star) => {
    star.addEventListener("click", () => {
      const rating = Number.parseInt(star.dataset.rating)
      AppState.selectedRating = rating

      stars.forEach((s, index) => {
        if (index < rating) {
          s.classList.add("active")
        } else {
          s.classList.remove("active")
        }
      })
    })

    star.addEventListener("mouseenter", () => {
      const rating = Number.parseInt(star.dataset.rating)
      stars.forEach((s, index) => {
        if (index < rating) {
          s.style.color = "#ffd700"
        }
      })
    })

    star.addEventListener("mouseleave", () => {
      stars.forEach((s, index) => {
        if (index < AppState.selectedRating) {
          s.style.color = "#ffd700"
        } else {
          s.style.color = "#ddd"
        }
      })
    })
  })
}

function submitFeedback() {
  const feedbackText = document.getElementById("feedback-text").value.trim()

  if (AppState.selectedRating === 0) {
    showToast("error", "אנא בחר דירוג")
    return
  }

  if (!feedbackText) {
    showToast("error", "אנא כתוב משוב")
    return
  }

  // Save feedback to localStorage
  const feedbacks = JSON.parse(localStorage.getItem("feedbacks") || "[]")
  feedbacks.push({
    rating: AppState.selectedRating,
    text: feedbackText,
    date: new Date().toISOString(),
  })
  localStorage.setItem("feedbacks", JSON.stringify(feedbacks))

  // Reset form
  document.getElementById("feedback-text").value = ""
  AppState.selectedRating = 0
  document.querySelectorAll(".star").forEach((s) => s.classList.remove("active"))

  showToast("success", "תודה על המשוב!")
}

// Admin Functions (placeholder for future implementation)
function generateReport() {
  showToast("info", "יצירת דוח...")
  // TODO: Implement report generation
}

function sendReportEmail() {
  showToast("info", "שולח דוח למייל...")
  // TODO: Implement email sending
}

// Toast Notifications
function showToast(type, message) {
  const container = document.getElementById("toast-container")
  const toast = document.createElement("div")
  toast.className = `toast ${type}`

  const icon = type === "success" ? "check-circle" : type === "error" ? "exclamation-circle" : "info-circle"

  toast.innerHTML = `
    <i class="fas fa-${icon}"></i>
    <span>${message}</span>
  `

  container.appendChild(toast)

  setTimeout(() => {
    toast.style.opacity = "0"
    setTimeout(() => {
      container.removeChild(toast)
    }, 300)
  }, 3000)
}

// Close modals when clicking outside
window.onclick = (event) => {
  const saveModal = document.getElementById("save-project-modal")
  const editModal = document.getElementById("edit-project-modal")

  if (event.target === saveModal) {
    closeSaveProjectModal()
  }
  if (event.target === editModal) {
    closeEditProjectModal()
  }
}

// Utility function for delays
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function callGeminiAPI(model, prompt) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${AppState.apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
        },
      }),
    },
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API error ${response.status}: ${errorText}`)
  }

  const data = await response.json()

  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    throw new Error("Invalid response from Gemini API")
  }

  return data.candidates[0].content.parts[0].text
}
