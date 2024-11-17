// Create a new shared.js file for common functionality
class PredictiveSearch {
    constructor(inputElement, options = {}) {
        this.input = inputElement;
        this.options = {
            minChars: 2,
            maxResults: 5,
            delay: 300,
            getSuggestions: () => [],
            formatSuggestion: (item) => item.toString(),
            onSelect: () => {},
            ...options
        };
        
        this.createAutocompleteContainer();
        this.setupEventListeners();
    }

    createAutocompleteContainer() {
        this.autocompleteContainer = document.createElement('div');
        this.autocompleteContainer.className = 'autocomplete-container';
        this.input.parentNode.appendChild(this.autocompleteContainer);
    }

    setupEventListeners() {
        this.input.addEventListener('input', this.debounce(() => {
            const value = this.input.value.trim();
            if (value.length >= this.options.minChars) {
                this.showSuggestions(value);
            } else {
                this.hideSuggestions();
            }
        }, this.options.delay));

        // Close suggestions on click outside
        document.addEventListener('click', (e) => {
            if (!this.input.contains(e.target) && !this.autocompleteContainer.contains(e.target)) {
                this.hideSuggestions();
            }
        });
    }

    async showSuggestions(query) {
        try {
            const matches = await this.options.getSuggestions(query);
            if (!matches || !matches.length) {
                this.hideSuggestions();
                return;
            }

            this.autocompleteContainer.innerHTML = '';
            matches.slice(0, this.options.maxResults).forEach(match => {
                const div = document.createElement('div');
                div.className = 'autocomplete-item';
                div.innerHTML = this.options.formatSuggestion(match);
                div.addEventListener('click', () => {
                    this.options.onSelect(match);
                    this.hideSuggestions();
                });
                this.autocompleteContainer.appendChild(div);
            });
            this.autocompleteContainer.style.display = 'block';
        } catch (error) {
            console.error('Error showing suggestions:', error);
            this.hideSuggestions();
        }
    }

    hideSuggestions() {
        this.autocompleteContainer.style.display = 'none';
    }

    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
}

// Add this at the end of shared.js
document.addEventListener('DOMContentLoaded', function() {
    // Get current page path
    const currentPath = window.location.pathname;
    
    // Update active state of navigation buttons
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        const btnPath = btn.getAttribute('href');
        if (currentPath.endsWith(btnPath)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Add hover effect for non-active buttons
    navButtons.forEach(btn => {
        if (!btn.classList.contains('active')) {
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'translateY(-2px)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'translateY(0)';
            });
        }
    });
});