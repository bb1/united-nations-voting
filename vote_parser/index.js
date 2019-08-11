const { Pool } = require('pg')
const Resolver = require('./resolution-resolver')


;(async () => {
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

    // TODO: get more urls
    const urls = [
        'https://digitallibrary.un.org/record/3814149?ln=en',
        'https://digitallibrary.un.org/record/562433?ln=en'
    ]
    const promises = urls.map(url => {
        const res = new Resolver(pool, url)
        return res.start()
    })

    await Promise.all(promises)

    await pool.end();
    console.info('QUIT all resolutions parsed')
    process.exit(0)
})().catch(e => console.error(e))
