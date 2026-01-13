# Editorial Dashboard

A web application for managing content team editorial workflows, story tracking, and competitive analysis.

## Features

### 1. Content Calendar View
- Weekly, monthly, and quarterly calendar views
- Track stories with fields:
  - Study name (story title)
  - Brand (LawnStarter, Lawn Love, Home Gnome)
  - Pitch Date
  - News Peg/Holiday tie-in
  - Analysis Due By, Draft Due By, Edits Due By, QA Due By
  - Production Date
  - Writer assigned
  - Number of Experts Contacted
  - Notes/Blockers
  - URLs: Research, Methodology, Official Analysis, Published Story

### 2. Team OOO Tracker
- Visual calendar showing team member availability
- Track start/end dates and reasons for time off

### 3. Blocked Dates
- Manage dates when pitching is blocked (holidays, election days, etc.)
- Support for recurring annual dates

### 4. Running Totals
- Track published story counts by brand
- Visual bar chart for brand comparison

### 5. Story Archive
- Archive past/refreshed stories
- Track link counts and Google Analytics pageviews
- Store feedback notes from previous runs

### 6. Competitor Article Log
- Paste competitor article URLs
- Automatic publication date extraction from URLs
- Track competitive landscape

### Data Export
All data can be exported to CSV format.

## Installation

```bash
npm install
```

## Running the Application

```bash
npm start
```

The application will be available at `http://localhost:3000`

## Data Storage

All data is stored in JSON files in the `/data` directory:
- `stories.json` - Active stories
- `team.json` - Team members
- `ooo.json` - Out of office entries
- `blocked-dates.json` - Blocked pitch dates
- `archive.json` - Archived stories with metrics
- `competitors.json` - Competitor article log

## Tech Stack

- **Backend**: Node.js with Express
- **Frontend**: Vanilla JavaScript
- **Styling**: CSS3 with CSS Variables
- **Data**: JSON file storage
