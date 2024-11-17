let currentTeams = [];
let allTeams = []; // Will be populated in background

// Add this constant at the top of the file
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEyMCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiNFMUU1RUIiLz48cGF0aCBkPSJNNjAgNDBDNTAuNjEgNDAgNDMgNDcuNjEgNDMgNTdDNDMgNjYuMzkgNTAuNjEgNzQgNjAgNzRDNjkuMzkgNzQgNzcgNjYuMzkgNzcgNTdDNzcgNDcuNjEgNjkuMzkgNDAgNjAgNDBaTTYwIDcwQzUyLjgyIDcwIDQ3IDY0LjE4IDQ3IDU3QzQ3IDQ5LjgyIDUyLjgyIDQ0IDYwIDQ0QzY3LjE4IDQ0IDczIDQ5LjgyIDczIDU3QzczIDY0LjE4IDY3LjE4IDcwIDYwIDcwWiIgZmlsbD0iIzk0QTNCOCIvPjwvc3ZnPg==';

// Add these helper functions at the top of the file
const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
};

const formatRecentForm = (form) => {
    if (!form) return '';
    return form.split('').map(result => {
        switch(result.toUpperCase()) {
            case 'W': return '<span class="form-w">W</span>';
            case 'L': return '<span class="form-l">L</span>';
            case 'D': return '<span class="form-d">D</span>';
            default: return '';
        }
    }).join('');
};

const toggleDescription = (button) => {
    const card = button.closest('.team-card');
    const shortDesc = card.querySelector('.description-content');
    const fullDesc = card.querySelector('.description-full');
    
    shortDesc.classList.toggle('hidden');
    fullDesc.classList.toggle('hidden');
};

document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Pre-fetch teams first
        await fetchAllLeaguesTeams();
        
        // Then initialize search controls after data is loaded
        initializeSearchControls();
        
        // Show initial state
        showInitialState();
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize the application. Please refresh the page.');
    }
});

function filterAndDisplayTeams() {
    const searchInput = document.getElementById('teamSearch');
    const leagueFilter = document.getElementById('leagueFilter');
    const showFavorites = document.getElementById('showFavorites');
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    // Always show initial state if search is empty
    if (searchTerm.length < 2) {
        showInitialState();
        return;
    }

    let filteredTeams = [...allTeams];

    // Apply search filter
    filteredTeams = filteredTeams.filter(team => {
        const teamName = team.strTeam.toLowerCase();
        const alternateNames = (team.strAlternate || '').toLowerCase();
        return teamName.includes(searchTerm) || alternateNames.includes(searchTerm);
    });

    // Display results
    displayTeams(filteredTeams);
}

function sortTeams(teams, sortBy) {
    switch (sortBy) {
        case 'name':
            teams.sort((a, b) => a.strTeam.localeCompare(b.strTeam));
            break;
        case 'league':
            teams.sort((a, b) => a.strLeague.localeCompare(b.strLeague));
            break;
        case 'country':
            teams.sort((a, b) => a.strCountry.localeCompare(b.strCountry));
            break;
    }
}

function initializeSearchControls() {
    const searchInput = document.getElementById('teamSearch');
    const leagueFilter = document.getElementById('leagueFilter');
    const showFavorites = document.getElementById('showFavorites');
    const sortSelect = document.getElementById('sortTeams');

    // Initialize predictive search
    new PredictiveSearch(searchInput, {
        getSuggestions: (query) => {
            if (query.length < 2) return [];
            query = query.toLowerCase();
            return allTeams.filter(team => {
                const teamName = team.strTeam.toLowerCase();
                const alternateNames = (team.strAlternate || '').toLowerCase();
                return teamName.includes(query) || alternateNames.includes(query);
            }).slice(0, 5); // Limit to 5 suggestions
        },
        formatSuggestion: (team) => {
            // Create placeholder with team's first letter
            const placeholderBadge = `https://via.placeholder.com/40x40/1e88e5/ffffff?text=${encodeURIComponent(team.strTeam.charAt(0))}`;
            
            return `
                <div class="team-suggestion">
                    <img src="${team.strTeamBadge || ''}" 
                         alt="${team.strTeam}" 
                         class="suggestion-badge"
                         onerror="this.src='${placeholderBadge}'"
                    >
                    <div class="suggestion-info">
                        <div class="suggestion-name">${team.strTeam}</div>
                        <div class="suggestion-league">${team.strLeague}</div>
                    </div>
                </div>
            `;
        },
        onSelect: (team) => {
            searchInput.value = team.strTeam;
            filterAndDisplayTeams();
        }
    });

    // Add event listeners
    searchInput.addEventListener('input', debounce(() => {
        if (searchInput.value.trim().length >= 2 || 
            leagueFilter.value !== 'all' || 
            showFavorites.checked) {
            filterAndDisplayTeams();
        } else {
            showInitialState();
        }
    }, 300));

    leagueFilter.addEventListener('change', filterAndDisplayTeams);
    showFavorites.addEventListener('change', filterAndDisplayTeams);
    sortSelect.addEventListener('change', filterAndDisplayTeams);
}

function showInitialState() {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = `
        <div class="initial-state">
            <div class="search-illustration">
                <i class="fas fa-search fa-3x"></i>
            </div>
            <h2>Search for Your Favorite Team</h2>
            <p>Enter a team name or select a league to get started</p>
            <div class="search-tips">
                <h3>Search Tips:</h3>
                <ul>
                    <li>Enter at least 2 characters to search</li>
                    <li>Try searching by team name (e.g., "Arsenal", "Barcelona")</li>
                    <li>Filter by league using the dropdown</li>
                    <li>Use the sort options to organize results</li>
                </ul>
            </div>
        </div>
    `;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Favorites management
function getFavorites() {
    return JSON.parse(localStorage.getItem('favoriteTeams') || '[]');
}

function toggleFavorite(teamName, button) {
    const favorites = getFavorites();
    const isFavorite = favorites.includes(teamName);
    
    if (isFavorite) {
        const index = favorites.indexOf(teamName);
        favorites.splice(index, 1);
        button.innerHTML = '<i class="fas fa-star"></i><span>Add to Favorites</span>';
        button.classList.remove('active');
    } else {
        favorites.push(teamName);
        button.innerHTML = '<i class="fas fa-star"></i><span>Remove from Favorites</span>';
        button.classList.add('active');
    }
    
    localStorage.setItem('favoriteTeams', JSON.stringify(favorites));
}

function displayTeams(teams) {
    const resultsContainer = document.getElementById('search-results');
    
    // Set min-height before clearing to prevent jumping
    resultsContainer.style.minHeight = resultsContainer.offsetHeight + 'px';
    
    // Clear previous results
    resultsContainer.innerHTML = '';

    if (!teams || teams.length === 0) {
        resultsContainer.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>No teams found. Try adjusting your search.</p>
            </div>`;
        updateResultsCount(0);
        return;
    }

    // Create grid container
    const teamsGrid = document.createElement('div');
    teamsGrid.className = 'teams-grid loading';
    resultsContainer.appendChild(teamsGrid);

    // Create all cards but keep them hidden
    const fragment = document.createDocumentFragment();
    teams.forEach(team => {
        const teamCard = createTeamCard(team);
        fragment.appendChild(teamCard);
    });

    // Batch DOM updates
    teamsGrid.appendChild(fragment);

    // Trigger reflow and add cards with animation
    requestAnimationFrame(() => {
        teamsGrid.classList.remove('loading');
        // Reset min-height after animation
        setTimeout(() => {
            resultsContainer.style.minHeight = '';
        }, 300);
    });

    updateResultsCount(teams.length);
}

function createTeamCard(team) {
    const teamCard = document.createElement('div');
    teamCard.className = 'team-card';
    
    // Clean and format the description
    const description = team.strDescriptionEN ? formatDescription(team.strDescriptionEN) : '';
    
    // Create a more reliable badge URL with multiple fallbacks
    const badgeUrls = [
        team.strTeamBadge,
        team.strTeamLogo,
        `https://resources.premierleague.com/premierleague/badges/t${team.idTeam}.png`,
        `https://media.api-sports.io/football/teams/${team.idTeam}.png`,
        // Create a letter-based placeholder as final fallback
        `https://via.placeholder.com/120x120/1e88e5/ffffff?text=${encodeURIComponent(team.strTeam.charAt(0))}`
    ];
    
    teamCard.innerHTML = `
        <div class="team-card-header">
            <img src="${badgeUrls[0]}" 
                 alt="${team.strTeam}" 
                 class="team-badge"
                 loading="lazy"
                 onerror="this.onerror=null; this.src='${badgeUrls[4]}'"
            >
        </div>
        <div class="team-info">
            <h3>${team.strTeam}</h3>
            <div class="team-details">
                <p class="team-league">
                    <i class="fas fa-trophy"></i>
                    <strong>${team.strLeague}</strong>
                </p>
                <p class="team-location">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${team.strCountry}</span>
                </p>
                <p class="team-stadium">
                    <i class="fas fa-building"></i>
                    <span>${team.strStadium || 'Stadium Unknown'}</span>
                    ${team.intStadiumCapacity ? 
                        `<span class="capacity">(${formatNumber(team.intStadiumCapacity)} capacity)</span>` 
                        : ''}
                </p>
                ${team.intFormedYear ? `
                    <p class="team-history">
                        <i class="fas fa-clock"></i>
                        <span>Founded in ${team.intFormedYear}</span>
                    </p>
                ` : ''}
            </div>
            ${description ? `
                <div class="team-description">
                    <div class="description-content">
                        ${description.short}
                        <button class="show-more-btn" onclick="toggleDescription(this)">
                            <i class="fas fa-chevron-down"></i> Read More
                        </button>
                    </div>
                    <div class="description-full hidden">
                        ${description.full}
                        <button class="show-less-btn" onclick="toggleDescription(this)">
                            <i class="fas fa-chevron-up"></i> Show Less
                        </button>
                    </div>
                </div>
            ` : ''}
        </div>
    `;

    return teamCard;
}

// Add this helper function to format the description
function formatDescription(text) {
    if (!text) return null;
    
    // Clean up the text
    const cleanText = text
        .replace(/\r\n/g, '\n')
        .replace(/\n\n+/g, '\n\n')
        .trim();
    
    // Create paragraphs
    const paragraphs = cleanText.split('\n\n')
        .map(p => `<p>${p.trim()}</p>`)
        .join('');
    
    return {
        short: `<p>${cleanText.substring(0, 150)}...</p>`,
        full: paragraphs
    };
}

function showError(message) {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = `
        <div class="error">
            <i class="fas fa-exclamation-circle"></i>
            <p>${message}</p>
        </div>
    `;
}

function updateResultsCount(count) {
    const countElement = document.getElementById('resultsCount');
    if (countElement) {
        countElement.textContent = `${count} team${count !== 1 ? 's' : ''} found`;
    }
}

async function fetchAllLeaguesTeams() {
    const leagues = [
        'English Premier League',
        'Spanish La Liga',
        'Italian Serie A',
        'German Bundesliga',
        'French Ligue 1'
    ];

    try {
        showLoading();
        const promises = leagues.map(league => 
            fetch(`https://www.thesportsdb.com/api/v1/json/3/search_all_teams.php?l=${encodeURIComponent(league)}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
        );

        const results = await Promise.all(promises);
        allTeams = results.flatMap(result => result.teams || []);
        currentTeams = [...allTeams];
        
        if (!allTeams.length) {
            throw new Error('No teams data received');
        }
    } catch (error) {
        console.error('Error fetching teams:', error);
        showError('Failed to load teams. Please try again later.');
        throw error; // Re-throw to be caught by the initialization
    }
}

function showLoading() {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin fa-3x"></i>
            <p>Loading teams...</p>
        </div>
    `;
}