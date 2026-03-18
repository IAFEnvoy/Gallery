// ==================== 详情页面逻辑 ====================

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

class DetailManager {
  constructor() {
    this.imageId = null;
    this.imageData = null;
    this.authorsData = {};

    this.init();
  }

  async init() {
    const params = new URLSearchParams(window.location.search);
    this.imageId = params.get('image');

    if (!this.imageId) {
      this.showError('未指定图片ID');
      return;
    }

    await this.loadImageData();

    document.getElementById('backBtn').href = `index.html?page=${params.get('lastpage')}`
  }

  async loadImageData() {
    try {
      // 加载图片元数据
      const response = await fetch(`/data/meta/${this.imageId}.json`);
      if (!response.ok) {
        throw new Error('图片不存在');
      }
      this.imageData = await response.json();

      // 并行加载所有作者信息
      if (this.imageData.authors && this.imageData.authors.length > 0) {
        const authorPromises = this.imageData.authors.map(authorName =>
          this.loadAuthorData(authorName)
        );
        await Promise.all(authorPromises);
      }
      this.render();
    } catch (e) {
      console.log(e)
    }
  }

  async loadAuthorData(authorName) {
    try {
      const response = await fetch(`/data/author/${authorName}.json`);
      if (response.ok) {
        const data = await response.json();
        this.authorsData[authorName] = data;
      }
    } catch (error) {
      console.error(`加载作者 ${authorName} 信息失败:`, error);
    }
  }

  render() {
    this.renderMainImage();
    this.renderMoreImages();
    this.renderImageInfo();
    this.renderAuthors();
  }

  renderMainImage() {
    const coverImg = document.getElementById('coverImage');
    coverImg.src = getImageUrl(this.imageData.more[0]);
    coverImg.alt = this.imageData.name || '作品图片';
  }

  renderMoreImages() {
    const container = document.getElementById('moreImagesContainer');
    container.innerHTML = '';

    if (!this.imageData.more || this.imageData.more.length === 0) {
      return;
    }

    this.imageData.more.forEach((imagePath, index) => {
      const item = document.createElement('div');
      item.className = 'more-image-item';
      const imageUrl = getImageUrl(imagePath);
      item.innerHTML = `<img src="${imageUrl}" alt="作品图片 ${index + 1}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%231a1f3a%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E'">`;
      item.onclick = _ => {
        const coverImg = document.getElementById('coverImage');
        coverImg.src = getImageUrl(imagePath);
      }
      container.appendChild(item);
    });
  }

  renderImageInfo() {
    document.getElementById('imageName').textContent = this.imageData.name || '未命名作品';
    // 横向显示稿价、分类、创建日期
    const infoRow = document.getElementById('artworkInfoRow');
    infoRow.innerHTML = '';
    // 稿价
    const price = this.imageData.price !== undefined ? this.imageData.price.toLocaleString('zh-CN') : '-';
    infoRow.appendChild(this.createInfoItem('稿价', price));
    // 分类
    if (this.imageData.category) {
      infoRow.appendChild(this.createInfoItem('分类', this.imageData.category));
    }
    // 创建日期
    if (this.imageData.created) {
      infoRow.appendChild(this.createInfoItem('创建日期', this.imageData.created));
    }
  }

  createInfoItem(label, value) {
    const spanLabel = document.createElement('span');
    spanLabel.className = 'info-label';
    spanLabel.textContent = label;
    const spanValue = document.createElement('span');
    spanValue.className = 'info-value';
    spanValue.textContent = value;
    const wrapper = document.createElement('div');
    wrapper.appendChild(spanLabel);
    wrapper.appendChild(spanValue);
    return wrapper;
  }

  renderAuthors() {
    const container = document.getElementById('authorsList');
    container.innerHTML = '';

    if (!this.imageData.authors || this.imageData.authors.length === 0) {
      container.innerHTML = '<p style="color: var(--text-secondary);">暂无作者信息</p>';
      return;
    }
    this.imageData.authors.forEach(authorData => {
      const authorCard = this.createAuthorCard(authorData);
      container.appendChild(authorCard);
    });
  }

  createAuthorCard(authorData) {
    const card = document.createElement('div');
    card.className = 'author-card';

    console.log(authorData)
    const cachedAuthorName = authorData instanceof Object ? authorData.name : authorData, role = authorData instanceof Object ? authorData.role : ''
    const authorInfo = this.authorsData[cachedAuthorName] || { name: cachedAuthorName };
    const contactsHtml = this.generateContactsHtml(authorInfo.social || {});

    card.innerHTML = `<div class="author-name"><span class="author-name-text">${authorInfo.name || cachedAuthorName}</span>&nbsp;<span class="author-role-text">${role}</span></div>
                      <div class="author-contacts">${contactsHtml}</div>`;

    return card;
  }

  generateContactsHtml(social) {
    const contacts = [];
    for (const key in social) {
      if (social[key])
        contacts.push(`<a href="${social[key]}" class="contact-item" target="_blank">${key}</a>`);
    }
    return contacts.length > 0
      ? contacts.join('')
      : '<div class="contact-item" style="color: var(--text-secondary);">暂无联系方式</div>';
  }

  showError(message) {
    const container = document.getElementById('detailContent');
    container.innerHTML = `
          <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
            <h2 style="color: var(--primary-color); margin-bottom: 1rem;">${message}</h2>
            <a href="index.html" class="back-btn">← 返回画廊</a>
          </div>
        `;
  }
}

// 页面加载完毕后初始化
document.addEventListener('DOMContentLoaded', () => {
  new DetailManager();
});
