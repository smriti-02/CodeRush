const WEIGHTS = {
    'O(1)': 5,
    'O(log n)': 4,
    'O(n)': 3,
    'O(n log n)': 2,
    'O(n^2)': 1
};

export const DIFFICULTY_STAKES = {
    'Easy': { floor: -100, eloPenalty: 100 },
    'Medium': { floor: -300, eloPenalty: 150 },
    'Hard': { floor: -500, eloPenalty: 200 }
};

/**
 * Calculates the final ELO change for a match.
 * @param {Object} matchData
 * @param {boolean} matchData.isWinner - Did the player win?
 * @param {string} matchData.difficulty - 'Easy', 'Medium', or 'Hard'
 * @param {string} matchData.userComplexity - 'O(n)'
 * @param {number} matchData.wrongSubmissions - Total failed attempts
 */
export const calculateMatchResults = (matchData) => {
    const {
        isWinner,
        isDraw,
        difficulty, 
        userComplexity,
        targetComplexity,
        wrongSubmissions
    } = matchData;

    const config = DIFFICULTY_STAKES[difficulty];
    let netEloChange = 0;

    // 1. Determine Match Result Base
    if (isWinner) {
        netEloChange = 300; 
    } else if (isDraw) {
        netEloChange = 0;  
    } else {
        netEloChange = -config.eloPenalty; 
    }

    // 2. Complexity Bonus (Mitigation Logic)
    const userW = WEIGHTS[userComplexity] || 0;
    const targetW = WEIGHTS[targetComplexity] || 1;
    
    if (userW >= targetW && userW > 0) {
        // Recovery bonus: mitigates 40% of the loss penalty
        const recoveryBonus = Math.floor(config.eloPenalty * 0.4); 
        netEloChange += recoveryBonus;
    }

    // 3. Penalty for Wrong Submissions (-50 ELO each)
    const totalPenalty = wrongSubmissions * 50;
    netEloChange -= totalPenalty;

    // 4. Final Floor Check
    if (netEloChange < config.floor) {
        netEloChange = config.floor;
    }

    return {
        netEloChange,
        complexityMatched: userW >= targetW,
        penaltyDeducted: totalPenalty
    };
};