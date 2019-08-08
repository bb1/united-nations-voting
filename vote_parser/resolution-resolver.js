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
        await this.saveData(client, data)
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
                    // get the html to split by br, create a fake-span just to parse html-special chars, get text 
                    const votes = $next
                        .html()
                        .split('<br>')
                        .map(vote => $('<span>' + vote.trim() + '</span>').text())
                    obj.votes = votes
                    break;
                default:
                    // console.log(`nothing for: ${field}`)
                    break;
            }
        })
        return obj
    }

    async saveData(client, data) {
        const res1 = await client.query(
            `INSERT INTO un.agenda(title)
            VALUES($1) RETURNING id`,
            [data.agenda])
        const agenda_id = res1.rows.id;
        const res2 = await client.query(
            `INSERT INTO un.resolution (title, agenda_id, resolution_name, vote_date)
            VALUES ($1, $2, $3, $4) RETURNING id `,
            [data.title, agenda_id, data.id, data.date])
        const resolution_id = res2.rows[0].id
        if (!resolution_id) {
            throw new Error('create resolution failed');
        }
        const affectedRowsArr = await Promise.all(data.votes.map(vote => this.insertVote(client, resolution_id, vote)))
        console.info('inserted votes: ' + affectedRowsArr.reduce((prev, cur) => prev + cur))
    }

    async insertVote(client, id, voteStr) {
        if (!voteStr || voteStr.length < 3 || voteStr.charAt(1) !== ' ') {
            return 0
        }
        const vote = voteStr.split(' ')[0]
        const country = voteStr.substr(2)
        const absent = vote === 'A'
        const approval = vote === 'Y'
        const disaproval = vote === 'N'
        const res = await client.query(
            `INSERT INTO un.vote (resolution_id, country, yes, no, absent)
            VALUES ($1, $2, $3, $4, $5) `,
            [id, country, approval, disaproval, absent])
        return res.rowCount;
    }
}

module.exports = ResolutionResolver;