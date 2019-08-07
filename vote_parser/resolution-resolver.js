const cheerio = require('cheerio')
const rq = require('request-promise-native')

class ResolutionResolver {
    constructor(pool, url) {
        this.pool = pool
        this.url = url
    }

    async start() {
        const data = await this.grabData(this.url)
        const client = await this.pool.connect()
        // await this.saveData(client, data)
        console.info(JSON.stringify(data))
        await client.release()
        console.info(`done with ${this.url}`)
    }

    async grabData(url) {
        const checkUrl = /.+digitallibrary\.un\.org\/record\/(\d+)(\?.+)?/.test(this.url)
        if (!checkUrl) throw 'invalid url'
        
        const id = RegExp.$1
        const $ = await rq({
            uri: this.url,
            transform: (body) => cheerio.load(body, {
                normalizeWhitespace: true,
            })
        })
        const title = $('.two-row-metadata.value').text().trim()
        const obj = {
            id,
            title,
        }
        $('.metadata-row .title').each((i, elem) => {
            const $elem = $(elem)
            const field = $elem.text().trim()
            const $next = $elem.next()
            switch (field) {
                case 'Agenda':
                    obj.agenda = $next.children().eq(0).text()
                    break;
                case 'Vote date':
                    obj.date = $next.text()
                    break;
                case 'Vote':
                    const votes = $next.html().split('<br>')
                    obj.votes = votes
                    console.log(votes.length)
                    break;
                default:
                    // console.log(`nothing for: ${field}`)
                    break;
            }
        })
        return obj
    }

    async saveData(client, data) {
        const { rows } = await client.query(
            `INSERT INTO un.agenda (title)
            VALUES ($1) RETURING agenda_id`,
            [data.agenda])
        console.info(rows)
        const agenda_id = rows.agenda_id;
        const { row2 } = await client.query(
            `INSERT INTO un.resolution (title, agenda_id, resolution_name, vote_date)
            VALUES ($1, $2, $3, $4) `,
            [data.title, agenda_id, data.id, data.date])
        console.info(row2)
    }
}

module.exports = ResolutionResolver;