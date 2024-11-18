document.addEventListener('DOMContentLoaded', function() {
    initializePredictor();
});

function initializePredictor() {
    const league1Select = document.getElementById('league1-select');
    const league2Select = document.getElementById('league2-select');
    const team1Select = document.getElementById('team1-select');
    const team2Select = document.getElementById('team2-select');
    const compareButton = document.getElementById('compare-teams');
    const comparisonResults = document.getElementById('comparison-results');

    if (!league1Select || !league2Select) return; // Not on predictor page

    // Add event listeners for league selects
    league1Select.addEventListener('change', () => updateTeamOptions(league1Select.value, team1Select));
    league2Select.addEventListener('change', () => updateTeamOptions(league2Select.value, team2Select));
    
    // Add event listener for compare button
    compareButton.addEventListener('click', async () => {
        const team1 = team1Select.options[team1Select.selectedIndex];
        const team2 = team2Select.options[team2Select.selectedIndex];

        if (!team1.value || !team2.value) {
            alert('Please select both teams to compare');
            return;
        }

        try {
            compareButton.disabled = true;
            compareButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
            
            const comparison = await compareTeams(
                team1.value,
                team2.value,
                team1.dataset.badge,
                team2.dataset.badge,
                team1.dataset.name,
                team2.dataset.name
            );
            
            displayComparison(comparison);
        } catch (error) {
            console.error('Comparison error:', error);
            alert('Failed to compare teams. Please try again.');
        } finally {
            compareButton.disabled = false;
            compareButton.innerHTML = '<i class="fas fa-chart-line"></i> Compare & Predict';
        }
    });
}

async function updateTeamOptions(league, teamSelect) {
    if (league === 'all') {
        teamSelect.innerHTML = '<option value="">Select Team</option>';
        return;
    }

    try {
        teamSelect.disabled = true;
        const response = await fetch(`https://www.thesportsdb.com/api/v1/json/3/search_all_teams.php?l=${encodeURIComponent(league)}`);
        const data = await response.json();
        
        if (data.teams) {
            teamSelect.innerHTML = `
                <option value="">Select Team</option>
                ${data.teams.map(team => `
                    <option value="${team.idTeam}" 
                            data-badge="${team.strTeamBadge}"
                            data-name="${team.strTeam}">
                        ${team.strTeam}
                    </option>
                `).join('')}
            `;
        }
    } catch (error) {
        console.error('Error fetching teams:', error);
        teamSelect.innerHTML = '<option value="">Error loading teams</option>';
    } finally {
        teamSelect.disabled = false;
    }
}

async function compareTeams(team1Id, team2Id, team1Badge, team2Badge, team1Name, team2Name) {
    try {
        // Fetch both team data and their last 5 events
        const [team1Data, team2Data, team1Events, team2Events] = await Promise.all([
            fetch(`https://www.thesportsdb.com/api/v1/json/3/lookupteam.php?id=${team1Id}`).then(r => r.json()),
            fetch(`https://www.thesportsdb.com/api/v1/json/3/lookupteam.php?id=${team2Id}`).then(r => r.json()),
            fetch(`https://www.thesportsdb.com/api/v1/json/3/eventslast.php?id=${team1Id}`).then(r => r.json()),
            fetch(`https://www.thesportsdb.com/api/v1/json/3/eventslast.php?id=${team2Id}`).then(r => r.json())
        ]);

        const team1 = team1Data.teams[0];
        const team2 = team2Data.teams[0];
        const team1LastEvents = team1Events.results || [];
        const team2LastEvents = team2Events.results || [];

        // Calculate stats based on recent performance
        const team1Stats = calculateDetailedStats(team1, team1LastEvents);
        const team2Stats = calculateDetailedStats(team2, team2LastEvents);

        return {
            team1: {
                name: team1Name,
                badge: team1Badge,
                stats: team1Stats,
                recentForm: calculateRecentForm(team1LastEvents)
            },
            team2: {
                name: team2Name,
                badge: team2Badge,
                stats: team2Stats,
                recentForm: calculateRecentForm(team2LastEvents)
            },
            prediction: calculateDetailedPrediction(team1Stats, team2Stats, team1LastEvents, team2LastEvents)
        };
    } catch (error) {
        console.error('Error fetching team data:', error);
        throw new Error('Failed to compare teams');
    }
}

function calculateDetailedStats(team, recentEvents) {
    const leagueStrength = getLeagueStrength(team.strLeague);
    const recentPerformance = analyzeRecentPerformance(recentEvents);
    
    const stats = {
        attack: calculateAttackRating(recentPerformance, leagueStrength),
        defense: calculateDefenseRating(recentPerformance, leagueStrength),
        possession: calculatePossessionRating(leagueStrength),
        form: recentPerformance.formRating,
        homeAdvantage: 75 // Base home advantage
    };
    
    stats.overall = calculateOverallRating(stats, leagueStrength);
    return stats;
}

function calculateAttackRating(recentPerformance, leagueStrength) {
    const baseRating = 75;
    const leagueFactor = (leagueStrength - 75) * 0.3;
    const goalsFactor = ((recentPerformance.averageGoalsScored || 1.5) - 1.5) * 10;
    
    return normalizeRating(baseRating + leagueFactor + goalsFactor);
}

function calculateDefenseRating(recentPerformance, leagueStrength) {
    const baseRating = 75;
    const leagueFactor = (leagueStrength - 75) * 0.3;
    const goalsFactor = (1.5 - (recentPerformance.averageGoalsConceded || 1.5)) * 10;
    
    return normalizeRating(baseRating + leagueFactor + goalsFactor);
}

function calculatePossessionRating(leagueStrength) {
    const baseRating = 75;
    const leagueFactor = (leagueStrength - 75) * 0.3;
    const randomFactor = Math.random() * 10 - 5;
    
    return normalizeRating(baseRating + leagueFactor + randomFactor);
}

function calculateOverallRating(stats, leagueStrength) {
    const weights = {
        attack: 0.25,
        defense: 0.25,
        possession: 0.15,
        form: 0.20,
        homeAdvantage: 0.15
    };

    const weightedSum = Object.entries(weights).reduce((sum, [stat, weight]) => {
        return sum + (stats[stat] * weight);
    }, 0);

    return normalizeRating(weightedSum + (leagueStrength - 75) * 0.2);
}

function normalizeRating(rating) {
    return Math.min(Math.max(Math.round(rating), 60), 90);
}

function analyzeRecentPerformance(events) {
    if (!events || !events.length) {
        return {
            formRating: 75,
            averageGoalsScored: 1.5,
            averageGoalsConceded: 1.5
        };
    }

    let totalGoalsScored = 0;
    let totalGoalsConceded = 0;
    let points = 0;

    events.forEach(event => {
        if (!event.intHomeScore || !event.intAwayScore) return;
        
        const isHome = event.strHomeTeam === event.strTeam;
        const goalsScored = isHome ? parseInt(event.intHomeScore) : parseInt(event.intAwayScore);
        const goalsConceded = isHome ? parseInt(event.intAwayScore) : parseInt(event.intHomeScore);

        totalGoalsScored += goalsScored;
        totalGoalsConceded += goalsConceded;

        if (goalsScored > goalsConceded) points += 3;
        else if (goalsScored === goalsConceded) points += 1;
    });

    const maxPoints = events.length * 3;
    const formRating = (points / maxPoints) * 100;

    return {
        formRating: normalizeRating(formRating),
        averageGoalsScored: totalGoalsScored / events.length,
        averageGoalsConceded: totalGoalsConceded / events.length
    };
}

function getLeagueStrength(league) {
    const leagueRatings = {
        'English Premier League': 88,
        'Spanish La Liga': 87,
        'German Bundesliga': 85,
        'Italian Serie A': 84,
        'French Ligue 1': 82
    };
    return leagueRatings[league] || 75;
}

function calculateRecentForm(events) {
    if (!events || !events.length) {
        return 'DDDDD'; // Default form if no events
    }

    return events.slice(0, 5).map(event => {
        if (!event.intHomeScore || !event.intAwayScore) return 'D';
        
        const isHome = event.strHomeTeam === event.strTeam;
        const teamScore = isHome ? parseInt(event.intHomeScore) : parseInt(event.intAwayScore);
        const opponentScore = isHome ? parseInt(event.intAwayScore) : parseInt(event.intHomeScore);

        if (teamScore > opponentScore) return 'W';
        if (teamScore < opponentScore) return 'L';
        return 'D';
    }).join('');
}

function calculateDetailedPrediction(team1Stats, team2Stats, team1Events, team2Events) {
    const team1Strength = team1Stats.overall;
    const team2Strength = team2Stats.overall;
    
    // Calculate win probabilities based on recent form and overall strength
    const totalStrength = team1Strength + team2Strength;
    const homeAdvantage = 1.2; // 20% advantage for home team
    
    let team1WinProb = (team1Strength * homeAdvantage) / (totalStrength * homeAdvantage) * 100;
    let team2WinProb = (team2Strength) / (totalStrength * homeAdvantage) * 100;
    
    // Adjust based on recent form
    const form1 = analyzeRecentPerformance(team1Events);
    const form2 = analyzeRecentPerformance(team2Events);
    
    team1WinProb = adjustProbabilityByForm(team1WinProb, form1);
    team2WinProb = adjustProbabilityByForm(team2WinProb, form2);
    
    // Normalize probabilities
    const total = team1WinProb + team2WinProb;
    team1WinProb = (team1WinProb / total) * 90; // Leave room for draw probability
    team2WinProb = (team2WinProb / total) * 90;
    const drawProb = 100 - team1WinProb - team2WinProb;
    
    // Predict score based on recent scoring records
    const predictedScore = calculateLikelyScore(form1, form2, team1Stats, team2Stats);
    
    return {
        score1: predictedScore.team1,
        score2: predictedScore.team2,
        team1Win: Math.round(team1WinProb),
        team2Win: Math.round(team2WinProb),
        draw: Math.round(drawProb)
    };
}

function adjustProbabilityByForm(baseProb, form) {
    const formFactor = form.formRating / 100;
    return baseProb * (0.7 + (0.3 * formFactor));
}

function calculateLikelyScore(form1, form2, team1Stats, team2Stats) {
    // Base expected goals from recent average
    let team1Expected = form1.averageGoalsScored || 1.5;
    let team2Expected = form2.averageGoalsScored || 1.5;
    
    // Adjust based on opponent's defense
    team1Expected *= (team1Stats.attack / team2Stats.defense) * 0.7;
    team2Expected *= (team2Stats.attack / team1Stats.defense) * 0.7;
    
    // Add slight randomization
    team1Expected += (Math.random() * 0.5) - 0.25;
    team2Expected += (Math.random() * 0.5) - 0.25;
    
    return {
        team1: Math.max(0, Math.round(team1Expected)),
        team2: Math.max(0, Math.round(team2Expected))
    };
}

function calculateOverallStrength(team) {
    const stats = calculateTeamStats(team);
    return (
        stats.attack * 0.3 +
        stats.defense * 0.3 +
        stats.possession * 0.2 +
        stats.form * 0.1 +
        stats.homeAdvantage * 0.1
    );
}

function predictScore(team1Strength, team2Strength) {
    const strengthDiff = team1Strength - team2Strength;
    const averageGoals = 2.5; // Average goals per team in most leagues
    
    let team1Expected = averageGoals * (team1Strength / 100);
    let team2Expected = averageGoals * (team2Strength / 100);
    
    // Add some randomness
    team1Expected += (Math.random() - 0.5);
    team2Expected += (Math.random() - 0.5);
    
    return {
        team1: Math.max(0, Math.round(team1Expected)),
        team2: Math.max(0, Math.round(team2Expected))
    };
}

function displayTeams(teams) {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.className = 'dynamic-content'; // Add this class
    // ... rest of the function
}

function displayComparison(comparison) {
    const container = document.getElementById('comparison-results');
    container.className = 'dynamic-content'; // Add this class
    // ... rest of the function
}

function createStatRow(label, value1, value2) {
    const row = document.createElement('div');
    row.className = 'stat-row';
    
    // Format the label and add tooltip info
    const formattedLabel = label
        .replace(/([A-Z])/g, ' $1')
        .toLowerCase()
        .replace(/^./, str => str.toUpperCase());
    
    // Define tooltip content for each stat
    const tooltips = {
        attack: "Team's offensive capabilities based on recent scoring record and league strength",
        defense: "Defensive rating considering goals conceded and league competition level",
        possession: "Ball control rating influenced by league level and team style",
        form: "Recent performance rating based on last 5 matches",
        overall: "Combined rating of all attributes including home advantage",
        homeAdvantage: "Base advantage when playing at home stadium"
    };

    // Calculate strength indicator
    const getStrengthIndicator = (value) => {
        if (value >= 85) return 'Exceptional';
        if (value >= 80) return 'Strong';
        if (value >= 75) return 'Good';
        if (value >= 70) return 'Average';
        return 'Developing';
    };

    row.innerHTML = `
        <div class="team1-stat ${getStrengthIndicator(value1).toLowerCase()}">
            ${Math.round(value1)}%
            <span class="strength-indicator">${getStrengthIndicator(value1)}</span>
        </div>
        <div class="stat-label" title="${tooltips[label.toLowerCase()] || ''}">
            ${formattedLabel}
            <i class="fas fa-info-circle stat-info"></i>
        </div>
        <div class="team2-stat ${getStrengthIndicator(value2).toLowerCase()}">
            ${Math.round(value2)}%
            <span class="strength-indicator">${getStrengthIndicator(value2)}</span>
        </div>
    `;
    return row;
}



