function main() {
    const apiUrl = "https://data.gov.il/api/3/action/datastore_search?resource_id=e83f763b-b7d7-479e-b172-ae981ddc6de5";
    const sheetId = "[Sheet ID]";
    const batchSize = 500;
  
    let offset = 0;
    let allData = [];
    let data;
  
    do {
      const urlWithOffset = `${apiUrl}&limit=${batchSize}&offset=${offset}`;
      const response = UrlFetchApp.fetch(urlWithOffset);
      data = JSON.parse(response.getContentText());
      const records = data.result.records;
  
      if (records.length === 0) {
        Logger.log("No records found.");
        break;
      }
  
      allData = allData.concat(records);
      offset += batchSize;
    } while (data.result.records.length === batchSize);
  
    Logger.log(`Total records fetched: ${allData.length}`);
  
    uploadDataToSheet(allData, sheetId);
    removeDuplicatesBasedOnMultipleColumns(sheetId);
  }
  
  function uploadDataToSheet(data, sheetId) {
    const values = data.map(row => Object.values(row));
    const headers = Object.keys(data[0]);
  
    let currentOffset = 0;
    const batchSize = 500;
  
    const sheet = SpreadsheetApp.openById(sheetId).getSheetByName("Sheet1");
    let lastRow = sheet.getLastRow();
  
    const firstRowRange = sheet.getRange(1, 1, 1, headers.length);
    const firstRowFontWeights = firstRowRange.getFontWeights();
    const firstRowFontStyles = firstRowRange.getFontStyles();
    
    if (lastRow === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      lastRow = 1;
      Logger.log("Headers added to the sheet");
    }
  
    while (currentOffset < values.length) {
      const batchValues = values.slice(currentOffset, currentOffset + batchSize);
  
      // Log the batchValues to ensure data is correct
      // Logger.log(`Appending ${batchValues.length} rows to range A${lastRow + 1}`);
      // Logger.log(`Batch values: ${JSON.stringify(batchValues)}`);
  
      sheet.getRange(lastRow + 1, 1, batchValues.length, batchValues[0].length).setValues(batchValues);
  
      currentOffset += batchSize;
      lastRow += batchSize;
    }

    firstRowRange.setFontWeights(firstRowFontWeights);
    firstRowRange.setFontStyles(firstRowFontStyles);
  
    for (let col = 1; col <= headers.length; col++) {
      const currentWidth = sheet.getColumnWidth(col);
      sheet.autoResizeColumn(col);
      const newWidth = sheet.getColumnWidth(col);
      if (newWidth < currentWidth) {
        sheet.setColumnWidth(col, currentWidth);
      }
    }
  }
  
  function removeDuplicatesBasedOnMultipleColumns(sheetId = "[Sheet ID]") {
    const spreadsheet = SpreadsheetApp.openById(sheetId);
    const sheet = spreadsheet.getSheetByName("Sheet1");
    const dataRange = sheet.getDataRange();
    const data = dataRange.getValues();

    const chfltnIndex = data[0].indexOf("CHFLTN");
    const chptolIndex = data[0].indexOf("CHPTOL");
    const chstolIndex = data[0].indexOf("CHSTOL");

    if (chfltnIndex === -1 || chptolIndex === -1 || chstolIndex === -1) {
        Logger.log("CHFLTN, CHPTOL, or CHSTOL column not found.");
        return;
    }

    const seenValues = new Set();
    const uniqueData = [];
    uniqueData.push(data[0]);

    for (let i = 1; i < data.length; i++) {
        const chfltnValue = data[i][chfltnIndex];
        const chptolValue = data[i][chptolIndex];
        const chstolValue = data[i][chstolIndex];
        const combinedValue = `${chfltnValue}-${chptolValue}-${chstolValue}`;

        if (!seenValues.has(combinedValue)) {
            uniqueData.push(data[i]);
            seenValues.add(combinedValue);
        }
    }

    sheet.clear();
    sheet.getRange(1, 1, uniqueData.length, uniqueData[0].length).setValues(uniqueData);

    const extraRows = sheet.getMaxRows() - uniqueData.length;
    
    if (extraRows > 0) {
        sheet.deleteRows(uniqueData.length + 1, extraRows);
    }

    Logger.log(`Removed ${data.length - uniqueData.length} duplicate rows.`);
}

