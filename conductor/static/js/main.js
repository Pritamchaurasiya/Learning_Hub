/**
 * Learning Hub - Main JavaScript
 * Theme toggle, navbar, mobile menu, contact form, FAQ, animations,
 * auth form API integration, password strength, and CSRF handling
 */

// ===== Configuration =====
const API_BASE = '/api/v1';

// ===== CSRF Token Helper =====
function getCSRFToken() {
    const cookie = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
    return cookie ? cookie.split('=')[1] : '';
}

// ===== API Helper =====
async function apiRequest(endpoint, method, body) {
    const headers = {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCSRFToken(),
    };

    const token = localStorage.getItem('access_token');
    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }

    const options = { method, headers };
    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(API_BASE + endpoint, options);
    let data = {};
    if (response.status !== 204) {
        data = await response.json().catch(() => ({}));
    }

    return { ok: response.ok, status: response.status, data };
}

// ===== Theme Toggle =====
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

function setTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    const icon = themeToggle?.querySelector('i');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'light';
setTheme(savedTheme);

themeToggle?.addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
});

// ===== Navbar Scroll Effect =====
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
    if (navbar) {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    }
});

// ===== Mobile Menu =====
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
let mobileOverlay = null;
let mobilePanel = null;

function createMobileMenu() {
    if (mobileOverlay) return;

    // Overlay backdrop
    mobileOverlay = document.createElement('div');
    mobileOverlay.className = 'mobile-overlay';
    mobileOverlay.addEventListener('click', closeMobileMenu);

    // Slide-in panel
    mobilePanel = document.createElement('div');
    mobilePanel.className = 'mobile-panel';

    const navLinks = document.querySelectorAll('.navbar-links a');

    let linksHTML = '<nav class="mobile-nav-links">';
    navLinks.forEach(link => {
        const isActive = link.classList.contains('active') ? ' class="active"' : '';
        const href = link.getAttribute('href');
        const text = link.textContent;
        linksHTML += '<a href="' + href + '"' + isActive + '>' + text + '</a>';
    });
    linksHTML += '</nav>';

    const currentTheme = html.getAttribute('data-theme');
    const themeIcon = currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';

    let actionsHTML = '<div class="mobile-nav-actions">';
    actionsHTML += '<button class="theme-toggle mobile-theme-toggle" id="mobileThemeBtn"><i class="' + themeIcon + '"></i> Toggle Theme</button>';
    actionsHTML += '<a href="/login" class="btn btn-secondary" style="width:100%">Log In</a>';
    actionsHTML += '<a href="/signup" class="btn btn-primary" style="width:100%">Sign Up</a>';
    actionsHTML += '</div>';

    // Close button
    const closeBtn = '<button class="mobile-close-btn" id="mobileCloseBtn"><i class="fas fa-times"></i></button>';

    mobilePanel.innerHTML = closeBtn + linksHTML + actionsHTML;
    document.body.appendChild(mobileOverlay);
    document.body.appendChild(mobilePanel);

    // Attach theme toggle to mobile button
    const mobileThemeBtn = document.getElementById('mobileThemeBtn');
    if (mobileThemeBtn) {
        mobileThemeBtn.addEventListener('click', () => {
            const current = html.getAttribute('data-theme');
            setTheme(current === 'dark' ? 'light' : 'dark');
            closeMobileMenu();
        });
    }

    // Attach close button
    const mobileCloseBtn = document.getElementById('mobileCloseBtn');
    if (mobileCloseBtn) {
        mobileCloseBtn.addEventListener('click', closeMobileMenu);
    }
}

function openMobileMenu() {
    createMobileMenu();
    requestAnimationFrame(() => {
        mobileOverlay.classList.add('active');
        mobilePanel.classList.add('active');
        document.body.style.overflow = 'hidden';
        mobileMenuBtn?.classList.add('active');
    });
}

function closeMobileMenu() {
    if (mobileOverlay) mobileOverlay.classList.remove('active');
    if (mobilePanel) mobilePanel.classList.remove('active');
    document.body.style.overflow = '';
    mobileMenuBtn?.classList.remove('active');
}

mobileMenuBtn?.addEventListener('click', () => {
    if (mobilePanel && mobilePanel.classList.contains('active')) {
        closeMobileMenu();
    } else {
        openMobileMenu();
    }
});

// ===== Form Message Helper =====
function showFormMessage(elementId, message, type) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = 'form-message show ' + type;
}

function hideFormMessage(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.className = 'form-message';
    el.textContent = '';
}

function setFieldError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = message;
}

function clearFieldErrors(prefix) {
    const errors = ['Name', 'Email', 'Password', 'ConfirmPassword'];
    errors.forEach(field => {
        const el = document.getElementById(prefix + field + 'Error');
        if (el) el.textContent = '';
    });
}

// ===== Button Loading State =====
function setBtnLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    const textEl = btn.querySelector('.btn-text');
    const loadEl = btn.querySelector('.btn-loading');
    if (loading) {
        btn.disabled = true;
        if (textEl) textEl.style.display = 'none';
        if (loadEl) loadEl.style.display = 'inline-flex';
    } else {
        btn.disabled = false;
        if (textEl) textEl.style.display = '';
        if (loadEl) loadEl.style.display = 'none';
    }
}

// ===== Password Visibility Toggle =====
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.password-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (!input) return;

            const icon = btn.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                if (icon) icon.className = 'fas fa-eye-slash';
            } else {
                input.type = 'password';
                if (icon) icon.className = 'fas fa-eye';
            }
        });
    });
});

// ===== Password Strength Checker =====
function checkPasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { level: 'weak', text: 'Weak' };
    if (score === 2) return { level: 'fair', text: 'Fair' };
    if (score === 3) return { level: 'good', text: 'Good' };
    return { level: 'strong', text: 'Strong' };
}

document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('signupPassword');
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');

    if (passwordInput && strengthFill && strengthText) {
        passwordInput.addEventListener('input', () => {
            const val = passwordInput.value;
            if (!val) {
                strengthFill.className = 'strength-fill';
                strengthText.className = 'strength-text';
                strengthText.textContent = '';
                return;
            }
            const result = checkPasswordStrength(val);
            strengthFill.className = 'strength-fill ' + result.level;
            strengthText.className = 'strength-text ' + result.level;
            strengthText.textContent = result.text;
        });
    }
});

// ===== Email Validation =====
function isValidEmail(email) {
    return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email);
}

// ===== Login Form =====
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearFieldErrors('login');
        hideFormMessage('loginMessage');

        const email = document.getElementById('loginEmail')?.value.trim();
        const password = document.getElementById('loginPassword')?.value;

        // Client-side validation
        let hasError = false;
        if (!email) {
            setFieldError('loginEmailError', 'Email is required');
            hasError = true;
        } else if (!isValidEmail(email)) {
            setFieldError('loginEmailError', 'Please enter a valid email');
            hasError = true;
        }
        if (!password) {
            setFieldError('loginPasswordError', 'Password is required');
            hasError = true;
        }
        if (hasError) return;

        setBtnLoading('loginSubmitBtn', true);

        try {
            const result = await apiRequest('/auth/login/', 'POST', { email, password });

            if (result.ok) {
                // Store tokens - Note: backend returns tokens in result.data.data (camelCase)
                const authData = result.data.data;
                if (authData && authData.accessToken) {
                    localStorage.setItem('access_token', authData.accessToken);
                }
                if (authData && authData.refreshToken) {
                    localStorage.setItem('refresh_token', authData.refreshToken);
                }
                showFormMessage('loginMessage', 'Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
            } else {
                // Parse Django error responses into user-friendly messages
                let msg = 'Invalid email or password. Please try again.';
                if (result.data.data && result.data.data.detail) {
                    msg = Array.isArray(result.data.data.detail) ? result.data.data.detail[0] : String(result.data.data.detail);
                } else if (result.data.detail) {
                    msg = Array.isArray(result.data.detail) ? result.data.detail[0] : String(result.data.detail);
                } else if (result.data.message) {
                    msg = String(result.data.message);
                } else if (result.data.non_field_errors) {
                    msg = Array.isArray(result.data.non_field_errors) ? result.data.non_field_errors[0] : String(result.data.non_field_errors);
                }
                showFormMessage('loginMessage', msg, 'error');
            }
        } catch (err) {
            showFormMessage('loginMessage', 'Network error. Please check your connection and try again.', 'error');
        } finally {
            setBtnLoading('loginSubmitBtn', false);
        }
    });
});

// ===== Signup Form =====
document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    if (!signupForm) return;

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearFieldErrors('signup');
        hideFormMessage('signupMessage');

        const name = document.getElementById('signupName')?.value.trim();
        const email = document.getElementById('signupEmail')?.value.trim();
        const password = document.getElementById('signupPassword')?.value;
        const confirmPassword = document.getElementById('signupConfirmPassword')?.value;
        const termsCheckbox = signupForm.querySelector('input[name="terms"]');

        // Client-side validation
        let hasError = false;
        if (!name || name.length < 2) {
            setFieldError('signupNameError', 'Please enter your full name');
            hasError = true;
        }
        if (!email) {
            setFieldError('signupEmailError', 'Email is required');
            hasError = true;
        } else if (!isValidEmail(email)) {
            setFieldError('signupEmailError', 'Please enter a valid email');
            hasError = true;
        }
        if (!password) {
            setFieldError('signupPasswordError', 'Password is required');
            hasError = true;
        } else if (password.length < 8) {
            setFieldError('signupPasswordError', 'Password must be at least 8 characters');
            hasError = true;
        }
        if (password !== confirmPassword) {
            setFieldError('signupConfirmPasswordError', 'Passwords do not match');
            hasError = true;
        }
        if (termsCheckbox && !termsCheckbox.checked) {
            showFormMessage('signupMessage', 'Please agree to the Terms and Privacy Policy.', 'error');
            hasError = true;
        }
        if (hasError) return;

        setBtnLoading('signupSubmitBtn', true);

        // Split name into first and last
        const nameParts = name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '';

        try {
            const result = await apiRequest('/auth/register/', 'POST', {
                email,
                password,
                password_confirm: confirmPassword,
                first_name: firstName,
                last_name: lastName,
            });

            if (result.ok) {
                showFormMessage('signupMessage', 'Account created successfully! Redirecting to dashboard...', 'success');
                
                // Auto-login: Store tokens if provided
                const authData = result.data.data;
                if (authData && authData.accessToken) {
                    localStorage.setItem('access_token', authData.accessToken);
                    if (authData.refreshToken) {
                        localStorage.setItem('refresh_token', authData.refreshToken);
                    }
                }
                
                signupForm.reset();
                // Reset password strength meter
                const strengthFill = document.getElementById('strengthFill');
                const strengthText = document.getElementById('strengthText');
                if (strengthFill) strengthFill.className = 'strength-fill';
                if (strengthText) {
                    strengthText.className = 'strength-text';
                    strengthText.textContent = '';
                }
                setTimeout(() => {
                    window.location.href = authData && authData.accessToken ? '/dashboard' : '/login';
                }, 2000);
            } else {
                // Handle field-level errors from Django
                if (result.data.email) {
                    setFieldError('signupEmailError', Array.isArray(result.data.email) ? result.data.email[0] : result.data.email);
                }
                if (result.data.password) {
                    setFieldError('signupPasswordError', Array.isArray(result.data.password) ? result.data.password[0] : result.data.password);
                }
                const msg = result.data.detail || result.data.message || result.data.non_field_errors?.[0] || 'Registration failed. Please check your details.';
                if (!result.data.email && !result.data.password) {
                    showFormMessage('signupMessage', msg, 'error');
                }
            }
        } catch (err) {
            showFormMessage('signupMessage', 'Network error. Please check your connection and try again.', 'error');
        } finally {
            setBtnLoading('signupSubmitBtn', false);
        }
    });
});

// ===== Course Filtering =====
document.addEventListener('DOMContentLoaded', () => {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const courseCards = document.querySelectorAll('.course-card:not(.quiz-category)');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.getAttribute('data-filter');

            courseCards.forEach(card => {
                if (filter === 'all') {
                    card.style.display = '';
                    card.style.animation = 'fadeInUp 0.4s ease forwards';
                } else {
                    const category = card.getAttribute('data-category');
                    if (category === filter) {
                        card.style.display = '';
                        card.style.animation = 'fadeInUp 0.4s ease forwards';
                    } else {
                        card.style.display = 'none';
                    }
                }
            });
        });
    });

    // Course search - real-time filtering on input
    const courseSearch = document.getElementById('courseSearch');
    function performCourseSearch() {
        const query = (courseSearch?.value || '').toLowerCase().trim();
        courseCards.forEach(card => {
            const title = card.querySelector('h4')?.textContent.toLowerCase() || '';
            const desc = card.querySelector('.course-content p')?.textContent.toLowerCase() || '';
            const category = card.querySelector('.course-category')?.textContent.toLowerCase() || '';
            const matches = !query || title.includes(query) || desc.includes(query) || category.includes(query);
            card.style.display = matches ? '' : 'none';
            if (matches) card.style.animation = 'fadeInUp 0.4s ease forwards';
        });
        // Reset category filter buttons
        filterBtns.forEach(b => b.classList.remove('active'));
        const allBtn = document.querySelector('.filter-btn[data-filter="all"]');
        if (allBtn) allBtn.classList.add('active');
    }
    if (courseSearch) {
        courseSearch.addEventListener('input', performCourseSearch);
        courseSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); performCourseSearch(); }
        });
    }
    // Wire up the Search button
    const courseSearchBtn = document.getElementById('courseSearchBtn');
    if (courseSearchBtn) {
        courseSearchBtn.addEventListener('click', performCourseSearch);
    }
});

// ===== Contact Form =====
document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');
    if (!contactForm) return;

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validate fields
        const firstName = document.getElementById('firstName')?.value.trim();
        const lastName = document.getElementById('lastName')?.value.trim();
        const email = document.getElementById('email')?.value.trim();
        const subject = document.getElementById('subject')?.value;
        const message = document.getElementById('message')?.value.trim();

        if (!firstName || !lastName || !email || !message) {
            showToast('Please fill in all required fields.', 'error');
            return;
        }

        if (!isValidEmail(email)) {
            showToast('Please enter a valid email address.', 'error');
            return;
        }

        // Disable submit button
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

        try {
            // Try to send to backend API
            const result = await apiRequest('/support/feedback/', 'POST', {
                first_name: firstName,
                last_name: lastName,
                email,
                subject: subject || 'general',
                message,
            });

            if (result.ok) {
                showToast('Message sent successfully! We\'ll get back to you within 24 hours.', 'success');
                contactForm.reset();
            } else {
                // Show error message from API
                const msg = result.data.detail || result.data.message || 'Failed to send message. Please try again.';
                showToast(msg, 'error');
            }
        } catch (err) {
            // Show error for network/connection issues
            showToast('Network error. Please check your connection and try again.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
        }
    });
});

// ===== Toast Notifications =====
function showToast(message, type) {
    // Remove existing toasts
    document.querySelectorAll('.toast-notification').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = 'toast-notification toast-' + type;

    const iconClass = type === 'success' ? 'fa-check-circle' : type === 'info' ? 'fa-info-circle' : 'fa-exclamation-circle';
    const content = document.createElement('div');
    content.className = 'toast-content';

    const icon = document.createElement('i');
    icon.className = 'fas ' + iconClass;
    content.appendChild(icon);

    const span = document.createElement('span');
    span.textContent = message;
    content.appendChild(span);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.addEventListener('click', () => toast.remove());

    toast.appendChild(content);
    toast.appendChild(closeBtn);
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ===== FAQ Accordion =====
document.addEventListener('DOMContentLoaded', () => {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');

        if (answer) {
            // Hide answers by default
            answer.style.maxHeight = '0';
            answer.style.overflow = 'hidden';
            answer.style.padding = '0 var(--space-lg)';
            answer.style.transition = 'max-height 0.35s ease, padding 0.35s ease';
        }

        if (question && answer) {
            question.addEventListener('click', () => {
                const isOpen = item.classList.contains('open');

                // Close all FAQ items
                faqItems.forEach(other => {
                    const otherAnswer = other.querySelector('.faq-answer');
                    const otherIcon = other.querySelector('.faq-question i');
                    other.classList.remove('open');
                    if (otherAnswer) {
                        otherAnswer.style.maxHeight = '0';
                        otherAnswer.style.padding = '0 var(--space-lg)';
                    }
                    if (otherIcon) otherIcon.style.transform = 'rotate(0deg)';
                });

                // Toggle the clicked one
                if (!isOpen) {
                    item.classList.add('open');
                    answer.style.maxHeight = answer.scrollHeight + 32 + 'px';
                    answer.style.padding = '0 var(--space-lg) var(--space-lg)';
                    const icon = question.querySelector('i');
                    if (icon) icon.style.transform = 'rotate(180deg)';
                }
            });
        }
    });
});

// ===== Scroll-to-Top Button =====
document.addEventListener('DOMContentLoaded', () => {
    const scrollBtn = document.createElement('button');
    scrollBtn.className = 'scroll-to-top';
    scrollBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
    scrollBtn.setAttribute('aria-label', 'Scroll to top');
    document.body.appendChild(scrollBtn);

    window.addEventListener('scroll', () => {
        scrollBtn.classList.toggle('visible', window.scrollY > 300);
    });

    scrollBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});

// ===== Smooth Scroll for Anchor Links =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
        const href = anchor.getAttribute('href');
        if (href && href !== '#') {
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    });
});

// ===== Scroll Animations =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.feature-card, .course-card, .team-member, .stat, .about-content, .contact-wrapper, .testimonial-card').forEach(el => {
        el.classList.add('animate-target');
        observer.observe(el);
    });
});

// ===== Stats Counter Animation =====
function animateCounter(element, target, duration) {
    let start = 0;
    const increment = target / (duration / 16);
    const suffix = element.textContent.replace(/[\d,.]/g, '');

    function update() {
        start += increment;
        if (start >= target) {
            element.textContent = target.toLocaleString() + suffix;
            return;
        }
        element.textContent = Math.floor(start).toLocaleString() + suffix;
        requestAnimationFrame(update);
    }
    update();
}

const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const statNumbers = entry.target.querySelectorAll('.stat-number');
            statNumbers.forEach(stat => {
                const text = stat.textContent;
                const number = parseInt(text.replace(/[^0-9]/g, ''));
                if (number > 0) {
                    animateCounter(stat, number, 2000);
                }
            });
            statsObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.hero-stats').forEach(el => statsObserver.observe(el));
});

// ===== Scroll Progress Bar =====
document.addEventListener('DOMContentLoaded', () => {
    const scrollProgress = document.getElementById('scrollProgress');
    if (!scrollProgress) return;

    window.addEventListener('scroll', () => {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        scrollProgress.style.width = scrolled + '%';
    });
});

// ===== UI Enhancements: Hover Effects on Buttons =====
document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.btn-primary, .btn-secondary, .btn-accent');
    buttons.forEach(btn => {
        btn.addEventListener('mouseenter', function(e) {
            this.style.transform = 'translateY(-3px)';
        });
        btn.addEventListener('mouseleave', function(e) {
            this.style.transform = 'translateY(0)';
        });
    });
});

// ===== Social Login Event Delegation (replaces inline onclick) =====
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', (e) => {
        const socialBtn = e.target.closest('[data-action="social-login"]');
        if (socialBtn) {
            e.preventDefault();
            const provider = socialBtn.dataset.provider || 'unknown';
            showToast(`${provider.charAt(0).toUpperCase() + provider.slice(1)} login coming soon!`, 'info');
        }
    });
});

// ===== Keyboard: Escape to Close Mobile Menu =====
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        // Use correct class selectors matching the dynamically created elements
        const overlay = document.querySelector('.mobile-overlay');
        const panel = document.querySelector('.mobile-panel');
        if (overlay && overlay.classList.contains('active')) {
            closeMobileMenu();
        }
    }
});

// ===== FAQ Accordion: aria-expanded Toggle =====
document.addEventListener('DOMContentLoaded', () => {
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(btn => {
        btn.addEventListener('click', () => {
            const isExpanded = btn.getAttribute('aria-expanded') === 'true';
            // Close all others
            faqQuestions.forEach(other => {
                if (other !== btn) {
                    other.setAttribute('aria-expanded', 'false');
                    const otherAnswer = other.nextElementSibling;
                    if (otherAnswer) otherAnswer.style.display = 'none';
                    const otherIcon = other.querySelector('i');
                    if (otherIcon) otherIcon.style.transform = 'rotate(0deg)';
                }
            });
            // Toggle current
            btn.setAttribute('aria-expanded', String(!isExpanded));
            const answer = btn.nextElementSibling;
            if (answer) answer.style.display = isExpanded ? 'none' : 'block';
            const icon = btn.querySelector('i');
            if (icon) icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
        });
    });
    // Initialize: hide all answers
    faqQuestions.forEach(btn => {
        const answer = btn.nextElementSibling;
        if (answer) answer.style.display = 'none';
    });
});
