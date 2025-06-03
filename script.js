// Global variables
let rawData = [];
let filteredData = [];
let headers = [];
let editingOperatorOriginalIdentifier = null; 
let allSortedWeeks = []; // To store chronologically sorted unique week strings

const DAY_COLUMNS = ["Lunedi", "Martedi", "Mercoledi", "Giovedi", "Venerdi", "Sabato", "Domenica"];
const DAY_MAP_TO_INDEX = { "Lunedi": 1, "Martedi": 2, "Mercoledi": 3, "Giovedi": 4, "Venerdi": 5, "Sabato": 6, "Domenica": 7 };
const TIME_FORMAT_REGEX = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/; 

// DOM Elements
const csvFileInput = document.getElementById('csvFileInput');
const fileNameDisplay = document.getElementById('fileNameDisplay'); 
const uploadSection = document.getElementById('uploadSection');
const filterSection = document.getElementById('filterSection');

const operatorFilter = document.getElementById('operatorFilter');
const shiftCodeFilter = document.getElementById('shiftCodeFilter'); 
const serviceFilter = document.getElementById('serviceFilter');
const structureFilter = document.getElementById('structureFilter');
const weekFilter = document.getElementById('weekFilter'); // Main global week filter

const applyFiltersButton = document.getElementById('applyFiltersButton');
const resetFiltersButton = document.getElementById('resetFiltersButton');

// Tab Elements
const tabsNavigation = document.getElementById('tabsNavigation');
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');
const tableView = document.getElementById('tableView');
const calendarView = document.getElementById('calendarView');
const operatorManagementView = document.getElementById('operatorManagementView');
const calendarContainer = document.getElementById('calendarContainer');
const calendarDataSection = document.getElementById('calendarDataSection'); 
const noDataMessageCalendar = document.getElementById('noDataMessageCalendar');
const downloadCalendarPdfButton = document.getElementById('downloadCalendarPdfButton');
const calendarWeekFromFilter = document.getElementById('calendarWeekFromFilter');
const calendarWeekToFilter = document.getElementById('calendarWeekToFilter');
 
// Operator Management Elements
const operatorManagementSection = document.getElementById('operatorManagementSection');
const operatorFormTitle = document.getElementById('operatorFormTitle');
const addOperatorForm = document.getElementById('addOperatorForm');
const addOperatorButton = document.getElementById('addOperatorButton');
const cancelEditOperatorButton = document.getElementById('cancelEditOperatorButton');
const editingOperatorIdentifierInput = document.getElementById('editingOperatorIdentifier');
const operatorManagementInfo = document.getElementById('operatorManagementInfo');
const existingOperatorsListSection = document.getElementById('existingOperatorsListSection');
const existingOperatorsList = document.getElementById('existingOperatorsList');
const noExistingOperatorsMessage = document.getElementById('noExistingOperatorsMessage');


// Table View Elements
const aggregatedDataSection = document.getElementById('aggregatedDataSection');
const dataTableSection = document.getElementById('dataTableSection');
const statsContainer = document.getElementById('statsContainer');
const statFilteredRows = document.getElementById('statFilteredRows');
const statTotalHours = document.getElementById('statTotalHours');
const statAvgResidue = document.getElementById('statAvgResidue');
const statAvgRecovery = document.getElementById('statAvgRecovery');
const dataTableHeader = document.getElementById('dataTableHeader');
const dataTableBody = document.getElementById('dataTableBody');
const noDataMessageTable = document.getElementById('noDataMessageTable');
const downloadCsvButton = document.getElementById('downloadCsvButton');

const customMessageBox = document.getElementById('customMessageBox');
const messageBoxContent = document.getElementById('messageBoxContent');
const messageBoxTitle = document.getElementById('messageBoxTitle');
const messageBoxText = document.getElementById('messageBoxText');
const messageBoxOkButton = document.getElementById('messageBoxOkButton');
const messageBoxCloseButton = document.getElementById('messageBoxCloseButton');

// --- Tab Switching Logic ---
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        tabContents.forEach(content => content.classList.remove('active'));
        const activeTabContentId = button.dataset.tab;
        document.getElementById(activeTabContentId).classList.add('active');
        
        if (rawData.length > 0) {
            applyFiltersAndDisplay(); 
            if (activeTabContentId === 'operatorManagementView') {
                displayExistingOperators(); 
            }
        }
    });
});


// --- Message Box Logic ---
function showMessage(title, text, type = 'info') {
    messageBoxTitle.textContent = title;
    messageBoxText.innerHTML = text; 
    
    // Reset borders and text colors first
    messageBoxContent.classList.remove('border-l-4', 'border-red-500', 'border-green-500');
    messageBoxTitle.classList.remove('text-red-700', 'text-green-700', 'text-green-800'); // Adjusted default to green-800
    messageBoxText.classList.remove('text-red-600', 'text-green-600', 'text-green-700'); // Adjusted default to green-700


    if (type === 'error') { // Error messages remain red for clarity
        messageBoxContent.classList.add('border-l-4', 'border-red-500');
        messageBoxTitle.classList.add('text-red-700');
        messageBoxText.classList.add('text-red-600');
    } else if (type === 'success') {
        messageBoxContent.classList.add('border-l-4', 'border-green-500');
        messageBoxTitle.classList.add('text-green-700'); // Brighter green for success title
        messageBoxText.classList.add('text-green-600'); // Brighter green for success text
    } else { // Info and default
        messageBoxContent.classList.add('border-l-4', 'border-green-600'); // Slightly darker green border for info
        messageBoxTitle.classList.add('text-green-800'); // Default title color
        messageBoxText.classList.add('text-green-700'); // Default text color
    }
    
    customMessageBox.classList.remove('hidden');
    setTimeout(() => {
        messageBoxContent.classList.remove('scale-95', 'opacity-0');
        messageBoxContent.classList.add('scale-100', 'opacity-100');
    }, 10); 
}

function hideMessage() {
    messageBoxContent.classList.add('scale-95', 'opacity-0');
    messageBoxContent.classList.remove('scale-100', 'opacity-100');
    setTimeout(() => {
        customMessageBox.classList.add('hidden');
    }, 300); 
}

messageBoxOkButton.addEventListener('click', hideMessage);
messageBoxCloseButton.addEventListener('click', hideMessage);

// --- CSV Parsing and Data Handling ---
csvFileInput.addEventListener('change', (event) => {
    if (event.target.files.length > 0) {
        fileNameDisplay.textContent = event.target.files[0].name;
    } else {
        fileNameDisplay.textContent = 'Nessun file selezionato';
    }
    handleFileUpload(event);
});


function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    if (!file.name.endsWith('.csv')) {
        showMessage('Errore File', 'Per favore, carica un file con estensione .csv.', 'error');
        csvFileInput.value = ''; 
        fileNameDisplay.textContent = 'Nessun file selezionato';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            parseCSV(e.target.result);
            if (rawData.length > 0) {
                populateFilters(); 
                applyFiltersAndDisplay(); 
                filterSection.classList.remove('hidden');
                tabsNavigation.classList.remove('hidden'); 
                
                const activeTabId = document.querySelector('.tab-button.active').dataset.tab;
                if (activeTabId === 'tableView') {
                    aggregatedDataSection.classList.remove('hidden');
                    dataTableSection.classList.remove('hidden');
                } else if (activeTabId === 'calendarView') {
                    calendarDataSection.classList.remove('hidden');
                    downloadCalendarPdfButton.disabled = false;
                } else if (activeTabId === 'operatorManagementView') {
                    operatorManagementSection.classList.remove('hidden');
                    displayExistingOperators(); 
                }
                addOperatorButton.disabled = false;
                operatorManagementInfo.textContent = "Gli operatori aggiunti verranno inseriti nel dataset corrente per ogni settimana esistente.";


                showMessage('Successo', `File CSV caricato con successo. ${rawData.length} righe elaborate.`, 'success');
            } else {
                 showMessage('Attenzione', 'Il file CSV è vuoto o non contiene dati validi dopo l\'intestazione.', 'error');
                 fileNameDisplay.textContent = 'Nessun file selezionato';
                 addOperatorButton.disabled = true;
                 operatorManagementInfo.textContent = "Carica un file CSV per abilitare l'aggiunta di operatori.";
                 existingOperatorsListSection.classList.add('hidden');
                 downloadCalendarPdfButton.disabled = true;
            }
        } catch (error) {
            console.error("Errore durante il parsing del CSV:", error);
            showMessage('Errore Parsing', `Si è verificato un errore durante la lettura del file CSV: ${error.message}.<br>Assicurati che il formato sia corretto (delimitatore ';', encoding UTF-8).`, 'error');
            resetApplicationState();
            fileNameDisplay.textContent = 'Nessun file selezionato';
        }
    };
    reader.onerror = function() {
        showMessage('Errore Lettura', 'Impossibile leggere il file.', 'error');
        resetApplicationState();
        fileNameDisplay.textContent = 'Nessun file selezionato';
    };
    reader.readAsText(file, 'UTF-8'); 
}
 
function parseCSV(csvString) {
    const lines = csvString.split(/\r\n|\n/); 
    if (lines.length === 0) {
        rawData = [];
        headers = [];
        return;
    }

    headers = lines[0].split(';').map(h => h.trim());
    const expectedBaseHeaders = ["Settimana", "Struttura", "Servizio", "Operatori", ...DAY_COLUMNS];
    const missingHeaders = expectedBaseHeaders.filter(eh => !headers.includes(eh));
    if (missingHeaders.length > 0) {
        console.warn("Attenzione: Intestazioni CSV mancanti necessarie per la piena funzionalità:", missingHeaders.join(", "));
    }

    rawData = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === "") continue; 

        const values = line.split(';');
        if (values.length !== headers.length) {
            console.warn(`Riga ${i+1} saltata: numero di colonne non corrispondente (${values.length} invece di ${headers.length}). Contenuto: ${line}`);
            continue; 
        }

        const row = {};
        row._internalId = `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        row._oreContrattuali = 0; 
        headers.forEach((header, index) => {
            let value = values[index] ? values[index].trim() : "";
            if ((header.startsWith("ORA IN.") || header.startsWith("ORA OUT.")) && value === "") {
                value = "00:00";
            }
            row[header] = value;
        });

        if (row['Operatori']) {
            row.parsedOperators = row['Operatori'].split(',').map(op => op.trim()).filter(op => op);
        } else {
            row.parsedOperators = [];
        }
        rawData.push(row);
    }
}

function resetApplicationState() {
    rawData = [];
    filteredData = [];
    csvFileInput.value = ''; 
    fileNameDisplay.textContent = 'Nessun file selezionato';

    filterSection.classList.add('hidden');
    tabsNavigation.classList.add('hidden');
    aggregatedDataSection.classList.add('hidden');
    dataTableSection.classList.add('hidden');
    calendarDataSection.classList.add('hidden');
    operatorManagementSection.classList.add('hidden'); 
    existingOperatorsListSection.classList.add('hidden');
    addOperatorButton.disabled = true;
    operatorManagementInfo.textContent = "Carica un file CSV per abilitare l'aggiunta di operatori.";
    resetOperatorForm();


    [operatorFilter, shiftCodeFilter, serviceFilter, structureFilter, weekFilter, calendarWeekFromFilter, calendarWeekToFilter].forEach(sel => {
        sel.innerHTML = '';
    });
    
    dataTableHeader.innerHTML = '';
    dataTableBody.innerHTML = '';
    noDataMessageTable.classList.add('hidden');
    calendarContainer.innerHTML = '';
    noDataMessageCalendar.classList.add('hidden');
    existingOperatorsList.innerHTML = '';
    noExistingOperatorsMessage.classList.add('hidden');


    downloadCsvButton.disabled = true;
    downloadCalendarPdfButton.disabled = true;


    statFilteredRows.textContent = '0';
    statTotalHours.textContent = '0';
    statAvgResidue.textContent = '0';
    statAvgRecovery.textContent = '0';
}


function getStartDateFromWeekString(weekString) {
    const dateMatch = weekString.match(/dal (\d{2})\/(\d{2})\/(\d{4})/);
    if (dateMatch) {
        return new Date(dateMatch[3], dateMatch[2] - 1, dateMatch[1]); 
    }
    return null; 
}

function populateFilters() {
    const uniqueOperators = new Set();
    const uniqueShiftCodesForFilter = new Set(); 
    const uniqueServices = new Set();
    const uniqueStructures = new Set(); 
    const uniqueWeeksSet = new Set();  

    rawData.forEach(row => {
        if (row.parsedOperators) {
            row.parsedOperators.forEach(op => uniqueOperators.add(op));
        }
        DAY_COLUMNS.forEach(dayCol => {
            if (row[dayCol] && row[dayCol].trim() !== "") {
                uniqueShiftCodesForFilter.add(row[dayCol].trim());
            }
        });
        if (row['Servizio'] && row['Servizio'].trim() !== "") {
            uniqueServices.add(row['Servizio'].trim());
        }
        if (row['Struttura'] && row['Struttura'].trim() !== "") { 
            uniqueStructures.add(row['Struttura'].trim());
        }
        if (row['Settimana'] && row['Settimana'].trim() !== "") { 
            uniqueWeeksSet.add(row['Settimana'].trim());
        }
    });

    allSortedWeeks = Array.from(uniqueWeeksSet).sort((a,b) => {
        const dateA = getStartDateFromWeekString(a);
        const dateB = getStartDateFromWeekString(b);
        if (dateA && dateB) return dateA - dateB;
        return 0; 
    });

    populateMultiSelect(operatorFilter, Array.from(uniqueOperators).sort());
    populateMultiSelect(shiftCodeFilter, Array.from(uniqueShiftCodesForFilter).sort()); 
    populateMultiSelect(serviceFilter, Array.from(uniqueServices).sort());
    populateMultiSelect(structureFilter, Array.from(uniqueStructures).sort()); 
    populateMultiSelect(weekFilter, allSortedWeeks); 
    populateCalendarWeekFilters(); 
}

function populateCalendarWeekFilters() {
    calendarWeekFromFilter.innerHTML = '<option value="">Dalla prima settimana</option>';
    calendarWeekToFilter.innerHTML = '<option value="">All\'ultima settimana</option>';

    allSortedWeeks.forEach(weekStr => {
        const optionFrom = document.createElement('option');
        optionFrom.value = weekStr;
        optionFrom.textContent = weekStr;
        calendarWeekFromFilter.appendChild(optionFrom);

        const optionTo = document.createElement('option');
        optionTo.value = weekStr;
        optionTo.textContent = weekStr;
        calendarWeekToFilter.appendChild(optionTo);
    });
}


function populateMultiSelect(selectElement, options) {
    selectElement.innerHTML = ''; 
    options.forEach(optValue => {
        if(optValue) { 
            const option = document.createElement('option');
            option.value = optValue;
            option.textContent = optValue;
            selectElement.appendChild(option);
        }
    });
}
 
function getSelectedOptions(selectElement) {
    return Array.from(selectElement.selectedOptions).map(opt => opt.value);
}


applyFiltersButton.addEventListener('click', applyFiltersAndDisplay);
resetFiltersButton.addEventListener('click', () => {
    [operatorFilter, shiftCodeFilter, serviceFilter, structureFilter, weekFilter].forEach(sel => {
        Array.from(sel.options).forEach(opt => opt.selected = false);
    });
    calendarWeekFromFilter.value = ""; 
    calendarWeekToFilter.value = "";
    
    applyFiltersAndDisplay();
    showMessage('Filtri Resettati', 'Tutti i filtri sono stati resettati.', 'info');
});

calendarWeekFromFilter.addEventListener('change', applyFiltersAndDisplay);
calendarWeekToFilter.addEventListener('change', applyFiltersAndDisplay);


function applyFiltersAndDisplay() {
    if (rawData.length === 0) {
        filteredData = [];
        aggregatedDataSection.classList.add('hidden');
        dataTableSection.classList.add('hidden');
        calendarDataSection.classList.add('hidden');
        operatorManagementSection.classList.add('hidden'); 
        tabsNavigation.classList.add('hidden');
        addOperatorButton.disabled = true;
        operatorManagementInfo.textContent = "Carica un file CSV per abilitare l'aggiunta di operatori.";
        existingOperatorsListSection.classList.add('hidden');
        downloadCalendarPdfButton.disabled = true;


        displayTable(filteredData); 
        displayCalendar(filteredData); 
        displayAggregatedData(filteredData); 
        return;
    }

    const selectedOperators = getSelectedOptions(operatorFilter);
    const selectedShiftCodesFromFilter = getSelectedOptions(shiftCodeFilter); 
    const selectedServices = getSelectedOptions(serviceFilter);
    const selectedStructures = getSelectedOptions(structureFilter); 
    const selectedGlobalWeeks = getSelectedOptions(weekFilter); 

    let tempFilteredData = rawData.filter(row => {
        const operatorMatch = selectedOperators.length === 0 || 
                               (row.parsedOperators && selectedOperators.some(op => row.parsedOperators.includes(op)));
        
        const shiftCodeMatch = selectedShiftCodesFromFilter.length === 0 || 
                                 selectedShiftCodesFromFilter.some(sc => DAY_COLUMNS.some(dayCol => row[dayCol] === sc));

        const serviceMatch = selectedServices.length === 0 || 
                               (row['Servizio'] && selectedServices.includes(row['Servizio']));
                                 
        const structureMatch = selectedStructures.length === 0 || 
                                 (row['Struttura'] && selectedStructures.includes(row['Struttura'])); 
        
        const globalWeekMatch = selectedGlobalWeeks.length === 0 || 
                                 (row['Settimana'] && selectedGlobalWeeks.includes(row['Settimana'])); 
        
        return serviceMatch && operatorMatch && shiftCodeMatch && structureMatch && globalWeekMatch;
    });
    
    filteredData = [...tempFilteredData]; 


    const activeTabId = document.querySelector('.tab-button.active').dataset.tab;
    if (activeTabId === 'tableView') {
        displayTable(filteredData); 
        aggregatedDataSection.classList.remove('hidden');
        dataTableSection.classList.remove('hidden');
        calendarDataSection.classList.add('hidden');
        operatorManagementSection.classList.add('hidden');
    } else if (activeTabId === 'calendarView') {
        let calendarSpecificData = [...filteredData]; 
        const startWeekRangeStr = calendarWeekFromFilter.value;
        const endWeekRangeStr = calendarWeekToFilter.value;

        if (startWeekRangeStr) {
            const filterStartDate = getStartDateFromWeekString(startWeekRangeStr);
            if (filterStartDate) {
                calendarSpecificData = calendarSpecificData.filter(row => {
                    const rowDate = getStartDateFromWeekString(row['Settimana']);
                    return rowDate && rowDate >= filterStartDate;
                });
            }
        }
        if (endWeekRangeStr) {
            const filterEndDate = getStartDateFromWeekString(endWeekRangeStr);
             if (filterEndDate) {
                calendarSpecificData = calendarSpecificData.filter(row => {
                    const rowDate = getStartDateFromWeekString(row['Settimana']);
                    return rowDate && rowDate <= filterEndDate;
                });
            }
        }
        displayCalendar(calendarSpecificData); 
        calendarDataSection.classList.remove('hidden');
        aggregatedDataSection.classList.add('hidden');
        dataTableSection.classList.add('hidden');
        operatorManagementSection.classList.add('hidden');
        downloadCalendarPdfButton.disabled = calendarSpecificData.length === 0;
    } else if (activeTabId === 'operatorManagementView') {
        operatorManagementSection.classList.remove('hidden');
        displayExistingOperators(); 
        aggregatedDataSection.classList.add('hidden');
        dataTableSection.classList.add('hidden');
        calendarDataSection.classList.add('hidden');
    }
    displayAggregatedData(filteredData); 
}

function handleCellEdit(event) {
    const td = event.target;
    const internalId = td.dataset.internalId; 
    const columnKey = td.dataset.columnKey;
    let newValue = td.textContent.trim();
    let isValid = true;
    let message = "";

    if (columnKey.startsWith("ORA IN.") || columnKey.startsWith("ORA OUT.")) {
        if (newValue === "") {
            newValue = "00:00";
            message = `Campo ora vuoto, impostato a ${newValue}.`;
        } else if (!TIME_FORMAT_REGEX.test(newValue)) {
            if (newValue.includes(',') && newValue.split(',').length === 2) {
                const parts = newValue.split(',');
                const h = parts[0].padStart(2, '0');
                const m = parts[1].padEnd(2, '0').substring(0,2); 
                const tentativeValue = `${h}:${m}`;
                if (TIME_FORMAT_REGEX.test(tentativeValue)) {
                    newValue = tentativeValue;
                } else {
                    isValid = false;
                }
            } else {
                 isValid = false;
            }

            if(!isValid) {
                message = `Formato ora "${td.textContent.trim()}" non valido per ${columnKey}. Impostato a 00:00. Usare HH:MM.`;
                newValue = "00:00"; 
                td.classList.add('cell-invalid-feedback');
                setTimeout(() => {
                    td.classList.remove('cell-invalid-feedback');
                }, 2000);
            }
        }
        td.textContent = newValue; 
    }

    const rawDataRow = rawData.find(r => r._internalId === internalId);
    if (rawDataRow) {
        rawDataRow[columnKey] = newValue;
    }
    
    const mainFilteredRow = filteredData.find(r => r._internalId === internalId);
    if (mainFilteredRow) {
        mainFilteredRow[columnKey] = newValue;
    }

    if (message) {
        showMessage('Modifica Cella', message, isValid ? 'info' : 'error');
    }
    
    if(isValid) {
        td.classList.add('cell-edited-feedback');
        setTimeout(() => {
            td.classList.remove('cell-edited-feedback');
        }, 1500);
    }
}

function displayTable(data) {
    dataTableHeader.innerHTML = '';
    dataTableBody.innerHTML = '';

    if (!tableView.classList.contains('active') && rawData.length > 0) { 
            return;
    }

    if (headers.length === 0 && data.length === 0 && rawData.length === 0) { 
        noDataMessageTable.textContent = "Carica un file CSV per iniziare.";
        noDataMessageTable.classList.remove('hidden');
        downloadCsvButton.disabled = true;
        return;
    }
    
    if (headers.length > 0) {
        const headerRow = document.createElement('tr');
        const displayHeaders = headers.filter(h => h !== '_internalId' && h !== '_oreContrattuali');
        displayHeaders.forEach(headerText => {
            const th = document.createElement('th');
            th.scope = "col";
            th.className = "px-4 py-3 text-left text-xs font-medium text-green-600 uppercase tracking-wider"; // Header text color
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        dataTableHeader.appendChild(headerRow);
    }

    if (data.length === 0) {
        noDataMessageTable.textContent = "Nessun dato corrisponde ai filtri selezionati per la tabella.";
        noDataMessageTable.classList.remove('hidden');
        dataTableBody.innerHTML = ''; 
        downloadCsvButton.disabled = true;
    } else {
        noDataMessageTable.classList.add('hidden');
        data.forEach((row) => { 
            const tr = document.createElement('tr');
            tr.className = "hover:bg-green-50 transition-colors duration-150"; // Row hover
            
            const displayHeaders = headers.filter(h => h !== '_internalId' && h !== '_oreContrattuali');
            displayHeaders.forEach(header => {
                const td = document.createElement('td');
                td.className = "px-4 py-3 whitespace-nowrap text-sm text-green-800"; // Cell text color
                
                let cellValue = row[header] !== undefined ? row[header] : "";
                if ((header.startsWith("ORA IN.") || header.startsWith("ORA OUT.")) && cellValue === "") {
                    cellValue = "00:00";
                }
                td.textContent = cellValue;

                const isEditableDayColumn = DAY_COLUMNS.includes(header);
                const isEditableOraInColumn = header.startsWith("ORA IN.");
                const isEditableOraOutColumn = header.startsWith("ORA OUT.");

                if (isEditableDayColumn || isEditableOraInColumn || isEditableOraOutColumn) {
                    td.contentEditable = true;
                    td.classList.add('editable-cell'); // Style updated in CSS
                    td.dataset.internalId = row._internalId; 
                    td.dataset.columnKey = header;
                    td.addEventListener('blur', handleCellEdit);
                }
                tr.appendChild(td);
            });
            dataTableBody.appendChild(tr);
        });
        downloadCsvButton.disabled = false;
    }
}
 
function displayCalendar(calendarDisplayData) { 
    calendarContainer.innerHTML = ''; 

    if (!calendarView.classList.contains('active') && rawData.length > 0) {
            return;
    }
    
    if (calendarDisplayData.length === 0) {
        noDataMessageCalendar.textContent = "Nessun dato da visualizzare nel calendario per i filtri selezionati.";
        noDataMessageCalendar.classList.remove('hidden');
        downloadCalendarPdfButton.disabled = true;
        return;
    }
    
    noDataMessageCalendar.classList.add('hidden');
    downloadCalendarPdfButton.disabled = false;


    const groupedByWeek = calendarDisplayData.reduce((acc, row) => {
        const week = row['Settimana'];
        if (!acc[week]) {
            acc[week] = [];
        }
        acc[week].push(row);
        return acc;
    }, {});

    allSortedWeeks.forEach(weekKey => {
        if (!groupedByWeek[weekKey]) return; 

        const weekData = groupedByWeek[weekKey];
        const weekContainer = document.createElement('div');
        weekContainer.className = 'calendar-week-container'; // Styles updated in CSS
        
        const weekTitle = document.createElement('h3');
        weekTitle.className = 'calendar-week-title'; // Styles updated in CSS
        weekTitle.textContent = weekKey;
        weekContainer.appendChild(weekTitle);

        const table = document.createElement('table');
        table.className = 'calendar-table'; // Styles updated in CSS
        
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const thOperator = document.createElement('th');
        thOperator.textContent = 'Operatore';
        headerRow.appendChild(thOperator);
        DAY_COLUMNS.forEach(dayName => {
            const thDay = document.createElement('th');
            thDay.textContent = dayName;
            headerRow.appendChild(thDay);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        const operatorsInWeek = [...new Set(weekData.flatMap(r => r.parsedOperators))].sort();

        operatorsInWeek.forEach(operatorName => {
            const operatorRowData = weekData.find(r => r.parsedOperators.includes(operatorName));

            if (operatorRowData) {
                const tr = document.createElement('tr');
                const tdOperator = document.createElement('td');
                tdOperator.className = 'calendar-operator-name'; // Styles updated in CSS
                tdOperator.textContent = operatorName;
                tr.appendChild(tdOperator);

                DAY_COLUMNS.forEach(dayName => {
                    const tdDay = document.createElement('td');
                    const dayIndex = DAY_MAP_TO_INDEX[dayName];
                    const shiftCode = operatorRowData[dayName] || '-';
                    const oraIn = operatorRowData[`ORA IN.${dayIndex}`] || '00:00';
                    const oraOut = operatorRowData[`ORA OUT.${dayIndex}`] || '00:00';

                    const shiftCodeDiv = document.createElement('div');
                    shiftCodeDiv.className = 'calendar-shift-code'; // Styles updated in CSS
                    shiftCodeDiv.textContent = shiftCode;
                    tdDay.appendChild(shiftCodeDiv);

                    if (shiftCode !== '-' && shiftCode.toUpperCase() !== 'RIPOSO' && shiftCode.toUpperCase() !== 'FERIE' && shiftCode.toUpperCase() !== 'MALATTIA' && !shiftCode.toUpperCase().includes('CONGEDO')) { 
                        const timeDiv = document.createElement('div');
                        timeDiv.className = 'calendar-shift-time'; // Styles updated in CSS
                        timeDiv.textContent = `${oraIn} - ${oraOut}`;
                        tdDay.appendChild(timeDiv);
                    }
                    tr.appendChild(tdDay);
                });
                tbody.appendChild(tr);
            }
        });
        table.appendChild(tbody);
        weekContainer.appendChild(table);
        calendarContainer.appendChild(weekContainer);
    });
}


function parseFloatWithComma(valueStr) {
    if (typeof valueStr !== 'string' || valueStr.trim() === "") return 0;
    return parseFloat(valueStr.replace(',', '.'));
}

function displayAggregatedData(data) {
    statFilteredRows.textContent = data.length;

    if (data.length === 0) {
        statTotalHours.textContent = '0';
        statAvgResidue.textContent = '0';
        statAvgRecovery.textContent = '0';
        return;
    }

    let totalHoursSum = 0;
    let residueSum = 0;
    let recoverySum = 0;

    data.forEach(row => {
        totalHoursSum += parseFloatWithComma(row['TOT']);
        residueSum += parseFloatWithComma(row['Residuo']);
        recoverySum += parseFloatWithComma(row['Recupero']);
    });
    
    statTotalHours.textContent = totalHoursSum.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    statAvgResidue.textContent = (data.length > 0 ? (residueSum / data.length) : 0).toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    statAvgRecovery.textContent = (data.length > 0 ? (recoverySum / data.length) : 0).toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

downloadCsvButton.addEventListener('click', downloadFilteredCSV);

function downloadFilteredCSV() {
    if (filteredData.length === 0) { 
        showMessage('Attenzione', 'Nessun dato da scaricare dalla tabella.', 'error');
        return;
    }
    
    const displayHeaders = headers.filter(h => h !== '_internalId' && h !== '_oreContrattuali');
    let csvContent = displayHeaders.join(";") + "\r\n"; 

    filteredData.forEach(row => { 
        const rowValues = displayHeaders.map(header => {
            let cellValue = row[header] !== undefined ? String(row[header]) : "";
            if (cellValue.includes('"')) {
                cellValue = cellValue.replace(/"/g, '""');
            }
            if (cellValue.includes(';') || cellValue.includes('\n') || cellValue.includes('\r')) {
                cellValue = `"${cellValue}"`;
            }
            return cellValue;
        });
        csvContent += rowValues.join(";") + "\r\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'dati_filtrati_turni.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showMessage('Download', 'Il file CSV con i dati filtrati è stato generato.', 'success');
}

downloadCalendarPdfButton.addEventListener('click', downloadCalendarPDF);

function downloadCalendarPDF() {
    const calendarWeekContainers = calendarContainer.querySelectorAll('.calendar-week-container');
    if (calendarWeekContainers.length === 0) {
             showMessage('Attenzione', 'Nessuna settimana visualizzata nel calendario da scaricare.', 'error');
        return;
    }

    const { jsPDF } = window.jspdf; 
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt', 
        format: 'a4'
    });

    let firstPage = true;

    calendarWeekContainers.forEach(weekDiv => {
        if (!firstPage) {
            doc.addPage();
        }
        firstPage = false;

        const weekTitleElement = weekDiv.querySelector('.calendar-week-title');
        const weekTitle = weekTitleElement ? weekTitleElement.textContent : 'Settimana';
        
        doc.setFontSize(16);
        doc.text(weekTitle, 40, 40); 

        const tableElement = weekDiv.querySelector('.calendar-table');
        if (tableElement) {
            const head = [[]];
            const body = [];

            tableElement.querySelectorAll('thead th').forEach(th => {
                head[0].push(th.textContent.trim());
            });

            tableElement.querySelectorAll('tbody tr').forEach(tr => {
                const rowData = [];
                tr.querySelectorAll('td').forEach((td, cellIndex) => {
                    let cellContent;
                    if (cellIndex === 0) { 
                        cellContent = td.textContent.trim();
                    } else { 
                        cellContent = Array.from(td.querySelectorAll('div'))
                                .map(div => div.textContent.trim())
                                .filter(text => text) 
                                .join('\n'); 
                    }
                    rowData.push(cellContent);
                });
                body.push(rowData);
            });
            
            doc.autoTable({
                head: head,
                body: body,
                startY: 60, 
                theme: 'grid',
                headStyles: { fillColor: [22, 160, 133], fontSize: 8, halign: 'center' }, // Already a nice green
                styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak', halign: 'left' },
                columnStyles: { 
                    0: { cellWidth: 120, fontStyle: 'bold' }, 
                    1: { cellWidth: 'auto' }, 
                    2: { cellWidth: 'auto' },
                    3: { cellWidth: 'auto' },
                    4: { cellWidth: 'auto' },
                    5: { cellWidth: 'auto' },
                    6: { cellWidth: 'auto' },
                    7: { cellWidth: 'auto' },
                },
                margin: { top: 40, right: 40, bottom: 40, left: 40 },
                tableWidth: 'auto', 
                didDrawPage: function (data) {
                    doc.setFontSize(8);
                    doc.text('Pagina ' + doc.internal.getNumberOfPages(), data.settings.margin.left, doc.internal.pageSize.height - 15);
                }
            });
        }
    });
    doc.save('calendario_turni.pdf');
    showMessage('Download PDF', 'Il PDF del calendario è stato generato.', 'success');
}


function getUniqueOperatorProfiles() {
    if (rawData.length === 0) return [];
    const profiles = new Map();
    rawData.forEach(row => {
        const operatorNameString = row['Operatori'] || (row.parsedOperators && row.parsedOperators.join(','));
        if (!operatorNameString) return;

        const profileKey = `${operatorNameString}|${row['Servizio']}|${row['Struttura']}`;
        if (!profiles.has(profileKey)) {
            const nameMatch = operatorNameString.match(/(.+)\((.+)\)/);
            profiles.set(profileKey, {
                key: profileKey,
                name: nameMatch ? nameMatch[1].trim() : operatorNameString,
                qualification: nameMatch ? nameMatch[2].trim() : '',
                operatorString: operatorNameString,
                service: row['Servizio'],
                structure: row['Struttura'],
                contractualHours: row['_oreContrattuali'] !== undefined ? row['_oreContrattuali'] : ''
            });
        } else { 
            const existingProfile = profiles.get(profileKey);
            if (row['_oreContrattuali'] !== undefined && existingProfile.contractualHours === '') {
                existingProfile.contractualHours = row['_oreContrattuali'];
            }
        }
    });
    return Array.from(profiles.values()).sort((a,b) => a.operatorString.localeCompare(b.operatorString));
}

function displayExistingOperators() {
    if (!operatorManagementView.classList.contains('active')) return;

    existingOperatorsList.innerHTML = '';
    const uniqueProfiles = getUniqueOperatorProfiles();

    if (uniqueProfiles.length === 0) {
        noExistingOperatorsMessage.classList.remove('hidden');
        existingOperatorsListSection.classList.add('hidden'); 
        return;
    }
    
    noExistingOperatorsMessage.classList.add('hidden');
    existingOperatorsListSection.classList.remove('hidden');


    uniqueProfiles.forEach(profile => {
        const listItem = document.createElement('div');
        listItem.className = 'operator-list-item'; // Styles updated in CSS

        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'operator-details'; // Styles updated in CSS
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'name'; // Styles updated in CSS
        nameSpan.textContent = profile.operatorString;
        detailsDiv.appendChild(nameSpan);

        const metaSpan = document.createElement('span');
        metaSpan.className = 'meta'; // Styles updated in CSS
        metaSpan.textContent = `Servizio: ${profile.service || 'N/D'} | Struttura: ${profile.structure || 'N/D'} | Ore Contr.: ${profile.contractualHours || 'N/A'}`;
        detailsDiv.appendChild(metaSpan);
        
        listItem.appendChild(detailsDiv);

        const editButton = document.createElement('button');
        editButton.textContent = 'Modifica';
        editButton.className = 'ml-4 py-1 px-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500';
        editButton.onclick = () => populateOperatorFormForEdit(profile);
        listItem.appendChild(editButton);

        existingOperatorsList.appendChild(listItem);
    });
}

function populateOperatorFormForEdit(profile) {
    editingOperatorOriginalIdentifier = profile.key; 
    editingOperatorIdentifierInput.value = profile.key; 

    document.getElementById('newOperatorName').value = profile.name;
    document.getElementById('newOperatorQualification').value = profile.qualification;
    document.getElementById('newOperatorService').value = profile.service;
    document.getElementById('newOperatorStructure').value = profile.structure;
    document.getElementById('newOperatorContractualHours').value = profile.contractualHours;

    operatorFormTitle.textContent = "Modifica Operatore Esistente";
    addOperatorButton.textContent = 'Salva Modifiche';
    // Keep green theme for edit button as well
    addOperatorButton.classList.remove('bg-indigo-600', 'hover:bg-indigo-700', 'focus:ring-indigo-500');
    addOperatorButton.classList.add('bg-green-600', 'hover:bg-green-700', 'focus:ring-green-500');
    cancelEditOperatorButton.classList.remove('hidden');
}

function resetOperatorForm() {
    addOperatorForm.reset();
    editingOperatorOriginalIdentifier = null;
    editingOperatorIdentifierInput.value = "";
    operatorFormTitle.textContent = "Aggiungi Nuovo Operatore";
    addOperatorButton.textContent = 'Aggiungi Operatore';
    // Ensure it's green
    addOperatorButton.classList.remove('bg-indigo-600', 'hover:bg-indigo-700', 'focus:ring-indigo-500');
    addOperatorButton.classList.add('bg-green-600', 'hover:bg-green-700', 'focus:ring-green-500');
    cancelEditOperatorButton.classList.add('hidden');
}
 
cancelEditOperatorButton.addEventListener('click', resetOperatorForm);


addOperatorForm.addEventListener('submit', function(event) {
    event.preventDefault();
    if (headers.length === 0) { 
        showMessage('Attenzione', 'Carica prima un file CSV per definire la struttura e le settimane.', 'error');
        return;
    }

    const name = document.getElementById('newOperatorName').value.trim();
    const qualification = document.getElementById('newOperatorQualification').value.trim();
    const service = document.getElementById('newOperatorService').value.trim();
    const structure = document.getElementById('newOperatorStructure').value.trim();
    const contractualHours = document.getElementById('newOperatorContractualHours').value;

    if (!name || !qualification || !service || !structure) {
        showMessage('Errore', 'Per favore, compila tutti i campi obbligatori (Nome, Qualifica, Servizio, Struttura).', 'error');
        return;
    }
    const newOperatorString = `${name.toUpperCase()}(${qualification.toUpperCase()})`;

    if (editingOperatorOriginalIdentifier) { 
        const [originalOpStr, originalService, originalStructure] = editingOperatorOriginalIdentifier.split('|');
        
        let updatedCount = 0;
        rawData.forEach(row => {
            if (row['Operatori'] === originalOpStr && row['Servizio'] === originalService && row['Struttura'] === originalStructure) {
                row['Operatori'] = newOperatorString;
                row.parsedOperators = [newOperatorString];
                row['Servizio'] = service;
                row['Struttura'] = structure;
                row['_oreContrattuali'] = contractualHours ? parseFloat(contractualHours) : (row['_oreContrattuali'] || 0) ;
                updatedCount++;
            }
        });
        showMessage('Successo', `Dati operatore aggiornati per ${updatedCount} record/settimane.`, 'success');
        resetOperatorForm();

    } else { 
        const operatorExists = rawData.some(row => row.parsedOperators.includes(newOperatorString) && row['Servizio'] === service && row['Struttura'] === structure);
        if (operatorExists) {
             showMessage('Attenzione', `L'operatore "${newOperatorString}" con lo stesso servizio e struttura sembra esistere già.`, 'error');
             return;
        }

        const uniqueWeeksInCSV = [...new Set(rawData.map(row => row['Settimana']))];
        if (uniqueWeeksInCSV.length === 0 && rawData.length > 0) { 
             showMessage('Errore', 'Nessuna settimana trovata nel CSV caricato. Impossibile aggiungere operatore.', 'error');
             return;
        }
         if (rawData.length === 0 && uniqueWeeksInCSV.length === 0) { 
            showMessage('Errore', 'Carica un CSV per definire le settimane prima di aggiungere un operatore.', 'error');
            return;
        }


        uniqueWeeksInCSV.forEach(weekValue => {
            const newRow = {
                _internalId: `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                _oreContrattuali: contractualHours ? parseFloat(contractualHours) : 0
            };
            
            headers.forEach(header => {
                switch(header) {
                    case 'Settimana': newRow[header] = weekValue; break;
                    case 'Struttura': newRow[header] = structure; break;
                    case 'Servizio': newRow[header] = service; break;
                    case 'Operatori': newRow[header] = newOperatorString; break;
                    case 'TOT': newRow[header] = "0,0"; break; 
                    case 'Residuo': newRow[header] = "0,0"; break;
                    case 'Recupero': newRow[header] = "0,0"; break;
                    default:
                        if (DAY_COLUMNS.includes(header)) {
                            newRow[header] = "RIPOSO";
                        } else if (header.startsWith("ORA IN.") || header.startsWith("ORA OUT.")) {
                            newRow[header] = "00:00";
                        } else {
                            newRow[header] = ""; 
                        }
                }
            });
            newRow.parsedOperators = [newOperatorString];
            rawData.push(newRow);
        });
        showMessage('Successo', `Operatore "${newOperatorString}" aggiunto per ${uniqueWeeksInCSV.length} settimane.`, 'success');
        addOperatorForm.reset();
    }
    
    populateFilters(); 
    applyFiltersAndDisplay(); 
    displayExistingOperators(); 
});


function initializeApp() {
    document.querySelector('.tab-button[data-tab="tableView"]').classList.add('active');
    document.getElementById('tableView').classList.add('active');
    
    aggregatedDataSection.classList.add('hidden');
    dataTableSection.classList.add('hidden');
    calendarDataSection.classList.add('hidden');
    operatorManagementSection.classList.add('hidden'); 
    existingOperatorsListSection.classList.add('hidden');
    tabsNavigation.classList.add('hidden'); 
    addOperatorButton.disabled = true; 
    downloadCalendarPdfButton.disabled = true;
    operatorManagementInfo.textContent = "Carica un file CSV per abilitare l'aggiunta di operatori.";
}

initializeApp();