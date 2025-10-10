// Variable to hold the API key globally
let globalApiKey = null

let storyModel = "gemini-2.5-flash" // Default model
let imageModel = "gemini-2.5-flash-image" // Default image model

document.addEventListener("DOMContentLoaded", () => {
  // Hide loading screen
  const loadingScreen = document.getElementById("loading-screen")
  if (loadingScreen) {
    loadingScreen.style.opacity = "0"
    setTimeout(() => {
      loadingScreen.style.display = "none"
    }, 500)
  }

  // טעינת מפתח ה-API מ-localStorage בעת טעינת הדף
  const storedApiKey = localStorage.getItem("geminiApiKey")
  if (storedApiKey) {
    globalApiKey = storedApiKey
    const apiKeyInput = document.getElementById("api-key")
    if (apiKeyInput) {
      apiKeyInput.value = storedApiKey
      const apiStatus = document.getElementById("api-status")
      if (apiStatus) {
        apiStatus.className = "api-status success"
        apiStatus.textContent = "מפתח API נטען בהצלחה."
      }
    }
  }

  const savedStoryModel = localStorage.getItem("storyModel")
  const savedImageModel = localStorage.getItem("imageModel")
  if (savedStoryModel) {
    storyModel = savedStoryModel
    const storyModelSelect = document.getElementById("story-model")
    if (storyModelSelect) storyModelSelect.value = savedStoryModel
  }
  if (savedImageModel) {
    imageModel = savedImageModel
    const imageModelSelect = document.getElementById("image-model")
    if (imageModelSelect) imageModelSelect.value = savedImageModel
  }

  // Initialize the active section to 'home'
  showSection("home")
  loadProjects() // Load projects on startup
})

function saveSettings() {
  const storyModelSelect = document.getElementById("story-model")
  const imageModelSelect = document.getElementById("image-model")

  storyModel = storyModelSelect.value
  imageModel = imageModelSelect.value

  localStorage.setItem("storyModel", storyModel)
  localStorage.setItem("imageModel", imageModel)

  showToast("ההגדרות נשמרו בהצלחה!", "success")
}

// Utility function to show toast notifications
function showToast(message, type = "info") {
  const toastContainer = document.getElementById("toast-container")
  const toast = document.createElement("div")
  toast.classList.add("toast", type)
  toast.innerHTML = `<span>${message}</span>`
  toastContainer.prepend(toast) // Add to the top

  setTimeout(() => {
    toast.remove()
  }, 3000)
}

// Function to handle section display
function showSection(sectionId) {
  document.querySelectorAll(".section").forEach((section) => {
    section.classList.remove("active")
  })
  document.getElementById(sectionId).classList.add("active")

  // Update active state of navigation buttons
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.remove("active")
  })
  const activeBtn = document.querySelector(`.nav-btn[onclick="showSection('${sectionId}')"]`)
  if (activeBtn) {
    activeBtn.classList.add("active")
  }

  // If navigating to projects section, refresh the list
  if (sectionId === "projects") {
    loadProjects()
  }
}

// API Setup functions
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
  const apiStatus = document.getElementById("api-status")

  if (apiKey === "") {
    apiStatus.className = "api-status error"
    apiStatus.textContent = "אנא הכנס מפתח API."
    showToast("מפתח API ריק.", "error")
    globalApiKey = null // Clear the global key if empty
    return
  }

  // Validate API key by making a simple call to list models
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (response.ok) {
      apiStatus.className = "api-status success"
      apiStatus.textContent = "מפתח API תקף! נשמר בהצלחה."
      showToast("מפתח API נשמר בהצלחה!", "success")
      localStorage.setItem("geminiApiKey", apiKey)
      globalApiKey = apiKey
    } else {
      apiStatus.className = "api-status error"
      apiStatus.textContent = "מפתח API לא תקין. אנא נסה שנית."
      showToast("מפתח API לא תקין.", "error")
      globalApiKey = null
    }
  } catch (error) {
    apiStatus.className = "api-status error"
    apiStatus.textContent = "שגיאה בבדיקת מפתח API. אנא בדוק את החיבור או נסה שנית."
    showToast("שגיאה בבדיקה: " + error.message, "error")
    globalApiKey = null
  }
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
  const storyText = document.getElementById("story-text").value.trim()

  if (!storyText) {
    showToast("אנא הכנס טקסט סיפור", "error")
    return
  }

  if (!globalApiKey) {
    showToast("אנא הגדר מפתח API תחילה", "error")
    showSection("api-setup")
    return
  }

  showToast("מעבד את הסיפור ומחלק לעמודי קומיקס...", "info")

  try {
    const divisionPrompt = `חלק את הסיפור הבא לעמודי קומיקס. כל עמוד צריך להכיל 3-6 פאנלים.
עבור כל עמוד, תאר בפירוט מה יופיע בכל פאנל, כולל דיאלוגים, פעולות ורקע.
החזר את התשובה בפורמט JSON כך:
[
  {
    "pageNumber": 1,
    "panels": [
      {"panelNumber": 1, "description": "תיאור הפאנל", "dialog": "דיאלוג"},
      {"panelNumber": 2, "description": "תיאור הפאנל", "dialog": "דיאלוג"}
    ]
  }
]

הסיפור:
${storyText}`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${storyModel}:generateContent?key=${globalApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: divisionPrompt }] }],
        }),
      },
    )

    if (!response.ok) {
      throw new Error("Failed to divide story into pages")
    }

    const data = await response.json()
    let pagesText = data.candidates[0]?.content?.parts?.[0]?.text

    // Clean JSON from markdown code blocks if present
    pagesText = pagesText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim()
    const pages = JSON.parse(pagesText)

    currentComicPanels = pages.map((page) => ({
      id: Date.now() + page.pageNumber,
      pageNumber: page.pageNumber,
      panels: page.panels,
      imageUrl: null,
      imageLoading: true,
    }))

    displayStoryOutput(currentComicPanels)
    renderComicPanels()
    showToast("הסיפור חולק לעמודי קומיקס. יוצר תמונות...", "info")

    const imageGenerationPromises = currentComicPanels.map(async (page) => {
      try {
        const pagePrompt = createPagePrompt(page, document.getElementById("art-style").value)
        const imageUrl = await generateAIImage(pagePrompt)
        page.imageUrl = imageUrl
        page.imageLoading = false
        renderComicPanels()
      } catch (error) {
        console.error(`Error generating image for page ${page.pageNumber}:`, error)
        page.imageLoading = false
        page.imageUrl = "error"
        renderComicPanels()
        showToast(`שגיאה ביצירת תמונה עבור עמוד ${page.pageNumber}`, "error")
      }
    })

    await Promise.all(imageGenerationPromises)
    showToast("כל עמודי הקומיקס נוצרו!", "success")
    showSection("comic-editor")
  } catch (error) {
    console.error("Error processing story:", error)
    showToast(`שגיאה בעיבוד הסיפור: ${error.message}`, "error")
  }
}

function createPagePrompt(page, artStyle) {
  let prompt = `צור עמוד קומיקס שלם בסגנון ${artStyle} עם ${page.panels.length} פאנלים מסודרים בצורה מקצועית. `
  prompt += `כל הטקסט חייב להיות בעברית בלבד! `
  prompt += `כלול בועות דיבור ומחשבה עם הטקסט הבא:\n\n`

  page.panels.forEach((panel) => {
    prompt += `פאנל ${panel.panelNumber}: ${panel.description}. `
    if (panel.dialog) {
      prompt += `דיאלוג בעברית: "${panel.dialog}". `
    }
  })

  prompt += `\nודא שהעמוד נראה כמו עמוד קומיקס מקצועי עם מסגרות ברורות לכל פאנל, בועות דיבור עם טקסט בעברית קריא, ועיצוב ויזואלי מושך.`

  return prompt
}

async function generateAIStory() {
  if (!globalApiKey) {
    showToast("אנא הגדר מפתח API תחילה", "error")
    showSection("api-setup")
    return
  }

  const storyPrompt = document.getElementById("story-prompt").value.trim()

  if (!storyPrompt) {
    showToast("אנא הכנס תיאור לסיפור", "error")
    return
  }

  showToast("יוצר סיפור אוטומטי...", "info")

  try {
    const prompt = `צור סיפור קצר ומעניין בעברית על פי ההנחיה הבאה: ${storyPrompt}
        
הסיפור צריך להיות מתאים לקומיקס עם 8-14 עמודים (כל עמוד מכיל 3-6 פאנלים).
כתוב סיפור עם עלילה ברורה, דמויות מעניינות ודיאלוגים טבעיים.
הסיפור צריך להיות בעל התחלה, אמצע וסוף.`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${storyModel}:generateContent?key=${globalApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      },
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error("API Error Response during story generation:", errorData)
      throw new Error(`Failed to generate story: ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    const generatedStory = data.candidates[0]?.content?.parts?.[0]?.text

    if (!generatedStory) {
      throw new Error("No story received from the API")
    }

    document.getElementById("story-text").value = generatedStory

    document.getElementById("creation-type").value = "manual"
    toggleCreationMode()

    await processStory()

    showToast("סיפור נוצר בהצלחה!", "success")
  } catch (error) {
    console.error("Error generating story:", error)
    showToast(`שגיאה ביצירת הסיפור: ${error.message}`, "error")
  }
}

async function generateAIImage(prompt) {
  if (!globalApiKey) {
    throw new Error("API Key is not set for image generation.")
  }

  try {
    let url, payload

    if (imageModel === "imagen-4") {
      url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0:generateContent?key=${globalApiKey}`
      payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          outputMimeType: "image/png",
        },
      }
    } else if (imageModel === "gemini-2.0-flash-image") {
      url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${globalApiKey}`
      payload = {
        contents: [{ parts: [{ text: prompt }], role: "user" }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }
    } else {
      // gemini-2.5-flash-image (default)
      url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${globalApiKey}`
      payload = {
        contents: [{ parts: [{ text: prompt }], role: "user" }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Image API Error:", errorData)
      throw new Error(`Failed to generate image: ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    const inlineData = data.candidates[0].content.parts.find((part) => part.inlineData)
    if (inlineData && inlineData.inlineData.mimeType.startsWith("image/")) {
      const base64Image = inlineData.inlineData.data
      return `data:${inlineData.inlineData.mimeType};base64,${base64Image}`
    } else {
      throw new Error("No image data found in response")
    }
  } catch (error) {
    console.error("Error in generateAIImage:", error)
    throw error
  }
}

function displayStoryOutput(pages) {
  const storyOutputContainer = document.getElementById("story-output")
  if (!storyOutputContainer) {
    console.warn("Element with id 'story-output' not found. Story pages will not be displayed here.")
    return
  }
  storyOutputContainer.innerHTML = ""

  pages.forEach((page, index) => {
    const pageDiv = document.createElement("div")
    pageDiv.classList.add("story-output-panel")

    let panelsHTML = ""
    page.panels.forEach((panel) => {
      panelsHTML += `<p><strong>פאנל ${panel.panelNumber}:</strong> ${panel.description}</p>`
      if (panel.dialog) {
        panelsHTML += `<p><em>דיאלוג: ${panel.dialog}</em></p>`
      }
    })

    pageDiv.innerHTML = `
            <h4>עמוד ${page.pageNumber}</h4>
            ${panelsHTML}
            ${
              page.imageLoading
                ? '<p>טוען תמונה... <i class="fas fa-spinner fa-spin"></i></p>'
                : page.imageUrl === "error"
                  ? '<p style="color: red;">שגיאה בטעינת תמונה.</p>'
                  : page.imageUrl
                    ? `<img src="${page.imageUrl}" alt="Page Image" loading="eager">`
                    : "<p>אין תמונה</p>"
            }
        `
    storyOutputContainer.appendChild(pageDiv)
  })
}

function renderComicPanels() {
  const comicPanelsContainer = document.getElementById("comic-panels")
  if (!comicPanelsContainer) {
    console.warn("Element with id 'comic-panels' not found.")
    return
  }
  comicPanelsContainer.innerHTML = ""

  currentComicPanels.forEach((page, index) => {
    const pageDiv = document.createElement("div")
    pageDiv.classList.add("comic-panel-item")
    pageDiv.dataset.panelId = page.id
    pageDiv.draggable = true

    let panelsText = ""
    page.panels.forEach((panel) => {
      panelsText += `<div class="panel-text-item"><strong>פאנל ${panel.panelNumber}:</strong> ${panel.description}`
      if (panel.dialog) {
        panelsText += ` - <em>"${panel.dialog}"</em>`
      }
      panelsText += `</div>`
    })

    pageDiv.innerHTML = `
            <div class="panel-header">
                <span class="panel-number">עמוד ${page.pageNumber}</span>
                <div class="panel-controls">
                    <button class="panel-btn" onclick="editPanel(${page.id})"><i class="fas fa-edit"></i></button>
                    <button class="panel-btn" onclick="deletePanel(${page.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="panel-content">
                ${panelsText}
                ${
                  page.imageLoading
                    ? '<p>טוען תמונה... <i class="fas fa-spinner fa-spin"></i></p>'
                    : page.imageUrl === "error"
                      ? '<p style="color: red;">שגיאה בטעינת תמונה.</p>'
                      : page.imageUrl
                        ? `<div class="panel-image"><img src="${page.imageUrl}" alt="Page Image" class="panel-generated-image" loading="eager"></div>`
                        : '<div class="panel-image">לחץ להעלאת תמונה או צור עם AI</div>'
                }
            </div>
        `
    comicPanelsContainer.appendChild(pageDiv)
    addDragAndDropListeners(pageDiv)
  })
}

// Variables to manage comic panels and current project
let currentComicPanels = []
let currentProjectId = null

// Function to add a new panel
function addPanel(text = "", imageUrl = null, dialog = "") {
  const panel = {
    id: Date.now(),
    pageNumber: currentComicPanels.length + 1,
    panels: [
      {
        panelNumber: 1,
        description: text || "תיאור פאנל חדש",
        dialog: dialog || "",
      },
    ],
    imageUrl: imageUrl || null,
    imageLoading: false,
  }
  currentComicPanels.push(panel)
  renderComicPanels()
}

// Function to edit a panel
function editPanel(panelId) {
  const page = currentComicPanels.find((p) => p.id === panelId)
  if (page) {
    const newText = prompt("הכנס תיאור חדש לעמוד:", page.panels.map((p) => p.description).join("\n"))
    if (newText !== null) {
      page.panels[0].description = newText.trim()
      page.imageUrl = null
      page.imageLoading = true
      renderComicPanels()

      const pagePrompt = createPagePrompt(page, document.getElementById("art-style").value)
      generateAIImage(pagePrompt)
        .then((imageUrl) => {
          page.imageUrl = imageUrl
          page.imageLoading = false
          renderComicPanels()
        })
        .catch((error) => {
          console.error("Error regenerating image:", error)
          page.imageUrl = "error"
          page.imageLoading = false
          renderComicPanels()
          showToast("שגיאה ביצירת תמונה מחדש.", "error")
        })
    }
  }
}

// Function to delete a panel
function deletePanel(panelId) {
  if (confirm("האם אתה בטוח שברצונך למחוק את העמוד?")) {
    currentComicPanels = currentComicPanels.filter((p) => p.id !== panelId)
    renderComicPanels()
    showToast("העמוד נמחק בהצלחה!", "success")
  }
}

// Function to update dialog
function updateDialog(panelId, dialogText) {
  const page = currentComicPanels.find((p) => p.id === panelId)
  if (page && page.panels[0]) {
    page.panels[0].dialog = dialogText
  }
}

// Function to handle image upload or AI generation
function handleImageUpload(panelId) {
  const page = currentComicPanels.find((p) => p.id === panelId)
  if (page) {
    const imageUrl = prompt("הכנס כתובת URL של תמונה או השאר ריק ליצירה עם AI:")
    if (imageUrl !== null) {
      if (imageUrl.trim() !== "") {
        page.imageUrl = imageUrl
      } else {
        page.imageLoading = true
        renderComicPanels()
        const pagePrompt = createPagePrompt(page, document.getElementById("art-style").value)
        generateAIImage(pagePrompt)
          .then((newImageUrl) => {
            page.imageUrl = newImageUrl
            page.imageLoading = false
            renderComicPanels()
          })
          .catch((error) => {
            console.error("Error generating image:", error)
            page.imageUrl = "error"
            page.imageLoading = false
            renderComicPanels()
            showToast("שגיאה ביצירת תמונה.", "error")
          })
      }
      renderComicPanels()
      showToast("תמונה עודכנה בהצלחה!", "success")
    }
  }
}

// Drag and Drop for panels
let draggedPanel = null

function addDragAndDropListeners(panelElement) {
  panelElement.addEventListener("dragstart", (e) => {
    draggedPanel = panelElement
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/html", panelElement.innerHTML)
    panelElement.classList.add("dragging")
  })

  panelElement.addEventListener("dragover", (e) => {
    e.preventDefault()
    if (e.target.closest(".comic-panel-item") !== draggedPanel) {
      e.target.closest(".comic-panel-item").classList.add("drag-over")
    }
  })

  panelElement.addEventListener("dragleave", (e) => {
    e.target.closest(".comic-panel-item").classList.remove("drag-over")
  })

  panelElement.addEventListener("drop", (e) => {
    e.preventDefault()
    e.target.closest(".comic-panel-item").classList.remove("drag-over")

    if (draggedPanel) {
      const dropTarget = e.target.closest(".comic-panel-item")
      if (dropTarget && draggedPanel !== dropTarget) {
        const comicPanelsContainer = document.getElementById("comic-panels")
        const draggedIndex = Array.from(comicPanelsContainer.children).indexOf(draggedPanel)
        const dropIndex = Array.from(comicPanelsContainer.children).indexOf(dropTarget)

        if (draggedIndex < dropIndex) {
          dropTarget.parentNode.insertBefore(draggedPanel, dropTarget.nextSibling)
        } else {
          dropTarget.parentNode.insertBefore(draggedPanel, dropTarget)
        }

        const [removed] = currentComicPanels.splice(draggedIndex, 1)
        currentComicPanels.splice(dropIndex, 0, removed)

        updatePanelNumbers()
      }
    }
  })

  panelElement.addEventListener("dragend", () => {
    draggedPanel.classList.remove("dragging")
    document.querySelectorAll(".comic-panel-item.drag-over").forEach((item) => {
      item.classList.remove("drag-over")
    })
    draggedPanel = null
  })
}

// Function to update panel numbers after drag and drop
function updatePanelNumbers() {
  const panelItems = document.querySelectorAll(".comic-panel-item")
  panelItems.forEach((item, index) => {
    item.querySelector(".panel-number").textContent = `עמוד ${index + 1}`
  })
}

// Function to download the comic
function downloadComic() {
  if (currentComicPanels.length === 0) {
    showToast("אין עמודים להורדה. אנא צור קומיקס תחילה.", "error")
    return
  }

  let comicHTML = "<html><head><style>body { direction: rtl; font-family: Arial, sans-serif; }</style></head><body>"
  currentComicPanels.forEach((page, index) => {
    comicHTML += `<div style="margin: 20px; border: 1px solid #ccc; padding: 10px; page-break-after: always;">
            <h3>עמוד ${page.pageNumber}</h3>`
    page.panels.forEach((panel) => {
      comicHTML += `<p><strong>פאנל ${panel.panelNumber}:</strong> ${panel.description}</p>`
      if (panel.dialog) {
        comicHTML += `<p><em>דיאלוג: ${panel.dialog}</em></p>`
      }
    })
    comicHTML += `${page.imageUrl && page.imageUrl !== "error" ? `<img src="${page.imageUrl}" alt="Page Image" style="max-width: 100%; height: auto;">` : ""}
        </div>`
  })
  comicHTML += "</body></html>"

  const blob = new Blob([comicHTML], { type: "text/html" })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "comic.html"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
  showToast("הקומיקס נשמר כקובץ HTML!", "success")
}

// Project Management Functions
let projects = JSON.parse(localStorage.getItem("comicProjects")) || []

function saveProject() {
  if (currentComicPanels.length === 0) {
    showToast("אין עמודים לשמירה. אנא צור עמודים לפני השמירה.", "error")
    return
  }
  showSaveProjectModal()
}

function showSaveProjectModal() {
  const saveProjectModal = document.getElementById("save-project-modal")
  saveProjectModal.style.display = "block"
  const projectNameInput = document.getElementById("project-name")
  if (currentProjectId) {
    const existingProject = projects.find((p) => p.id === currentProjectId)
    if (existingProject) {
      projectNameInput.value = existingProject.name
    }
  } else {
    projectNameInput.value = ""
  }
}

function closeSaveProjectModal() {
  document.getElementById("save-project-modal").style.display = "none"
}

document.getElementById("save-project-form").addEventListener("submit", (e) => {
  e.preventDefault()
  const projectName = document.getElementById("project-name").value.trim()

  if (!projectName) {
    showToast("אנא הכנס שם לפרויקט.", "error")
    return
  }

  if (currentProjectId) {
    const projectIndex = projects.findIndex((p) => p.id === currentProjectId)
    if (projectIndex !== -1) {
      projects[projectIndex].name = projectName
      projects[projectIndex].panels = currentComicPanels
      projects[projectIndex].lastModified = new Date().toLocaleString()
      showToast(`הפרויקט "${projectName}" עודכן בהצלחה!`, "success")
    }
  } else {
    const newProject = {
      id: Date.now(),
      name: projectName,
      panels: currentComicPanels,
      createdAt: new Date().toLocaleString(),
      lastModified: new Date().toLocaleString(),
    }
    projects.push(newProject)
    showToast(`הפרויקט "${projectName}" נשמר בהצלחה!`, "success")
  }

  localStorage.setItem("comicProjects", JSON.stringify(projects))
  closeSaveProjectModal()
  loadProjects()
  currentProjectId = null
  document.getElementById("project-name").value = ""
})

function loadProjects() {
  const projectsListContainer = document.getElementById("projects-list")
  projectsListContainer.innerHTML = ""

  if (projects.length === 0) {
    projectsListContainer.innerHTML =
      '<p style="text-align: center; color: #666;">עדיין אין פרויקטים שמורים. התחל ליצור!</p>'
    return
  }

  projects.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))

  projects.forEach((project) => {
    const projectCard = document.createElement("div")
    projectCard.classList.add("project-card")
    projectCard.dataset.projectId = project.id
    projectCard.innerHTML = `
            <h3>${project.name}</h3>
            <p>נוצר: ${project.createdAt}</p>
            <p>עודכן לאחרונה: ${project.lastModified}</p>
            <div class="project-actions">
                <button class="btn btn-primary" onclick="loadProject(${project.id})"><i class="fas fa-folder-open"></i> פתח</button>
                <button class="btn btn-secondary" onclick="showEditProjectModal(${project.id}, '${project.name}')"><i class="fas fa-pencil-alt"></i> שנה שם</button>
                <button class="btn btn-danger" onclick="deleteProject(${project.id})"><i class="fas fa-trash"></i> מחק</button>
            </div>
        `
    projectsListContainer.appendChild(projectCard)
  })
}

function loadProject(projectId) {
  const project = projects.find((p) => p.id === projectId)
  if (project) {
    currentComicPanels = JSON.parse(JSON.stringify(project.panels))
    currentProjectId = projectId

    const comicPanelsContainer = document.getElementById("comic-panels")
    comicPanelsContainer.innerHTML = ""

    currentComicPanels.forEach((panelData) => {
      addPanel(panelData.panels[0]?.description || "", panelData.imageUrl, panelData.panels[0]?.dialog || "")
    })
    showSection("comic-editor")
    showToast(`הפרויקט "${project.name}" נטען בהצלחה!`, "success")
  } else {
    showToast("שגיאה: פרויקט לא נמצא.", "error")
  }
}

function showEditProjectModal(projectId, currentName) {
  const editModal = document.getElementById("edit-project-modal")
  document.getElementById("edit-project-name").value = currentName
  document.getElementById("edit-project-id").value = projectId
  editModal.style.display = "block"
}

function closeEditProjectModal() {
  document.getElementById("edit-project-modal").style.display = "none"
}

document.getElementById("edit-project-form").addEventListener("submit", (e) => {
  e.preventDefault()
  const newName = document.getElementById("edit-project-name").value.trim()
  const projectId = Number.parseInt(document.getElementById("edit-project-id").value)

  if (!newName) {
    showToast("אנא הכנס שם חדש לפרויקט.", "error")
    return
  }

  const projectIndex = projects.findIndex((p) => p.id === projectId)
  if (projectIndex !== -1) {
    const oldName = projects[projectIndex].name
    projects[projectIndex].name = newName
    projects[projectIndex].lastModified = new Date().toLocaleString()
    localStorage.setItem("comicProjects", JSON.stringify(projects))
    showToast(`שם הפרויקט שונה מ-"${oldName}" ל-"${newName}" בהצלחה!`, "success")
    closeEditProjectModal()
    loadProjects()
  } else {
    showToast("שגיאה: פרויקט לא נמצא לשינוי שם.", "error")
  }
})

function deleteProject(projectId) {
  if (confirm("האם אתה בטוח שברצונך למחוק פרויקט זה?")) {
    projects = projects.filter((p) => p.id !== projectId)
    localStorage.setItem("comicProjects", JSON.stringify(projects))
    showToast("הפרויקט נמחק בהצלחה!", "info")
    loadProjects()
  }
}

function filterProjects() {
  const searchTerm = document.getElementById("project-search").value.toLowerCase()
  const projectCards = document.querySelectorAll(".projects-list .project-card")

  projectCards.forEach((card) => {
    const projectName = card.querySelector("h3").textContent.toLowerCase()
    if (projectName.includes(searchTerm)) {
      card.style.display = "flex"
    } else {
      card.style.display = "none"
    }
  })
}

// Feedback Section
let userRating = 0

document.getElementById("star-rating").addEventListener("click", (e) => {
  if (e.target.classList.contains("star")) {
    userRating = Number.parseInt(e.target.dataset.rating)
    document.querySelectorAll(".star").forEach((star) => {
      if (Number.parseInt(star.dataset.rating) <= userRating) {
        star.classList.add("active")
      } else {
        star.classList.remove("active")
      }
    })
  }
})

function submitFeedback() {
  const feedbackText = document.getElementById("feedback-text").value.trim()

  if (userRating === 0 && feedbackText === "") {
    showToast("אנא דרג את החוויה שלך או כתוב משוב.", "error")
    return
  }

  console.log("Feedback Submitted:", { rating: userRating, text: feedbackText })
  showToast("תודה על המשוב שלך!", "success")
  document.getElementById("feedback-text").value = ""
  userRating = 0
  document.querySelectorAll(".star").forEach((star) => star.classList.remove("active"))
}

// Admin Section
function updateAdminStats() {
  document.getElementById("total-users").textContent = "123"
  document.getElementById("total-comics").textContent = projects.length.toString()
  document.getElementById("avg-rating").textContent = "4.5"
  document.getElementById("total-feedback").textContent = "50"
}

function generateReport() {
  showToast("פונקציית יצירת דוח אינה מיושמת במלואה בדמו זה.", "info")
}

function sendReportEmail() {
  showToast("פונקציית שליחת דוח למייל אינה מיושמת במלואה בדמו זה.", "info")
}

// Initial calls
toggleCreationMode()
updateAdminStats()
