document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('report-form');
  const photoInput = document.getElementById('photo');
  const dropZone = document.getElementById('drop-zone');
  const previewContainer = document.getElementById('preview-container');
  const imagePreview = document.getElementById('image-preview');
  const removeBtn = document.getElementById('remove-image');
  const detectBtn = document.getElementById('detect-location');
  const latInput = document.getElementById('latitude');
  const lngInput = document.getElementById('longitude');
  const locationStatus = document.getElementById('location-status');
  const formError = document.getElementById('form-error');
  const formLoading = document.getElementById('form-loading');
  const submitBtn = document.getElementById('submit-btn');

  let selectedFile = null;

  // Drop zone click opens file picker
  dropZone.addEventListener('click', () => photoInput.click());

  // Drag and drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  // File input change
  photoInput.addEventListener('change', () => {
    if (photoInput.files.length) {
      handleFile(photoInput.files[0]);
    }
  });

  function handleFile(file) {
    if (!file.type.startsWith('image/')) {
      showError('Please select an image file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showError('Image must be under 10MB.');
      return;
    }
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      dropZone.style.display = 'none';
      previewContainer.style.display = 'block';
    };
    reader.readAsDataURL(file);
    hideError();
  }

  // Remove image
  removeBtn.addEventListener('click', () => {
    selectedFile = null;
    photoInput.value = '';
    imagePreview.src = '';
    previewContainer.style.display = 'none';
    dropZone.style.display = 'flex';
  });

  // Detect location
  detectBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      locationStatus.textContent = 'Geolocation is not supported by your browser.';
      return;
    }
    locationStatus.textContent = 'Detecting location...';
    detectBtn.disabled = true;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        latInput.value = position.coords.latitude.toFixed(6);
        lngInput.value = position.coords.longitude.toFixed(6);
        locationStatus.textContent = 'Location detected successfully.';
        detectBtn.disabled = false;
      },
      () => {
        locationStatus.textContent = 'Could not detect location. Please enter manually.';
        detectBtn.disabled = false;
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  // Auto-detect on page load
  detectBtn.click();

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    if (!selectedFile) {
      showError('Please upload a photo of the pothole.');
      return;
    }
    if (!latInput.value || !lngInput.value) {
      showError('Please provide the location.');
      return;
    }

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('latitude', latInput.value);
    formData.append('longitude', lngInput.value);
    formData.append('description', document.getElementById('description').value);

    formLoading.style.display = 'flex';
    submitBtn.disabled = true;

    try {
      const result = await apiPostForm('/reports', formData);
      window.location.href = `status.html?id=${result.id}`;
    } catch (err) {
      showError('Failed to submit report. Please try again.');
      formLoading.style.display = 'none';
      submitBtn.disabled = false;
    }
  });

  function showError(msg) {
    formError.textContent = msg;
    formError.style.display = 'block';
  }

  function hideError() {
    formError.style.display = 'none';
  }
});