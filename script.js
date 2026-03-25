// ======================
// MAIN JAVASCRIPT FUNCTIONALITY
// ======================

// Smooth Scrolling for Navigation Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const href = this.getAttribute('href');
    if (href && href !== '#') {
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }
  });
});

// Dark Mode Toggle
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

// Check for saved theme preference
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  body.setAttribute('data-theme', 'dark');
  themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
} else {
  // Default to light mode if no saved preference or if saved preference is 'light'
  body.setAttribute('data-theme', 'light');
  themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
}

themeToggle.addEventListener('click', () => {
  const currentTheme = body.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  body.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  
  themeToggle.innerHTML = newTheme === 'dark' ? 
    '<i class="fas fa-sun"></i>' : 
    '<i class="fas fa-moon"></i>';
});

// Progress Bar
const progressBar = document.getElementById('progressBar');

window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const scrollPercent = (scrollTop / docHeight) * 100;
  progressBar.style.width = scrollPercent + '%';
});

// ======================
// GOOGLE SHEETS DATA FETCHING
// ======================

// Your published Google Sheets CSV URL - REPLACE THIS WITH YOUR ACTUAL URL
const GOOGLE_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSSFe56OdLQIrc9_HTaQsNltLzvMmaRfO9c3JPTqqghbBwI_7Se9JIq3v6itywhfdgBeIXJRAccdY1p/pub?output=csv';

// Function to create skeleton loading HTML
function createSkeletonHTML(count = 3) {
  let skeletonHTML = '<div class="loading-container">';
  skeletonHTML += '<div class="loading-text">Loading latest stories...</div>';
  
  for (let i = 0; i < count; i++) {
    skeletonHTML += `
      <div class="article-skeleton">
        <div class="article-skeleton-image"></div>
        <div class="article-skeleton-content">
          <div class="article-skeleton-title"></div>
          <div class="article-skeleton-meta"></div>
          <div class="article-skeleton-excerpt"></div>
          <div class="article-skeleton-excerpt"></div>
          <div class="article-skeleton-excerpt"></div>
          <div class="article-skeleton-footer">
            <div class="article-skeleton-button"></div>
            <div class="article-skeleton-actions">
              <div class="article-skeleton-action"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  skeletonHTML += '</div>';
  return skeletonHTML;
}

// Function to fetch stories from Google Sheets
async function fetchStoriesFromSheet() {
  try {
    console.log('Fetching stories from Google Sheets...');
    const response = await fetch(GOOGLE_SHEETS_URL);
    const csvText = await response.text();
    console.log('CSV data received, length:', csvText.length);
    
    // Better CSV parsing using Papa Parse-like logic
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        currentRow.push(currentField.trim());
        currentField = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        // End of row
        if (currentField || currentRow.length > 0) {
          currentRow.push(currentField.trim());
          if (currentRow.some(field => field.length > 0)) {
            rows.push(currentRow);
          }
          currentRow = [];
          currentField = '';
        }
        // Skip \r\n
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
      } else {
        currentField += char;
      }
    }
    
    // Push last row if exists
    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      if (currentRow.some(field => field.length > 0)) {
        rows.push(currentRow);
      }
    }
    
    console.log('Parsed rows count:', rows.length);
    
    if (rows.length === 0) {
      console.error('No rows found in CSV');
      return { stories: [], quickStories: [] };
    }
    
    // Log headers for debugging
    console.log('Headers:', rows[0]);
    
    // Skip header row (first row)
    const stories = [];
    const quickStories = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 2) {
        console.log(`Row ${i} has insufficient columns:`, row);
        continue;
      }
      
      // Clean each value
      const cleanRow = row.map(cell => cell ? cell.trim() : '');
      
      // Map columns based on your structure
      const storyType = cleanRow[1] || ''; // Column B: Story Type
      
      if (storyType === 'Full Story') {
        let imageUrl = cleanRow[15] || cleanRow[16] || '';
        
        // Enhanced Google Drive URL handling
        if (imageUrl) {
          // Check for Google Drive share links
          if (imageUrl.includes('drive.google.com')) {
            // Extract file ID from various Google Drive URL formats
            let fileId = null;
            
            // Format: https://drive.google.com/file/d/FILE_ID/view
            const fileIdMatch = imageUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (fileIdMatch) {
              fileId = fileIdMatch[1];
            }
            
            // Format: https://drive.google.com/open?id=FILE_ID
            const openIdMatch = imageUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (openIdMatch) {
              fileId = openIdMatch[1];
            }
            
            // Format: https://drive.google.com/uc?export=view&id=FILE_ID
            const ucIdMatch = imageUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (ucIdMatch && !fileId) {
              fileId = ucIdMatch[1];
            }
            
            if (fileId) {
              imageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
            }
          }
        }
        
        const story = {
          timestamp: cleanRow[0] || '',
          title: cleanRow[2] || '',
          author: cleanRow[3] || '',
          date: cleanRow[4] || '',
          category: cleanRow[5] ? cleanRow[5].toLowerCase() : '',
          imageFilename: cleanRow[6] || '',
          imageAlt: cleanRow[7] || '',
          imageUrl: imageUrl,
          excerpt: cleanRow[8] || '',
          fullContent: cleanRow[9] || '',
          addToBreaking: cleanRow[10] ? cleanRow[10].toLowerCase().includes('yes') : false
        };
        
        console.log(`Story ${i}: "${story.title}" - Image URL:`, story.imageUrl);
        
        // Parse date for sorting
        if (story.date) {
          const dateParts = story.date.split('/');
          if (dateParts.length === 3) {
            story.sortDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
          } else {
            story.sortDate = new Date();
          }
        } else {
          story.sortDate = new Date();
        }
        
        // Only add if we have a title
        if (story.title) {
          stories.push(story);
          
          // Add to quick stories if checked
          if (story.addToBreaking) {
            quickStories.push({
              title: story.title,
              content: story.excerpt || (story.fullContent ? story.fullContent.substring(0, 150) + '...' : ''),
              time: story.date || 'Recently',
              category: story.category,
              isFromFull: true
            });
          }
        }
      } 
      else if (storyType === 'Quick Story') {
        const quickStory = {
          title: cleanRow[11] || '', // Column L: Quick Story Headline
          content: cleanRow[12] || '', // Column M: Quick Story Summary
          time: cleanRow[14] || 'Just now', // Column O: Time Stamp
          category: cleanRow[13] ? cleanRow[13].toLowerCase() : '', // Column N: Category
          isFromFull: false
        };
        
        if (quickStory.title) {
          quickStories.push(quickStory);
        }
      }
    }
    
    // Sort stories by date (newest first)
    stories.sort((a, b) => b.sortDate - a.sortDate);
    
    console.log(`Loaded ${stories.length} stories and ${quickStories.length} quick stories`);
    
    return { stories, quickStories };
    
  } catch (error) {
    console.error('Error fetching from Google Sheets:', error);
    return { stories: [], quickStories: [] };
  }
}

function createArticleHTML(story, index) {
  const articleId = `story-${Date.now()}-${index}`;
  
  // Better date formatting
  let formattedDate = '';
  if (story.date) {
    // If date is in DD/MM/YYYY format
    const dateParts = story.date.split('/');
    if (dateParts.length === 3) {
      // Convert to YYYY-MM-DD for data attribute
      formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
    } else {
      formattedDate = story.date;
    }
  }
  
  // Format the full content with paragraphs
  let fullContentHTML = '';
  if (story.fullContent && story.fullContent.trim()) {
    const paragraphs = story.fullContent.split(/\r?\n/).filter(p => p.trim() !== '');
    fullContentHTML = paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('');
  } else {
    fullContentHTML = '<p>Full article content is not available at this time.</p>';
  }
  
  // Determine image source
  let imagePath = 'images/logo-placeholder.png';
  
  if (story.imageUrl && story.imageUrl.trim()) {
    imagePath = story.imageUrl;
  } else if (story.imageFilename && story.imageFilename.trim()) {
    imagePath = `images/${story.imageFilename}`;
  }
  
  // Format display date
  const displayDate = story.date || 'Recently';
  
  return `
    <article class="article fade-in" id="${articleId}" data-date="${formattedDate}" data-category="${escapeHtml(story.category || '')}">
      <img src="${escapeHtml(imagePath)}" alt="${escapeHtml(story.imageAlt || story.title)}" class="article-image" 
           onerror="this.onerror=null; this.src='images/logo-placeholder.png';">
      <div class="article-content">
        <h2>${escapeHtml(story.title || 'Untitled')}</h2>
        <div class="article-meta">By ${escapeHtml(story.author || 'Akhona Nongauza')} | ${escapeHtml(displayDate)}</div>
        <p class="article-excerpt">${escapeHtml(story.excerpt || '')}</p>
        <div class="article-full-content" style="display: none;">
          ${fullContentHTML}
        </div>
        <div class="article-footer">
          <button class="read-more">Read more</button>
          <div class="article-actions">
            <button class="action-btn">
              <i class="fas fa-share"></i>
              <span class="tooltip">Share</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
}

// Helper function to escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Function to update quick stories banner
function updateQuickStories(quickStories) {
  if (!quickStories || quickStories.length === 0) return;
  
  const quickStoriesLinkEl = document.getElementById('quickStoriesLink');
  const quickStoriesModal = document.getElementById('quickStoriesModal');
  const quickStoriesModalClose = document.getElementById('quickStoriesModalClose');
  const quickStoriesModalTitle = document.getElementById('quickStoriesModalTitle');
  const quickStoriesModalContent = document.getElementById('quickStoriesModalContent');
  const quickStoriesModalTime = document.getElementById('quickStoriesModalTime');
  const quickStoriesModalCategory = document.getElementById('quickStoriesModalCategory');
  const quickStoriesModalCounter = document.querySelector('.quick-stories-modal-counter');
  const quickStoriesSection = document.querySelector('.quick-stories');
  const prevQuickStoryBtn = document.getElementById('prevQuickStory');
  const nextQuickStoryBtn = document.getElementById('nextQuickStory');
  const prevQuickStoryModalBtn = document.getElementById('prevQuickStoryModal');
  const nextQuickStoryModalBtn = document.getElementById('nextQuickStoryModal');
  
  if (!quickStoriesLinkEl || !quickStoriesModal) return;
  
  let currentIndex = 0;
  let interval;
  let isPaused = false;
  
  function updateDisplay() {
    const currentStory = quickStories[currentIndex];
    if (currentStory) {
      quickStoriesLinkEl.textContent = currentStory.title || 'Quick Story';
    }
    
    // Update banner navigation buttons
    if (prevQuickStoryBtn && nextQuickStoryBtn) {
      prevQuickStoryBtn.disabled = currentIndex === 0;
      nextQuickStoryBtn.disabled = currentIndex === quickStories.length - 1;
    }
    
    // Update modal navigation buttons and counter
    if (prevQuickStoryModalBtn && nextQuickStoryModalBtn && quickStoriesModalCounter) {
      prevQuickStoryModalBtn.disabled = currentIndex === 0;
      nextQuickStoryModalBtn.disabled = currentIndex === quickStories.length - 1;
      quickStoriesModalCounter.textContent = `${currentIndex + 1} / ${quickStories.length}`;
    }
  }
  
  function nextStory() {
    if (quickStories.length > 0 && currentIndex < quickStories.length - 1) {
      currentIndex++;
      updateDisplay();
      updateModalContent(); // Update modal if it's open
    }
  }
  
  function prevStory() {
    if (quickStories.length > 0 && currentIndex > 0) {
      currentIndex--;
      updateDisplay();
      updateModalContent(); // Update modal if it's open
    }
  }
  
  function updateModalContent() {
    if (quickStoriesModal.classList.contains('active')) {
      const currentStory = quickStories[currentIndex];
      if (currentStory) {
        if (quickStoriesModalTitle) quickStoriesModalTitle.textContent = currentStory.title || 'Quick Story';
        if (quickStoriesModalContent) quickStoriesModalContent.textContent = currentStory.content || 'No content available.';
        if (quickStoriesModalTime) quickStoriesModalTime.textContent = currentStory.time || 'Just now';
        if (quickStoriesModalCategory) quickStoriesModalCategory.textContent = currentStory.category || 'General';
        if (quickStoriesModalCounter) quickStoriesModalCounter.textContent = `${currentIndex + 1} / ${quickStories.length}`;
      }
    }
  }
  
  function startInterval() {
    if (interval) clearInterval(interval);
    if (quickStories.length > 1) {
      interval = setInterval(() => {
        if (!isPaused) {
          currentIndex = (currentIndex + 1) % quickStories.length;
          updateDisplay();
          updateModalContent(); // Update modal if it's open
        }
      }, 5000);
    }
  }
  
  function resetInterval() {
    if (interval) clearInterval(interval);
    startInterval();
  }
  
  function stopRotation() { isPaused = true; }
  function resumeRotation() { isPaused = false; }
  
  function openModal(e) {
    e.preventDefault();
    const currentStory = quickStories[currentIndex];
    if (currentStory) {
      if (quickStoriesModalTitle) quickStoriesModalTitle.textContent = currentStory.title || 'Quick Story';
      if (quickStoriesModalContent) quickStoriesModalContent.textContent = currentStory.content || 'No content available.';
      if (quickStoriesModalTime) quickStoriesModalTime.textContent = currentStory.time || 'Just now';
      if (quickStoriesModalCategory) quickStoriesModalCategory.textContent = currentStory.category || 'General';
      if (quickStoriesModalCounter) quickStoriesModalCounter.textContent = `${currentIndex + 1} / ${quickStories.length}`;
      
      quickStoriesModal.classList.add('active');
      document.body.style.overflow = 'hidden';
      
      // Update modal button states
      if (prevQuickStoryModalBtn && nextQuickStoryModalBtn) {
        prevQuickStoryModalBtn.disabled = currentIndex === 0;
        nextQuickStoryModalBtn.disabled = currentIndex === quickStories.length - 1;
      }
    }
  }
  
  function closeModal() {
    quickStoriesModal.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
  
  // Remove old event listeners and add new ones
  quickStoriesLinkEl.removeEventListener('click', openModal);
  quickStoriesLinkEl.addEventListener('click', openModal);
  
  if (quickStoriesModalClose) {
    quickStoriesModalClose.removeEventListener('click', closeModal);
    quickStoriesModalClose.addEventListener('click', closeModal);
  }
  
  quickStoriesModal.addEventListener('click', (e) => {
    if (e.target === quickStoriesModal) closeModal();
  });
  
  // Banner navigation button event listeners
  if (prevQuickStoryBtn) {
    prevQuickStoryBtn.addEventListener('click', () => {
      prevStory();
      resetInterval();
    });
  }
  
  if (nextQuickStoryBtn) {
    nextQuickStoryBtn.addEventListener('click', () => {
      nextStory();
      resetInterval();
    });
  }
  
  // Modal navigation button event listeners
  if (prevQuickStoryModalBtn) {
    prevQuickStoryModalBtn.addEventListener('click', () => {
      prevStory();
      resetInterval();
    });
  }
  
  if (nextQuickStoryModalBtn) {
    nextQuickStoryModalBtn.addEventListener('click', () => {
      nextStory();
      resetInterval();
    });
  }
  
  if (quickStoriesSection) {
    quickStoriesSection.removeEventListener('mouseenter', stopRotation);
    quickStoriesSection.removeEventListener('mouseleave', resumeRotation);
    quickStoriesSection.addEventListener('mouseenter', stopRotation);
    quickStoriesSection.addEventListener('mouseleave', resumeRotation);
  }
  
  // Initialize
  if (quickStories.length > 0) {
    updateDisplay();
    startInterval();
  }
}


// ======================
// VIEW MORE/LESS FUNCTIONALITY
// ======================

function initializeViewMore(stories, existingArticles) {
  const articlesContainer = document.querySelector('.articles');
  const viewMoreContainer = document.getElementById('viewMoreContainer');
  
  let currentVisibleCount = 6;
  let hasAddedViewLess = false;
  let currentCategory = 'all'; // ADD THIS - FIXES THE BUTTON!
  
  // Combine stories and existing articles
  let allStories = [...stories];
  if (existingArticles) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = existingArticles;
    const existingElements = tempDiv.querySelectorAll('.article');
    existingElements.forEach(el => {
      allStories.push({
        element: el.outerHTML,
        isExisting: true,
        category: el.getAttribute('data-category') || ''
      });
    });
  }
  
  function displayArticles(count, category = currentCategory) {
    let articlesHTML = '';
    let articlesToShow = 0;
    let visibleStories = [];
    
    // First, filter stories by category
    for (let i = 0; i < allStories.length; i++) {
      const story = allStories[i];
      let storyCategory = '';
      
      if (story.isExisting) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = story.element;
        const articleEl = tempDiv.querySelector('.article');
        storyCategory = articleEl?.getAttribute('data-category') || '';
      } else {
        storyCategory = story.category || '';
      }
      
      if (category === 'all' || storyCategory === category) {
        visibleStories.push(story);
      }
    }
    
    articlesToShow = Math.min(count, visibleStories.length);
    
    for (let i = 0; i < articlesToShow; i++) {
      const story = visibleStories[i];
      if (story.isExisting) {
        articlesHTML += story.element;
      } else {
        articlesHTML += createArticleHTML(story, i);
      }
    }
    
    articlesContainer.innerHTML = articlesHTML;
    
    if (category !== 'all') {
      articlesContainer.classList.add('category-view');
      articlesContainer.style.display = 'flex';
      articlesContainer.style.flexDirection = 'column';
      articlesContainer.style.gap = '2rem';
    } else {
      articlesContainer.classList.remove('category-view');
      articlesContainer.style.display = 'grid';
      articlesContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(350px, 1fr))';
    }
    
    initializeArticleModal();
    return visibleStories.length;
  }
  
  function updateButtons(visibleCount, totalFiltered) {
    if (!viewMoreContainer) return;
    
    viewMoreContainer.innerHTML = '';
    
    if (currentVisibleCount < totalFiltered) {
      const moreBtn = document.createElement('button');
      moreBtn.className = 'view-more-btn';
      moreBtn.id = 'viewMoreBtn';
      moreBtn.innerHTML = '<i class="fas fa-plus"></i> View More Articles';
      moreBtn.addEventListener('click', handleViewMore);
      viewMoreContainer.appendChild(moreBtn);
    }
    
    if (currentVisibleCount > 6 && hasAddedViewLess) {
      const lessBtn = document.createElement('button');
      lessBtn.className = 'view-more-btn view-less';
      lessBtn.id = 'viewLessBtn';
      lessBtn.innerHTML = '<i class="fas fa-minus"></i> View Less Articles';
      lessBtn.addEventListener('click', handleViewLess);
      viewMoreContainer.appendChild(lessBtn);
    }
    
    viewMoreContainer.style.display = 
      (currentVisibleCount < totalFiltered || (currentVisibleCount > 6 && hasAddedViewLess)) 
      ? 'flex' : 'none';
  }
  
  function handleViewMore() {
    currentVisibleCount += 6;
    hasAddedViewLess = true;
    const totalFiltered = displayArticles(currentVisibleCount, currentCategory);
    updateButtons(totalFiltered, totalFiltered);
  }
  
  function handleViewLess() {
    currentVisibleCount = Math.max(6, currentVisibleCount - 6);
    const totalFiltered = displayArticles(currentVisibleCount, currentCategory);
    updateButtons(totalFiltered, totalFiltered);
    
    if (currentVisibleCount === 6) {
      hasAddedViewLess = false;
    }
  }
  
  window.changeCategory = function(category) {
    currentCategory = category;
    currentVisibleCount = 6;
    hasAddedViewLess = false;
    const totalFiltered = displayArticles(currentVisibleCount, category);
    updateButtons(totalFiltered, totalFiltered);
  };
  
  const totalFiltered = displayArticles(currentVisibleCount, 'all');
  updateButtons(totalFiltered, totalFiltered);
}

// Function to initialize article modal (extracted from DOMContentLoaded)
function initializeArticleModal() {
  const articleModal = document.getElementById('articleModal');
  const prevArticleBtn = document.getElementById('prevArticleBtn');
  const nextArticleBtn = document.getElementById('nextArticleBtn');
  
  let currentArticleIndex = 0;
  let allArticles = [];
  
  // Collect all articles
  function collectArticles() {
    const articleElements = document.querySelectorAll('.article');
    allArticles = Array.from(articleElements).map(article => {
      // Get the full content HTML directly
      const fullContentDiv = article.querySelector('.article-full-content');
      let fullContentHTML = '';
      
      if (fullContentDiv) {
        fullContentHTML = fullContentDiv.innerHTML;
      }
      
      // Log for debugging
      console.log('Article:', article.querySelector('h2')?.textContent);
      console.log('Full content HTML length:', fullContentHTML.length);
      console.log('Full content preview:', fullContentHTML.substring(0, 100));
      
      return {
        element: article,
        id: article.id,
        title: article.querySelector('h2')?.textContent || '',
        meta: article.querySelector('.article-meta')?.textContent || '',
        image: article.querySelector('.article-image')?.src || '',
        imageAlt: article.querySelector('.article-image')?.alt || '',
        excerpt: article.querySelector('.article-excerpt')?.textContent || '',
        fullContent: fullContentHTML,
        date: article.getAttribute('data-date') || ''
      };
    });
    
    console.log('Total articles collected:', allArticles.length);
  }
  
// Load article into modal
function loadArticle(index) {
  if (index < 0 || index >= allArticles.length) return;
  
  currentArticleIndex = index;
  const article = allArticles[index];
  
  const modalTitle = document.getElementById('modalTitle');
  const modalImage = document.getElementById('modalImage');
  const modalMeta = document.getElementById('modalMeta');
  const modalFullContent = document.getElementById('modalFullContent');
  
  if (modalTitle) modalTitle.textContent = article.title;
  
  if (modalImage) {
    modalImage.innerHTML = `<img src="${article.image}" alt="${article.imageAlt}" style="width: 100%; height: 300px; object-fit: cover; border-radius: 10px; margin-bottom: 1.5rem;" onerror="this.src='images/logo-placeholder.png'">`;
  }
  
  if (modalMeta) modalMeta.textContent = article.meta;
  
  if (modalFullContent) {
    // Always use light mode styling for excerpt wrapper in light mode
    const isDarkMode = document.body.getAttribute('data-theme') === 'dark';
    
    // Check if we have actual content
    let contentToShow = article.fullContent;
    
    // If fullContent is empty or just has a default message, use excerpt
    if (!contentToShow || contentToShow === '<p>Full article content is not available at this time.</p>' || contentToShow.length < 50) {
      if (article.excerpt && article.excerpt.length > 0) {
        contentToShow = `<p>${article.excerpt}</p><p><em>Full article content will be available soon.</em></p>`;
      } else {
        contentToShow = '<p>No content available for this article.</p>';
      }
    }
    
    // Create content with proper styling for both modes
    const combinedContent = `
      <div class="modal-excerpt-wrapper" style="margin-bottom: 1.5rem; padding: 1rem; background: rgba(255, 255, 255, 0.15); border-left: 4px solid var(--accent-gold);">
        <p class="modal-excerpt-text" style="font-style: italic; margin: 0; color: #ffffff;">
          ${article.excerpt || 'No excerpt available.'}
        </p>
      </div>
      <div class="modal-full-content-wrapper">
        ${contentToShow}
      </div>
    `;
    
    modalFullContent.innerHTML = combinedContent;
    
    // Force text color to white in light mode
    if (!isDarkMode) {
      const allContentElements = modalFullContent.querySelectorAll('*');
      allContentElements.forEach(el => {
        el.style.color = '#ffffff';
      });
    }
  }
  
  if (prevArticleBtn) prevArticleBtn.disabled = index === 0;
  if (nextArticleBtn) nextArticleBtn.disabled = index === allArticles.length - 1;
}
  
  function showPrevArticle() {
    if (currentArticleIndex > 0) {
      loadArticle(currentArticleIndex - 1);
    }
  }
  
  function showNextArticle() {
    if (currentArticleIndex < allArticles.length - 1) {
      loadArticle(currentArticleIndex + 1);
    }
  }
  
  // Remove existing event listeners and add new ones
  document.querySelectorAll('.read-more').forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.addEventListener('click', function(event) {
      event.preventDefault();
      event.stopPropagation();
      
      const article = this.closest('.article');
      if (!article) return;
      
      // Collect articles fresh each time
      collectArticles();
      
      const index = allArticles.findIndex(a => a.element === article);
      console.log('Opening article at index:', index);
      
      if (index !== -1) {
        loadArticle(index);
        articleModal.classList.add('active');
        document.body.style.overflow = 'hidden';
      } else {
        console.error('Article not found in collection');
      }
    });
  });
  
  // Navigation button event listeners
  if (prevArticleBtn) {
    prevArticleBtn.removeEventListener('click', showPrevArticle);
    prevArticleBtn.addEventListener('click', showPrevArticle);
  }
  
  if (nextArticleBtn) {
    nextArticleBtn.removeEventListener('click', showNextArticle);
    nextArticleBtn.addEventListener('click', showNextArticle);
  }
  
  // Keyboard navigation
  document.removeEventListener('keydown', handleKeyNavigation);
  function handleKeyNavigation(e) {
    if (!articleModal.classList.contains('active')) return;
    
    if (e.key === 'ArrowLeft' && currentArticleIndex > 0) {
      showPrevArticle();
    } else if (e.key === 'ArrowRight' && currentArticleIndex < allArticles.length - 1) {
      showNextArticle();
    } else if (e.key === 'Escape') {
      closeModal();
    }
  }
  document.addEventListener('keydown', handleKeyNavigation);
  
  // Modal close functionality
  const modalClose = document.getElementById('modalClose');
  if (modalClose) {
    modalClose.removeEventListener('click', closeModal);
    modalClose.addEventListener('click', closeModal);
  }
  
  function closeModal() {
    articleModal.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
  
  articleModal?.removeEventListener('click', handleModalClick);
  function handleModalClick(event) {
    if (event.target === articleModal) {
      closeModal();
    }
  }
  articleModal.addEventListener('click', handleModalClick);
  
  // Initial collection
  collectArticles();
}

// MAIN DOMContentLoaded - ALL functionality goes here
document.addEventListener('DOMContentLoaded', async function() {
  
  // ======================
// FETCH STORIES FROM GOOGLE SHEETS
// ======================

const articlesContainer = document.querySelector('.articles');

if (articlesContainer) {
  // FIRST, save all existing articles
  const existingArticles = Array.from(document.querySelectorAll('.article')).map(el => el.outerHTML).join('');
  
  // Show skeleton loading indicators
  articlesContainer.innerHTML = createSkeletonHTML(3);
  
  // Fetch stories from Google Sheets
  const { stories, quickStories } = await fetchStoriesFromSheet();
  
  // Clear skeleton loading indicators
  articlesContainer.innerHTML = '';
  
  if (stories.length > 0) {
    // Initialize view more functionality
    initializeViewMore(stories, existingArticles);
  } else {
    // Just show existing articles
    articlesContainer.innerHTML = existingArticles;
  }
  
  
  // Update quick stories banner with quick stories
  if (quickStories.length > 0) {
    updateQuickStories(quickStories);
  }
}
  
  // Search functionality - only for main page
  if (!window.location.pathname.includes('fixtures.html')) {
    document.querySelector('.search-bar')?.addEventListener('input', function(e) {
      const searchTerm = e.target.value.toLowerCase();
      const articles = document.querySelectorAll('.article');
      
      articles.forEach(article => {
        const title = article.querySelector('h2')?.textContent.toLowerCase() || '';
        const excerpt = article.querySelector('.article-excerpt')?.textContent.toLowerCase() || '';
        
        if (title.includes(searchTerm) || excerpt.includes(searchTerm)) {
          article.style.display = 'flex';
        } else {
          article.style.display = 'none';
        }
      });
    });
  }
  
  // Share button functionality
  document.querySelectorAll('.action-btn').forEach(button => {
    button.addEventListener('click', function(event) {
      event.preventDefault();
      event.stopPropagation();
      
      const article = this.closest('.article');
      const articleId = article.id;
      const articleTitle = article.querySelector('h2').textContent;
      const shareUrl = window.location.href + '#' + articleId;
      
      // Create share menu
      const existingMenu = document.querySelector('.share-menu');
      if (existingMenu) {
        existingMenu.remove();
      }
      
      const shareMenu = document.createElement('div');
      shareMenu.className = 'share-menu';
      shareMenu.innerHTML = `
        <button class="share-btn share-facebook" data-url="${shareUrl}" data-title="${articleTitle}">
          <i class="fab fa-facebook-f"></i> Facebook
        </button>
        <button class="share-btn share-twitter" data-url="${shareUrl}" data-title="${articleTitle}">
          <i class="fab fa-twitter"></i> Twitter
        </button>
        <button class="share-btn share-whatsapp" data-url="${shareUrl}" data-title="${articleTitle}">
          <i class="fab fa-whatsapp"></i> WhatsApp
        </button>
      `;
      
      // Position the menu
      const buttonRect = this.getBoundingClientRect();
      shareMenu.style.position = 'fixed';
      shareMenu.style.top = buttonRect.bottom + 5 + 'px';
      shareMenu.style.left = buttonRect.left + 'px';
      shareMenu.style.zIndex = '1000';
      
      document.body.appendChild(shareMenu);
      
      // Add event listeners to share buttons
      shareMenu.querySelectorAll('.share-btn').forEach(shareBtn => {
        shareBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          const url = this.getAttribute('data-url');
          const title = this.getAttribute('data-title');
          
          if (this.classList.contains('share-facebook')) {
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
          } else if (this.classList.contains('share-twitter')) {
            window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank');
          } else if (this.classList.contains('share-whatsapp')) {
            window.open(`https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`, '_blank');
          }
          
          shareMenu.remove();
        });
      });
      
      // Close menu when clicking outside
      setTimeout(() => {
        document.addEventListener('click', function closeMenu() {
          shareMenu.remove();
          document.removeEventListener('click', closeMenu);
        });
      }, 100);
    });
  });
  
  // ======================
  // MEET AKHONA MODAL FUNCTIONALITY
  // ======================
  
  const meetAkhonaBtn = document.getElementById('meetAkhonaBtn');
  const akhonaModal = document.getElementById('akhonaModal');
  const akhonaModalClose = document.getElementById('akhonaModalClose');
  const akhonaFullStory = document.getElementById('akhonaFullStory');
  
  const akhonaStory = `
    <p>Hi, I'm Akhona – the voice behind SportsCentral Media. My journey in sports journalism began in the stands of local stadiums, watching matches with a notebook in hand and dreaming of telling the stories of South African athletes.</p>
    
    <p>With over 5 years of experience covering South African sports, I've had the privilege of witnessing some of the most memorable moments in our nation's sporting history – from Bafana Bafana's historic World Cup qualification to the rise of new talent in the Varsity Cup and the dominance of our Proteas on the international stage.</p>
    
    <p>I'm passionate about bringing you the stories that matter from the pitch, field, and court. Whether it's the underdog triumph of a university team, the pressure of a title race, or the human stories behind the athletes, I believe every match has a story worth telling.</p>
    
    <p>What started as a passion project has grown into SportsCentral Media – a platform dedicated to comprehensive, authentic, and engaging sports coverage that puts South African fans first. From local tournaments to international competitions, I'm committed to keeping you connected to the sports you love.</p>
    
    <p>When I'm not at a match or writing, you'll find me studying the beautiful game, engaging with fans on social media, or planning the next big story to share with you.</p>
    
    <p>Thanks for being part of this journey. Your support means the world to me.</p>
    
    <p class="signature">— Akhona Nongauza</p>
  `;
  
  if (meetAkhonaBtn && akhonaModal) {
    meetAkhonaBtn.addEventListener('click', function() {
      if (akhonaFullStory) {
        akhonaFullStory.innerHTML = akhonaStory;
      }
      akhonaModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  }
  
  if (akhonaModalClose) {
    akhonaModalClose.addEventListener('click', function() {
      akhonaModal.classList.remove('active');
      document.body.style.overflow = 'auto';
    });
  }
  
  if (akhonaModal) {
    akhonaModal.addEventListener('click', function(event) {
      if (event.target === this) {
        this.classList.remove('active');
        document.body.style.overflow = 'auto';
      }
    });
  }
  
// Category filtering functionality
document.querySelectorAll('.category-item').forEach(item => {
  item.addEventListener('click', function(event) {
    event.preventDefault();
    
    const selectedCategory = this.getAttribute('data-category');
    console.log('Selected category:', selectedCategory);
    
    // Use the changeCategory function from initializeViewMore
    if (typeof window.changeCategory === 'function') {
      window.changeCategory(selectedCategory);
    } else {
      // Fallback: manual filtering
      const articles = document.querySelectorAll('.article');
      const articlesContainer = document.querySelector('.articles');
      let visibleCount = 0;
      
      articles.forEach(article => {
        const articleCategory = article.getAttribute('data-category');
        
        if (selectedCategory === 'all') {
          article.style.display = 'flex';
          visibleCount++;
        } else {
          if (articleCategory === selectedCategory) {
            article.style.display = 'flex';
            visibleCount++;
          } else {
            article.style.display = 'none';
          }
        }
      });
      
      if (selectedCategory === 'all') {
        articlesContainer.classList.remove('category-view');
        articlesContainer.style.display = 'grid';
        articlesContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(350px, 1fr))';
      } else {
        articlesContainer.classList.add('category-view');
        articlesContainer.style.display = 'flex';
        articlesContainer.style.flexDirection = 'column';
      }
    }
    
    // Update active category styling
    document.querySelectorAll('.category-item').forEach(cat => {
      cat.style.backgroundColor = '';
      cat.style.color = '';
      cat.style.borderRadius = '';
    });
    this.style.backgroundColor = 'var(--primary-red)';
    this.style.color = 'var(--white)';
    this.style.borderRadius = '4px';
  });
});
    
    // Show/hide view more container based on visible articles
    const viewMoreContainer = document.getElementById('viewMoreContainer');
    if (viewMoreContainer) {
      if (selectedCategory !== 'all' && visibleCount <= 6) {
        viewMoreContainer.style.display = 'none';
      } else {
        viewMoreContainer.style.display = 'flex';
      }
    }
  });


// ======================
// FIXTURES PAGE FUNCTIONALITY
// ======================

const PSL_FIXTURES = [
  // Round 1
  {
    date: '2025-08-08T15:00:00',
    homeTeam: 'AmaZulu',
    awayTeam: 'Orbit College',
    venue: 'Moses Mabhida Stadium',
    round: 1
  },
  {
    date: '2025-08-09T15:00:00',
    homeTeam: 'Chippa United',
    awayTeam: 'Mamelodi Sundowns',
    venue: 'Nelson Mandela Bay Stadium',
    round: 1
  },
  {
    date: '2025-08-09T15:00:00',
    homeTeam: 'Polokwane City',
    awayTeam: 'Magesi FC',
    venue: 'Peter Mokaba Stadium',
    round: 1
  },
  {
    date: '2025-08-09T15:00:00',
    homeTeam: 'Richards Bay',
    awayTeam: 'Marumo Gallants',
    venue: 'King Zwelithini Stadium',
    round: 1
  },
  {
    date: '2025-08-09T17:30:00',
    homeTeam: 'Orlando Pirates',
    awayTeam: 'Sekhukhune United',
    venue: 'Orlando Stadium',
    round: 1
  },
  {
    date: '2025-08-09T20:00:00',
    homeTeam: 'Siwelele FC',
    awayTeam: 'Golden Arrows',
    venue: 'Dr. Petrus Molemela Stadium',
    round: 1
  },
  {
    date: '2025-08-10T17:30:00',
    homeTeam: 'Stellenbosch FC',
    awayTeam: 'Kaizer Chiefs',
    venue: 'Danie Craven Stadium',
    round: 1
  },
  {
    date: '2025-08-10T18:00:00',
    homeTeam: 'TS Galaxy',
    awayTeam: 'Durban City',
    venue: 'Mbombela Stadium',
    round: 1
  },
  
  // Round 2
  {
    date: '2025-08-12T19:30:00',
    homeTeam: 'Mamelodi Sundowns',
    awayTeam: 'AmaZulu',
    venue: 'Loftus Versfeld Stadium',
    round: 2
  },
  {
    date: '2025-08-12T19:30:00',
    homeTeam: 'Marumo Gallants',
    awayTeam: 'Orlando Pirates',
    venue: 'Peter Mokaba Stadium',
    round: 2
  },
  {
    date: '2025-08-12T19:30:00',
    homeTeam: 'Orbit College',
    awayTeam: 'Siwelele FC',
    venue: 'Orlando Stadium',
    round: 2
  },
  {
    date: '2025-08-13T19:30:00',
    homeTeam: 'Durban City',
    awayTeam: 'Chippa United',
    venue: 'Sugar Ray Xulu Stadium',
    round: 2
  },
  {
    date: '2025-08-13T19:30:00',
    homeTeam: 'Kaizer Chiefs',
    awayTeam: 'Polokwane City',
    venue: 'FNB Stadium',
    round: 2
  },
  {
    date: '2025-08-13T19:30:00',
    homeTeam: 'Golden Arrows',
    awayTeam: 'Richards Bay',
    venue: 'Princess Magogo Stadium',
    round: 2
  },
  {
    date: '2025-08-13T19:30:00',
    homeTeam: 'Magesi FC',
    awayTeam: 'Stellenbosch FC',
    venue: 'Old Peter Mokaba Stadium',
    round: 2
  },
  {
    date: '2025-08-13T19:30:00',
    homeTeam: 'Sekhukhune United',
    awayTeam: 'TS Galaxy',
    venue: 'Peter Mokaba Stadium',
    round: 2
  },
  
  // Round 3
  {
    date: '2025-08-19T19:30:00',
    homeTeam: 'Chippa United',
    awayTeam: 'TS Galaxy',
    venue: 'Nelson Mandela Bay Stadium',
    round: 3
  },
  {
    date: '2025-08-19T19:30:00',
    homeTeam: 'Durban City',
    awayTeam: 'Golden Arrows',
    venue: 'Sugar Ray Xulu Stadium',
    round: 3
  },
  {
    date: '2025-08-19T19:30:00',
    homeTeam: 'Kaizer Chiefs',
    awayTeam: 'Richards Bay',
    venue: 'FNB Stadium',
    round: 3
  },
  {
    date: '2025-08-19T19:30:00',
    homeTeam: 'Orbit College',
    awayTeam: 'Sekhukhune United',
    venue: 'Orlando Stadium',
    round: 3
  },
  {
    date: '2025-08-19T19:30:00',
    homeTeam: 'Siwelele FC',
    awayTeam: 'Polokwane City',
    venue: 'Dr. Petrus Molemela Stadium',
    round: 3
  },
  {
    date: '2025-08-20T19:30:00',
    homeTeam: 'AmaZulu',
    awayTeam: 'Marumo Gallants',
    venue: 'Moses Mabhida Stadium',
    round: 3
  },
  {
    date: '2025-08-20T19:30:00',
    homeTeam: 'Magesi FC',
    awayTeam: 'Mamelodi Sundowns',
    venue: 'Old Peter Mokaba Stadium',
    round: 3
  },
  {
    date: '2025-08-20T19:30:00',
    homeTeam: 'Orlando Pirates',
    awayTeam: 'Stellenbosch FC',
    venue: 'Orlando Stadium',
    round: 3
  },
  
  // Round 4
  {
    date: '2025-08-25T18:30:00',
    homeTeam: 'Orlando Pirates',
    awayTeam: 'Orbit College',
    venue: 'Orlando Stadium',
    round: 4
  },
  {
    date: '2025-08-25T18:30:00',
    homeTeam: 'Polokwane City',
    awayTeam: 'Durban City',
    venue: 'Peter Mokaba Stadium',
    round: 4
  },
  {
    date: '2025-08-25T18:30:00',
    homeTeam: 'Richards Bay',
    awayTeam: 'Chippa United',
    venue: 'King Zwelithini Stadium',
    round: 4
  },
  {
    date: '2025-08-25T18:30:00',
    homeTeam: 'Stellenbosch FC',
    awayTeam: 'Marumo Gallants',
    venue: 'Danie Craven Stadium',
    round: 4
  },
  {
    date: '2025-08-25T18:30:00',
    homeTeam: 'Siwelele FC',
    awayTeam: 'Golden Arrows',
    venue: 'Dr. Petrus Molemela Stadium',
    round: 4
  },
  {
    date: '2025-08-25T18:30:00',
    homeTeam: 'Mamelodi Sundowns',
    awayTeam: 'Kaizer Chiefs',
    venue: 'Loftus Versfeld Stadium',
    round: 4
  },
  {
    date: '2025-08-25T18:30:00',
    homeTeam: 'Sekhukhune United',
    awayTeam: 'AmaZulu',
    venue: 'Peter Mokaba Stadium',
    round: 4
  },
  {
    date: '2025-08-25T18:30:00',
    homeTeam: 'TS Galaxy',
    awayTeam: 'Magesi FC',
    venue: 'Mbombela Stadium',
    round: 4
  },
  
  // Round 5
  {
    date: '2025-08-30T15:00:00',
    homeTeam: 'Siwelele FC',
    awayTeam: 'Richards Bay',
    venue: 'Dr. Petrus Molemela Stadium',
    round: 5
  },
  {
    date: '2025-08-30T15:00:00',
    homeTeam: 'Magesi FC',
    awayTeam: 'AmaZulu',
    venue: 'Old Peter Mokaba Stadium',
    round: 5
  },
  {
    date: '2025-08-30T15:00:00',
    homeTeam: 'Stellenbosch FC',
    awayTeam: 'Mamelodi Sundowns',
    venue: 'Danie Craven Stadium',
    round: 5
  },
  {
    date: '2025-08-30T15:00:00',
    homeTeam: 'Golden Arrows',
    awayTeam: 'Kaizer Chiefs',
    venue: 'Princess Magogo Stadium',
    round: 5
  },
  {
    date: '2025-08-30T15:00:00',
    homeTeam: 'Sekhukhune United',
    awayTeam: 'Durban City',
    venue: 'Peter Mokaba Stadium',
    round: 5
  },
  {
    date: '2025-08-30T15:00:00',
    homeTeam: 'Orbit College',
    awayTeam: 'TS Galaxy',
    venue: 'Orlando Stadium',
    round: 5
  },
  {
    date: '2025-08-30T15:00:00',
    homeTeam: 'Chippa United',
    awayTeam: 'Orlando Pirates',
    venue: 'Nelson Mandela Bay Stadium',
    round: 5
  },
  {
    date: '2025-08-30T15:00:00',
    homeTeam: 'Marumo Gallants',
    awayTeam: 'Polokwane City',
    venue: 'Peter Mokaba Stadium',
    round: 5
  },

  // Round 6
  {
    date: '2025-10-05T15:00:00',
    homeTeam: 'Golden Arrows',
    awayTeam: 'Mamelodi Sundowns',
    venue: 'Princess Magogo Stadium',
    round: 6
  },
  {
    date: '2025-10-05T17:30:00',
    homeTeam: 'Marumo Gallants',
    awayTeam: 'Orlando Pirates',
    venue: 'Peter Mokaba Stadium',
    round: 6
  },
  {
    date: '2025-10-05T18:30:00',
    homeTeam: 'Orbit College',
    awayTeam: 'Polokwane City',
    venue: 'Orlando Stadium',
    round: 6
  },
  {
    date: '2025-10-05T19:30:00',
    homeTeam: 'Richards Bay',
    awayTeam: 'Sekhukhune United',
    venue: 'King Zwelithini Stadium',
    round: 6
  },
  {
    date: '2025-10-05T19:30:00',
    homeTeam: 'Magesi FC',
    awayTeam: 'TS Galaxy',
    venue: 'Old Peter Mokaba Stadium',
    round: 6
  },
  {
    date: '2025-10-05T20:30:00',
    homeTeam: 'Sekhukhune United',
    awayTeam: 'Chippa United',
    venue: 'Peter Mokaba Stadium',
    round: 6
  },
  {
    date: '2025-10-05T21:30:00',
    homeTeam: 'Siwelele FC',
    awayTeam: 'Stellenbosch FC',
    venue: 'Dr. Petrus Molemela Stadium',
    round: 6
  },
  {
    date: '2025-10-05T22:30:00',
    homeTeam: 'Orlando Pirates',
    awayTeam: 'AmaZulu',
    venue: 'Orlando Stadium',
    round: 6
  },

  // Round 7
  {
    date: '2025-09-20T15:00:00',
    homeTeam: 'AmaZulu',
    awayTeam: 'Orlando Pirates',
    venue: 'Moses Mabhida Stadium',
    round: 7
  },
  {
    date: '2025-09-20T15:00:00',
    homeTeam: 'Magesi FC',
    awayTeam: 'Siwelele FC',
    venue: 'Old Peter Mokaba Stadium',
    round: 7
  },
  {
    date: '2025-09-20T15:00:00',
    homeTeam: 'Sekhukhune United',
    awayTeam: 'Golden Arrows',
    venue: 'Peter Mokaba Stadium',
    round: 7
  },
  {
    date: '2025-09-20T17:30:00',
    homeTeam: 'Mamelodi Sundowns',
    awayTeam: 'Durban City',
    venue: 'Loftus Versfeld Stadium',
    round: 7
  },
  {
    date: '2025-09-20T20:00:00',
    homeTeam: 'Orbit College',
    awayTeam: 'Marumo Gallants',
    venue: 'Orlando Stadium',
    round: 7
  },
  {
    date: '2025-09-20T20:00:00',
    homeTeam: 'Stellenbosch FC',
    awayTeam: 'Richards Bay',
    venue: 'Danie Craven Stadium',
    round: 7
  },
  {
    date: '2025-09-21T15:00:00',
    homeTeam: 'Polokwane City',
    awayTeam: 'Chippa United',
    venue: 'Peter Mokaba Stadium',
    round: 7
  },
  {
    date: '2025-09-21T15:00:00',
    homeTeam: 'TS Galaxy',
    awayTeam: 'Kaizer Chiefs',
    venue: 'Mbombela Stadium',
    round: 7
  },

  // Round 8
  {
    date: '2025-09-24T15:00:00',
    homeTeam: 'Golden Arrows',
    awayTeam: 'Mamelodi Sundowns',
    venue: 'Princess Magogo Stadium',
    round: 8
  },
  {
    date: '2025-09-24T17:30:00',
    homeTeam: 'Marumo Gallants',
    awayTeam: 'Kaizer Chiefs',
    venue: 'Peter Mokaba Stadium',
    round: 8
  },
  {
    date: '2025-09-24T19:30:00',
    homeTeam: 'Orbit College',
    awayTeam: 'Polokwane City',
    venue: 'Orlando Stadium',
    round: 8
  },
  {
    date: '2025-09-24T19:30:00',
    homeTeam: 'Richards Bay',
    awayTeam: 'Magesi FC',
    venue: 'King Zwelithini Stadium',
    round: 8
  },
  {
    date: '2025-09-24T19:30:00',
    homeTeam: 'Sekhukhune United',
    awayTeam: 'Chippa United',
    venue: 'Peter Mokaba Stadium',
    round: 8
  },
  {
    date: '2025-09-24T19:30:00',
    homeTeam: 'Siwelele FC',
    awayTeam: 'Orlando Pirates',
    venue: 'Dr. Petrus Molemela Stadium',
    round: 8
  },
  {
    date: '2025-09-24T19:30:00',
    homeTeam: 'Stellenbosch FC',
    awayTeam: 'Durban City',
    venue: 'Danie Craven Stadium',
    round: 8
  },
  {
    date: '2025-09-24T19:30:00',
    homeTeam: 'TS Galaxy',
    awayTeam: 'AmaZulu',
    venue: 'Mbombela Stadium',
    round: 8
  },

  // Round 9
  {
    date: '2025-09-27T15:00:00',
    homeTeam: 'Golden Arrows',
    awayTeam: 'Orbit College',
    venue: 'Princess Magogo Stadium',
    round: 9
  },
  {
    date: '2025-09-27T15:00:00',
    homeTeam: 'Polokwane City',
    awayTeam: 'Sekhukhune United',
    venue: 'Peter Mokaba Stadium',
    round: 9
  },
  {
    date: '2025-09-27T17:30:00',
    homeTeam: 'Kaizer Chiefs',
    awayTeam: 'AmaZulu',
    venue: 'FNB Stadium',
    round: 9
  },
  {
    date: '2025-09-27T17:30:00',
    homeTeam: 'Mamelodi Sundowns',
    awayTeam: 'Richards Bay',
    venue: 'Loftus Versfeld Stadium',
    round: 9
  },
  {
    date: '2025-09-27T20:00:00',
    homeTeam: 'Durban City',
    awayTeam: 'Magesi FC',
    venue: 'Sugar Ray Xulu Stadium',
    round: 9
  },
  {
    date: '2025-09-28T15:00:00',
    homeTeam: 'Orlando Pirates',
    awayTeam: 'TS Galaxy',
    venue: 'Orlando Stadium',
    round: 9
  },
  {
    date: '2025-09-28T15:00:00',
    homeTeam: 'Siwelele FC',
    awayTeam: 'Marumo Gallants',
    venue: 'Dr. Petrus Molemela Stadium',
    round: 9
  },
  {
    date: '2025-09-28T17:30:00',
    homeTeam: 'Chippa United',
    awayTeam: 'Stellenbosch FC',
    venue: 'Nelson Mandela Bay Stadium',
    round: 9
  },

  // Round 10
  {
    date: '2025-12-17T19:30:00',
    homeTeam: 'Richards Bay',
    awayTeam: 'Orbit College',
    venue: 'King Zwelithini Stadium',
    round: 10
  },
  {
    date: '2025-12-18T15:30:00',
    homeTeam: 'AmaZulu',
    awayTeam: 'Durban City',
    venue: 'Moses Mabhida Stadium',
    round: 10
  },
  {
    date: '2025-12-18T15:30:00',
    homeTeam: 'Orlando Pirates',
    awayTeam: 'Polokwane City',
    venue: 'Orlando Stadium',
    round: 10
  },
  {
    date: '2025-12-18T17:20:00',
    homeTeam: 'Magesi FC',
    awayTeam: 'TS Galaxy',
    venue: 'Old Peter Mokaba Stadium',
    round: 10
  },
  {
    date: '2025-12-18T17:20:00',
    homeTeam: 'Sekhukhune United',
    awayTeam: 'Mamelodi Sundowns',
    venue: 'Peter Mokaba Stadium',
    round: 10
  },
  {
    date: '2025-12-18T20:00:00',
    homeTeam: 'Stellenbosch FC',
    awayTeam: 'Golden Arrows',
    venue: 'Danie Craven Stadium',
    round: 10
  },
  {
    date: '2025-12-18T15:30:00',
    homeTeam: 'Marumo Gallants',
    awayTeam: 'Chippa United',
    venue: 'Peter Mokaba Stadium',
    round: 10
  },
  {
    date: '2025-12-19T17:20:00',
    homeTeam: 'Kaizer Chiefs',
    awayTeam: 'Siwelele FC',
    venue: 'FNB Stadium',
    round: 10
  },

  // Round 11
  {
    date: '2025-10-31T19:30:00',
    homeTeam: 'Durban City',
    awayTeam: 'Kaizer Chiefs',
    venue: 'Sugar Ray Xulu Stadium',
    round: 11
  },
  {
    date: '2025-10-31T19:30:00',
    homeTeam: 'Siwelele FC',
    awayTeam: 'Sekhukhune United',
    venue: 'Dr. Petrus Molemela Stadium',
    round: 11
  },
  {
    date: '2025-11-01T15:30:00',
    homeTeam: 'Mamelodi Sundowns',
    awayTeam: 'Orlando Pirates',
    venue: 'Loftus Versfeld Stadium',
    round: 11
  },
  {
    date: '2025-11-01T15:30:00',
    homeTeam: 'Orbit College',
    awayTeam: 'Magesi FC',
    venue: 'Orlando Stadium',
    round: 11
  },
  {
    date: '2025-11-01T17:30:00',
    homeTeam: 'Polokwane City',
    awayTeam: 'Richards Bay',
    venue: 'Peter Mokaba Stadium',
    round: 11
  },
  {
    date: '2025-11-01T20:00:00',
    homeTeam: 'Chippa United',
    awayTeam: 'AmaZulu',
    venue: 'Nelson Mandela Bay Stadium',
    round: 11
  },
  {
    date: '2025-11-02T15:30:00',
    homeTeam: 'TS Galaxy',
    awayTeam: 'Stellenbosch FC',
    venue: 'Mbombela Stadium',
    round: 11
  },
  {
    date: '2025-11-02T17:30:00',
    homeTeam: 'Golden Arrows',
    awayTeam: 'Marumo Gallants',
    venue: 'Princess Magogo Stadium',
    round: 11
  },

  // Round 12
  {
    date: '2025-11-04T18:30:00',
    homeTeam: 'AmaZulu',
    awayTeam: 'Polokwane City',
    venue: 'Moses Mabhida Stadium',
    round: 12
  },
  {
    date: '2025-11-04T18:30:00',
    homeTeam: 'Chippa United',
    awayTeam: 'Magesi FC',
    venue: 'Nelson Mandela Bay Stadium',
    round: 12
  },
  {
    date: '2025-11-04T18:30:00',
    homeTeam: 'Kaizer Chiefs',
    awayTeam: 'Orbit College',
    venue: 'FNB Stadium',
    round: 12
  },
  {
    date: '2025-11-04T18:30:00',
    homeTeam: 'Sekhukhune United',
    awayTeam: 'Richards Bay',
    venue: 'Peter Mokaba Stadium',
    round: 12
  },
  {
    date: '2025-11-05T18:30:00',
    homeTeam: 'Durban City',
    awayTeam: 'Marumo Gallants',
    venue: 'Sugar Ray Xulu Stadium',
    round: 12
  },
  {
    date: '2025-11-05T18:30:00',
    homeTeam: 'Golden Arrows',
    awayTeam: 'Orlando Pirates',
    venue: 'Princess Magogo Stadium',
    round: 12
  },
  {
    date: '2025-11-05T18:30:00',
    homeTeam: 'Mamelodi Sundowns',
    awayTeam: 'TS Galaxy',
    venue: 'Loftus Versfeld Stadium',
    round: 12
  },
  {
    date: '2025-11-05T18:30:00',
    homeTeam: 'Stellenbosch FC',
    awayTeam: 'Siwelele FC',
    venue: 'Danie Craven Stadium',
    round: 12
  },

  // Round 13
  {
    date: '2025-11-22T15:30:00',
    homeTeam: 'AmaZulu',
    awayTeam: 'Siwelele FC',
    venue: 'Moses Mabhida Stadium',
    round: 13
  },
  {
    date: '2025-11-22T15:30:00',
    homeTeam: 'Orlando Pirates',
    awayTeam: 'Chippa United',
    venue: 'Orlando Stadium',
    round: 13
  },
  {
    date: '2025-11-22T17:30:00',
    homeTeam: 'Magesi FC',
    awayTeam: 'Kaizer Chiefs',
    venue: 'Old Peter Mokaba Stadium',
    round: 13
  },
  {
    date: '2025-11-22T17:30:00',
    homeTeam: 'Marumo Gallants',
    awayTeam: 'Sekhukhune United',
    venue: 'Peter Mokaba Stadium',
    round: 13
  },
  {
    date: '2025-11-22T20:00:00',
    homeTeam: 'Orbit College',
    awayTeam: 'Stellenbosch FC',
    venue: 'Orlando Stadium',
    round: 13
  },
  {
    date: '2025-11-23T15:30:00',
    homeTeam: 'Polokwane City',
    awayTeam: 'Mamelodi Sundowns',
    venue: 'Peter Mokaba Stadium',
    round: 13
  },
  {
    date: '2025-11-23T15:30:00',
    homeTeam: 'TS Galaxy',
    awayTeam: 'Golden Arrows',
    venue: 'Mbombela Stadium',
    round: 13
  },
  {
    date: '2025-11-23T17:30:00',
    homeTeam: 'Richards Bay',
    awayTeam: 'Durban City',
    venue: 'King Zwelithini Stadium',
    round: 13
  },

  // Round 14
  {
    date: '2025-11-28T19:30:00',
    homeTeam: 'Richards Bay',
    awayTeam: 'AmaZulu',
    venue: 'King Zwelithini Stadium',
    round: 14
  },
  {
    date: '2025-11-29T15:30:00',
    homeTeam: 'Durban City',
    awayTeam: 'Orlando Pirates',
    venue: 'Sugar Ray Xulu Stadium',
    round: 14
  },
  {
    date: '2025-11-29T15:30:00',
    homeTeam: 'Polokwane City',
    awayTeam: 'TS Galaxy',
    venue: 'Peter Mokaba Stadium',
    round: 14
  },
  {
    date: '2025-11-29T17:30:00',
    homeTeam: 'Siwelele FC',
    awayTeam: 'Chippa United',
    venue: 'Dr. Petrus Molemela Stadium',
    round: 14
  },
  {
    date: '2025-11-29T20:00:00',
    homeTeam: 'Mamelodi Sundowns',
    awayTeam: 'Orbit College',
    venue: 'Loftus Versfeld Stadium',
    round: 14
  },
  {
    date: '2025-11-30T15:30:00',
    homeTeam: 'Marumo Gallants',
    awayTeam: 'Magesi FC',
    venue: 'Peter Mokaba Stadium',
    round: 14
  },
  {
    date: '2025-11-30T15:30:00',
    homeTeam: 'Sekhukhune United',
    awayTeam: 'Stellenbosch FC',
    venue: 'Peter Mokaba Stadium',
    round: 14
  },
  {
    date: '2025-11-30T17:30:00',
    homeTeam: 'Kaizer Chiefs',
    awayTeam: 'Golden Arrows',
    venue: 'FNB Stadium',
    round: 14
  },

  // Round 15
  {
    date: '2025-12-02T18:30:00',
    homeTeam: 'Orlando Pirates',
    awayTeam: 'Richards Bay',
    venue: 'Orlando Stadium',
    round: 15
  },
  {
    date: '2025-12-02T18:30:00',
    homeTeam: 'Siwelele FC',
    awayTeam: 'Mamelodi Sundowns',
    venue: 'Dr. Petrus Molemela Stadium',
    round: 15
  },
  {
    date: '2025-12-03T18:30:00',
    homeTeam: 'Chippa United',
    awayTeam: 'Kaizer Chiefs',
    venue: 'Nelson Mandela Bay Stadium',
    round: 15
  },
  {
    date: '2025-12-03T18:30:00',
    homeTeam: 'Golden Arrows',
    awayTeam: 'AmaZulu',
    venue: 'Princess Magogo Stadium',
    round: 15
  },
  {
    date: '2025-12-03T18:30:00',
    homeTeam: 'Magesi FC',
    awayTeam: 'Sekhukhune United',
    venue: 'Old Peter Mokaba Stadium',
    round: 15
  },
  {
    date: '2025-12-03T18:30:00',
    homeTeam: 'Orbit College',
    awayTeam: 'Durban City',
    venue: 'Orlando Stadium',
    round: 15
  },
  {
    date: '2025-12-03T18:30:00',
    homeTeam: 'Stellenbosch FC',
    awayTeam: 'Polokwane City',
    venue: 'Danie Craven Stadium',
    round: 15
  },
  {
    date: '2025-12-03T18:30:00',
    homeTeam: 'TS Galaxy',
    awayTeam: 'Marumo Gallants',
    venue: 'Mbombela Stadium',
    round: 15
  },

  // Round 16
  {
    date: '2026-01-23T19:30:00',
    homeTeam: 'Richards Bay',
    awayTeam: 'Siwelele FC',
    venue: 'Sugar Ray Xulu Stadium',
    round: 16
  },
  {
    date: '2026-01-24T15:30:00',
    homeTeam: 'Orbit College',
    awayTeam: 'Chippa United',
    venue: 'ORBIT College Stadium',
    round: 16
  },
  {
    date: '2026-01-24T15:30:00',
    homeTeam: 'Sekhukhune United',
    awayTeam: 'Orlando Pirates',
    venue: 'Thohoyandou Stadium',
    round: 16
  },
  {
    date: '2026-01-24T17:30:00',
    homeTeam: 'Kaizer Chiefs',
    awayTeam: 'Marumo Gallants',
    venue: 'FNB Stadium',
    round: 16
  },
  {
    date: '2026-01-24T17:30:00',
    homeTeam: 'Golden Arrows',
    awayTeam: 'Stellenbosch FC',
    venue: 'Princess Magogo Stadium',
    round: 16
  },
  {
    date: '2026-01-24T20:00:00',
    homeTeam: 'Mamelodi Sundowns',
    awayTeam: 'Magesi FC',
    venue: 'Loftus Versfeld Stadium',
    round: 16
  },
  {
    date: '2026-01-25T15:30:00',
    homeTeam: 'AmaZulu',
    awayTeam: 'TS Galaxy',
    venue: 'King Zwelithini Stadium',
    round: 16
  },
  {
    date: '2026-01-25T17:30:00',
    homeTeam: 'Durban City',
    awayTeam: 'Polokwane City',
    venue: 'Durban City Stadium',
    round: 16
  },

  // Round 17
  {
    date: '2026-01-30T19:30:00',
    homeTeam: 'Richards Bay',
    awayTeam: 'Golden Arrows',
    venue: 'Sugar Ray Xulu Stadium',
    round: 17
  },
  {
    date: '2026-01-30T19:30:00',
    homeTeam: 'Stellenbosch FC',
    awayTeam: 'Magesi FC',
    venue: 'Danie Craven Stadium',
    round: 17
  },
  {
    date: '2026-01-31T15:30:00',
    homeTeam: 'Marumo Gallants',
    awayTeam: 'AmaZulu',
    venue: 'Peter Mokaba Stadium',
    round: 17
  },
  {
    date: '2026-01-31T15:30:00',
    homeTeam: 'Orlando Pirates',
    awayTeam: 'Mamelodi Sundowns',
    venue: 'Orlando Stadium',
    round: 17
  },
  {
    date: '2026-01-31T17:30:00',
    homeTeam: 'Polokwane City',
    awayTeam: 'Orbit College',
    venue: 'Old Peter Mokaba Stadium',
    round: 17
  },
  {
    date: '2026-01-31T20:00:00',
    homeTeam: 'Chippa United',
    awayTeam: 'Durban City',
    venue: 'Sivutsa Stadium',
    round: 17
  },
  {
    date: '2026-02-01T15:30:00',
    homeTeam: 'TS Galaxy',
    awayTeam: 'Sekhukhune United',
    venue: 'Kemi Seba Stadium',
    round: 17
  },
  {
    date: '2026-02-01T17:30:00',
    homeTeam: 'Siwelele FC',
    awayTeam: 'Kaizer Chiefs',
    venue: 'Siwelele Stadium',
    round: 17
  },

  // Round 18
  {
    date: '2026-02-13T19:30:00',
    homeTeam: 'Durban City',
    awayTeam: 'TS Galaxy',
    venue: 'Durban City Stadium',
    round: 18
  },
  {
    date: '2026-02-13T19:30:00',
    homeTeam: 'Magesi FC',
    awayTeam: 'Golden Arrows',
    venue: 'Old Peter Mokaba Stadium',
    round: 18
  },
  {
    date: '2026-02-14T15:30:00',
    homeTeam: 'AmaZulu',
    awayTeam: 'Mamelodi Sundowns',
    venue: 'King Zwelithini Stadium',
    round: 18
  },
  {
    date: '2026-02-14T15:30:00',
    homeTeam: 'Polokwane City',
    awayTeam: 'Siwelele FC',
    venue: 'Old Peter Mokaba Stadium',
    round: 18
  },
  {
    date: '2026-02-14T17:30:00',
    homeTeam: 'Kaizer Chiefs',
    awayTeam: 'Stellenbosch FC',
    venue: 'FNB Stadium',
    round: 18
  },
  {
    date: '2026-02-14T20:00:00',
    homeTeam: 'Chippa United',
    awayTeam: 'Richards Bay',
    venue: 'Sivutsa Stadium',
    round: 18
  },
  {
    date: '2026-02-15T15:30:00',
    homeTeam: 'Orlando Pirates',
    awayTeam: 'Marumo Gallants',
    venue: 'Orlando Stadium',
    round: 18
  },
  {
    date: '2026-02-15T17:30:00',
    homeTeam: 'Sekhukhune United',
    awayTeam: 'Orbit College',
    venue: 'Thohoyandou Stadium',
    round: 18
  },

  // Round 19
  {
    date: '2026-02-27T19:30:00',
    homeTeam: 'Magesi FC',
    awayTeam: 'Polokwane City',
    venue: 'Old Peter Mokaba Stadium',
    round: 19
  },
  {
    date: '2026-02-27T19:30:00',
    homeTeam: 'Stellenbosch FC',
    awayTeam: 'AmaZulu',
    venue: 'Danie Craven Stadium',
    round: 19
  },
  {
    date: '2026-02-28T15:30:00',
    homeTeam: 'Kaizer Chiefs',
    awayTeam: 'Orlando Pirates',
    venue: 'FNB Stadium',
    round: 19
  },
  {
    date: '2026-02-28T17:30:00',
    homeTeam: 'Golden Arrows',
    awayTeam: 'Chippa United',
    venue: 'Princess Magogo Stadium',
    round: 19
  },
  {
    date: '2026-02-28T17:30:00',
    homeTeam: 'Siwelele FC',
    awayTeam: 'TS Galaxy',
    venue: 'Siwelele Stadium',
    round: 19
  },
  {
    date: '2026-02-28T20:00:00',
    homeTeam: 'Orbit College',
    awayTeam: 'Richards Bay',
    venue: 'ORBIT College Stadium',
    round: 19
  },
  {
    date: '2026-03-01T15:30:00',
    homeTeam: 'Mamelodi Sundowns',
    awayTeam: 'Sekhukhune United',
    venue: 'Loftus Versfeld Stadium',
    round: 19
  },
  {
    date: '2026-03-01T15:30:00',
    homeTeam: 'Marumo Gallants',
    awayTeam: 'Durban City',
    venue: 'Peter Mokaba Stadium',
    round: 19
  },

  // Round 20
  {
    date: '2026-03-03T19:30:00',
    homeTeam: 'Richards Bay',
    awayTeam: 'Kaizer Chiefs',
    venue: 'Sugar Ray Xulu Stadium',
    round: 20
  },
  {
    date: '2026-03-03T19:30:00',
    homeTeam: 'Siwelele FC',
    awayTeam: 'Stellenbosch FC',
    venue: 'Siwelele Stadium',
    round: 20
  },
  {
    date: '2026-03-03T19:30:00',
    homeTeam: 'TS Galaxy',
    awayTeam: 'Orbit College',
    venue: 'Kemi Seba Stadium',
    round: 20
  },
  {
    date: '2026-03-04T19:30:00',
    homeTeam: 'AmaZulu',
    awayTeam: 'Magesi FC',
    venue: 'King Zwelithini Stadium',
    round: 20
  },
  {
    date: '2026-03-04T19:30:00',
    homeTeam: 'Chippa United',
    awayTeam: 'Marumo Gallants',
    venue: 'Sivutsa Stadium',
    round: 20
  },
  {
    date: '2026-03-04T19:30:00',
    homeTeam: 'Durban City',
    awayTeam: 'Sekhukhune United',
    venue: 'Durban City Stadium',
    round: 20
  },
  {
    date: '2026-03-04T19:30:00',
    homeTeam: 'Mamelodi Sundowns',
    awayTeam: 'Golden Arrows',
    venue: 'Loftus Versfeld Stadium',
    round: 20
  },
  {
    date: '2026-03-04T19:30:00',
    homeTeam: 'Polokwane City',
    awayTeam: 'Orlando Pirates',
    venue: 'Old Peter Mokaba Stadium',
    round: 20
  },

  // Round 21
  {
    date: '2026-03-13T19:30:00',
    homeTeam: 'Magesi FC',
    awayTeam: 'Chippa United',
    venue: 'Old Peter Mokaba Stadium',
    round: 21
  },
  {
    date: '2026-03-13T19:30:00',
    homeTeam: 'Stellenbosch FC',
    awayTeam: 'TS Galaxy',
    venue: 'Danie Craven Stadium',
    round: 21
  },
  {
    date: '2026-03-14T15:30:00',
    homeTeam: 'AmaZulu',
    awayTeam: 'Richards Bay',
    venue: 'King Zwelithini Stadium',
    round: 21
  },
  {
    date: '2026-03-14T15:30:00',
    homeTeam: 'Orlando Pirates',
    awayTeam: 'Siwelele FC',
    venue: 'Orlando Stadium',
    round: 21
  },
  {
    date: '2026-03-14T17:30:00',
    homeTeam: 'Sekhukhune United',
    awayTeam: 'Polokwane City',
    venue: 'Thohoyandou Stadium',
    round: 21
  },
  {
    date: '2026-03-14T20:00:00',
    homeTeam: 'Orbit College',
    awayTeam: 'Mamelodi Sundowns',
    venue: 'ORBIT College Stadium',
    round: 21
  },
  {
    date: '2026-03-15T15:30:00',
    homeTeam: 'Kaizer Chiefs',
    awayTeam: 'Durban City',
    venue: 'FNB Stadium',
    round: 21
  },
  {
    date: '2026-03-15T17:30:00',
    homeTeam: 'Marumo Gallants',
    awayTeam: 'Golden Arrows',
    venue: 'Peter Mokaba Stadium',
    round: 21
  },

  // Round 22
  {
    date: '2026-03-20T19:30:00',
    homeTeam: 'Siwelele FC',
    awayTeam: 'Orbit College',
    venue: 'Siwelele Stadium',
    round: 22
  },
  {
    date: '2026-03-21T15:30:00',
    homeTeam: 'Polokwane City',
    awayTeam: 'AmaZulu',
    venue: 'Old Peter Mokaba Stadium',
    round: 22
  },
  {
    date: '2026-03-21T15:30:00',
    homeTeam: 'Stellenbosch FC',
    awayTeam: 'Chippa United',
    venue: 'Danie Craven Stadium',
    round: 22
  },
  {
    date: '2026-03-21T17:30:00',
    homeTeam: 'Kaizer Chiefs',
    awayTeam: 'Magesi FC',
    venue: 'FNB Stadium',
    round: 22
  },
  {
    date: '2026-03-21T17:30:00',
    homeTeam: 'Golden Arrows',
    awayTeam: 'Sekhukhune United',
    venue: 'Princess Magogo Stadium',
    round: 22
  },
  {
    date: '2026-03-21T20:00:00',
    homeTeam: 'Mamelodi Sundowns',
    awayTeam: 'Marumo Gallants',
    venue: 'Loftus Versfeld Stadium',
    round: 22
  },
  {
    date: '2026-03-22T15:30:00',
    homeTeam: 'TS Galaxy',
    awayTeam: 'Orlando Pirates',
    venue: 'Kemi Seba Stadium',
    round: 22
  },
  {
    date: '2026-03-22T17:30:00',
    homeTeam: 'Durban City',
    awayTeam: 'Richards Bay',
    venue: 'Durban City Stadium',
    round: 22
  },

  // Round 23
  {
    date: '2026-04-06T19:30:00',
    homeTeam: 'AmaZulu',
    awayTeam: 'Sekhukhune United',
    venue: 'King Zwelithini Stadium',
    round: 23
  },
  {
    date: '2026-04-07T19:30:00',
    homeTeam: 'Chippa United',
    awayTeam: 'Siwelele FC',
    venue: 'Sivutsa Stadium',
    round: 23
  },
  {
    date: '2026-04-07T19:30:00',
    homeTeam: 'Durban City',
    awayTeam: 'Mamelodi Sundowns',
    venue: 'Durban City Stadium',
    round: 23
  },
  {
    date: '2026-04-07T19:30:00',
    homeTeam: 'Magesi FC',
    awayTeam: 'Marumo Gallants',
    venue: 'Old Peter Mokaba Stadium',
    round: 23
  },
  {
    date: '2026-04-07T19:30:00',
    homeTeam: 'Orbit College',
    awayTeam: 'Kaizer Chiefs',
    venue: 'ORBIT College Stadium',
    round: 23
  },
  {
    date: '2026-04-07T19:30:00',
    homeTeam: 'Orlando Pirates',
    awayTeam: 'Golden Arrows',
    venue: 'Orlando Stadium',
    round: 23
  },
  {
    date: '2026-04-07T19:30:00',
    homeTeam: 'Richards Bay',
    awayTeam: 'Stellenbosch FC',
    venue: 'Sugar Ray Xulu Stadium',
    round: 23
  },
  {
    date: '2026-04-07T19:30:00',
    homeTeam: 'TS Galaxy',
    awayTeam: 'Polokwane City',
    venue: 'Kemi Seba Stadium',
    round: 23
  },

  // Round 24
  {
    date: '2026-04-10T19:30:00',
    homeTeam: 'Richards Bay',
    awayTeam: 'Orlando Pirates',
    venue: 'Sugar Ray Xulu Stadium',
    round: 24
  },
  {
    date: '2026-04-11T15:00:00',
    homeTeam: 'Golden Arrows',
    awayTeam: 'Durban City',
    venue: 'Princess Magogo Stadium',
    round: 24
  },
  {
    date: '2026-04-11T15:00:00',
    homeTeam: 'Siwelele FC',
    awayTeam: 'AmaZulu',
    venue: 'Siwelele Stadium',
    round: 24
  },
  {
    date: '2026-04-11T17:30:00',
    homeTeam: 'Mamelodi Sundowns',
    awayTeam: 'Stellenbosch FC',
    venue: 'Loftus Versfeld Stadium',
    round: 24
  },
  {
    date: '2026-04-11T17:30:00',
    homeTeam: 'Sekhukhune United',
    awayTeam: 'Magesi FC',
    venue: 'Thohoyandou Stadium',
    round: 24
  },
  {
    date: '2026-04-11T20:00:00',
    homeTeam: 'Chippa United',
    awayTeam: 'Polokwane City',
    venue: 'Sivutsa Stadium',
    round: 24
  },
  {
    date: '2026-04-12T15:00:00',
    homeTeam: 'Kaizer Chiefs',
    awayTeam: 'TS Galaxy',
    venue: 'FNB Stadium',
    round: 24
  },
  {
    date: '2026-04-12T17:30:00',
    homeTeam: 'Marumo Gallants',
    awayTeam: 'Orbit College',
    venue: 'Peter Mokaba Stadium',
    round: 24
  },

  // Round 25
  {
    date: '2026-04-17T19:30:00',
    homeTeam: 'Stellenbosch FC',
    awayTeam: 'Sekhukhune United',
    venue: 'Danie Craven Stadium',
    round: 25
  },
  {
    date: '2026-04-18T15:00:00',
    homeTeam: 'Marumo Gallants',
    awayTeam: 'Siwelele FC',
    venue: 'Peter Mokaba Stadium',
    round: 25
  },
  {
    date: '2026-04-18T15:00:00',
    homeTeam: 'Orbit College',
    awayTeam: 'Golden Arrows',
    venue: 'ORBIT College Stadium',
    round: 25
  },
  {
    date: '2026-04-18T15:00:00',
    homeTeam: 'Orlando Pirates',
    awayTeam: 'AmaZulu',
    venue: 'Orlando Stadium',
    round: 25
  },
  {
    date: '2026-04-18T17:30:00',
    homeTeam: 'Mamelodi Sundowns',
    awayTeam: 'Chippa United',
    venue: 'Loftus Versfeld Stadium',
    round: 25
  },
  {
    date: '2026-04-18T20:00:00',
    homeTeam: 'Polokwane City',
    awayTeam: 'Kaizer Chiefs',
    venue: 'Old Peter Mokaba Stadium',
    round: 25
  },
  {
    date: '2026-04-19T15:00:00',
    homeTeam: 'TS Galaxy',
    awayTeam: 'Richards Bay',
    venue: 'Kemi Seba Stadium',
    round: 25
  },
  {
    date: '2026-04-19T17:30:00',
    homeTeam: 'Magesi FC',
    awayTeam: 'Durban City',
    venue: 'Old Peter Mokaba Stadium',
    round: 25
  },

  // Round 26
  {
    date: '2026-04-24T19:30:00',
    homeTeam: 'Durban City',
    awayTeam: 'Orbit College',
    venue: 'Durban City Stadium',
    round: 26
  },
  {
    date: '2026-04-24T19:30:00',
    homeTeam: 'Golden Arrows',
    awayTeam: 'Siwelele FC',
    venue: 'Princess Magogo Stadium',
    round: 26
  },
  {
    date: '2026-04-25T15:00:00',
    homeTeam: 'Orlando Pirates',
    awayTeam: 'Kaizer Chiefs',
    venue: 'Orlando Stadium',
    round: 26
  },
  {
    date: '2026-04-25T17:30:00',
    homeTeam: 'Richards Bay',
    awayTeam: 'Mamelodi Sundowns',
    venue: 'Sugar Ray Xulu Stadium',
    round: 26
  },
  {
    date: '2026-04-25T17:30:00',
    homeTeam: 'Sekhukhune United',
    awayTeam: 'Marumo Gallants',
    venue: 'Thohoyandou Stadium',
    round: 26
  },
  {
    date: '2026-04-25T20:00:00',
    homeTeam: 'AmaZulu',
    awayTeam: 'Chippa United',
    venue: 'King Zwelithini Stadium',
    round: 26
  },
  {
    date: '2026-04-26T15:00:00',
    homeTeam: 'Polokwane City',
    awayTeam: 'Stellenbosch FC',
    venue: 'Old Peter Mokaba Stadium',
    round: 26
  },
  {
    date: '2026-04-26T15:00:00',
    homeTeam: 'TS Galaxy',
    awayTeam: 'Magesi FC',
    venue: 'Kemi Seba Stadium',
    round: 26
  },

  // Round 27
  {
    date: '2026-05-05T19:30:00',
    homeTeam: 'Chippa United',
    awayTeam: 'Sekhukhune United',
    venue: 'Sivutsa Stadium',
    round: 27
  },
  {
    date: '2026-05-05T19:30:00',
    homeTeam: 'Magesi FC',
    awayTeam: 'Orbit College',
    venue: 'Old Peter Mokaba Stadium',
    round: 27
  },
  {
    date: '2026-05-05T19:30:00',
    homeTeam: 'Siwelele FC',
    awayTeam: 'Durban City',
    venue: 'Siwelele Stadium',
    round: 27
  },
  {
    date: '2026-05-05T19:30:00',
    homeTeam: 'Stellenbosch FC',
    awayTeam: 'Orlando Pirates',
    venue: 'Danie Craven Stadium',
    round: 27
  },
  {
    date: '2026-05-06T19:30:00',
    homeTeam: 'AmaZulu',
    awayTeam: 'Golden Arrows',
    venue: 'King Zwelithini Stadium',
    round: 27
  },
  {
    date: '2026-05-06T19:30:00',
    homeTeam: 'Kaizer Chiefs',
    awayTeam: 'Mamelodi Sundowns',
    venue: 'FNB Stadium',
    round: 27
  },
  {
    date: '2026-05-06T19:30:00',
    homeTeam: 'Marumo Gallants',
    awayTeam: 'TS Galaxy',
    venue: 'Peter Mokaba Stadium',
    round: 27
  },
  {
    date: '2026-05-06T19:30:00',
    homeTeam: 'Richards Bay',
    awayTeam: 'Polokwane City',
    venue: 'Sugar Ray Xulu Stadium',
    round: 27
  },

  // Round 28
  {
    date: '2026-05-08T19:30:00',
    homeTeam: 'Durban City',
    awayTeam: 'Stellenbosch FC',
    venue: 'Durban City Stadium',
    round: 28
  },
  {
    date: '2026-05-09T15:00:00',
    homeTeam: 'Marumo Gallants',
    awayTeam: 'Richards Bay',
    venue: 'Peter Mokaba Stadium',
    round: 28
  },
  {
    date: '2026-05-09T15:00:00',
    homeTeam: 'Orbit College',
    awayTeam: 'AmaZulu',
    venue: 'ORBIT College Stadium',
    round: 28
  },
  {
    date: '2026-05-09T17:30:00',
    homeTeam: 'Golden Arrows',
    awayTeam: 'Polokwane City',
    venue: 'Princess Magogo Stadium',
    round: 28
  },
  {
    date: '2026-05-09T17:30:00',
    homeTeam: 'Mamelodi Sundowns',
    awayTeam: 'Siwelele FC',
    venue: 'Loftus Versfeld Stadium',
    round: 28
  },
  {
    date: '2026-05-09T20:00:00',
    homeTeam: 'Magesi FC',
    awayTeam: 'Orlando Pirates',
    venue: 'Old Peter Mokaba Stadium',
    round: 28
  },
  {
    date: '2026-05-10T15:00:00',
    homeTeam: 'TS Galaxy',
    awayTeam: 'Chippa United',
    venue: 'Kemi Seba Stadium',
    round: 28
  },
  {
    date: '2026-05-10T17:30:00',
    homeTeam: 'Sekhukhune United',
    awayTeam: 'Kaizer Chiefs',
    venue: 'Thohoyandou Stadium',
    round: 28
  },

  // Round 29
  {
    date: '2026-05-16T15:00:00',
    homeTeam: 'AmaZulu',
    awayTeam: 'Kaizer Chiefs',
    venue: 'King Zwelithini Stadium',
    round: 29
  },
  {
    date: '2026-05-16T15:00:00',
    homeTeam: 'Chippa United',
    awayTeam: 'Golden Arrows',
    venue: 'Sivutsa Stadium',
    round: 29
  },
  {
    date: '2026-05-16T15:00:00',
    homeTeam: 'Orlando Pirates',
    awayTeam: 'Durban City',
    venue: 'Orlando Stadium',
    round: 29
  },
  {
    date: '2026-05-16T15:00:00',
    homeTeam: 'Richards Bay',
    awayTeam: 'Sekhukhune United',
    venue: 'Sugar Ray Xulu Stadium',
    round: 29
  },
  {
    date: '2026-05-16T15:00:00',
    homeTeam: 'Siwelele FC',
    awayTeam: 'Magesi FC',
    venue: 'Siwelele Stadium',
    round: 29
  },
  {
    date: '2026-05-16T15:00:00',
    homeTeam: 'Stellenbosch FC',
    awayTeam: 'Orbit College',
    venue: 'Danie Craven Stadium',
    round: 29
  },
  {
    date: '2026-05-16T15:00:00',
    homeTeam: 'TS Galaxy',
    awayTeam: 'Mamelodi Sundowns',
    venue: 'Kemi Seba Stadium',
    round: 29
  },
  {
    date: '2026-05-16T15:30:00',
    homeTeam: 'Polokwane City',
    awayTeam: 'Marumo Gallants',
    venue: 'Old Peter Mokaba Stadium',
    round: 29
  },

  // Round 30
  {
    date: '2026-05-23T15:00:00',
    homeTeam: 'Durban City',
    awayTeam: 'AmaZulu',
    venue: 'Durban City Stadium',
    round: 30
  },
  {
    date: '2026-05-23T15:00:00',
    homeTeam: 'Kaizer Chiefs',
    awayTeam: 'Chippa United',
    venue: 'FNB Stadium',
    round: 30
  },
  {
    date: '2026-05-23T15:00:00',
    homeTeam: 'Golden Arrows',
    awayTeam: 'TS Galaxy',
    venue: 'Princess Magogo Stadium',
    round: 30
  },
  {
    date: '2026-05-23T15:00:00',
    homeTeam: 'Magesi FC',
    awayTeam: 'Richards Bay',
    venue: 'Old Peter Mokaba Stadium',
    round: 30
  },
  {
    date: '2026-05-23T15:00:00',
    homeTeam: 'Mamelodi Sundowns',
    awayTeam: 'Polokwane City',
    venue: 'Loftus Versfeld Stadium',
    round: 30
  },
  {
    date: '2026-05-23T15:00:00',
    homeTeam: 'Marumo Gallants',
    awayTeam: 'Stellenbosch FC',
    venue: 'Peter Mokaba Stadium',
    round: 30
  },
  {
    date: '2026-05-23T15:00:00',
    homeTeam: 'Orbit College',
    awayTeam: 'Orlando Pirates',
    venue: 'ORBIT College Stadium',
    round: 30
  },
  {
    date: '2026-05-23T15:00:00',
    homeTeam: 'Sekhukhune United',
    awayTeam: 'Siwelele FC',
    venue: 'Thohoyandou Stadium',
    round: 30
  }
];

// Official PSL website URL
const OFFICIAL_PSL_SITE = 'https://www.psl.co.za';

// Function to check if a match has been played (date is in the past)
function isMatchCompleted(matchDate) {
  const now = new Date();
  return new Date(matchDate) < now;
}

// Function to format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-ZA', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
}

// Function to format time for display
function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-ZA', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}
// Function to get team logo image (updated)
function getTeamLogo(teamName) {
  // Map team names to their logo filenames
  const teamLogoMap = {
    'AmaZulu': 'amazulu.png',
    'Chippa United': 'chippa-united.png',
    'Durban City': 'durban-city.png',
    'Golden Arrows': 'golden-arrows.png',
    'Kaizer Chiefs': 'kaizer-chiefs.png',
    'Magesi FC': 'magesi-fc.png',
    'Mamelodi Sundowns': 'mamelodi-sundowns.png',
    'Marumo Gallants': 'marumo-gallants.png',
    'Orbit College': 'orbit-college.png',
    'Orlando Pirates': 'orlando-pirates.png',
    'Polokwane City': 'polokwane-city.png',
    'Richards Bay': 'richards-bay.png',
    'Sekhukhune United': 'sekhukhune-united.png',
    'Siwelele FC': 'siwelele-fc.png',
    'Stellenbosch FC': 'stellenbosch-fc.png',
    'TS Galaxy': 'ts-galaxy.png'
  };
  
  const logoFile = teamLogoMap[teamName];
  if (logoFile) {
    return `<img src="images/teams/${logoFile}" alt="${teamName} logo" class="team-logo-img" onerror="this.src='images/logo-placeholder.png'">`;
  }
  return `<span class="team-logo-emoji">⚽</span>`;
}

// Updated function to generate fixture HTML with images
function generateFixtureHTML(fixture) {
  const matchDate = new Date(fixture.date);
  const isCompleted = isMatchCompleted(fixture.date);
  const dateString = formatDate(fixture.date);
  const timeString = formatTime(fixture.date);
  
  return `
    <div class="fixture-card">
      <div class="fixture-header">
        <span class="date">${dateString}</span>
        <span class="time">${timeString}</span>
        <span class="venue">${fixture.venue}</span>
      </div>
      <div class="fixture-teams">
        <div class="team home">
          ${getTeamLogo(fixture.homeTeam)}
          <span class="team-name">${fixture.homeTeam}</span>
        </div>
        <div class="vs">VS</div>
        <div class="team away">
          ${getTeamLogo(fixture.awayTeam)}
          <span class="team-name">${fixture.awayTeam}</span>
        </div>
      </div>
      <div class="fixture-status ${isCompleted ? 'completed' : 'upcoming'}">
        ${isCompleted ? 'COMPLETED' : 'UPCOMING'}
      </div>
      ${isCompleted ? `<a href="${OFFICIAL_PSL_SITE}" target="_blank" class="view-results-btn">View Results</a>` : ''}
    </div>
  `;
}

// Function to display fixtures
function displayFixtures(fixtures = PSL_FIXTURES, containerId = 'fixturesList', limit = null) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // Sort fixtures by date
  const sortedFixtures = [...fixtures].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Apply limit if specified
  const fixturesToShow = limit ? sortedFixtures.slice(0, limit) : sortedFixtures;
  
  // Generate HTML
  const fixturesHTML = fixturesToShow.map(fixture => generateFixtureHTML(fixture)).join('');
  
  // Update container
  container.innerHTML = fixturesHTML;
}

// Sport filtering functionality - separate DOMContentLoaded for fixtures page
document.addEventListener('DOMContentLoaded', function() {
  // Only run on fixtures page
  if (window.location.pathname.includes('fixtures.html')) {
    const sportFilter = document.getElementById('sportFilter');
    const competitionFilter = document.getElementById('competition');
    const sportFixtures = document.querySelectorAll('.sport-fixtures');
    
 // Search functionality for fixtures
const searchBar = document.querySelector('.search-bar');
if (searchBar) {
  // Create or get the no results message element
  let noResultsMsg = document.querySelector('.no-results-message');
  if (!noResultsMsg) {
    noResultsMsg = document.createElement('div');
    noResultsMsg.className = 'no-results-message';
    noResultsMsg.style.textAlign = 'center';
    noResultsMsg.style.padding = '2rem';
    noResultsMsg.style.fontSize = '1.1rem';
    noResultsMsg.style.color = 'var(--text-secondary)';
    noResultsMsg.innerHTML = '<i class="fas fa-search"></i> No fixtures found matching your search.';
    noResultsMsg.style.display = 'none';
    
    // Insert after fixtures container
    const fixturesContainer = document.querySelector('.fixtures-container');
    if (fixturesContainer) {
      fixturesContainer.parentNode.insertBefore(noResultsMsg, fixturesContainer.nextSibling);
    }
  }
  
  searchBar.addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    const allFixtureCards = document.querySelectorAll('.fixture-card');
    const competitionSections = document.querySelectorAll('.competition-section');
    let visibleCount = 0;
    
    // First, show all sections and cards
    competitionSections.forEach(section => {
      section.style.display = 'block';
    });
    
    allFixtureCards.forEach(card => {
      const teamNames = card.querySelectorAll('.team-name');
      const venue = card.querySelector('.venue');
      const competition = card.closest('.competition-section')?.querySelector('h3')?.textContent;
      
      let matchesSearch = false;
      
      if (searchTerm === '') {
        // If search is empty, show all cards
        matchesSearch = true;
      } else {
        // Check team names
        teamNames.forEach(team => {
          if (team.textContent.toLowerCase().includes(searchTerm)) {
            matchesSearch = true;
          }
        });
        
        // Check venue
        if (venue && venue.textContent.toLowerCase().includes(searchTerm)) {
          matchesSearch = true;
        }
        
        // Check competition name
        if (competition && competition.toLowerCase().includes(searchTerm)) {
          matchesSearch = true;
        }
      }
      
      if (matchesSearch) {
        card.style.display = 'flex';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });
    
    // Hide empty competition sections
    competitionSections.forEach(section => {
      const visibleCards = section.querySelectorAll('.fixture-card:not([style*="display: none"])');
      if (visibleCards.length === 0) {
        section.style.display = 'none';
      }
    });
    
    // Show/hide no results message
    if (noResultsMsg) {
      if (searchTerm !== '' && visibleCount === 0) {
        noResultsMsg.style.display = 'block';
      } else {
        noResultsMsg.style.display = 'none';
      }
    }
    
    // Reset view more button text and state if needed
    const viewMoreFootballBtn = document.getElementById('viewMoreFootball');
    const moreFootballFixtures = document.getElementById('moreFootballFixtures');
    
    if (viewMoreFootballBtn && moreFootballFixtures) {
      // If searching, automatically show all fixtures and hide the view more button
      if (searchTerm !== '') {
        moreFootballFixtures.classList.add('show');
        moreFootballFixtures.classList.remove('hidden-fixtures');
        viewMoreFootballBtn.style.display = 'none';
      } else {
        // Restore original state when search is cleared
        if (!moreFootballFixtures.classList.contains('hidden-fixtures')) {
          moreFootballFixtures.classList.remove('show');
          moreFootballFixtures.classList.add('hidden-fixtures');
        }
        viewMoreFootballBtn.style.display = 'inline-flex';
      }
    }
  });
}
    
    // Sport filter change handler
    if (sportFilter) {
      sportFilter.addEventListener('change', function() {
        const selectedSport = this.value;
        
        sportFixtures.forEach(fixture => {
          if (selectedSport === 'all') {
            fixture.style.display = 'block';
          } else {
            const fixtureSport = fixture.getAttribute('data-sport');
            fixture.style.display = fixtureSport === selectedSport ? 'block' : 'none';
          }
        });
      });
    }
    
    // Competition filter change handler
    if (competitionFilter) {
      competitionFilter.addEventListener('change', function() {
        const selectedCompetition = this.value;
        const competitionSections = document.querySelectorAll('.competition-section');
        
        competitionSections.forEach(section => {
          if (selectedCompetition === 'all') {
            section.style.display = 'block';
          } else {
            const heading = section.querySelector('h3').textContent.toLowerCase();
            section.style.display = heading.includes(selectedCompetition.toLowerCase().replace('-', ' ')) ? 'block' : 'none';
          }
        });
      });
    }
    
    // View More button functionality
    const viewMoreFootballBtn = document.getElementById('viewMoreFootball');
    const moreFootballFixtures = document.getElementById('moreFootballFixtures');
    
    if (viewMoreFootballBtn && moreFootballFixtures) {
      viewMoreFootballBtn.addEventListener('click', function() {
        const isHidden = moreFootballFixtures.classList.contains('hidden-fixtures');
        
        if (isHidden) {
          moreFootballFixtures.classList.add('show');
          moreFootballFixtures.classList.remove('hidden-fixtures');
          this.textContent = 'View Less Fixtures';
        } else {
          moreFootballFixtures.classList.remove('show');
          moreFootballFixtures.classList.add('hidden-fixtures');
          this.textContent = 'View More Fixtures';
        }
      });
    }
  }
});
