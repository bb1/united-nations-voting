require('dotenv').config();
const { Pool } = require('pg')
const Resolver = require('./resolution-resolver')
const Search = require('./search')


;(async () => {
    // db init
    const pool = await Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
    })
    
    pool.on('error', (err, client) => {
        console.error('Unexpected error on idle client', err)
        process.exit(-1)
    })

    const year = process.argv[2]
    if (year && year.length === 4) {
        console.info(`Parsing year ${year}...`)
    } else {
        console.error(`Invalid year argument. Use: node index.js 2001.`)
        await pool.end();
        process.exit(1)
    }

    const search = new Search()
    const urls = await search.start(year)
    let leftUrls = urls.length
    const promises = urls.map(url => {
        const res = new Resolver(pool, url)
        return res.start().then(() => {
            console.info(`urls left: ${--leftUrls}`)
        })
    })

    await Promise.all(promises)

    await pool.end();
    console.info('QUIT all resolutions parsed')
    process.exit(0)
})().catch(e => console.error(e))
