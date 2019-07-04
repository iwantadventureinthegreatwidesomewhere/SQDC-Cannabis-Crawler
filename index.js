const puppeteer = require('puppeteer');

const titles = [
    'Name',
    'Brand',
    'Category',
    'Species',
    'THC',
    'CBD'
];

const availability_selector = 'button.btn.btn-default.btn-outline.mr-20.active';
const next_selector = 'i[class="icn-sqdc-arrow-right fa-lg"]';

const specs_selector = [
    'h1[property="name"]', //name
    'div[property="brand"]', //brand
    'ol > li:nth-child(2) > a', //category
    'div.product-attribute', //species
    'ul > li:nth-child(1) > span:nth-child(2)', //thc
    'ul > li:nth-child(2) > span:nth-child(2)' //cbd
];

puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'], headless: true }).then(async browser => {
    var url = 'https://www.sqdc.ca/en-CA/Search?keywords=*&sortDirection=asc&page=1';

    const page = await browser.newPage();

    await page.setRequestInterception(true);

    page.on('request', (req) => {
        if(req.resourceType() == 'stylesheet' || req.resourceType() == 'font' || req.resourceType() == 'image'){
            req.abort();
        }
        else {
            req.continue();
        }   
    });

    await page.goto(url, { timeout: 60000, waitUntil: 'networkidle2' });

    while(true){
        var next = await page.evaluate((next_selector) => {
            var t = document.querySelector(next_selector);

            try{
                return t.parentElement.getAttribute('href');
            }catch(e){
                return null;
            }
        }, next_selector);

        var links = await page.evaluate(() => {
            var t = [];
            var elements = document.getElementsByClassName('product-tile-media image-background');

            for(var element of elements){
                t.push('https://www.sqdc.ca' + element.getAttribute('href'));
            }

            return t;
        });

        for(var link of links){
            await page.goto(link, { timeout: 60000, waitUntil: 'networkidle2' });
            
            await page.waitFor('input[id="month"]', { timeout: 60000 });

            const month = Math.ceil(Math.random() * 12);
            await page.type('input[id="month"]', '' + month);

            const day = Math.ceil(Math.random() * 25);
            await page.type('input[id="day"]', '' + day);

            const year = Math.ceil(Math.random() * 50 + 1950);
            await page.type('input[id="year"]', '' + year);

            await page.click('button[type="submit"]');

            await page.waitForSelector(availability_selector, { timeout: 60000 });
            var availability = await page.$eval(availability_selector, el => el.getAttribute('class'));

            if(('' + availability.search('unavailable')) == -1){
                var data = []
    
                for(var i = 0; i < 6; i++){
                    await page.waitForSelector(specs_selector[i], { timeout: 60000 });
                    var spec = await page.$eval(specs_selector[i], el => el.textContent);
    
                    if(spec == 'Pills'){
                        spec = 'Capsules';
                    }
    
                    data.push('' + titles[i] + ': ' + spec);
                }
    
                data.push('URL: ' + link);
    
                console.log(data);
            }
        }

        if(next != null){
            await page.goto('https://www.sqdc.ca' + next, { timeout: 60000, waitUntil: 'networkidle2' });
        }else{
            await browser.close();
            process.exit();
        }
    }
}).catch(function(e) {
    console.log(e.stack);
    process.exit();
});