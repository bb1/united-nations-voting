const { Pool, Client } = require('pg')
const cheerio = require('cheerio')
const rq = require('request-promise-native')

;(async () => {
    // crawl
    const uri = `https://digitallibrary.un.org/record/3814149?ln=en`
    const options = {
        transform: (body) => {
            return cheerio.load(body);
        }
    }
    const $ = await rq(Object.assign({uri}, options))
    const title = $('.two-row-metadata.value').text()
    console.info(title)

    // db init
    const pool = await Pool({
        user: 'postgres',
        host: '127.0.0.1',
        database: 'un',
        password: 'root',
        port: 5432,
    })
    
    pool.on('error', (err, client) => {
        console.error('Unexpected error on idle client', err)
        process.exit(-1)
    })

    // write to DB
    const client = await pool.connect()
    try {
        const { rows } = await client.query('SELECT NOW()', [])
        console.info(rows)
    } finally {
        client.release()
        await pool.end();
        console.info('done')
        process.exit(0)
    }
})().catch(e => console.error(e));
