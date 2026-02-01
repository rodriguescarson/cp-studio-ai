#!/usr/bin/env node

/**
 * Fetch Codeforces problem statements using codeforces-api-ts and cheerio
 */

const { CodeforcesAPI } = require('codeforces-api-ts');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

async function fetchProblemStatement(contestId, problemIndex) {
    const url = `https://codeforces.com/contest/${contestId}/problem/${problemIndex}`;
    
    try {
        console.log(`Fetching ${url}...`);
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            },
            timeout: 30000
        });
        
        const $ = cheerio.load(response.data);
        const problemStatement = $('.problem-statement');
        
        if (problemStatement.length === 0) {
            console.log(`  ⚠️  Problem statement not found (may require authentication)`);
            return null;
        }
        
        // Extract problem content
        const title = problemStatement.find('.title').first().text().trim();
        const timeLimit = problemStatement.find('.time-limit').text().trim();
        const memoryLimit = problemStatement.find('.memory-limit').text().trim();
        
        // Get problem description
        const description = problemStatement.find('.problem-statement > div').slice(1).map((i, el) => {
            return $(el).text().trim();
        }).get().join('\n\n');
        
        return {
            title,
            timeLimit,
            memoryLimit,
            description,
            url
        };
    } catch (error) {
        console.error(`  ❌ Error fetching ${url}:`, error.message);
        return null;
    }
}

async function fetchContestProblems(contestId, problems) {
    console.log(`\n📥 Fetching problems for contest ${contestId}...\n`);
    
    for (const prob of problems) {
        const { index, name } = prob;
        console.log(`Problem ${index}: ${name}`);
        
        const statement = await fetchProblemStatement(contestId, index);
        
        if (statement) {
            const problemDir = path.join(__dirname, '..', 'contests', contestId.toString(), index);
            if (!fs.existsSync(problemDir)) {
                fs.mkdirSync(problemDir, { recursive: true });
            }
            
            const statementFile = path.join(problemDir, 'problem_statement.txt');
            const content = `# ${statement.title}\n\n**Time Limit:** ${statement.timeLimit}\n\n**Memory Limit:** ${statement.memoryLimit}\n\n**Input File:** inputstandard input\n\n**Output File:** outputstandard output\n\n${statement.description}\n\n**Problem URL:** ${statement.url}`;
            
            fs.writeFileSync(statementFile, content);
            console.log(`  ✅ Saved to ${statementFile}\n`);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

async function main() {
    const contestId = process.argv[2] ? parseInt(process.argv[2], 10) : 2188;
    
    // Try to get problem list from API first
    try {
        const apiResponse = await CodeforcesAPI.call('contest.standings', {
            contestId: contestId,
            from: 1,
            count: 1
        });
        
        if (apiResponse.status === 'OK') {
            const contestProblems = apiResponse.result.problems;
            if (contestProblems.length === 0) {
                console.log('No problems returned by API. Falling back to A–G.');
                const fallback = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(index => ({ index, name: `Problem ${index}` }));
                await fetchContestProblems(contestId, fallback);
            } else {
                await fetchContestProblems(contestId, contestProblems);
            }
        }
    } catch (error) {
        console.error('API Error:', error.message);
        console.log('Falling back to direct fetching (A–G)...\n');
        
        const fallback = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(index => ({ index, name: `Problem ${index}` }));
        await fetchContestProblems(contestId, fallback);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { fetchProblemStatement, fetchContestProblems };
