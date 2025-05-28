document.addEventListener('DOMContentLoaded', () => {
    // DOM Element Constants
    const settingsApiKeyInput = document.getElementById('settingsApiKeyInput');
    const settingsSaveApiKeyBtn = document.getElementById('settingsSaveApiKeyBtn');
    const settingsApiKeyMessages = document.getElementById('settingsApiKeyMessages');
    const ipInput = document.getElementById('ipInput');
    const charCountEl = document.getElementById('charCount');
    const scanBtn = document.getElementById('scanBtn');
    const loadingEl = document.getElementById('loading');
    const resultsContainer = document.getElementById('resultsContainer');
    const apiStatusMessagesScan = document.getElementById('apiStatusMessagesScan');

    const historySectionFull = document.getElementById('historySectionFull');
    const scanHistoryTableBody = document.getElementById('scanHistoryTableBody');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const historySearchInput = document.getElementById('historySearchInput');
    const noHistoryMessage = document.getElementById('noHistoryMessage');
    
    const maxHistoryItemsInput = document.getElementById('maxHistoryItemsInput');
    const saveHistorySettingsBtn = document.getElementById('saveHistorySettingsBtn');
    const historySettingsMessages = document.getElementById('historySettingsMessages');

    const apiCreditsModal = document.getElementById('apiCreditsModal');
    const viewApiCreditsBtn = document.getElementById('viewApiCreditsBtn');
    const closeApiStatusModalBtn = document.getElementById('closeApiStatusModalBtn');
    const modalCreditsRemainedEl = document.getElementById('modalCreditsRemained');
    const modalEstimatedQueriesEl = document.getElementById('modalEstimatedQueries');
    const modalElapsedTimeEl = document.getElementById('modalElapsedTime');

    const mapViewModal = document.getElementById('mapViewModal');
    const closeMapModalBtn = document.getElementById('closeMapModalBtn');
    const leafletMapDiv = document.getElementById('leafletMap');
    let mapInstance = null;

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const sidenav = document.getElementById('sidenav');
    const sidenavToggleBtn = document.getElementById('sidenavToggleBtn');
    const mainContent = document.getElementById('mainContent');
    const sidenavLinks = document.querySelectorAll('.sidenav-menu .nav-link');
    const contentSections = document.querySelectorAll('.main-content .content-section');

    // Global State
    let globalApiCredits = 'N/A';
    let globalEstimatedQueries = 'N/A';
    let globalElapsedTime = 'N/A';
    let MAX_HISTORY_ITEMS = parseInt(localStorage.getItem('maxHistoryItems')) || 15;
    if(maxHistoryItemsInput) maxHistoryItemsInput.value = MAX_HISTORY_ITEMS;

    // Tooltip Definitions
    const tooltips = {
        riskScore: "Overall risk assessment score provided by the API (0-100). Higher scores indicate higher risk.",
        detections: "Number of blacklist engines that detected this IP out of the total engines checked.",
        asn: "Autonomous System Number: A unique number identifying a network on the internet. Often indicates the organization owning the IP block.",
        hosting: "Indicates if the IP address belongs to a known hosting provider. Can be legitimate, but also used for malicious activities.",
        isp: "Internet Service Provider that owns or manages this IP address.",
        reverseDns: "Reverse DNS lookup (PTR record) for the IP address. Can provide clues about the server's purpose.",
        anonymous: "Indicates if the IP is associated with anonymity services like VPN, Tor, or Proxies."
    };

    // --- Sidenav Toggle ---
    function toggleSidenav() {
        if (!sidenav || !mainContent || !sidenavToggleBtn) return;
        sidenav.classList.toggle('collapsed');
        mainContent.classList.toggle('sidenav-collapsed'); 
        localStorage.setItem('sidenavCollapsed', sidenav.classList.contains('collapsed'));
        
        const icon = sidenavToggleBtn.querySelector('i');
        if (sidenav.classList.contains('collapsed')) {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
            sidenavToggleBtn.setAttribute('aria-expanded', 'false');
            sidenavToggleBtn.setAttribute('aria-label', 'Expand Sidenav');
        } else {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
            sidenavToggleBtn.setAttribute('aria-expanded', 'true');
            sidenavToggleBtn.setAttribute('aria-label', 'Collapse Sidenav');
        }
    }

    if (sidenavToggleBtn) {
        sidenavToggleBtn.addEventListener('click', toggleSidenav);
    }

    // --- Navigation / Routing ---
    function setActiveSection(targetId) {
        contentSections.forEach(section => {
            section.classList.remove('active');
            if (section.id === targetId) {
                section.classList.add('active');
            }
        });
        sidenavLinks.forEach(link => {
            link.classList.remove('active');
            link.setAttribute('aria-current', 'false');
            if (link.dataset.target === targetId) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
            }
        });
        localStorage.setItem('activeSection', targetId); 
    }

    sidenavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = e.currentTarget.dataset.target;
            setActiveSection(targetId);
            if (targetId === 'historySectionFull' && typeof loadScanHistory === 'function') {
                loadScanHistory(historySearchInput ? historySearchInput.value : '');
            }
            // Optionally collapse sidenav on mobile after click if it's not already collapsed
            if (window.innerWidth < 769 && !sidenav.classList.contains('collapsed')) {
                // toggleSidenav(); // Uncomment if you want this behavior
            }
        });
    });

    // --- Theme Management ---
    function applyTheme(theme) {
        const themeLabel = sidenav.querySelector('.theme-switcher-container-sidenav .nav-text-label');
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
            themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
            if (themeLabel) themeLabel.textContent = 'Light Mode';
            themeToggleBtn.setAttribute('aria-label', 'Switch to Light Mode');
        } else {
            document.body.classList.add('light-mode');
            document.body.classList.remove('dark-mode');
            themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
            if (themeLabel) themeLabel.textContent = 'Dark Mode';
            themeToggleBtn.setAttribute('aria-label', 'Switch to Dark Mode');
        }
         // Re-append the span if it was removed or if it's not there
        if (themeLabel && !themeToggleBtn.querySelector('.nav-text-label')) {
            themeToggleBtn.appendChild(themeLabel);
        }
    }

    function toggleTheme() {
        const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    }

    if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);

    // --- API Key Management ---
    function loadApiKey() {
        const savedKey = localStorage.getItem('apivoid_api_key');
        if (settingsApiKeyInput && savedKey) { 
            settingsApiKeyInput.value = savedKey;
            showMessage('info', 'API Key loaded from Local Storage.', settingsApiKeyMessages, 3000);
        }
    }

    if (settingsSaveApiKeyBtn) { 
        settingsSaveApiKeyBtn.addEventListener('click', () => {
            const keyToSave = settingsApiKeyInput.value.trim();
            if (keyToSave) {
                localStorage.setItem('apivoid_api_key', keyToSave);
                showMessage('success', 'API Key saved successfully!', settingsApiKeyMessages, 3000);
            } else {
                localStorage.removeItem('apivoid_api_key');
                showMessage('warning', 'API Key field is empty. Key removed from storage.', settingsApiKeyMessages, 3000);
            }
        });
    }
    
    // --- History Settings ---
    if (saveHistorySettingsBtn) {
        saveHistorySettingsBtn.addEventListener('click', () => {
            const newMax = parseInt(maxHistoryItemsInput.value);
            if (newMax >= 10 && newMax <= 100) {
                MAX_HISTORY_ITEMS = newMax;
                localStorage.setItem('maxHistoryItems', MAX_HISTORY_ITEMS.toString());
                showMessage('success', `Max history items set to ${MAX_HISTORY_ITEMS}.`, historySettingsMessages, 3000);
                if(typeof loadScanHistory === 'function') loadScanHistory(historySearchInput ? historySearchInput.value : ''); 
            } else {
                showMessage('error', 'Max history items must be between 10 and 100.', historySettingsMessages, 3000);
                maxHistoryItemsInput.value = MAX_HISTORY_ITEMS; 
            }
        });
    }

    // --- History Management ---
    function loadScanHistory(searchTerm = '') {
        const history = JSON.parse(localStorage.getItem('ipScanHistory')) || [];
        if (!scanHistoryTableBody) return; 

        scanHistoryTableBody.innerHTML = '';
        const filteredHistory = history.filter(item => 
            item.ip.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (filteredHistory.length > 0) {
            if(noHistoryMessage) noHistoryMessage.style.display = 'none';
            filteredHistory.slice().reverse().forEach(item => addHistoryItemToTable(item)); 
        } else {
            if(noHistoryMessage) {
                noHistoryMessage.style.display = 'block';
                if (searchTerm) {
                    noHistoryMessage.innerHTML = `<i class="fas fa-search"></i> No history items match your search for "${searchTerm}".`;
                } else {
                    noHistoryMessage.innerHTML = `<i class="fas fa-info-circle"></i> No scan history available.`;
                }
            }
        }
    }

    function addScanToHistory(ip, riskScore, detections) {
        let history = JSON.parse(localStorage.getItem('ipScanHistory')) || [];
        const now = new Date();
        const newEntry = {
            id: now.getTime(), 
            ip,
            riskScore: riskScore !== null ? riskScore : 'N/A',
            detections,
            date: now.toLocaleString()
        };
        
        const existingEntryIndex = history.findIndex(item => item.ip === ip);
        if (existingEntryIndex > -1) {
            history.splice(existingEntryIndex, 1); 
        }
        history.push(newEntry); 
        while (history.length > MAX_HISTORY_ITEMS) {
            history.shift(); 
        }
        localStorage.setItem('ipScanHistory', JSON.stringify(history));
        if (document.getElementById('historySectionFull')?.classList.contains('active')) {
            loadScanHistory(historySearchInput ? historySearchInput.value : '');
        }
    }
            
    function addHistoryItemToTable(item) {
        if (!scanHistoryTableBody) return;
        const row = scanHistoryTableBody.insertRow();
        row.innerHTML = `
            <td><span class="ip">${item.ip}</span></td>
            <td>${item.riskScore}</td>
            <td>${item.detections}</td>
            <td>${item.date}</td>
            <td class="actions-cell">
                <button class="btn btn-secondary btn-small rescan-history-btn" data-ip="${item.ip}" aria-label="Re-scan IP ${item.ip}"><i class="fas fa-redo"></i> Re-scan</button>
                <button class="btn btn-secondary btn-small delete-history-item-btn" data-id="${item.id}" style="background-color:var(--message-error-border);" aria-label="Delete history item for IP ${item.ip}"><i class="fas fa-times"></i></button>
            </td>
        `;
        const rescanBtn = row.querySelector('.rescan-history-btn');
        if (rescanBtn) {
            rescanBtn.addEventListener('click', function() {
                if (ipInput) { 
                    ipInput.value = this.dataset.ip + '\n';
                    ipInput.focus();
                    ipInput.dispatchEvent(new Event('input'));
                    setActiveSection('scanSection'); 
                }
            });
        }
        const deleteBtn = row.querySelector('.delete-history-item-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function() {
                deleteHistoryItem(parseInt(this.dataset.id));
            });
        }
    }

    function deleteHistoryItem(itemId) {
        let history = JSON.parse(localStorage.getItem('ipScanHistory')) || [];
        history = history.filter(item => item.id !== itemId);
        localStorage.setItem('ipScanHistory', JSON.stringify(history));
        loadScanHistory(historySearchInput ? historySearchInput.value : ''); 
    }

    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear ALL scan history? This cannot be undone.')) {
                localStorage.removeItem('ipScanHistory');
                loadScanHistory();
            }
        });
    }
    if (historySearchInput) {
        historySearchInput.addEventListener('input', (e) => {
            loadScanHistory(e.target.value);
        });
    }

    // --- Modal Management (API Status & Map) ---
    if (viewApiCreditsBtn) {
        viewApiCreditsBtn.addEventListener('click', () => {
            modalCreditsRemainedEl.textContent = globalApiCredits;
            modalEstimatedQueriesEl.textContent = globalEstimatedQueries;
            modalElapsedTimeEl.textContent = globalElapsedTime + (globalElapsedTime !== 'N/A' ? ' sec(s)' : '');
            apiCreditsModal.style.display = 'flex';
        });
    }
    if (closeApiStatusModalBtn) closeApiStatusModalBtn.addEventListener('click', () => { apiCreditsModal.style.display = 'none'; });
            
    function openMapModal(lat, lon, ipAddress) {
        if (!mapViewModal || !leafletMapDiv) return;
        mapViewModal.style.display = 'flex';
        const mapTitle = mapViewModal.querySelector('.modal-header h2');
        if (mapTitle) mapTitle.innerHTML = `<i class="fas fa-map-marked-alt"></i> Geolocation for ${ipAddress}`;
        
        setTimeout(() => {
            if (mapInstance) { mapInstance.remove(); }
            mapInstance = L.map(leafletMapDiv).setView([lat, lon], 10); 
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(mapInstance);
            L.marker([lat, lon]).addTo(mapInstance).bindPopup(`<b>IP:</b> ${ipAddress}<br><b>Coords:</b> ${lat.toFixed(4)}, ${lon.toFixed(4)}`).openPopup();
            mapInstance.invalidateSize();
        }, 100); 
    }
    if (closeMapModalBtn) closeMapModalBtn.addEventListener('click', () => { mapViewModal.style.display = 'none'; });
    
    window.addEventListener('click', (event) => { 
        if (event.target === apiCreditsModal) apiCreditsModal.style.display = 'none'; 
        if (event.target === mapViewModal) mapViewModal.style.display = 'none'; 
    });

    // --- Core Logic (Scan Page) ---
    if (ipInput) {
        ipInput.addEventListener('input', function() {
            if(charCountEl) charCountEl.textContent = this.value.length;
            this.style.height = 'auto';
            this.style.height = Math.max(110, this.scrollHeight) + 'px';
        });
    }
    if (scanBtn) scanBtn.addEventListener('click', scanIPs);

    function validateIP(ip) {
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipRegex.test(ip.trim());
    }
    function isPrivateIP(ip) {
        const parts = ip.split('.').map(Number);
        return ( (parts[0] === 10) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168) || (parts[0] === 127) );
    }
    async function fetchIPReputation(ip, apiKey) {
        if (!apiKey) { 
            const savedKey = localStorage.getItem('apivoid_api_key');
            if (!savedKey) throw new Error("APIVoid API Key is missing. Please set it in Settings.");
            apiKey = savedKey;
        }
        const url = `https://endpoint.apivoid.com/iprep/v1/pay-as-you-go/?key=${apiKey}&ip=${ip}`;
        try {
            const response = await fetch(url);
            const responseData = await response.json();
            if (!response.ok) throw new Error(responseData.error || `API request failed: ${response.status} ${response.statusText}`);
            if (responseData.success === false) throw new Error(responseData.error || "API returned an unspecified error.");
            return responseData; 
        } catch (error) { console.error(`Error fetching for ${ip}:`, error); throw error; }
    }
    function transformApiData(apiResponse) {
        const report = apiResponse?.data?.report;
        if (!report) return { error: 'Malformed API response or no report data.' };
        const info = report.information || {}; const anonymity = report.anonymity || {};
        const blacklists = report.blacklists || {}; const riskScoreData = report.risk_score || {};
        let detectingEnginesList = [];
        if (blacklists.engines && typeof blacklists.engines === 'object') { detectingEnginesList = Object.values(blacklists.engines).filter(engine => engine.detected === true).map(engine => ({ name: engine.engine, reference: engine.reference })); }
        return {
            ip: report.ip, detections: blacklists.detections || 0, engines_count: blacklists.engines_count || 0,
            country: info.country_name || 'N/A', country_code: (info.country_code || 'xx').toLowerCase(),
            latitude: info.latitude !== undefined ? parseFloat(info.latitude) : null, longitude: info.longitude !== undefined ? parseFloat(info.longitude) : null,
            isp: info.isp || 'N/A', reverse_dns: info.reverse_dns || 'N/A', asn: info.asn || 'N/A',
            region: info.region_name || 'N/A', city: info.city_name || 'N/A',
            is_proxy: anonymity.is_proxy || false, is_tor: anonymity.is_tor || false, is_vpn: anonymity.is_vpn || false,
            is_webproxy: anonymity.is_web_proxy || false, is_hosting: anonymity.is_hosting || false, is_icloud_relay: anonymity.is_icloud_relay || false,
            risk_score: riskScoreData.result !== undefined ? riskScoreData.result : null, detecting_engines: detectingEnginesList
        };
    }

    async function scanIPs() {
        const currentApiKey = localStorage.getItem('apivoid_api_key'); 
        if (!currentApiKey) { 
            showMessage('error', 'APIVoid API Key is not set. Please set it in the Settings page.', apiStatusMessagesScan); 
            setActiveSection('settingsSection'); 
            if(settingsApiKeyInput) settingsApiKeyInput.focus(); // Focus on API key input in settings
            return; 
        }
        if (!ipInput || !resultsContainer || !loadingEl || !scanBtn) return; // Ensure scan page elements are present

        const inputText = ipInput.value.trim();
        if (apiStatusMessagesScan) apiStatusMessagesScan.innerHTML = ''; 
        resultsContainer.innerHTML = ''; 
        if (!inputText) { showMessage('warning', 'Please enter at least one IP address.', resultsContainer); return; }
        const ips = inputText.split('\n').map(ip => ip.trim()).filter(ip => ip);
        if (ips.length === 0) { showMessage('warning', 'Please enter valid IP addresses.', resultsContainer); return; }
        if (ips.length > 10) { showMessage('error', 'Maximum 10 IP addresses allowed.', resultsContainer); return; }
        const validIPs = []; const validationErrors = [];
        ips.forEach(ip => { if (!validateIP(ip)) validationErrors.push(`Invalid IP format: ${ip}`); else if (isPrivateIP(ip)) validationErrors.push(`Private/Local IP skipped: ${ip}`); else validIPs.push(ip); });
        validationErrors.forEach(error => { resultsContainer.innerHTML += `<div class="message-box warning-message"><i class="fas fa-exclamation-triangle"></i> ${error}</div>`; });
        if (validIPs.length === 0) { return; }
        scanBtn.disabled = true; loadingEl.style.display = 'block';
        const allResultsData = []; let firstApiCallDone = false;

        for (let i = 0; i < validIPs.length; i++) {
            const ip = validIPs[i]; 
            try {
                if (i > 0) await new Promise(resolve => setTimeout(resolve, 250));
                const rawResponse = await fetchIPReputation(ip, currentApiKey); 
                if (!firstApiCallDone) { 
                    globalApiCredits = rawResponse.credits_remained !== undefined ? rawResponse.credits_remained : 'N/A';
                    globalEstimatedQueries = rawResponse.estimated_queries || 'N/A'; 
                    globalElapsedTime = rawResponse.elapsed_time || 'N/A';
                    firstApiCallDone = true; 
                    if (apiStatusMessagesScan) showMessage('info', `API Credits Remained: ${globalApiCredits}. Click 'View API Status'.`, apiStatusMessagesScan, 7000);
                } else { if (rawResponse.elapsed_time) globalElapsedTime = rawResponse.elapsed_time; }
                
                const transformedData = transformApiData(rawResponse);
                allResultsData.push({ ipForDisplay: transformedData.ip || ip, data: transformedData, rawResponse });
                if (transformedData.error) { allResultsData[allResultsData.length-1].error = transformedData.error; }
                else { addScanToHistory(transformedData.ip || ip, transformedData.risk_score, transformedData.detections); }
            } catch (error) { 
                allResultsData.push({ ipForDisplay: ip, error: error.message || 'Failed to fetch data.', rawResponse: { error: error.message } });
                if (error.message && (error.message.toLowerCase().includes("invalid api key") || error.message.toLowerCase().includes("authentication failed"))) {
                    if (apiStatusMessagesScan) showMessage('error', `API Key Error: ${error.message}. Check Settings.`, apiStatusMessagesScan);
                    loadingEl.style.display = 'none'; scanBtn.disabled = false; 
                    setActiveSection('settingsSection'); 
                    if(settingsApiKeyInput) settingsApiKeyInput.focus();
                    return;
                }
            }
        }
        loadingEl.style.display = 'none'; scanBtn.disabled = false;
        if (resultsContainer) displayResults(allResultsData);
    }
            
    function getRiskScoreLabelAndClass(score) {
        if (score === null || score === undefined) return { label: 'N/A', className: 'risk-unknown' };
        if (score <= 30) return { label: 'Low Risk', className: 'risk-low' };
        if (score <= 70) return { label: 'Medium Risk', className: 'risk-medium' };
        return { label: 'High Risk', className: 'risk-high' };
    }

    function createTooltipIcon(tooltipKey) {
        if (tooltips[tooltipKey]) { return `<i class="fas fa-info-circle tooltip-icon"><span class="tooltip-text">${tooltips[tooltipKey]}</span></i>`; } return '';
    }

    function displayResults(results) {
        if (!resultsContainer) return; 
        let htmlContent = ''; // Build all HTML here then set innerHTML once
        const successfulResults = results.filter(r => r.data && !r.data.error);

        if (successfulResults.length > 0) { 
            const safeCount = successfulResults.filter(r => r.data.detections === 0 && (r.data.risk_score === null || r.data.risk_score <= 30)).length; 
            const dangerousCount = successfulResults.filter(r => r.data.detections >= 5 || (r.data.risk_score !== null && r.data.risk_score > 70)).length; 
            const suspiciousCount = successfulResults.length - safeCount - dangerousCount;
            htmlContent += `
                <div class="stats-summary fade-in">
                    <div class="stat-item"><span class="stat-number">${successfulResults.length}</span><div class="stat-label">Scanned</div></div>
                    <div class="stat-item"><span class="stat-number" style="color: var(--risk-low-color)">${safeCount}</span><div class="stat-label">Low Risk / Clean</div></div>
                    <div class="stat-item"><span class="stat-number" style="color: var(--risk-medium-color)">${suspiciousCount}</span><div class="stat-label">Medium Risk / Susp.</div></div>
                    <div class="stat-item"><span class="stat-number" style="color: var(--risk-high-color)">${dangerousCount}</span><div class="stat-label">High Risk / Danger.</div></div>
                </div>`;
        } else if (results.every(r => r.error) && results.length > 0) { 
            htmlContent += `<div class="message-box error-message"><i class="fas fa-exclamation-circle"></i> All API requests failed. Check individual errors below or API key.</div>`;
        }

        results.forEach((result, index) => {
            const { ipForDisplay, data, error, rawResponse } = result;
            const cardId = `result-card-${index}`; const jsonContainerId = `json-container-${index}`; const enginesContainerId = `engines-container-${index}`;
            if (error) { 
                htmlContent += `<div class="result-card error fade-in" style="animation-delay: ${index * 0.1}s"><div class="result-header"><div class="ip-address">${ipForDisplay}</div><div class="status-badge status-error">Error</div></div><div class="result-body"> <p><strong>Error:</strong> ${error}</p> <button class="btn btn-secondary btn-small toggle-content-btn" data-target="${jsonContainerId}"><i class="fas fa-code"></i> Raw JSON</button> <div class="raw-json-container" id="${jsonContainerId}">${JSON.stringify(rawResponse || {error: "No raw response available"}, null, 2)}</div> </div></div>`; return; 
            }
            let statusClass, statusText, cardClass; const riskInfo = getRiskScoreLabelAndClass(data.risk_score);
            if (data.risk_score !== null && data.risk_score > 70 || data.detections >=5) { statusClass = 'status-danger'; statusText = 'High Risk'; cardClass = 'danger'; } 
            else if (data.risk_score !== null && data.risk_score > 30 || data.detections > 0) { statusClass = 'status-warning'; statusText = 'Medium Risk'; cardClass = 'warning'; } 
            else { statusClass = 'status-safe'; statusText = 'Low Risk'; cardClass = 'safe'; }
            const detectionPercentage = data.engines_count > 0 ? (data.detections / data.engines_count) * 100 : 0; 
            let meterClass = 'detection-safe'; if (detectionPercentage >= 10 && detectionPercentage < 30) meterClass = 'detection-warning'; if (detectionPercentage >= 30) meterClass = 'detection-danger';
            const isGenerallyAnonymous = data.is_proxy || data.is_tor || data.is_vpn || data.is_webproxy || data.is_icloud_relay; 
            let anonymityDetailsHtml = [data.is_proxy && "Proxy", data.is_webproxy && "Web Proxy", data.is_vpn && "VPN", data.is_tor && "Tor", data.is_icloud_relay && "iCloud Relay"].filter(Boolean).map(d => `<span>${d}</span>`).join('');
            let detectingEnginesHtml = '<ul>'; if (data.detecting_engines && data.detecting_engines.length > 0) { data.detecting_engines.forEach(engine => { detectingEnginesHtml += `<li><strong>${engine.name}</strong> ${engine.reference ? `(<a href="${engine.reference}" target="_blank" rel="noopener noreferrer">ref</a>)` : ''}</li>`; }); } else { detectingEnginesHtml += '<li>No specific engines reported detections.</li>'; } detectingEnginesHtml += '</ul>';
            let mapButtonHtml = ''; if (data.latitude !== null && data.longitude !== null) { mapButtonHtml = `<button class="btn-map open-map-btn" data-lat="${data.latitude}" data-lon="${data.longitude}" data-ip="${ipForDisplay}"><i class="fas fa-map-marker-alt"></i> View on Map</button>`; }
            const detailsToCopy = `IP Address: ${ipForDisplay}\nRisk Score: ${data.risk_score !== null ? data.risk_score : 'N/A'} (${riskInfo.label})\nDetections: ${data.detections}/${data.engines_count > 0 ? data.engines_count : 'N/A'}\nCountry: ${data.country}\nISP: ${data.isp}\nASN: ${data.asn}\nAnonymous: ${isGenerallyAnonymous ? 'Yes' : 'No'}${anonymityDetailsHtml ? ' ('+anonymityDetailsHtml.replace(/<\/?span>/g, '')+')' : ''}\nHosting: ${data.is_hosting ? 'Yes' : 'No'}`;
            htmlContent += `<div class="result-card ${cardClass} fade-in" id="${cardId}" style="animation-delay: ${index * 0.1}s"><div class="result-header"> <div class="ip-address">${ipForDisplay}</div> <div class="status-badge ${statusClass}">${statusText}</div> </div><div class="result-body"><div class="info-grid"><div class="info-item"><i class="fas fa-tachometer-alt info-icon"></i><div class="info-label">Risk Score ${createTooltipIcon('riskScore')}:</div><div class="info-value"><span class="risk-score-value ${riskInfo.className}">${data.risk_score !== null ? data.risk_score : 'N/A'}</span> (${riskInfo.label})</div></div><div class="info-item"><i class="fas fa-chart-bar info-icon"></i><div class="info-label">Blacklists ${createTooltipIcon('detections')}:</div><div class="info-value">${data.detections}/${data.engines_count > 0 ? data.engines_count : 'N/A'} Detections ${data.engines_count > 0 ? `<div class="detection-meter"><div class="detection-fill ${meterClass}" style="width: ${Math.max(detectionPercentage, 2)}%"></div></div>` : ''}</div></div><div class="info-item"><i class="fas fa-globe info-icon"></i><div class="info-label">Location:</div><div class="info-value">${data.country_code !== 'xx' ? `<img src="https://flagcdn.com/${data.country_code}.svg" alt="${data.country}" class="flag" style="margin-right:5px;">` : ''} ${data.city ? data.city + ', ' : ''}${data.region ? data.region + ', ' : ''}${data.country} ${mapButtonHtml}</div></div><div class="info-item"><i class="fas fa-building info-icon"></i><div class="info-label">ISP ${createTooltipIcon('isp')}:</div><div class="info-value">${data.isp}</div></div><div class="info-item"><i class="fas fa-server info-icon"></i><div class="info-label">Reverse DNS ${createTooltipIcon('reverseDns')}:</div><div class="info-value">${data.reverse_dns || 'N/A'}</div></div><div class="info-item"><i class="fas fa-network-wired info-icon"></i><div class="info-label">ASN ${createTooltipIcon('asn')}:</div><div class="info-value">${data.asn}</div></div><div class="info-item"><i class="fas fa-${isGenerallyAnonymous ? 'user-secret' : 'user'} info-icon"></i><div class="info-label">Anonymous ${createTooltipIcon('anonymous')}:</div><div class="info-value">${isGenerallyAnonymous ? 'Yes' : 'No'} ${anonymityDetailsHtml ? `<span class="anonymity-details">${anonymityDetailsHtml}</span>` : ''}</div></div><div class="info-item"><i class="fas fa-shield-virus info-icon"></i><div class="info-label">Hosting ${createTooltipIcon('hosting')}:</div><div class="info-value">${data.is_hosting ? 'Yes' : 'No'}</div></div></div><div style="margin-top:15px; display:flex; gap:10px; flex-wrap:wrap;"><button class="btn btn-secondary btn-small toggle-content-btn" data-target="${jsonContainerId}"><i class="fas fa-code"></i> Raw JSON</button>${data.detections > 0 ? `<button class="btn btn-secondary btn-small toggle-content-btn" data-target="${enginesContainerId}"><i class="fas fa-eye"></i> Engines (${data.detecting_engines.length})</button>` : ''}<button class="btn btn-secondary btn-small copy-details-btn" data-details="${encodeURIComponent(detailsToCopy)}"><i class="fas fa-copy"></i> Copy Details</button></div><div class="raw-json-container" id="${jsonContainerId}">${JSON.stringify(rawResponse, null, 2)}</div>${data.detections > 0 ? `<div class="detecting-engines-container" id="${enginesContainerId}">${detectingEnginesHtml}</div>` : ''}</div></div>`;
        });
        resultsContainer.innerHTML += htmlContent; 
        document.querySelectorAll('.toggle-content-btn').forEach(button => { button.addEventListener('click', function() { const targetId = this.dataset.target; const contentContainer = document.getElementById(targetId); if (contentContainer) { contentContainer.style.display = contentContainer.style.display === 'none' || contentContainer.style.display === '' ? 'block' : 'none'; } }); });
        document.querySelectorAll('.open-map-btn').forEach(button => { button.addEventListener('click', function() { const lat = parseFloat(this.dataset.lat); const lon = parseFloat(this.dataset.lon); const ip = this.dataset.ip; if (!isNaN(lat) && !isNaN(lon)) { openMapModal(lat, lon, ip); } else { console.error("Invalid coordinates for map:", this.dataset.lat, this.dataset.lon); showMessage('error', 'Invalid coordinates, cannot display map.', apiStatusMessagesScan, 3000); } }); });
        document.querySelectorAll('.copy-details-btn').forEach(button => { button.addEventListener('click', function() { const details = decodeURIComponent(this.dataset.details); navigator.clipboard.writeText(details).then(() => { const originalText = this.innerHTML; this.innerHTML = '<i class="fas fa-check"></i> Copied!'; this.disabled = true; setTimeout(() => { this.innerHTML = originalText; this.disabled = false; }, 2000); }).catch(err => { console.error('Failed to copy details: ', err); showMessage('error', 'Failed to copy details.', apiStatusMessagesScan, 3000); }); }); });
    }
            
    function showMessage(type, message, container, autoDismissDelay = 0) { 
        if (!container) { console.warn("showMessage: container not found for message:", message); return; }
        let iconClass = 'fa-info-circle'; if (type === 'error') iconClass = 'fa-exclamation-circle'; else if (type === 'warning') iconClass = 'fa-exclamation-triangle'; else if (type === 'success') iconClass = 'fa-check-circle';
        const messageDiv = document.createElement('div'); messageDiv.className = `message-box ${type}-message fade-in`; messageDiv.innerHTML = `<i class="fas ${iconClass}"></i> ${message}`;
        container.innerHTML = ''; container.appendChild(messageDiv);
        if (autoDismissDelay > 0) { setTimeout(() => { if (messageDiv.parentNode === container) { messageDiv.style.opacity = '0'; setTimeout(() => { if(messageDiv.parentNode === container) container.innerHTML = ''; }, 500); } }, autoDismissDelay); }
    }

    // Initial load
    const preferredTheme = localStorage.getItem('theme') || 'light'; applyTheme(preferredTheme);
    const savedActiveSection = localStorage.getItem('activeSection') || 'scanSection'; setActiveSection(savedActiveSection);
    const sidenavCollapsed = localStorage.getItem('sidenavCollapsed') === 'true';
    if (sidenav && mainContent && sidenavToggleBtn) { // Ensure elements exist before manipulating
        if (sidenavCollapsed) { 
            sidenav.classList.add('collapsed'); 
            mainContent.classList.add('sidenav-collapsed'); 
            const icon = sidenavToggleBtn.querySelector('i'); 
            if(icon) { icon.classList.remove('fa-times'); icon.classList.add('fa-bars'); }
            sidenavToggleBtn.setAttribute('aria-expanded', 'false');
            sidenavToggleBtn.setAttribute('aria-label', 'Expand Sidenav');
        } else { 
            const icon = sidenavToggleBtn.querySelector('i'); 
            if(icon) { icon.classList.remove('fa-bars'); icon.classList.add('fa-times'); }
            sidenavToggleBtn.setAttribute('aria-expanded', 'true');
            sidenavToggleBtn.setAttribute('aria-label', 'Collapse Sidenav');
        }
    }
    
    loadApiKey(); 
    if (savedActiveSection === 'historySectionFull' && typeof loadScanHistory === 'function') { loadScanHistory(); }
    if (ipInput) ipInput.dispatchEvent(new Event('input')); 
});
