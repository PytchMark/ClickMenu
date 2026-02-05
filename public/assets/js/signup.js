// Signup flow state
const signupState = {
  currentStep: 1,
  businessInfo: {},
  storeInfo: {},
  selectedPlan: null,
};

// DOM elements
const heroSection = document.getElementById('heroSection');
const signupSection = document.getElementById('signupSection');
const successSection = document.getElementById('successSection');
const processingState = document.getElementById('processingState');

const step1Form = document.getElementById('step1Form');
const step2Form = document.getElementById('step2Form');
const step3Form = document.getElementById('step3Form');

const storeIdInput = document.getElementById('storeId');
const storeIdFeedback = document.getElementById('storeIdFeedback');

// Navigation functions
function showHero() {
  heroSection.hidden = false;
  signupSection.hidden = true;
  successSection.hidden = true;
}

function showSignupForm() {
  heroSection.hidden = true;
  signupSection.hidden = false;
  successSection.hidden = true;
  goToStep(1);
}

function showSuccess(data) {
  heroSection.hidden = true;
  signupSection.hidden = true;
  successSection.hidden = false;
  
  document.getElementById('successStoreId').textContent = data.storeId;
  document.getElementById('successEmail').textContent = data.email;
}

function goToStep(stepNumber) {
  signupState.currentStep = stepNumber;
  
  // Hide all forms
  step1Form.hidden = true;
  step2Form.hidden = true;
  step3Form.hidden = true;
  processingState.hidden = true;
  
  // Show current form
  if (stepNumber === 1) step1Form.hidden = false;
  if (stepNumber === 2) step2Form.hidden = false;
  if (stepNumber === 3) step3Form.hidden = false;
  
  // Update step indicator
  document.querySelectorAll('.step').forEach(step => {
    const num = parseInt(step.dataset.step);
    step.classList.remove('active', 'completed');
    if (num < stepNumber) {
      step.classList.add('completed');
    } else if (num === stepNumber) {
      step.classList.add('active');
    }
  });
}

// Step 1: Business Info
step1Form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  signupState.businessInfo = {
    name: document.getElementById('businessName').value.trim(),
    email: document.getElementById('contactEmail').value.trim(),
    whatsapp: document.getElementById('whatsappNumber').value.trim(),
    ownerName: document.getElementById('ownerName').value.trim(),
    ownerPhone: document.getElementById('ownerPhone').value.trim(),
    parish: document.getElementById('parish').value.trim(),
    cuisineType: document.getElementById('cuisineType').value.trim(),
  };
  
  goToStep(2);
});

// Step 2: Store ID & Password
let storeIdCheckTimeout;
storeIdInput.addEventListener('input', (e) => {
  const value = e.target.value.toUpperCase();
  e.target.value = value;
  
  clearTimeout(storeIdCheckTimeout);
  storeIdFeedback.textContent = '';
  storeIdFeedback.className = 'field-feedback';
  
  if (value.length < 2) return;
  
  storeIdCheckTimeout = setTimeout(async () => {
    try {
      const response = await fetch('/api/public/check-store-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: value }),
      });
      
      const data = await response.json();
      
      if (!data.ok) {
        storeIdFeedback.textContent = data.error || 'Error checking availability';
        storeIdFeedback.className = 'field-feedback error';
        return;
      }
      
      if (data.error) {
        storeIdFeedback.textContent = data.error;
        storeIdFeedback.className = 'field-feedback error';
      } else if (data.available) {
        storeIdFeedback.textContent = '✓ Store ID available!';
        storeIdFeedback.className = 'field-feedback success';
      } else {
        storeIdFeedback.textContent = 'Store ID already taken';
        storeIdFeedback.className = 'field-feedback error';
      }
    } catch (error) {
      console.error('Store ID check failed:', error);
    }
  }, 500);
});

step2Form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const storeId = document.getElementById('storeId').value.trim().toUpperCase();
  const passcode = document.getElementById('passcode').value;
  const passcodeConfirm = document.getElementById('passcodeConfirm').value;
  
  if (passcode !== passcodeConfirm) {
    alert('Passcodes do not match!');
    return;
  }
  
  if (passcode.length < 6) {
    alert('Passcode must be at least 6 characters');
    return;
  }
  
  // Check if feedback shows error
  if (storeIdFeedback.classList.contains('error')) {
    alert('Please fix the Store ID error before continuing');
    return;
  }
  
  signupState.storeInfo = {
    storeId,
    passcode,
  };
  
  goToStep(3);
});

// Step 3: Plan Selection
function selectPlan(plan) {
  signupState.selectedPlan = plan;
  completeSi gnup();
}

async function completeSignup() {
  // Hide form, show processing
  step3Form.hidden = true;
  processingState.hidden = false;
  
  try {
    const payload = {
      store_id: signupState.storeInfo.storeId,
      name: signupState.businessInfo.name,
      profile_email: signupState.businessInfo.email,
      whatsapp: signupState.businessInfo.whatsapp,
      owner_name: signupState.businessInfo.ownerName,
      owner_phone: signupState.businessInfo.ownerPhone,
      parish: signupState.businessInfo.parish,
      cuisine_type: signupState.businessInfo.cuisineType,
      password: signupState.storeInfo.passcode,
      plan: signupState.selectedPlan,
      status: 'active',
      authorized: true,
    };
    
    // Create merchant account
    const response = await fetch('/api/admin/stores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create account');
    }
    
    const data = await response.json();
    
    // If paid plan selected, redirect to Stripe
    if (signupState.selectedPlan !== 'free') {
      const checkoutResponse = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: signupState.selectedPlan,
          storeId: signupState.storeInfo.storeId,
          email: signupState.businessInfo.email,
        }),
      });
      
      const checkoutData = await checkoutResponse.json();
      
      if (checkoutData.url) {
        // Redirect to Stripe checkout
        window.location.href = checkoutData.url;
        return;
      }
    }
    
    // For free plan, show success
    showSuccess({
      storeId: signupState.storeInfo.storeId,
      email: signupState.businessInfo.email,
    });
    
  } catch (error) {
    console.error('Signup failed:', error);
    alert(`Signup failed: ${error.message}. Please try again.`);
    goToStep(3);
  }
}

// Check for success parameter from Stripe redirect
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('success') === 'true') {
    // User just completed Stripe checkout
    const storeId = localStorage.getItem('signup_store_id');
    const email = localStorage.getItem('signup_email');
    
    if (storeId && email) {
      showSuccess({ storeId, email });
      localStorage.removeItem('signup_store_id');
      localStorage.removeItem('signup_email');
    }
  }
  
  if (params.get('canceled') === 'true') {
    showSignupForm();
    goToStep(3);
  }
});
