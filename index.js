const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function launchBrowser() {
    const browser = await puppeteer.launch({
        headless: false,
        // devtools: true
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1367, height: 1024 });

    const url = "https://lps.legal.dubai.gov.ae//Portal/DirectorySearch?isRTL=false#!";
    await page.goto(url);

    getPage(page);


    // await browser.close();
};

launchBrowser();
// Function to create a delay
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getPage(page) {
    let lawyer_id = 1;
    let allData = [];
    for (let i = 0; i < 13; i++) {
        // Trigger the pagination click within the page context
        await page.evaluate((i) => {
            aspxGVPagerOnClick('DirectorySearchPartial', `PN${i}`);
        }, i);

        // Wait for the data to load, you may need to adjust the selector or delay
        await delay(3000); // Wait for 3 seconds for the data to load


        // Extract lawyer data from the current page
        await getLawyerData(page, lawyer_id, i, allData);
        lawyer_id = lawyer_id + 10;
    }
}


// Function to extract data from the modal
async function extractModalData(page, lawyer_id) {
    await page.waitForSelector('#divPrint', { visible: true });

    const data = await page.evaluate((lawyer_id) => {
        const rows = Array.from(document.querySelectorAll('#divPrint .table tbody tr'));

        result = {};
        rows.forEach(row => {
            // Assuming the first cell contains the lawyer_id
            const cells = Array.from(row.querySelectorAll('td'));

            if (cells.length > 0) {
                result[lawyer_id] = {
                    'Name of Firm': cells[0] ? cells[0].innerText.trim() : '',
                    'License Issue Date': cells[1] ? cells[1].innerText.trim() : '',
                    "Address": cells[2] ? cells[2].innerText.trim() : '',
                    'Contact No.': cells[3] ? cells[3].innerText.trim() : '',
                    'Email Address': cells[4] ? cells[4].innerText.trim() : ''
                };
            }
        });

        return result;
    }, lawyer_id);


    return data;
}


// Function to close the modal
async function closeModal(page) {
    try {
        await page.waitForSelector('#divPrint', { visible: true });
        const closeButton = await page.waitForSelector('#divPrint .modal-header .close', { visible: true });
        if (closeButton) {
            await closeButton.click();
            await delay(1000); // Ensure the modal is closed
        } else {
            console.log('Close button not found');
        }
    } catch (error) {
        console.error('Error closing modal:', error);
    }
}

// function to get lawyerData
async function getLawyerData(page, lawyer_id, i, allData) {
    const table = await page.$('#DirectorySearchPartial_DXMainTable');
    const rows = await table.$$('.dxgvDataRow_Aqua'); // Select all rows with the specified class

    for (let index = 0; index < rows.length; index++) {
        // if (index < 2) {
        const row = rows[index];
        const link = await row.$('a[data-toggle="modal"]'); // Find the link inside the row

        if (link) {
            await link.click();
            console.log(`lawyer_id : ${lawyer_id},page : ${i + 1}`);
            const data = await extractModalData(page, lawyer_id);
            allData.push(data)

            // if (lawyer_id % 10 == 0 || lawyer_id == 128) {
            if (lawyer_id == 128) {
                console.log('Modal Data:', allData);
                saveFile(JSON.stringify(allData), `lawyer${lawyer_id}.json`);
                allData = [];
            }
            lawyer_id++;
            await delay(1000);
            await closeModal(page);
        } else {
            console.log('Link not found in row', index, i);
        }
        // }
    }
}


function saveFile(data, fileName) {
    // Define the path to save the file
    const filePath = path.join(`${__dirname}\\json\\`, fileName);

    // Write the text data to the file
    fs.writeFile(filePath, data, (err) => {
        if (err) {
            console.error('Error writing file:', err);
        } else {
            console.log('File saved successfully:', filePath);
        }
    });
}

