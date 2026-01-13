const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Ensure data directory exists
async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

// Initialize default data files if they don't exist
async function initializeDataFiles() {
    const defaultFiles = {
        'stories.json': [],
        'team.json': [
            { id: '1', name: 'Team Member 1', role: 'Writer' },
            { id: '2', name: 'Team Member 2', role: 'Editor' },
            { id: '3', name: 'Team Member 3', role: 'Analyst' }
        ],
        'ooo.json': [],
        'blocked-dates.json': [
            { id: '1', date: '2026-01-01', reason: 'New Year\'s Day', recurring: true },
            { id: '2', date: '2026-07-04', reason: 'Independence Day', recurring: true },
            { id: '3', date: '2026-12-25', reason: 'Christmas Day', recurring: true },
            { id: '4', date: '2026-11-26', reason: 'Thanksgiving', recurring: true },
            { id: '5', date: '2026-02-09', reason: 'Day After Super Bowl', recurring: false }
        ],
        'archive.json': [],
        'competitors.json': []
    };

    for (const [filename, defaultData] of Object.entries(defaultFiles)) {
        const filePath = path.join(DATA_DIR, filename);
        try {
            await fs.access(filePath);
        } catch {
            await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2));
        }
    }
}

// Generic read function
async function readJsonFile(filename) {
    const filePath = path.join(DATA_DIR, filename);
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// Generic write function
async function writeJsonFile(filename, data) {
    const filePath = path.join(DATA_DIR, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Stories API
app.get('/api/stories', async (req, res) => {
    try {
        const stories = await readJsonFile('stories.json');
        res.json(stories);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read stories' });
    }
});

app.post('/api/stories', async (req, res) => {
    try {
        const stories = await readJsonFile('stories.json');
        const newStory = {
            id: Date.now().toString(),
            ...req.body,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        stories.push(newStory);
        await writeJsonFile('stories.json', stories);
        res.json(newStory);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create story' });
    }
});

app.put('/api/stories/:id', async (req, res) => {
    try {
        const stories = await readJsonFile('stories.json');
        const index = stories.findIndex(s => s.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ error: 'Story not found' });
        }
        stories[index] = {
            ...stories[index],
            ...req.body,
            updatedAt: new Date().toISOString()
        };
        await writeJsonFile('stories.json', stories);
        res.json(stories[index]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update story' });
    }
});

app.delete('/api/stories/:id', async (req, res) => {
    try {
        const stories = await readJsonFile('stories.json');
        const filtered = stories.filter(s => s.id !== req.params.id);
        await writeJsonFile('stories.json', filtered);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete story' });
    }
});

// Team API
app.get('/api/team', async (req, res) => {
    try {
        const team = await readJsonFile('team.json');
        res.json(team);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read team' });
    }
});

app.post('/api/team', async (req, res) => {
    try {
        const team = await readJsonFile('team.json');
        const newMember = {
            id: Date.now().toString(),
            ...req.body
        };
        team.push(newMember);
        await writeJsonFile('team.json', team);
        res.json(newMember);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add team member' });
    }
});

app.delete('/api/team/:id', async (req, res) => {
    try {
        const team = await readJsonFile('team.json');
        const filtered = team.filter(t => t.id !== req.params.id);
        await writeJsonFile('team.json', filtered);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete team member' });
    }
});

// OOO API
app.get('/api/ooo', async (req, res) => {
    try {
        const ooo = await readJsonFile('ooo.json');
        res.json(ooo);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read OOO' });
    }
});

app.post('/api/ooo', async (req, res) => {
    try {
        const ooo = await readJsonFile('ooo.json');
        const newOoo = {
            id: Date.now().toString(),
            ...req.body
        };
        ooo.push(newOoo);
        await writeJsonFile('ooo.json', ooo);
        res.json(newOoo);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add OOO' });
    }
});

app.delete('/api/ooo/:id', async (req, res) => {
    try {
        const ooo = await readJsonFile('ooo.json');
        const filtered = ooo.filter(o => o.id !== req.params.id);
        await writeJsonFile('ooo.json', filtered);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete OOO' });
    }
});

// Blocked Dates API
app.get('/api/blocked-dates', async (req, res) => {
    try {
        const blockedDates = await readJsonFile('blocked-dates.json');
        res.json(blockedDates);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read blocked dates' });
    }
});

app.post('/api/blocked-dates', async (req, res) => {
    try {
        const blockedDates = await readJsonFile('blocked-dates.json');
        const newBlockedDate = {
            id: Date.now().toString(),
            ...req.body
        };
        blockedDates.push(newBlockedDate);
        await writeJsonFile('blocked-dates.json', blockedDates);
        res.json(newBlockedDate);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add blocked date' });
    }
});

app.delete('/api/blocked-dates/:id', async (req, res) => {
    try {
        const blockedDates = await readJsonFile('blocked-dates.json');
        const filtered = blockedDates.filter(b => b.id !== req.params.id);
        await writeJsonFile('blocked-dates.json', filtered);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete blocked date' });
    }
});

// Archive API
app.get('/api/archive', async (req, res) => {
    try {
        const archive = await readJsonFile('archive.json');
        res.json(archive);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read archive' });
    }
});

app.post('/api/archive', async (req, res) => {
    try {
        const archive = await readJsonFile('archive.json');
        const newArchiveEntry = {
            id: Date.now().toString(),
            ...req.body,
            archivedAt: new Date().toISOString()
        };
        archive.push(newArchiveEntry);
        await writeJsonFile('archive.json', archive);
        res.json(newArchiveEntry);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add to archive' });
    }
});

app.put('/api/archive/:id', async (req, res) => {
    try {
        const archive = await readJsonFile('archive.json');
        const index = archive.findIndex(a => a.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ error: 'Archive entry not found' });
        }
        archive[index] = {
            ...archive[index],
            ...req.body,
            updatedAt: new Date().toISOString()
        };
        await writeJsonFile('archive.json', archive);
        res.json(archive[index]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update archive entry' });
    }
});

app.delete('/api/archive/:id', async (req, res) => {
    try {
        const archive = await readJsonFile('archive.json');
        const filtered = archive.filter(a => a.id !== req.params.id);
        await writeJsonFile('archive.json', filtered);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete archive entry' });
    }
});

// Competitors API
app.get('/api/competitors', async (req, res) => {
    try {
        const competitors = await readJsonFile('competitors.json');
        res.json(competitors);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read competitors' });
    }
});

app.post('/api/competitors', async (req, res) => {
    try {
        const competitors = await readJsonFile('competitors.json');
        const newCompetitor = {
            id: Date.now().toString(),
            ...req.body,
            addedAt: new Date().toISOString()
        };
        competitors.push(newCompetitor);
        await writeJsonFile('competitors.json', competitors);
        res.json(newCompetitor);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add competitor article' });
    }
});

app.delete('/api/competitors/:id', async (req, res) => {
    try {
        const competitors = await readJsonFile('competitors.json');
        const filtered = competitors.filter(c => c.id !== req.params.id);
        await writeJsonFile('competitors.json', filtered);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete competitor article' });
    }
});

// Export endpoints
app.get('/api/export/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const validTypes = ['stories', 'team', 'ooo', 'blocked-dates', 'archive', 'competitors'];

        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: 'Invalid export type' });
        }

        const data = await readJsonFile(`${type}.json`);

        if (data.length === 0) {
            return res.status(200).send('No data to export');
        }

        // Convert to CSV
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];

        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header];
                if (value === null || value === undefined) return '';
                const stringValue = String(value);
                // Escape quotes and wrap in quotes if contains comma, quote, or newline
                if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                    return `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
            });
            csvRows.push(values.join(','));
        }

        const csv = csvRows.join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${type}-export-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
    } catch (error) {
        res.status(500).json({ error: 'Failed to export data' });
    }
});

// Statistics endpoint
app.get('/api/stats', async (req, res) => {
    try {
        const stories = await readJsonFile('stories.json');
        const archive = await readJsonFile('archive.json');

        // Count published stories by brand
        const publishedByBrand = {};
        const allStories = [...stories, ...archive];

        for (const story of allStories) {
            if (story.status === 'published' || story.productionDate) {
                const brand = story.brand || 'Unknown';
                publishedByBrand[brand] = (publishedByBrand[brand] || 0) + 1;
            }
        }

        res.json({
            totalStories: stories.length,
            totalArchived: archive.length,
            publishedByBrand
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// Start server
async function start() {
    await ensureDataDir();
    await initializeDataFiles();

    app.listen(PORT, () => {
        console.log(`Editorial Dashboard running at http://localhost:${PORT}`);
    });
}

start();
