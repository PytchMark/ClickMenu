// Onboarding Modal Logic
const OnboardingModal = (() => {
  let currentStep = 1;
  const totalSteps = 4;
  
  const state = {
    storeId: '',
    name: '',
    whatsapp: '',
    profile_email: '',
    parish: '',
    cuisine: '',
    description: '',
    logo_url: '',
    passcode: '',
    planTier: 'plan1',
    addonLiveMenu: false,
    addonPosWaitlist: false,
  };

  const showModal = () => {
    const backdrop = document.getElementById('onboardingBackdrop');
    backdrop.classList.add('show');
    document.body.style.overflow = 'hidden';
    goToStep(1);
  };

  const hideModal = () => {
    const backdrop = document.getElementById('onboardingBackdrop');
    backdrop.classList.remove('show');
    document.body.style.overflow = '';
    resetForm();
  };

  const resetForm = () => {
    currentStep = 1;
    Object.keys(state).forEach(key => {
      if (typeof state[key] === 'boolean') {
        state[key] = false;
      } else {
        state[key] = '';
      }
    });
    state.planTier = 'plan1';
  };

  const goToStep = (step) => {
    currentStep = step;
    
    document.querySelectorAll('.step-dot').forEach((dot, index) => {
      dot.classList.toggle('active', index + 1 === step);
    });

    document.querySelectorAll('.onboarding-step').forEach((stepEl, index) => {
      stepEl.classList.toggle('active', index + 1 === step);
    });

    const prevBtn = document.getElementById('onboardingPrevBtn');
    const nextBtn = document.getElementById('onboardingNextBtn');
    
    prevBtn.style.display = step === 1 ? 'none' : 'inline-block';
    nextBtn.textContent = step === totalSteps ? 'Complete Setup' : 'Next';
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!state.name || !state.whatsapp || !state.profile_email) {
          alert('Please fill in all required fields');
          return false;
        }
        return true;
      case 3:
        if (!state.passcode || state.passcode.length < 6) {
          alert('Passcode must be at least 6 characters');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const collectStepData = (step) => {
    switch (step) {
      case 1:
        state.name = document.getElementById('onboardingName').value.trim();
        state.whatsapp = document.getElementById('onboardingWhatsapp').value.trim();
        state.profile_email = document.getElementById('onboardingEmail').value.trim();
        state.parish = document.getElementById('onboardingParish').value.trim();
        break;
      case 2:
        state.cuisine = document.getElementById('onboardingCuisine').value.trim();
        state.description = document.getElementById('onboardingDescription').value.trim();
        state.logo_url = document.getElementById('onboardingLogoUrl').value.trim();
        break;
      case 3:
        state.storeId = document.getElementById('onboardingStoreId').value.trim().toUpperCase();
        state.passcode = document.getElementById('onboardingPasscode').value;
        break;
      case 4:
        state.addonLiveMenu = document.getElementById('addonLiveMenu').checked;
        state.addonPosWaitlist = document.getElementById('addonPosWaitlist').checked;
        break;
    }
  };

  const nextStep = () => {
    collectStepData(currentStep);
    if (!validateStep(currentStep)) return;
    if (currentStep < totalSteps) {
      goToStep(currentStep + 1);
    } else {
      submitOnboarding();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) goToStep(currentStep - 1);
  };

  const selectPlan = (planTier) => {
    state.planTier = planTier;
    document.querySelectorAll('.plan-card').forEach(card => {
      card.classList.toggle('selected', card.dataset.plan === planTier);
    });
  };

  const submitOnboarding = async () => {
    const nextBtn = document.getElementById('onboardingNextBtn');
    nextBtn.disabled = true;
    nextBtn.textContent = 'Creating account...';

    try {
      const signupResponse = await fetch('/api/public/merchant/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });

      const signupData = await signupResponse.json();
      if (!signupData.ok) throw new Error(signupData.error);

      const finalStoreId = signupData.storeId;
      nextBtn.textContent = 'Connecting to payment...';
      
      const checkoutResponse = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: finalStoreId, planTier: state.planTier }),
      });

      const checkoutData = await checkoutResponse.json();

      if (checkoutData.ok && checkoutData.url) {
        window.location.href = checkoutData.url;
      } else {
        showFallbackSuccess(finalStoreId);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
      nextBtn.disabled = false;
      nextBtn.textContent = 'Complete Setup';
    }
  };

  const showFallbackSuccess = (storeId) => {
    document.querySelectorAll('.onboarding-step').forEach(s => s.classList.remove('active'));
    document.querySelector('.steps-indicator').style.display = 'none';
    document.querySelector('.modal-footer').style.display = 'none';

    document.querySelector('.modal-body').innerHTML = `
      <div class="success-state">
        <div class="success-icon">✓</div>
        <h3>Profile Created!</h3>
        <p>Your merchant account has been created. Payment setup coming next.</p>
        <div class="credentials-box">
          <strong>Your Store ID:</strong>
          <div class="store-id">${storeId}</div>
          <small style="color: rgba(255,255,255,0.6); display: block; margin-top: 12px;">
            Save this ID - you'll need it to log in!
          </small>
        </div>
        <button class="btn-onboarding btn-primary" onclick="window.location.href='/merchant'">
          Go to Merchant Login
        </button>
      </div>
    `;
  };

  const init = () => {
    const openBtn = document.getElementById('becomeMerchantBtn');
    if (openBtn) openBtn.addEventListener('click', showModal);

    const closeBtn = document.getElementById('onboardingCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', hideModal);

    const backdrop = document.getElementById('onboardingBackdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) hideModal();
      });
    }

    const nextBtn = document.getElementById('onboardingNextBtn');
    const prevBtn = document.getElementById('onboardingPrevBtn');
    if (nextBtn) nextBtn.addEventListener('click', nextStep);
    if (prevBtn) prevBtn.addEventListener('click', prevStep);

    document.querySelectorAll('.plan-card').forEach(card => {
      card.addEventListener('click', () => selectPlan(card.dataset.plan));
    });
  };

  return { init, showModal, hideModal };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', OnboardingModal.init);
} else {
  OnboardingModal.init();
}
