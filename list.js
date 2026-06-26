// ==================== 列表页面逻辑 ====================

// 辅助函数：获取正确的图片 URL
function getImageUrl(imagePath) {
  if (!imagePath) return '';
  // 如果是 URL（http:// 或 https://），直接返回
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  // 否则视为文件名，转换为本地路径
  return `/data/images/${imagePath}`;
}

class GalleryManager {
  constructor() {
    this.allImages = [];
    this.currentPage = 1;
    this.itemsPerPage = 20;
    this.totalPages = 1;
    this.debugMode = false;

    this.init();
  }

  async init() {
    await this.loadGalleryList();
    this.initParams();
    this.setupEventListeners();
    this.render();
  }

  initParams() {
    const params = new URLSearchParams(window.location.search);
    // 获取当前页码（从URL query参数）
    const pageParam = params.get('page');
    if (pageParam) this.currentPage = Math.max(1, Math.min(+pageParam, this.totalPages));
    // 调试Flag
    if (params.get('debug') != null) this.debugMode = true
  }

  async loadGalleryList() {
    try {
      const response = await fetch('/data/gallery_list.json');
      const data = await response.json();
      this.allImages = data.filter(id => id !== '...more');
      this.totalPages = Math.ceil(this.allImages.length / this.itemsPerPage);
    } catch (error) {
      console.error('加载画廊列表失败:', error);
      this.showError('无法加载画廊列表');
    }
  }

  setupEventListeners() {
    // 分页按钮
    document.getElementById('prevBtnTop').addEventListener('click', () => this.previousPage());
    document.getElementById('prevBtnBottom').addEventListener('click', () => this.previousPage());
    document.getElementById('nextBtnTop').addEventListener('click', () => this.nextPage());
    document.getElementById('nextBtnBottom').addEventListener('click', () => this.nextPage());
  }

  getPageImages() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.allImages.slice(startIndex, endIndex);
  }

  async render() {
    const gallery = document.getElementById('galleryGrid');

    // 先清空并显示加载动画
    gallery.innerHTML = `<div style="grid-column: 1 / -1; display: flex; justify-content: center; align-items: center; padding: 3rem;" id="loadingIndicator">
        <loading-indicator></loading-indicator>
      </div>`;

    const pageImages = this.getPageImages();

    // 并行加载所有图片的元数据
    const imagePromises = pageImages.map(id => this.loadImageMetadata(id));
    const images = await Promise.all(imagePromises);

    // 移除 loading 指示器
    const loadingEl = document.getElementById('loadingIndicator');
    if (loadingEl) loadingEl.remove();

    images.forEach(image => {
      if (image) {
        const card = this.createCard(image);
        gallery.appendChild(card);
      }
    });

    this.updatePagination();
  }

  async loadImageMetadata(imageId) {
    try {
      const response = await fetch(`/data/meta/${imageId}.json`);
      if (!response.ok) return null;
      const data = await response.json();
      return { id: imageId, ...data };
    } catch (error) {
      console.error(`加载图片 ${imageId} 的元数据失败:`, error);
      return null;
    }
  }

  createCard(image) {
    const card = document.createElement('div');
    card.className = 'gallery-card';

    // 获取作者名称
    const authorName = image.authors && image.authors.length > 0 ? image.authors.map(x => x instanceof Object ? x.name : x).join(', ') : '未知作者';

    const coverUrl = getImageUrl(image.cover);

    card.innerHTML = `
            <img src="${coverUrl}" alt="${image.name}" class="card-image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22%3E%3Crect fill=%22%231a1f3a%22 width=%22300%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23a0a0c0%22 font-family=%22Arial%22%3E图片加载失败%3C/text%3E%3C/svg%3E'">
            <div class="card-info">
                <div class="card-name">${image.name || '未命名作品'}&nbsp;${this.debugMode ? `<span class="author-role-text">ID:${image.id}</span>` : ''}</div>
                <div class="card-author">By ${authorName}</div>
            </div>
        `;

    card.addEventListener('click', () => this.navigateToDetail(image.id));

    return card;
  }

  navigateToDetail(imageId) {
    window.location.href = `detail.html?image=${imageId}&lastpage=${this.currentPage}`;
  }

  updatePagination() {
    document.getElementById('currentPageTop').textContent = document.getElementById('currentPageBottom').textContent = this.currentPage;
    document.getElementById('totalPagesTop').textContent = document.getElementById('totalPagesBottom').textContent = this.totalPages;
    document.getElementById('prevBtnTop').disabled = document.getElementById('prevBtnBottom').disabled = this.currentPage === 1;
    document.getElementById('nextBtnTop').disabled = document.getElementById('nextBtnBottom').disabled = this.currentPage === this.totalPages;
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updateUrl();
      window.scrollTo(0, 0);
      this.render();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updateUrl();
      window.scrollTo(0, 0);
      this.render();
    }
  }

  updateUrl() {
    const params = new URLSearchParams();
    params.set('page', this.currentPage);
    window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
  }

  showError(message) {
    const gallery = document.getElementById('galleryGrid');
    const loadingEl = document.getElementById('loadingIndicator');
    if (loadingEl) loadingEl.remove();
    gallery.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-secondary);">${message}</div>`;
  }
}

// 页面加载完毕后初始化
document.addEventListener('DOMContentLoaded', () => {
  new GalleryManager();
});
