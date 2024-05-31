const express = require('express')
const cors = require('cors')
const morgan = require('morgan')


const puppeteer = require('puppeteer-core');
// const puppeteer = require('puppeteer');

const path = require('path')
const app = express()
app.use(morgan('dev'))
app.use(cors())

app.use(express.static('assets'));

// Extract the logic into a separate async function for cleaner code.
async function scrapeOptions(url) {
    console.log('puppeteer lunch');
    const browser = await puppeteer.launch({
        headless: false, // Consider running in headless mode for better performance
        executablePath: path.join(__dirname, './chrome-win', 'chrome.exe'),
        //  './chrome-win/chrome.exe', // Uncomment if using puppeteer-core
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(90000);
        await page.goto(url);
        await page.waitForSelector('body');

        let tables = await page.evaluate(() => {
            let bcDataGrids = document.querySelectorAll('bc-data-grid');
            // let tablesElement = document.querySelectorAll('table');
            return Array.from(bcDataGrids).map(bcDataGrid => {
                let shadow = bcDataGrid.shadowRoot;
                if (shadow === null) 
                    return {
                        header: [],
                        body: []
                    };
                let grid = shadow.querySelector('._grid');
                if (grid === null) 
                    return {
                        header: [],
                        body: []
                    };
                let headerElement = grid.querySelector('._header');
                if (headerElement === null) 
                    return {
                        header: [],
                        body: []
                    };
                let headers = Array.from(headerElement.querySelectorAll('.bc-datatable-header-tooltip')).map(th =>
                    th?.textContent?.trim()
                );

                let bodyRows = Array.from(grid.querySelectorAll('set-class._grid_columns')).map(tr => 
                    Array.from(tr.querySelectorAll('text-binding')).map(td => {
                        return td.shadowRoot?.textContent?.trim();
                    })
                );

                return {
                    header: headers,
                    body: bodyRows
                };
            });
        });

        return tables;
    } finally {
        await browser.close();
    }
}

// Updated the route to use async/await pattern for better error handling.
app.get('/get_options', async (req, res) => {
    let url = req.query.url || "";
    console.log(url);

    try {
        // Await for the scrapeOptions to resolve before sending the response
        const options = await scrapeOptions(url);
        res.json(options);
    } catch (error) {
        // Properly handle any errors that occur during the scraping
        console.error(error);
        res.status(500).send('An error occurred while retrieving options.');
    }
});

app.get('/options', function(req,res){
    res.sendFile(path.join(__dirname, '../components', 'option.html'));
})

app.get("/", (req, res) => res.send("Express on Vercel"));

let port = process.env.PORT || 3002;
app.listen(port, (err) => {
    console.log('Server is running at port ...' + port);
});

module.exports = app;