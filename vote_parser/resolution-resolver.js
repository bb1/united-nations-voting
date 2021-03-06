const cheerio = require('cheerio')
const rq = require('request-promise-native')


class ResolutionResolver {
    constructor(pool, url) {
        this.pool = pool
        this.url = url
    }

    async start() {
        const start = Date.now()
        const data = await this.grabData(this.url)
        const client = await this.pool.connect()
        await this.saveData(client, data)
        await client.release()
        const duration = Date.now() - start
        console.info(`done with ${this.url} in ${duration}ms`)
    }

    async grabData(url) {
        const checkUrl = /.+digitallibrary\.un\.org\/record\/(\d+)(\?.+)?/.test(this.url)
        if (!checkUrl) {
            throw new Error('invalid url')
        }
        
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
                    break
                case 'Vote date':
                    obj.date = $next.text()
                    break
                case 'Vote':
                    // get the html to split by br, create a fake-span just to parse html-special chars, get text 
                    const votes = $next
                        .html()
                        .split('<br>')
                        .map(vote => $('<span>' + vote.trim() + '</span>').text())
                    obj.votes = votes
                    break
                default:
                    // console.warn(`no handler for field: ${field}`)
                    break
            }
        })
        return obj
    }

    async saveData(client, data) {
        let agenda_id
        const res0 = await client.query(
            `SELECT id FROM un.agenda WHERE title = $1`,
            [data.agenda])
        if (res0.rows.length > 0) {
            agenda_id = res0.rows[0].id
        } else {
            const res1 = await client.query(
                `INSERT INTO un.agenda(title)
                VALUES($1) RETURNING id`,
                [data.agenda])
            agenda_id = res1.rows[0].id;
            console.info(`ADDED agenda: ${data.agenda}`)
        }
        const res2 = await client.query(
            `INSERT INTO un.resolution (title, agenda_id, resolution_name, vote_date)
            VALUES ($1, $2, $3, $4) RETURNING id `,
            [data.title, agenda_id, data.id, data.date])
        const resolution_id = res2.rows[0].id
        if (!resolution_id) {
            throw new Error('create resolution failed')
        }
        const affectedRowsArr = await Promise.all(data.votes.map(vote => this.insertVote(client, resolution_id, vote)))
        const affectedRows = affectedRowsArr.reduce((prev, cur) => prev + cur)
        console.info(`ADDED resolution: ${data.title} (${affectedRows} votes)`)
    }

    async insertVote(client, id, voteStr) {
        if (!voteStr) {
            return 0
        }
        const voteArr = voteStr.split(' ')
        // if the vote doesn't start with Y/N/A it's a non vote
        const nonVoted = voteArr[0].length > 1
        const country = nonVoted ? voteStr : voteStr.substr(2)
        const vote = voteArr[0]
        const absent = nonVoted ? false : vote === 'A'
        const approval = nonVoted ? false : vote === 'Y'
        const disaproval = nonVoted ? false : vote === 'N'
        const res = await client.query(
            `INSERT INTO un.vote (resolution_id, country, yes, no, absent)
            VALUES ($1, $2, $3, $4, $5) `,
            [id, country, approval, disaproval, absent])
        return res.rowCount
    }
}

module.exports = ResolutionResolver;