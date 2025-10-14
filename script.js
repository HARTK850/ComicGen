// ComicGen - Comic Generator Application
// Global State Management
const AppState = {
  apiKey: localStorage.getItem("gemini_api_key") || "",
  backupApiKey: "",
  storyModel: localStorage.getItem("story_model") || "gemini-2.5-flash",
  imageModel: localStorage.getItem("image_model") || "gemini-2.5-flash-image",
  currentSection: "home",
  currentProject: null,
  projects: JSON.parse(localStorage.getItem("projects") || "[]"),
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

  if (!apiKey) {
    showStatus(statusDiv, "error", "אנא הכנס מפתח API")
    return
  }

  statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> בודק מפתח...'
  statusDiv.className = "api-status"

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
        throw new Error("לא ניתן להמשיך ללא מפתח API נוסף")
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
    comic: "קומיקס קלאסי - קווי מתאר מודגשים, צללים דרמטיים, בועות דיבור",
    manga: "מנגה - שחור לבן, קווי מהירות, ביטויים דרמטיים",
  }
  return styles[artStyle] || styles["comic"]
}

async function checkImageGenerationQuota(numberOfPages) {
  // This is a simplified check - in production, you'd want to call the actual quota API
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${AppState.imageModel}?key=${AppState.apiKey}`,
    )
    if (response.ok) {
      return { canGenerate: true }
    }
    return { canGenerate: false }
  } catch (error) {
    console.error("[v0] Error checking quota:", error)
    return { canGenerate: false }
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
  const progressPerPage = 75 / totalPages // 20% to 95%
  let currentProgress = 20

  for (let i = 0; i < storyStructure.pages.length; i++) {
    const page = storyStructure.pages[i]

    try {
      // Generate image for entire page
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

      // Try with backup API key if available
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
            error: true,
          })
        }
      } else {
        pages.push({
          pageNumber: page.pageNumber,
          imageUrl: null,
          panels: page.panels,
          error: true,
        })
      }
    }
  }

  return pages
}

async function generatePageImage(page, artStyle, title, useBackupKey = false) {
  const apiKey = useBackupKey ? AppState.backupApiKey : AppState.apiKey

  // Create detailed prompt for the entire page
  let pagePrompt = `צור עמוד קומיקס שלם בסגנון ${getStyleDescription(artStyle)}.\n`
  pagePrompt += `כותרת: ${title}\n`
  pagePrompt += `עמוד ${page.pageNumber} מכיל ${page.panels.length} פאנלים:\n\n`

  page.panels.forEach((panel, index) => {
    pagePrompt += `פאנל ${index + 1}:\n`
    pagePrompt += `תיאור: ${panel.visualDescription}\n`
    if (panel.dialogue) {
      pagePrompt += `דיאלוג (בבועת דיבור בעברית): ${panel.dialogue}\n`
    }
    if (panel.narration) {
      pagePrompt += `נרציה (בתיבת טקסט בעברית): ${panel.narration}\n`
    }
    pagePrompt += `\n`
  })

  pagePrompt += `\nחשוב: כל הטקסטים חייבים להיות בעברית! צור פריסת פאנלים מקצועית עם בועות דיבור ותיבות טקסט ברורות.`

  // Check which image model is being used
  if (AppState.imageModel.includes("imagen")) {
    // Use Imagen 4 API
    return await generateWithImagen(pagePrompt, apiKey)
  } else {
    // Use Gemini image generation
    return await generateWithGemini(pagePrompt, apiKey)
  }
}

async function generateWithImagen(prompt, apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-4:generateImages?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt,
        number_of_images: 1,
        aspect_ratio: "3:4", // Comic book page ratio
        safety_filter_level: "block_some",
        person_generation: "allow_all",
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`Imagen API error: ${response.status}`)
  }

  const data = await response.json()

  if (data.generatedImages && data.generatedImages.length > 0) {
    // Return the base64 image data
    return `data:image/png;base64,${data.generatedImages[0].image.imageBytes}`
  }

  throw new Error("No image generated")
}

async function generateWithGemini(prompt, apiKey) {
  // Gemini models with image generation capability
  const model = AppState.imageModel

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
          temperature: 0.9,
          topK: 40,
          topP: 0.95,
        },
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()

  // For Gemini image models, check if there's inline data
  if (data.candidates && data.candidates[0].content.parts) {
    for (const part of data.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
      }
    }
  }

  throw new Error("No image generated by Gemini")
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
    throw new Error(`API error: ${response.status}`)
  }

  const data = await response.json()
  return data.candidates[0].content.parts[0].text
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
    content.innerHTML = '<div class="panel-image">שגיאה ביצירת התמונה</div>'
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

  localStorage.setItem("projects", JSON.stringify(AppState.projects))

  closeSaveProjectModal()
  showToast("success", "הפרויקט נשמר בהצלחה")
  loadProjects()
}

function loadProjects() {
  const projectsList = document.getElementById("projects-list")

  if (!projectsList) return

  if (AppState.projects.length === 0) {
    projectsList.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">אין פרויקטים שמורים</p>'
    return
  }

  projectsList.innerHTML = ""

  AppState.projects.forEach((project, index) => {
    const projectCard = createProjectCard(project, index)
    projectsList.appendChild(projectCard)
  })
}

function createProjectCard(project, index) {
  const card = document.createElement("div")
  card.className = "project-card"
  card.dataset.projectName = project.name.toLowerCase()

  const date = new Date(project.createdAt).toLocaleDateString("he-IL")

  card.innerHTML = `
    <h3>${project.name}</h3>
    <p>נוצר ב: ${date}</p>
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
        ${project.favorite ? "הסר מועדף" : "מועדף"}
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
