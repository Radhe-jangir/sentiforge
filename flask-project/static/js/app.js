// SentiMind Front-end client controller logic

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const sentimentForm = document.getElementById('sentimentForm');
    const inputText = document.getElementById('inputText');
    const charCount = document.getElementById('charCount');
    const clearTextBtn = document.getElementById('clearTextBtn');
    
    const analyzeBtn = document.getElementById('analyzeBtn');
    const analyzeIcon = document.getElementById('analyzeIcon');
    const analyzeSpinner = document.getElementById('analyzeSpinner');
    
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    
    // Panel views
    const resultsPlaceholder = document.getElementById('resultsPlaceholder');
    const resultsPanel = document.getElementById('resultsPanel');
    
    // Dynamic output tags
    const sentimentClassification = document.getElementById('sentimentClassification');
    const sentimentEmoji = document.getElementById('sentimentEmoji');
    const sentimentConfidence = document.getElementById('sentimentConfidence');
    const polarityBar = document.getElementById('polarityBar');
    const polarityNum = document.getElementById('polarityNum');
    const subjectivityBar = document.getElementById('subjectivityBar');
    const subjectivityNum = document.getElementById('subjectivityNum');
    const timestampBadge = document.getElementById('timestampBadge');
    
    const positiveWordTags = document.getElementById('positiveWordTags');
    const negativeWordTags = document.getElementById('negativeWordTags');
    const wordClusterList = document.getElementById('wordClusterList');
    
    const totalAnalysesCount = document.getElementById('totalAnalysesCount');
    const avgPolarityScore = document.getElementById('avgPolarityScore');
    const avgSubjectivityScore = document.getElementById('avgSubjectivityScore');
    const historyTableBody = document.getElementById('historyTableBody');
    
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    
    // Chart instances
    let pieChartInstance = null;
    let barChartInstance = null;

    // Current Analysis state cache
    let currentAnalysisResult = null;

    // --- Theme Controller ---
    const initTheme = () => {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeToggleButton(savedTheme);
    };

    const updateThemeToggleButton = (theme) => {
        if (theme === 'dark') {
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun text-warning"></i>';
        } else {
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
    };

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeToggleButton(newTheme);
        
        // Redraw charts with adapted themes if required
        updateChartThemes();
    });

    const updateChartThemes = () => {
        // Option to change grid color or tick fonts based on light/dark mode
        if (pieChartInstance && barChartInstance) {
            // Standard chart updates
        }
    };

    // --- Character Count ---
    inputText.addEventListener('input', () => {
        const textLength = inputText.value.length;
        charCount.textContent = `${textLength} char${textLength !== 1 ? 's' : ''}`;
    });

    clearTextBtn.addEventListener('click', () => {
        inputText.value = '';
        charCount.textContent = '0 chars';
        inputText.focus();
    });

    // --- Analytics Charts Initializer ---
    const initCharts = (historyList) => {
        const ctxPie = document.getElementById('pieChart').getContext('2d');
        const ctxBar = document.getElementById('barChart').getContext('2d');

        // Parse metrics
        let positiveCount = 0;
        let negativeCount = 0;
        let neutralCount = 0;

        const polarityBins = {
            'Very Negative (-1 to -0.6)': 0,
            'Negative (-0.6 to -0.05)': 0,
            'Neutral (-0.05 to 0.05)': 0,
            'Positive (0.05 to 0.6)': 0,
            'Very Positive (0.6 to 1)': 0
        };

        historyList.forEach(item => {
            if (item.classification === 'Positive') positiveCount++;
            else if (item.classification === 'Negative') negativeCount++;
            else neutralCount++;

            const pol = item.polarity;
            if (pol >= 0.6) polarityBins['Very Positive (0.6 to 1)']++;
            else if (pol >= 0.05) polarityBins['Positive (0.05 to 0.6)']++;
            else if (pol > -0.05) polarityBins['Neutral (-0.05 to 0.05)']++;
            else if (pol > -0.6) polarityBins['Negative (-0.6 to -0.05)']++;
            else polarityBins['Very Negative (-1 to -0.6)']++;
        });

        // 1. Pie Chart for Classifications
        if (pieChartInstance) {
            pieChartInstance.destroy();
        }
        pieChartInstance = new Chart(ctxPie, {
            type: 'doughnut',
            data: {
                labels: ['Positive', 'Negative', 'Neutral'],
                datasets: [{
                    data: [positiveCount, negativeCount, neutralCount],
                    backgroundColor: ['#10b981', '#ef4444', '#6b7280'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { family: 'Inter', size: 12 },
                            padding: 15
                        }
                    }
                }
            }
        });

        // 2. Bar Chart for Polarities
        if (barChartInstance) {
            barChartInstance.destroy();
        }
        barChartInstance = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: Object.keys(polarityBins),
                datasets: [{
                    label: 'Statement Volume',
                    data: Object.values(polarityBins),
                    backgroundColor: ['#b91c1c', '#f87171', '#94a3b8', '#60a5fa', '#1d4ed8'],
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1, precision: 0 }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    };

    // --- State & History Loader ---
    const loadSessionHistory = async () => {
        try {
            const response = await fetch('/api/history');
            if (!response.ok) throw new Error('Failed to retrieve sqlite records');
            const history = await response.json();
            
            // Render Analytics Metrics
            totalAnalysesCount.textContent = history.length;
            
            if (history.length > 0) {
                const totalPolNum = history.reduce((acc, curr) => acc + curr.polarity, 0);
                const totalSubNum = history.reduce((acc, curr) => acc + curr.subjectivity, 0);
                
                avgPolarityScore.textContent = (totalPolNum / history.length).toFixed(4);
                avgSubjectivityScore.textContent = (totalSubNum / history.length).toFixed(4);
                
                // Populate Table
                historyTableBody.innerHTML = '';
                history.forEach(item => {
                    const row = document.createElement('tr');
                    
                    let badgeClass = 'bg-secondary';
                    if (item.classification === 'Positive') badgeClass = 'bg-success';
                    else if (item.classification === 'Negative') badgeClass = 'bg-danger';
                    
                    row.innerHTML = `
                        <td class="text-center font-mono text-muted text-sm">${item.id}</td>
                        <td class="text-start text-truncate max-w-250" title="${item.text}">${item.text}</td>
                        <td class="text-center"><span class="badge ${badgeClass} px-2.5 py-1 text-xs fw-medium">${item.classification}</span></td>
                        <td class="text-center font-mono text-sm ${item.polarity > 0 ? 'text-success' : item.polarity < 0 ? 'text-danger' : 'text-muted'}">${item.polarity > 0 ? '+' : ''}${item.polarity.toFixed(4)}</td>
                        <td class="text-center font-mono text-sm text-info">${item.subjectivity.toFixed(4)}</td>
                        <td class="text-center font-mono text-sm fw-medium">${item.confidence.toFixed(1)}%</td>
                        <td class="text-end text-muted text-xs font-mono">${item.timestamp}</td>
                    `;
                    historyTableBody.appendChild(row);
                });
                
                // Initialize/Refresh charts
                initCharts(history);
            } else {
                avgPolarityScore.textContent = '0.0000';
                avgSubjectivityScore.textContent = '0.0000';
                historyTableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center py-4 text-muted">
                            <i class="fa-solid fa-database display-6 d-block mb-2 text-silver"></i>
                            No records saved yet. Provide a statement above to load the SQLite history stream.
                        </td>
                    </tr>
                `;
                
                if (pieChartInstance) pieChartInstance.destroy();
                if (barChartInstance) barChartInstance.destroy();
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
        }
    };

    // --- Form submit analysis ---
    sentimentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const textToAnalyze = inputText.value.trim();
        if (!textToAnalyze) return;
        
        // Show Loading State
        analyzeBtn.disabled = true;
        analyzeIcon.classList.add('d-none');
        analyzeSpinner.classList.remove('d-none');
        
        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: textToAnalyze })
            });

            if(!response.ok) throw new Error('API server failed response.');
            
            const result = await response.json();
            currentAnalysisResult = { ...result, text: textToAnalyze }; // Cache current result state

            // Render output details
            sentimentClassification.textContent = result.classification;
            sentimentEmoji.textContent = result.emoji;
            sentimentConfidence.textContent = `${result.confidence}%`;
            
            // Class card border tint
            const overviewClassCard = document.getElementById('overviewClassCard');
            overviewClassCard.className = 'card shadow-sm overflow-hidden border-top-6';
            if (result.classification === 'Positive') {
                overviewClassCard.classList.add('border-success-polarity');
            } else if (result.classification === 'Negative') {
                overviewClassCard.classList.add('border-danger-polarity');
            } else {
                overviewClassCard.classList.add('border-neutral-polarity');
            }
            
            // Format Polarity rating progress
            // Polarity sits [-1, 1], map to [0, 100] progress logic percentage
            const polPercent = ((result.polarity + 1) / 2) * 100;
            polarityBar.style.width = `${polPercent}%`;
            polarityNum.textContent = `${result.polarity > 0 ? '+' : ''}${result.polarity.toFixed(4)}`;
            if (result.polarity > 0.05) {
                polarityBar.className = 'progress-bar bg-success';
            } else if (result.polarity < -0.05) {
                polarityBar.className = 'progress-bar bg-danger';
            } else {
                polarityBar.className = 'progress-bar bg-secondary';
            }

            // Subjectivity percentage
            const subPercent = result.subjectivity * 100;
            subjectivityBar.style.width = `${subPercent}%`;
            subjectivityNum.textContent = result.subjectivity.toFixed(4);
            
            timestampBadge.textContent = result.timestamp || 'Just now';

            // Highlighting keywords
            positiveWordTags.innerHTML = result.positive_words.length > 0 
                ? result.positive_words.map(w => `<span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 font-mono text-xs">${w.text} (${w.value})</span>`).join('')
                : '<span class="text-muted italic">None</span>';
                
            negativeWordTags.innerHTML = result.negative_words.length > 0 
                ? result.negative_words.map(w => `<span class="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1 font-mono text-xs">${w.text} (${w.value})</span>`).join('')
                : '<span class="text-muted italic">None</span>';

            // Word cluster frequency list
            wordClusterList.innerHTML = result.word_cloud.length > 0
                ? result.word_cloud.map(w => `<span class="badge bg-light text-dark border px-2.5 py-1.5 rounded-pill font-mono" style="font-size: ${Math.max(0.7, Math.min(1.2, 0.7 + (w.value * 0.1)))}rem">${w.text} <b class="text-primary">${w.value}</b></span>`).join('')
                : '<span class="text-muted italic text-xs">No high frequency words</span>';

            // Transition components display
            resultsPlaceholder.classList.add('d-none');
            resultsPanel.classList.remove('d-none');
            
            // Refresh saved logs history table and graphs
            await loadSessionHistory();
            
        } catch (error) {
            alert('Error running sentiment parser api: ' + error.message);
        } finally {
            // Restore button trigger state
            analyzeBtn.disabled = false;
            analyzeIcon.classList.remove('d-none');
            analyzeSpinner.classList.add('d-none');
        }
    });

    // --- Delete database log logs ---
    clearHistoryBtn.addEventListener('click', async () => {
        if (!confirm('Are you absolutely sure you want to delete all historic records from SQLite? This action is irreversible.')) {
            return;
        }
        
        try {
            const response = await fetch('/api/history/clear', { method: 'POST' });
            if (!response.ok) throw new Error('Clear endpoint failed.');
            
            // Reset panel placeholder view
            resultsPanel.classList.add('d-none');
            resultsPlaceholder.classList.remove('d-none');
            currentAnalysisResult = null;
            
            await loadSessionHistory();
        } catch (error) {
            alert('Could not clear logs: ' + error.message);
        }
    });

    // --- PDF Report download trigger ---
    downloadPdfBtn.addEventListener('click', async () => {
        if (!currentAnalysisResult) {
            alert('No active analyzed statement cached.');
            return;
        }
        
        try {
            const response = await fetch('/api/export-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(currentAnalysisResult)
            });
            
            if (!response.ok) throw new Error('PDF render api failed.');
            
            // Trigger blob download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `senti_report_${currentAnalysisResult.id || 'export'}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error) {
            alert('Failed generating PDF output: ' + error.message);
        }
    });

    // Initialize systems
    initTheme();
    loadSessionHistory();
});
